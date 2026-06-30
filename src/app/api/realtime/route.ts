import type { NextRequest } from "next/server";
import { subscribe } from "@/lib/realtime/bus";
import type { RealtimeEvent } from "@/lib/realtime/events";
import { getCurrentUser } from "@/lib/session";
import { verifyOrderToken } from "@/lib/order-token";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stream SSE. O cliente passa ?channels=ch1,ch2 e (opcional) ?token=... .
 * Cada canal é autorizado individualmente — sem permissão, é descartado.
 */
async function canAccess(
  channel: string,
  user: SessionUser | null,
  token: string | null
): Promise<boolean> {
  // restaurant:{id}:orders -> apenas o dono
  if (channel.startsWith("restaurant:") && channel.endsWith(":orders")) {
    if (user?.role !== "OWNER") return false;
    const id = channel.slice("restaurant:".length, channel.length - ":orders".length);
    const r = await prisma.restaurant.findFirst({
      where: { id, ownerId: user.id },
      select: { id: true },
    });
    return !!r;
  }

  // delivery:{id} -> apenas o entregador dono do perfil
  if (channel.startsWith("delivery:")) {
    const id = channel.slice("delivery:".length);
    return !!user && user.deliveryPersonId === id;
  }

  // order:{id} ou order:{id}:chat -> participantes ou token válido
  if (channel.startsWith("order:")) {
    const rest = channel.slice("order:".length);
    const orderId = rest.endsWith(":chat") ? rest.slice(0, rest.length - ":chat".length) : rest;
    if (verifyOrderToken(orderId, token)) return true;
    if (!user) return false;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        customerId: true,
        deliveryPerson: { select: { userId: true } },
        restaurant: { select: { ownerId: true } },
      },
    });
    if (!order) return false;
    return (
      user.id === order.customerId ||
      user.id === order.deliveryPerson?.userId ||
      user.id === order.restaurant.ownerId
    );
  }

  return false;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const requested = (url.searchParams.get("channels") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const token = url.searchParams.get("token");
  const user = await getCurrentUser();

  const allowed: string[] = [];
  for (const ch of requested) {
    if (await canAccess(ch, user, token)) allowed.push(ch);
  }
  if (allowed.length === 0) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  const unsubs: Array<() => void> = [];
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    unsubs.forEach((u) => u());
  };

  const stream = new ReadableStream({
    start(controller) {
      const safeEnqueue = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          /* conexão já fechada */
        }
      };

      safeEnqueue(": connected\n\n");

      const handler = (event: RealtimeEvent) => safeEnqueue(`data: ${JSON.stringify(event)}\n\n`);
      for (const ch of allowed) unsubs.push(subscribe(ch, handler));

      heartbeat = setInterval(() => safeEnqueue(": ping\n\n"), 25000);

      // Limpeza tanto no abort da requisição quanto no cancel() do stream.
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          /* já fechado */
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
