/**
 * Abstração de provedor de pagamento. Hoje implementamos Stripe (cartão),
 * mas a mesma interface permite plugar Mercado Pago / Pix sem tocar nas regras
 * de negócio do checkout.
 */
export type CreateChargeInput = {
  orderId: string;
  amountInReais: number;
  currency?: string;
  description?: string;
};

export type CreateChargeResult = {
  providerPaymentId: string;
  /** Segredo usado no cliente para confirmar o pagamento (Stripe Payment Element). */
  clientSecret: string | null;
};

export interface PaymentProvider {
  readonly type: "STRIPE";
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>;
}
