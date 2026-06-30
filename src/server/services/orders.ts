import "server-only";
import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/realtime/bus";
import { channels } from "@/lib/realtime/events";
import { ALLOWED_TRANSITIONS, canTransition } from "@/lib/order-status";

// Reexporta para quem já importava daqui.
export { ALLOWED_TRANSITIONS, canTransition };

/** Retorna o campo de timestamp a preencher para um determinado status. */
function timestampFieldFor(status: OrderStatus): keyof Prisma.OrderUpdateInput | null {
  switch (status) {
    case "CONFIRMED":
      return "confirmedAt";
    case "PREPARING":
      return "preparingAt";
    case "OUT_FOR_DELIVERY":
      return "dispatchedAt";
    case "DELIVERED":
      return "deliveredAt";
    case "CANCELLED":
      return "cancelledAt";
    default:
      return null;
  }
}

export class OrderTransitionError extends Error {}

/**
 * Aplica uma mudança de status: valida a transição, persiste (com o timestamp
 * correto) e publica os eventos de tempo real. Lança OrderTransitionError se a
 * transição for inválida.
 */
export async function changeOrderStatus(orderId: string, to: OrderStatus) {
  const current = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, restaurantId: true, deliveryPersonId: true },
  });
  if (!current) throw new OrderTransitionError("Pedido não encontrado.");

  if (current.status === to) return current; // idempotente
  if (!canTransition(current.status, to)) {
    throw new OrderTransitionError(
      `Transição inválida: ${current.status} -> ${to}.`
    );
  }

  const data: Prisma.OrderUpdateInput = { status: to };
  const field = timestampFieldFor(to);
  if (field) (data as Record<string, unknown>)[field] = new Date();

  const updated = await prisma.order.update({
    where: { id: orderId },
    data,
    select: { id: true, status: true, restaurantId: true, deliveryPersonId: true },
  });

  // Eventos de tempo real
  publish(channels.order(orderId), { type: "order_status", orderId, status: to });
  publish(channels.restaurantOrders(updated.restaurantId), {
    type: "order_status",
    orderId,
    status: to,
  });
  if (updated.deliveryPersonId) {
    publish(channels.delivery(updated.deliveryPersonId), {
      type: "order_status",
      orderId,
      status: to,
    });
  }

  return updated;
}
