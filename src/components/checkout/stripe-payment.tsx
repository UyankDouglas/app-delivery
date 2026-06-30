"use client";

import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui";

function PaymentForm({ returnUrl, onPaid }: { returnUrl: string; onPaid: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    if (error) {
      setError(error.message ?? "Falha ao processar o pagamento.");
      setLoading(false);
    } else {
      // Pagamento sem redirecionamento concluído: a confirmação final vem pelo webhook.
      onPaid();
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button type="submit" className="w-full" loading={loading} disabled={!stripe}>
        Pagar agora
      </Button>
    </form>
  );
}

export function StripePayment({
  publishableKey,
  clientSecret,
  returnUrl,
  onPaid,
}: {
  publishableKey: string;
  clientSecret: string;
  returnUrl: string;
  onPaid: () => void;
}) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, locale: "pt-BR" }}>
      <PaymentForm returnUrl={returnUrl} onPaid={onPaid} />
    </Elements>
  );
}
