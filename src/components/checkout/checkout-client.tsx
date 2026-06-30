"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PaymentMethod } from "@prisma/client";
import { useCart } from "@/components/cart/cart-context";
import {
  createOrderAction,
  getRestaurantCheckoutInfo,
  type CheckoutInfo,
} from "@/server/actions/checkout";
import { StripePayment } from "@/components/checkout/stripe-payment";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Spinner } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHOD_LABEL } from "@/types";

type StripeStep = { clientSecret: string; orderId: string; token: string };

export function CheckoutClient({ user }: { user: { name?: string | null; email?: string | null } | null }) {
  const router = useRouter();
  const { items, subtotal, restaurantId, restaurantName, clear } = useCart();

  const [info, setInfo] = useState<CheckoutInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stripeStep, setStripeStep] = useState<StripeStep | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setLoadingInfo(false);
      return;
    }
    getRestaurantCheckoutInfo(restaurantId)
      .then((data) => {
        setInfo(data);
        if (data) {
          const available = data.paymentMethods.filter(
            (m) => m === "CASH" || (m === "CARD" && data.stripeEnabled)
          );
          if (available.length > 0) setMethod(available[0]);
        }
      })
      .finally(() => setLoadingInfo(false));
  }, [restaurantId]);

  if (loadingInfo) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (items.length === 0 || !restaurantId) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-gray-600">Seu carrinho está vazio.</p>
        <Link href="/" className="mt-3 inline-block text-brand-600 hover:underline">
          Ver restaurantes
        </Link>
      </div>
    );
  }

  if (!info) {
    return <p className="text-center text-red-600">Restaurante indisponível.</p>;
  }

  const availableMethods = info.paymentMethods.filter(
    (m) => m === "CASH" || (m === "CARD" && info.stripeEnabled)
  );
  const deliveryFee = info.deliveryFee;
  const total = subtotal + deliveryFee;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) ?? "").trim();

    setSubmitting(true);
    const res = await createOrderAction({
      restaurantId: restaurantId!,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, note: i.note })),
      paymentMethod: method,
      customerNote: g("customerNote"),
      guestName: g("guestName"),
      guestEmail: g("guestEmail"),
      address: {
        recipient: g("recipient"),
        phone: g("phone"),
        zipCode: g("zipCode"),
        street: g("street"),
        number: g("number"),
        complement: g("complement"),
        neighborhood: g("neighborhood"),
        city: g("city"),
        state: g("state"),
        reference: g("reference"),
      },
    });
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.paymentMethod === "CARD" && res.clientSecret) {
      setStripeStep({ clientSecret: res.clientSecret, orderId: res.orderId, token: res.token });
    } else {
      clear();
      router.push(`/orders/${res.orderId}?token=${res.token}`);
    }
  }

  // Etapa de pagamento com cartão (Stripe)
  if (stripeStep) {
    const returnUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/orders/${stripeStep.orderId}?token=${stripeStep.token}`
        : "/";
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Pagamento</h1>
        <p className="text-sm text-gray-500">
          Total a pagar: <strong>{formatCurrency(total)}</strong>
        </p>
        <Card>
          <CardContent>
            <StripePayment
              publishableKey={info.publishableKey}
              clientSecret={stripeStep.clientSecret}
              returnUrl={returnUrl}
              onPaid={() => {
                clear();
                router.push(`/orders/${stripeStep.orderId}?token=${stripeStep.token}`);
              }}
            />
          </CardContent>
        </Card>
        <p className="text-center text-xs text-gray-400">
          Cartão de teste: 4242 4242 4242 4242 — qualquer data futura e CVC.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        {!user && (
          <Card>
            <CardHeader>
              <CardTitle>Seus dados</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="guestName">Nome</Label>
                <Input id="guestName" name="guestName" required />
              </div>
              <div>
                <Label htmlFor="guestEmail">E-mail</Label>
                <Input id="guestEmail" name="guestEmail" type="email" required />
              </div>
              <p className="text-xs text-gray-500 sm:col-span-2">
                Já tem conta?{" "}
                <Link href="/login?callbackUrl=/checkout" className="text-brand-600 hover:underline">
                  Entre
                </Link>{" "}
                para usar seu histórico.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Endereço de entrega</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="recipient">Quem recebe</Label>
              <Input id="recipient" name="recipient" defaultValue={user?.name ?? ""} required />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" required />
            </div>
            <div>
              <Label htmlFor="zipCode">CEP</Label>
              <Input id="zipCode" name="zipCode" required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="street">Rua</Label>
              <Input id="street" name="street" required />
            </div>
            <div>
              <Label htmlFor="number">Número</Label>
              <Input id="number" name="number" required />
            </div>
            <div>
              <Label htmlFor="complement">Complemento</Label>
              <Input id="complement" name="complement" />
            </div>
            <div>
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input id="neighborhood" name="neighborhood" required />
            </div>
            <div>
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" name="city" required />
            </div>
            <div>
              <Label htmlFor="state">UF</Label>
              <Input id="state" name="state" maxLength={2} required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="reference">Ponto de referência</Label>
              <Input id="reference" name="reference" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableMethods.length === 0 ? (
              <p className="text-sm text-red-600">
                Nenhuma forma de pagamento disponível no momento.
              </p>
            ) : (
              availableMethods.map((m) => (
                <label
                  key={m}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={m}
                    checked={method === m}
                    onChange={() => setMethod(m)}
                  />
                  <span className="text-sm text-gray-800">{PAYMENT_METHOD_LABEL[m]}</span>
                </label>
              ))
            )}
            <div>
              <Label htmlFor="customerNote">Observações (opcional)</Label>
              <Input id="customerNote" name="customerNote" placeholder="Ex.: sem cebola, troco para R$ 50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo */}
      <div>
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle>Resumo — {restaurantName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((i) => (
              <div key={i.productId} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {i.quantity}× {i.name}
                </span>
                <span>{formatCurrency(i.price * i.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Taxa de entrega</span>
                <span>{formatCurrency(deliveryFee)}</span>
              </div>
              <div className="mt-1 flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {info.minimumOrder > 0 && subtotal < info.minimumOrder && (
              <p className="text-xs text-amber-700">
                Pedido mínimo de {formatCurrency(info.minimumOrder)}.
              </p>
            )}
            {!info.isOpen && (
              <p className="text-xs text-red-600">O restaurante está fechado no momento.</p>
            )}
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={submitting}
              disabled={!info.isOpen || availableMethods.length === 0}
            >
              {method === "CARD" ? "Ir para o pagamento" : "Confirmar pedido"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
