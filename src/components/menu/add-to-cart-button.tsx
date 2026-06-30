"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { Button } from "@/components/ui";

export function AddToCartButton({
  restaurant,
  product,
}: {
  restaurant: { id: string; name: string };
  product: { productId: string; name: string; price: number; imageUrl?: string | null };
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <Button
      size="sm"
      variant={added ? "secondary" : "primary"}
      onClick={() => {
        addItem(restaurant, product);
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
      }}
    >
      {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      {added ? "Adicionado" : "Adicionar"}
    </Button>
  );
}
