"use server";

import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { messageSchema } from "@/lib/validations";
import { sanitizeText } from "@/lib/utils";
import { verifyOrderToken } from "@/lib/order-token";
import { publish } from "@/lib/realtime/bus";
import { channels } from "@/lib/realtime/events";

export type SendMessageResult =
  | {
      ok: true;
      message: {
        id: string;
        body: string;
        senderId: string;
        senderRole: Role;
        senderName: string;
        createdAt: string;
      };
    }
  | { ok: false; error: string };

/**
 * Envia uma mensagem no chat de um pedido.
 * Autoriza por sessão (cliente/entregador/dono participantes) OU por token de
 * pedido (cliente convidado, sem login).
 */
export async function sendMessageAction(input: {
  orderId: string;
  body: string;
  token?: string;
}): Promise<SendMessageResult> {
  const parsed = messageSchema.safeParse({ orderId: input.orderId, body: input.body });
  if (!parsed.success) return { ok: false, error: "Mensagem inválida." };

  const body = sanitizeText(parsed.data.body).trim();
  if (!body) return { ok: false, error: "Mensagem vazia." };

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    select: {
      id: true,
      customerId: true,
      customer: { select: { name: true } },
      deliveryPerson: { select: { userId: true } },
      restaurant: { select: { ownerId: true } },
    },
  });
  if (!order) return { ok: false, error: "Pedido não encontrado." };

  let senderId: string | null = null;
  let senderRole: Role | null = null;
  let senderName = "";

  const user = await getCurrentUser();
  if (user) {
    if (user.id === order.customerId) {
      senderId = user.id;
      senderRole = "CUSTOMER";
      senderName = user.name ?? order.customer.name;
    } else if (order.deliveryPerson && user.id === order.deliveryPerson.userId) {
      senderId = user.id;
      senderRole = "DELIVERY";
      senderName = user.name ?? "Entregador";
    } else if (user.id === order.restaurant.ownerId) {
      senderId = user.id;
      senderRole = "OWNER";
      senderName = user.name ?? "Restaurante";
    }
  }

  // Convidado via token
  if (!senderId && verifyOrderToken(order.id, input.token)) {
    senderId = order.customerId;
    senderRole = "CUSTOMER";
    senderName = order.customer.name;
  }

  if (!senderId || !senderRole) {
    return { ok: false, error: "Sem permissão para enviar mensagem neste pedido." };
  }

  const created = await prisma.message.create({
    data: { orderId: order.id, senderId, senderRole, body },
    select: { id: true, body: true, senderId: true, senderRole: true, createdAt: true },
  });

  const payload = {
    id: created.id,
    body: created.body,
    senderId: created.senderId,
    senderRole: created.senderRole,
    senderName,
    createdAt: created.createdAt.toISOString(),
  };

  publish(channels.orderChat(order.id), { type: "message", orderId: order.id, message: payload });

  return { ok: true, message: payload };
}
