"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registerAction, type ActionState } from "@/server/actions/auth";
import { FieldError, Input, Label, Select, SubmitButton } from "@/components/ui";

export function RegisterForm({ defaultRole = "CUSTOMER" }: { defaultRole?: "CUSTOMER" | "OWNER" }) {
  const [state, action] = useActionState<ActionState, FormData>(registerAction, {});
  const [role, setRole] = useState<"CUSTOMER" | "OWNER">(defaultRole);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <Label htmlFor="role">Quero me cadastrar como</Label>
        <Select
          id="role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as "CUSTOMER" | "OWNER")}
        >
          <option value="CUSTOMER">Cliente</option>
          <option value="OWNER">Dono de restaurante</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="name">Nome completo</Label>
        <Input id="name" name="name" required />
        <FieldError messages={fe.name} />
      </div>

      {role === "OWNER" && (
        <div>
          <Label htmlFor="restaurantName">Nome do restaurante</Label>
          <Input id="restaurantName" name="restaurantName" required />
          <FieldError messages={fe.restaurantName} />
        </div>
      )}

      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError messages={fe.email} />
      </div>

      <div>
        <Label htmlFor="phone">Telefone (opcional)</Label>
        <Input id="phone" name="phone" type="tel" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
          <FieldError messages={fe.password} />
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirmar</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" required />
          <FieldError messages={fe.confirmPassword} />
        </div>
      </div>

      <SubmitButton className="w-full">Criar conta</SubmitButton>

      <p className="text-center text-sm text-gray-600">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
