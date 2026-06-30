"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import type { Prisma, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations";
import { generateOrderCode, sanitizeText } from "@/lib/utils";
import { signOrderToken } from "@/lib/order-token";
import { hashPassword } from "@/lib/auth/password";
import { stripeProvider } from "@/lib/payments/stripe";
import { env, isStripeEnabled } from "@/env";
import { publish } from "@/lib/realtime/bus";
import { channels } from "@/lib/realtime/events";

export type CheckoutResult =
  | {
      ok: true;
      orderId: string;
      code: string;
      token: string;
      paymentMethod: PaymentMethod;
      clientSecret?: string | null;
    }
  | { ok: false; error: string };

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type CheckoutInfo = {
  id: string;
  name: string;
  isOpen: boolean;
  deliveryFee: number;
  minimumOrder: number;
  paymentMethods: PaymentMethod[];
  stripeEnabled: boolean;
  publishableKey: string;
};

/** Informações de operação do restaurante para a tela de checkout (read-only). */
export async function getRestaurantCheckoutInfo(restaurantId: string): Promise<CheckoutInfo | null> {
  const r = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      isOpen: true,
      deliveryFee: true,
      minimumOrder: true,
      paymentMethods: true,
    },
  });
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    isOpen: r.isOpen,
    deliveryFee: r.deliveryFee.toNumber(),
    minimumOrder: r.minimumOrder.toNumber(),
    paymentMethods: r.paymentMethods,
    stripeEnabled: isStripeEnabled,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY,
  };
}

async function generateUniqueCode(tx: Prisma.TransactionClient): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = generateOrderCode();
    const exists = await tx.order.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  return `${generateOrderCode()}${Date.now().toString(36).toUpperCase().slice(-3)}`;
}

export async function createOrderAction(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const method = data.paymentMethod;

  // 1) Restaurante e validações de operação
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: data.restaurantId },
    select: {
      id: true,
      isOpen: true,
      deliveryFee: true,
      minimumOrder: true,
      paymentMethods: true,
    },
  });
  if (!restaurant) return { ok: false, error: "Restaurante não encontrado." };
  if (!restaurant.isOpen) return { ok: false, error: "O restaurante está fechado no momento." };
  if (!restaurant.paymentMethods.includes(method)) {
    return { ok: false, error: "Forma de pagamento não aceita por este restaurante." };
  }
  if (method === "PIX") {
    return { ok: false, error: "Pagamento via Pix ainda não disponível. Use cartão ou dinheiro." };
  }
  if (method === "CARD" && !isStripeEnabled) {
    return {
      ok: false,
      error: "Cartão indisponível (Stripe não configurado). Use 'Dinheiro na entrega'.",
    };
  }

  // 2) Cliente (logado ou convidado)
  let customerId: string;
  const user = await getCurrentUser();
  if (user) {
    customerId = user.id;
  } else {
    const email = (data.guestEmail || "").trim().toLowerCase();
    const name = (data.guestName || data.address.recipient || "").trim();
    if (!email || !name) {
      return { ok: false, error: "Informe nome e e-mail, ou faça login para continuar." };
    }
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return {
        ok: false,
        error: "Já existe uma conta com este e-mail. Faça login para continuar.",
      };
    }
    const guest = await prisma.user.create({
      data: {
        name,
        email,
        phone: data.address.phone,
        role: "CUSTOMER",
        passwordHash: await hashPassword(crypto.randomUUID()),
      },
      select: { id: true },
    });
    customerId = guest.id;
  }

  // 3) Recalcula preços a partir do banco (nunca confiar no cliente)
  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, restaurantId: restaurant.id, isAvailable: true },
    select: { id: true, name: true, price: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const invalid = data.items.find((i) => !productMap.has(i.productId));
  if (invalid) {
    return { ok: false, error: "Um ou mais itens estão indisponíveis. Atualize o carrinho." };
  }

  let subtotal = 0;
  const itemsData = data.items.map((item) => {
    const product = productMap.get(item.productId)!;
    const unit = product.price.toNumber();
    const lineTotal = round2(unit * item.quantity);
    subtotal = round2(subtotal + lineTotal);
    return {
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity: item.quantity,
      lineTotal,
      note: item.note ? sanitizeText(item.note) : null,
    };
  });

  const minimum = restaurant.minimumOrder.toNumber();
  if (subtotal < minimum) {
    return {
      ok: false,
      error: `O pedido mínimo é de R$ ${minimum.toFixed(2)}. Adicione mais itens.`,
    };
  }

  const deliveryFee = restaurant.deliveryFee.toNumber();
  const total = round2(subtotal + deliveryFee);

  const a = data.address;
  const isCash = method === "CASH";

  // 4) Cria pedido + itens + pagamento (transação)
  const order = await prisma.$transaction(async (tx) => {
    const code = await generateUniqueCode(tx);
    return tx.order.create({
      data: {
        code,
        restaurantId: restaurant.id,
        customerId,
        status: isCash ? "CONFIRMED" : "PENDING_PAYMENT",
        confirmedAt: isCash ? new Date() : null,
        subtotal,
        deliveryFee,
        total,
        paymentMethod: method,
        addrRecipient: a.recipient,
        addrPhone: a.phone,
        addrZipCode: a.zipCode,
        addrStreet: a.street,
        addrNumber: a.number,
        addrComplement: a.complement || null,
        addrNeighborhood: a.neighborhood,
        addrCity: a.city,
        addrState: a.state,
        addrReference: a.reference || null,
        customerNote: data.customerNote ? sanitizeText(data.customerNote) : null,
        items: { create: itemsData },
        payment: {
          create: {
            provider: isCash ? "CASH" : "STRIPE",
            method,
            status: "PENDING",
            amount: total,
            currency: "brl",
          },
        },
      },
      select: { id: true, code: true, restaurantId: true },
    });
  });

  const token = signOrderToken(order.id);

  // 5) Pagamento com cartão: cria o PaymentIntent e devolve o clientSecret.
  if (method === "CARD") {
    try {
      const charge = await stripeProvider.createCharge({
        orderId: order.id,
        amountInReais: total,
        description: `Pedido ${order.code}`,
      });
      await prisma.payment.update({
        where: { orderId: order.id },
        data: { providerPaymentId: charge.providerPaymentId },
      });
      return {
        ok: true,
        orderId: order.id,
        code: order.code,
        token,
        paymentMethod: method,
        clientSecret: charge.clientSecret,
      };
    } catch {
      // Falhou ao iniciar o pagamento: marca como falho (não confirma o pedido).
      await prisma.$transaction([
        prisma.order.update({ where: { id: order.id }, data: { status: "PAYMENT_FAILED" } }),
        prisma.payment.update({ where: { orderId: order.id }, data: { status: "FAILED" } }),
      ]);
      return { ok: false, error: "Não foi possível iniciar o pagamento. Tente novamente." };
    }
  }

  // 6) Dinheiro na entrega: pedido já confirmado -> aparece para o dono.
  // Um único evento basta (o painel refaz a consulta no refresh).
  publish(channels.restaurantOrders(order.restaurantId), { type: "order_new", orderId: order.id });
  revalidatePath("/owner/orders");

  return { ok: true, orderId: order.id, code: order.code, token, paymentMethod: method };
}
