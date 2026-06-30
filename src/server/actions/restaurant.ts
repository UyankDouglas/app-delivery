"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { restaurantSettingsSchema } from "@/lib/validations";
import type { ActionState } from "./auth";

/** Busca o restaurante do dono logado (lança se não houver). */
export async function getOwnerRestaurantId(): Promise<string> {
  const user = await requireRole("OWNER");
  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!restaurant) throw new Error("Restaurante não encontrado para este dono.");
  return restaurant.id;
}

export async function updateRestaurantSettingsAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("OWNER");

  // openingHours chega como string JSON montada no cliente.
  let openingHours: unknown = undefined;
  const rawHours = formData.get("openingHours");
  if (typeof rawHours === "string" && rawHours.trim()) {
    try {
      openingHours = JSON.parse(rawHours);
    } catch {
      return { error: "Horário de funcionamento inválido." };
    }
  }

  const payload = {
    name: formData.get("name"),
    description: formData.get("description"),
    logoUrl: formData.get("logoUrl"),
    phone: formData.get("phone"),
    street: formData.get("street"),
    number: formData.get("number"),
    complement: formData.get("complement"),
    neighborhood: formData.get("neighborhood"),
    city: formData.get("city"),
    state: formData.get("state"),
    zipCode: formData.get("zipCode"),
    deliveryFee: formData.get("deliveryFee"),
    minimumOrder: formData.get("minimumOrder"),
    avgPrepTimeMinutes: formData.get("avgPrepTimeMinutes"),
    paymentMethods: formData.getAll("paymentMethods"),
    isOpen: formData.get("isOpen") === "on" || formData.get("isOpen") === "true",
    openingHours,
  };

  const parsed = restaurantSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Verifique os campos." };
  }
  const d = parsed.data;

  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerId: user.id },
    select: { id: true, slug: true },
  });
  if (!restaurant) return { error: "Restaurante não encontrado." };

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: {
      name: d.name,
      description: d.description || null,
      logoUrl: d.logoUrl || null,
      phone: d.phone || null,
      street: d.street || null,
      number: d.number || null,
      complement: d.complement || null,
      neighborhood: d.neighborhood || null,
      city: d.city || null,
      state: d.state || null,
      zipCode: d.zipCode || null,
      deliveryFee: d.deliveryFee,
      minimumOrder: d.minimumOrder,
      avgPrepTimeMinutes: d.avgPrepTimeMinutes,
      paymentMethods: d.paymentMethods,
      isOpen: d.isOpen,
      openingHours: (d.openingHours ?? undefined) as never,
    },
  });

  revalidatePath("/owner/settings");
  revalidatePath(`/r/${restaurant.slug}`);
  return { success: true };
}
