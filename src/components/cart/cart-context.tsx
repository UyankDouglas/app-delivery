"use client";

import * as React from "react";
import type { CartItem } from "@/types";

const STORAGE_KEY = "app_pedido_cart_v1";

type CartState = {
  restaurantId: string | null;
  restaurantName: string | null;
  items: CartItem[];
};

type CartContextValue = CartState & {
  addItem: (
    restaurant: { id: string; name: string },
    item: Omit<CartItem, "quantity">,
    quantity?: number
  ) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  totalItems: number;
  subtotal: number;
};

const CartContext = React.createContext<CartContextValue | null>(null);

const emptyState: CartState = { restaurantId: null, restaurantName: null, items: [] };

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<CartState>(emptyState);
  const [hydrated, setHydrated] = React.useState(false);

  // Carrega do localStorage
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {
      /* ignora */
    }
    setHydrated(true);
  }, []);

  // Persiste
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignora */
    }
  }, [state, hydrated]);

  const addItem: CartContextValue["addItem"] = (restaurant, item, quantity = 1) => {
    setState((prev) => {
      // Carrinho é por restaurante: trocar de restaurante limpa o carrinho.
      const base =
        prev.restaurantId && prev.restaurantId !== restaurant.id
          ? { restaurantId: restaurant.id, restaurantName: restaurant.name, items: [] as CartItem[] }
          : {
              restaurantId: restaurant.id,
              restaurantName: restaurant.name,
              items: [...prev.items],
            };

      const idx = base.items.findIndex((i) => i.productId === item.productId);
      if (idx >= 0) {
        base.items[idx] = { ...base.items[idx], quantity: base.items[idx].quantity + quantity };
      } else {
        base.items.push({ ...item, quantity });
      }
      return base;
    });
  };

  const setQuantity: CartContextValue["setQuantity"] = (productId, quantity) => {
    setState((prev) => {
      const items = prev.items
        .map((i) => (i.productId === productId ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0);
      return { ...prev, items, ...(items.length === 0 ? emptyState : {}) };
    });
  };

  const removeItem: CartContextValue["removeItem"] = (productId) => {
    setState((prev) => {
      const items = prev.items.filter((i) => i.productId !== productId);
      return items.length === 0 ? emptyState : { ...prev, items };
    });
  };

  const clear = () => setState(emptyState);

  const totalItems = state.items.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = state.items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  const value: CartContextValue = {
    ...state,
    addItem,
    setQuantity,
    removeItem,
    clear,
    totalItems,
    subtotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de <CartProvider>.");
  return ctx;
}
