import Stripe from "stripe";
import { env, isStripeEnabled } from "@/env";
import type { CreateChargeInput, CreateChargeResult, PaymentProvider } from "./provider";

let _stripe: Stripe | null = null;

/** Cliente Stripe (lazy). Lança erro se as chaves não estiverem configuradas. */
export function getStripe(): Stripe {
  if (!isStripeEnabled) {
    throw new Error(
      "Stripe não está configurado. Defina STRIPE_SECRET_KEY e NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY no .env, ou use o método 'Dinheiro na entrega'."
    );
  }
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

export const stripeProvider: PaymentProvider = {
  type: "STRIPE",
  async createCharge({
    orderId,
    amountInReais,
    currency = "brl",
    description,
  }: CreateChargeInput): Promise<CreateChargeResult> {
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amountInReais * 100), // Stripe usa a menor unidade (centavos)
      currency,
      description,
      metadata: { orderId },
      automatic_payment_methods: { enabled: true },
    });
    return {
      providerPaymentId: intent.id,
      clientSecret: intent.client_secret,
    };
  },
};
