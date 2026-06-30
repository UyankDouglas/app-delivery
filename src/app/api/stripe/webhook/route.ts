import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import { getStripe } from "@/lib/payments/stripe";
import { env, isStripeEnabled } from "@/env";
import { prisma } from "@/lib/prisma";
import { changeOrderStatus } from "@/server/services/orders";

export const runtime = "nodejs";
// O corpo precisa ser lido cru (não parseado) para validar a assinatura.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isStripeEnabled || !env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe não configurado.", { status: 400 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Assinatura ausente.", { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response("Assinatura inválida.", { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handleSucceeded(event.data.object as Stripe.PaymentIntent, event);
        break;
      case "payment_intent.payment_failed":
        await handleFailed(event.data.object as Stripe.PaymentIntent, event);
        break;
      default:
        break;
    }
  } catch (e) {
    console.error("Erro ao processar webhook Stripe:", e);
    return new Response("Erro interno.", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}

function audit(event: Stripe.Event): Prisma.InputJsonValue {
  return { id: event.id, type: event.type, created: event.created };
}

async function handleSucceeded(pi: Stripe.PaymentIntent, event: Stripe.Event) {
  // Idempotência robusta: compare-and-swap atômico. Marca PAID apenas se ainda não estava.
  // Reentregas/concorrência da Stripe não reprocessam (count === 0).
  const swap = await prisma.payment.updateMany({
    where: { providerPaymentId: pi.id, status: { not: "PAID" } },
    data: { status: "PAID", paidAt: new Date(), rawEvent: audit(event) },
  });
  if (swap.count === 0) return;

  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId: pi.id },
    select: { orderId: true },
  });
  if (!payment) return;

  const order = await prisma.order.findUnique({
    where: { id: payment.orderId },
    select: { status: true },
  });
  if (!order) return;

  if (order.status === "PENDING_PAYMENT") {
    // Só agora o pedido é confirmado. changeOrderStatus já publica o evento de status.
    await changeOrderStatus(payment.orderId, "CONFIRMED");
  } else {
    // O pedido não está mais aguardando pagamento (ex.: foi cancelado). Para não cobrar
    // sem entregar, estorna o pagamento e marca como REFUNDED.
    try {
      await getStripe().refunds.create({ payment_intent: pi.id });
      await prisma.payment.update({
        where: { orderId: payment.orderId },
        data: { status: "REFUNDED" },
      });
    } catch (e) {
      console.error("Falha ao estornar pagamento de pedido não-pendente:", e);
    }
  }
}

async function handleFailed(pi: Stripe.PaymentIntent, event: Stripe.Event) {
  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId: pi.id },
    select: { id: true, orderId: true },
  });
  if (!payment) return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "FAILED", rawEvent: audit(event) },
  });
  await prisma.order
    .update({ where: { id: payment.orderId }, data: { status: "PAYMENT_FAILED" } })
    .catch(() => undefined);
}
