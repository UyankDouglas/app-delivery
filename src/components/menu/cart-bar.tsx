"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { formatCurrency } from "@/lib/utils";

/** Barra flutuante de carrinho, exibida apenas quando há itens deste restaurante. */
export function CartBar({ restaurantId }: { restaurantId: string }) {
  const { totalItems, subtotal, restaurantId: cartRid } = useCart();
  if (totalItems === 0 || cartRid !== restaurantId) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
      <Link
        href="/cart"
        className="mx-auto flex w-full max-w-2xl items-center justify-between rounded-xl bg-brand-600 px-5 py-3 text-white shadow-lg hover:bg-brand-700"
      >
        <span className="inline-flex items-center gap-2 font-medium">
          <ShoppingBag className="h-5 w-5" />
          Ver carrinho · {totalItems} {totalItems > 1 ? "itens" : "item"}
        </span>
        <span className="font-semibold">{formatCurrency(subtotal)}</span>
      </Link>
    </div>
  );
}
