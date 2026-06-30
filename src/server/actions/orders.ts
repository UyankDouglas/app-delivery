"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/session";
import { updateStatusSchema, assignDeliverySchema } from "@/lib/validations";
import { changeOrderStatus, OrderTransitionError } from "@/server/services/orders";
import { publish } from "@/lib/realtime/bus";
import { channels } from "@/lib/realtime/events";
import type { ActionState } from "./auth";

// Alvos de status permitidos por papel.
const DELIVERY_ALLOWED: OrderStatus[] = ["OUT_FOR_DELIVERY", "DELIVERED"];
// O dono NÃO pode definir CONFIRMED manualmente: pedidos de cartão são confirmados
// apenas pelo webhook do Stripe (após pagamento) e os de dinheiro já nascem confirmados.
// Isso impede confirmar um pedido de cartão sem pagamento.
const OWNER_ALLOWED: OrderStatus[] = ["PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

/** Dono ou entregador altera o status de um pedido (com regras por papel). */
export async function updateOrderStatusAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = updateStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dados inválidos." };
  const { orderId, status } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      deliveryPersonId: true,
      restaurant: { select: { ownerId: true } },
    },
  });
  if (!order) return { error: "Pedido não encontrado." };

  // Autorização por papel
  if (user.role === "OWNER") {
    if (order.restaurant.ownerId !== user.id) return { error: "Sem permissão." };
    if (!OWNER_ALLOWED.includes(status)) {
      return { error: "Este status não pode ser definido manualmente." };
    }
  } else if (user.role === "DELIVERY") {
    if (!user.deliveryPersonId || order.deliveryPersonId !== user.deliveryPersonId) {
      return { error: "Este pedido não está atribuído a você." };
    }
    if (!DELIVERY_ALLOWED.includes(status)) {
      return { error: "Entregador só pode marcar 'Saiu para entrega' ou 'Entregue'." };
    }
  } else {
    return { error: "Sem permissão." };
  }

  try {
    await changeOrderStatus(orderId, status);
  } catch (e) {
    if (e instanceof OrderTransitionError) return { error: e.message };
    throw e;
  }

  revalidatePath("/owner/orders");
  revalidatePath("/delivery");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath(`/delivery/orders/${orderId}`);
  return {};
}

/** Dono atribui um entregador ao pedido. */
export async function assignDeliveryAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("OWNER");
  const parsed = assignDeliverySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Dados inválidos." };
  const { orderId, deliveryPersonId } = parsed.data;

  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!restaurant) return { error: "Restaurante não encontrado." };

  // Só pedidos ativos podem receber entregador (não entregues/cancelados/não pagos).
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      restaurantId: restaurant.id,
      status: { in: ["CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY"] },
    },
    select: { id: true, deliveryPersonId: true },
  });
  if (!order) return { error: "Pedido não encontrado ou não elegível para atribuição." };

  const deliveryPerson = await prisma.deliveryPerson.findFirst({
    where: { id: deliveryPersonId, restaurantId: restaurant.id },
    select: { id: true },
  });
  if (!deliveryPerson) return { error: "Entregador inválido." };

  const previousDeliveryPersonId = order.deliveryPersonId;

  await prisma.order.update({
    where: { id: orderId },
    data: { deliveryPersonId },
  });

  publish(channels.delivery(deliveryPersonId), { type: "order_assigned", orderId, deliveryPersonId });
  publish(channels.order(orderId), { type: "order_assigned", orderId, deliveryPersonId });
  publish(channels.restaurantOrders(restaurant.id), {
    type: "order_assigned",
    orderId,
    deliveryPersonId,
  });
  // Notifica o entregador anterior (reatribuição) para o pedido sair da lista dele.
  if (previousDeliveryPersonId && previousDeliveryPersonId !== deliveryPersonId) {
    publish(channels.delivery(previousDeliveryPersonId), {
      type: "order_assigned",
      orderId,
      deliveryPersonId,
    });
  }

  revalidatePath("/owner/orders");
  revalidatePath("/delivery");
  revalidatePath(`/orders/${orderId}`);
  return {};
}
