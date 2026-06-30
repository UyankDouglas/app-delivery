"use client";

import Link from "next/link";
import { ShoppingBag, UtensilsCrossed } from "lucide-react";
import type { Role } from "@prisma/client";
import { useCart } from "@/components/cart/cart-context";
import { ROLE_LABEL, homeForRole } from "@/types";
import { signOutAction } from "@/server/actions/auth";

export function SiteHeader({
  user,
}: {
  user: { name?: string | null; role: Role } | null;
}) {
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
          <UtensilsCrossed className="h-5 w-5 text-brand-600" />
          App Pedido
        </Link>

        <div className="flex items-center gap-3 text-sm">
          {(!user || user.role === "CUSTOMER") && (
            <Link
              href="/cart"
              className="relative inline-flex items-center gap-1 rounded-lg px-2 py-1 text-gray-700 hover:bg-gray-100"
              aria-label="Carrinho"
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <>
              <Link
                href={homeForRole(user.role)}
                className="hidden text-gray-600 hover:text-gray-900 sm:inline"
              >
                {user.name?.split(" ")[0] ?? "Conta"} · {ROLE_LABEL[user.role]}
              </Link>
              <form action={signOutAction}>
                <button className="rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-100">
                  Sair
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-100">
                Entrar
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
              >
                Criar conta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
