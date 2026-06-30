"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bike } from "lucide-react";
import { createDeliveryPersonAction } from "@/server/actions/delivery";
import type { ActionState } from "@/server/actions/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FieldError,
  Input,
  Label,
  SubmitButton,
} from "@/components/ui";

export type DeliveryPersonRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  vehicle: string | null;
};

export function DeliveryManager({ people }: { people: DeliveryPersonRow[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState<ActionState, FormData>(createDeliveryPersonAction, {});
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Entregadores</h1>

      <Card>
        <CardHeader>
          <CardTitle>Cadastrar entregador</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-2">
            {state.success && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 sm:col-span-2">
                Entregador cadastrado! Ele já pode entrar com o e-mail e senha informados.
              </p>
            )}
            {state.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
                {state.error}
              </p>
            )}
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required />
              <FieldError messages={fe.name} />
            </div>
            <div>
              <Label htmlFor="email">E-mail (login)</Label>
              <Input id="email" name="email" type="email" required />
              <FieldError messages={fe.email} />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" required />
              <FieldError messages={fe.phone} />
            </div>
            <div>
              <Label htmlFor="vehicle">Veículo</Label>
              <Input id="vehicle" name="vehicle" placeholder="Ex.: Moto Honda CG" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="password">Senha provisória</Label>
              <Input id="password" name="password" type="password" required />
              <FieldError messages={fe.password} />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton>Cadastrar entregador</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {people.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum entregador cadastrado ainda.</p>
        ) : (
          people.map((p) => (
            <Card key={p.id} className="flex items-center gap-3 p-3">
              <Bike className="h-5 w-5 text-brand-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{p.name}</p>
                <p className="text-sm text-gray-500">
                  {p.email}
                  {p.phone && ` · ${p.phone}`}
                  {p.vehicle && ` · ${p.vehicle}`}
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
