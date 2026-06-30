import crypto from "crypto";
import { env } from "@/env";

/**
 * Segredo de assinatura. Falha rápido se AUTH_SECRET não estiver configurado —
 * nunca usa um fallback público (evita forjar tokens de qualquer pedido).
 */
function getSecret(): string {
  if (!env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET não configurado — necessário para tokens de pedido.");
  }
  return env.AUTH_SECRET;
}

/**
 * Token de acesso ao pedido para clientes convidados (sem login).
 * É um HMAC do id do pedido — permite acompanhar e conversar sem expor outros pedidos.
 */
export function signOrderToken(orderId: string): string {
  return crypto.createHmac("sha256", getSecret()).update(orderId).digest("hex");
}

export function verifyOrderToken(orderId: string, token?: string | null): boolean {
  if (!token) return false;
  const expected = crypto.createHmac("sha256", getSecret()).update(orderId).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
