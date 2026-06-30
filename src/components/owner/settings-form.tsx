"use client";

import { useActionState, useMemo, useState } from "react";
import type { PaymentMethod } from "@prisma/client";
import { updateRestaurantSettingsAction } from "@/server/actions/restaurant";
import type { ActionState } from "@/server/actions/auth";
import { FieldError, Input, Label, SubmitButton, Textarea } from "@/components/ui";
import { PAYMENT_METHOD_LABEL } from "@/types";

const DAYS = [
  ["mon", "Segunda"],
  ["tue", "Terça"],
  ["wed", "Quarta"],
  ["thu", "Quinta"],
  ["fri", "Sexta"],
  ["sat", "Sábado"],
  ["sun", "Domingo"],
] as const;
type DayKey = (typeof DAYS)[number][0];
type DayHours = { open: string; close: string; closed: boolean };
type Hours = Record<DayKey, DayHours>;

export type SettingsData = {
  name: string;
  description: string;
  logoUrl: string;
  phone: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  deliveryFee: number;
  minimumOrder: number;
  avgPrepTimeMinutes: number;
  paymentMethods: PaymentMethod[];
  isOpen: boolean;
  openingHours: Record<string, Partial<DayHours>> | null;
};

// Pix ainda não é suportado no checkout — não oferecemos como opção configurável
// para não anunciar uma forma de pagamento indisponível. (Ver roadmap no README.)
const ALL_METHODS: PaymentMethod[] = ["CARD", "CASH"];

function buildInitialHours(data: SettingsData["openingHours"]): Hours {
  const result = {} as Hours;
  for (const [key] of DAYS) {
    const existing = data?.[key];
    result[key] = {
      open: existing?.open ?? "18:00",
      close: existing?.close ?? "23:00",
      closed: existing?.closed ?? false,
    };
  }
  return result;
}

export function SettingsForm({ restaurant }: { restaurant: SettingsData }) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateRestaurantSettingsAction,
    {}
  );
  const [hours, setHours] = useState<Hours>(() => buildInitialHours(restaurant.openingHours));
  const fe = state.fieldErrors ?? {};

  const hoursJson = useMemo(() => JSON.stringify(hours), [hours]);

  const setDay = (day: DayKey, patch: Partial<DayHours>) =>
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="openingHours" value={hoursJson} />

      {state.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Configurações salvas com sucesso.
        </p>
      )}
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold text-gray-900">Dados do restaurante</h2>
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" defaultValue={restaurant.name} required />
          <FieldError messages={fe.name} />
        </div>
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" name="description" rows={2} defaultValue={restaurant.description} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="logoUrl">URL do logo</Label>
            <Input id="logoUrl" name="logoUrl" defaultValue={restaurant.logoUrl} placeholder="https://..." />
            <FieldError messages={fe.logoUrl} />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" defaultValue={restaurant.phone} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-gray-900">Endereço</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="street">Rua</Label>
            <Input id="street" name="street" defaultValue={restaurant.street} />
          </div>
          <div>
            <Label htmlFor="number">Número</Label>
            <Input id="number" name="number" defaultValue={restaurant.number} />
          </div>
          <div>
            <Label htmlFor="complement">Complemento</Label>
            <Input id="complement" name="complement" defaultValue={restaurant.complement} />
          </div>
          <div>
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input id="neighborhood" name="neighborhood" defaultValue={restaurant.neighborhood} />
          </div>
          <div>
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" name="city" defaultValue={restaurant.city} />
          </div>
          <div>
            <Label htmlFor="state">UF</Label>
            <Input id="state" name="state" maxLength={2} defaultValue={restaurant.state} />
          </div>
          <div>
            <Label htmlFor="zipCode">CEP</Label>
            <Input id="zipCode" name="zipCode" defaultValue={restaurant.zipCode} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-gray-900">Operação</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="deliveryFee">Taxa de entrega (R$)</Label>
            <Input
              id="deliveryFee"
              name="deliveryFee"
              type="number"
              step="0.01"
              min="0"
              defaultValue={restaurant.deliveryFee}
            />
            <FieldError messages={fe.deliveryFee} />
          </div>
          <div>
            <Label htmlFor="minimumOrder">Pedido mínimo (R$)</Label>
            <Input
              id="minimumOrder"
              name="minimumOrder"
              type="number"
              step="0.01"
              min="0"
              defaultValue={restaurant.minimumOrder}
            />
          </div>
          <div>
            <Label htmlFor="avgPrepTimeMinutes">Tempo de preparo (min)</Label>
            <Input
              id="avgPrepTimeMinutes"
              name="avgPrepTimeMinutes"
              type="number"
              min="0"
              defaultValue={restaurant.avgPrepTimeMinutes}
            />
            <FieldError messages={fe.avgPrepTimeMinutes} />
          </div>
        </div>

        <div>
          <Label>Formas de pagamento aceitas</Label>
          <div className="flex flex-wrap gap-3">
            {ALL_METHODS.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="paymentMethods"
                  value={m}
                  defaultChecked={restaurant.paymentMethods.includes(m)}
                />
                {PAYMENT_METHOD_LABEL[m]}
              </label>
            ))}
          </div>
          <FieldError messages={fe.paymentMethods} />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="isOpen" defaultChecked={restaurant.isOpen} /> Restaurante aberto
          para pedidos
        </label>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-900">Horário de funcionamento</h2>
        <div className="space-y-2">
          {DAYS.map(([key, label]) => (
            <div key={key} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="w-24 text-gray-700">{label}</span>
              <label className="flex items-center gap-1 text-gray-500">
                <input
                  type="checkbox"
                  checked={hours[key].closed}
                  onChange={(e) => setDay(key, { closed: e.target.checked })}
                />
                Fechado
              </label>
              {!hours[key].closed && (
                <>
                  <input
                    type="time"
                    value={hours[key].open}
                    onChange={(e) => setDay(key, { open: e.target.value })}
                    className="rounded-lg border border-gray-300 px-2 py-1"
                  />
                  <span className="text-gray-400">às</span>
                  <input
                    type="time"
                    value={hours[key].close}
                    onChange={(e) => setDay(key, { close: e.target.value })}
                    className="rounded-lg border border-gray-300 px-2 py-1"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <SubmitButton>Salvar configurações</SubmitButton>
    </form>
  );
}
