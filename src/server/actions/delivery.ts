"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { hashPassword } from "@/lib/auth/password";
import { deliveryPersonSchema } from "@/lib/validations";
import type { ActionState } from "./auth";

/** Dono cadastra um entregador (cria User com papel DELIVERY + perfil). */
export async function createDeliveryPersonAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("OWNER");
  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!restaurant) return { error: "Restaurante não encontrado." };

  const parsed = deliveryPersonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Verifique os campos." };
  }
  const d = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: d.email } });
  if (existing) return { error: "Já existe um usuário com este e-mail." };

  await prisma.user.create({
    data: {
      name: d.name,
      email: d.email,
      phone: d.phone,
      role: "DELIVERY",
      passwordHash: await hashPassword(d.password),
      deliveryProfile: {
        create: { restaurantId: restaurant.id, vehicle: d.vehicle || null },
      },
    },
  });

  revalidatePath("/owner/delivery");
  return { success: true };
}
