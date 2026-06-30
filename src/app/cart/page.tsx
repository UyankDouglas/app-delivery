"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { Button, Card, EmptyState } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export default function CartPage() {
  const { items, subtotal, restaurantName, setQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8" />}
          title="Seu carrinho está vazio"
          description="Escolha um restaurante e adicione produtos para começar."
          action={
            <Link
              href="/"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Ver restaurantes
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Seu carrinho</h1>
        {restaurantName && <p className="text-sm text-gray-500">{restaurantName}</p>}
      </div>

      <Card className="divide-y divide-gray-100">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center gap-3 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl || "https://placehold.co/72x72?text=Prato"}
              alt={item.name}
              className="h-16 w-16 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900">{item.name}</p>
              <p className="text-sm text-gray-500">{formatCurrency(item.price)}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setQuantity(item.productId, item.quantity - 1)}
                aria-label="Diminuir"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setQuantity(item.productId, item.quantity + 1)}
                aria-label="Aumentar"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="w-20 text-right font-semibold text-gray-900">
              {formatCurrency(item.price * item.quantity)}
            </div>
            <button
              onClick={() => removeItem(item.productId)}
              className="text-gray-400 hover:text-red-600"
              aria-label="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </Card>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">Subtotal</span>
        <span className="text-lg font-bold text-gray-900">{formatCurrency(subtotal)}</span>
      </div>

      <div className="flex gap-3">
        <Link href="/" className="flex-1">
          <Button variant="outline" className="w-full">
            Continuar comprando
          </Button>
        </Link>
        <Link href="/checkout" className="flex-1">
          <Button className="w-full">Finalizar pedido</Button>
        </Link>
      </div>
    </div>
  );
}
