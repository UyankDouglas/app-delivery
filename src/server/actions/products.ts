"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { productSchema } from "@/lib/validations";
import { getOwnerRestaurantId } from "./restaurant";
import type { ActionState } from "./auth";

/** Encontra ou cria uma categoria pelo nome dentro do restaurante. */
async function resolveCategoryId(restaurantId: string, name?: string): Promise<string | null> {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return null;
  const existing = await prisma.category.findFirst({
    where: { restaurantId, name: trimmed },
    select: { id: true },
  });
  if (existing) return existing.id;
  const count = await prisma.category.count({ where: { restaurantId } });
  const created = await prisma.category.create({
    data: { restaurantId, name: trimmed, sortOrder: count },
    select: { id: true },
  });
  return created.id;
}

async function revalidateProductViews(restaurantId: string) {
  const r = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { slug: true },
  });
  revalidatePath("/owner/products");
  if (r) revalidatePath(`/r/${r.slug}`);
}

export async function createProductAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const restaurantId = await getOwnerRestaurantId();
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Verifique os campos." };
  }
  const d = parsed.data;
  const categoryId = await resolveCategoryId(restaurantId, d.categoryName);

  await prisma.product.create({
    data: {
      restaurantId,
      categoryId,
      name: d.name,
      description: d.description || null,
      imageUrl: d.imageUrl || null,
      price: d.price,
      isAvailable: d.isAvailable,
    },
  });

  await revalidateProductViews(restaurantId);
  return { success: true };
}

export async function updateProductAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const restaurantId = await getOwnerRestaurantId();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Produto inválido." };

  const product = await prisma.product.findFirst({
    where: { id, restaurantId },
    select: { id: true },
  });
  if (!product) return { error: "Produto não encontrado." };

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Verifique os campos." };
  }
  const d = parsed.data;
  const categoryId = await resolveCategoryId(restaurantId, d.categoryName);

  await prisma.product.update({
    where: { id },
    data: {
      categoryId,
      name: d.name,
      description: d.description || null,
      imageUrl: d.imageUrl || null,
      price: d.price,
      isAvailable: d.isAvailable,
    },
  });

  await revalidateProductViews(restaurantId);
  return { success: true };
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const restaurantId = await getOwnerRestaurantId();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // Garante que o produto pertence ao restaurante do dono.
  const product = await prisma.product.findFirst({
    where: { id, restaurantId },
    select: { id: true },
  });
  if (!product) return;
  await prisma.product.delete({ where: { id } });
  await revalidateProductViews(restaurantId);
}

export async function toggleProductAvailabilityAction(formData: FormData): Promise<void> {
  await requireRole("OWNER");
  const restaurantId = await getOwnerRestaurantId();
  const id = String(formData.get("id") ?? "");
  const product = await prisma.product.findFirst({
    where: { id, restaurantId },
    select: { id: true, isAvailable: true },
  });
  if (!product) return;
  await prisma.product.update({
    where: { id },
    data: { isAvailable: !product.isAvailable },
  });
  await revalidateProductViews(restaurantId);
}
