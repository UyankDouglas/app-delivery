"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { updateOrderStatusAction } from "@/server/actions/orders";
import { Button } from "@/components/ui";

export function DeliveryOrderActions({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(to: OrderStatus) {
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("orderId", orderId);
    fd.set("status", to);
    const res = await updateOrderStatusAction({}, fd);
    setLoading(false);
    if (res?.error) setError(res.error);
    else router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "PREPARING" && (
          <Button loading={loading} onClick={() => update("OUT_FOR_DELIVERY")}>
            Saiu para entrega
          </Button>
        )}
        {status === "OUT_FOR_DELIVERY" && (
          <Button loading={loading} onClick={() => update("DELIVERED")}>
            Marcar como entregue
          </Button>
        )}
        {status === "CONFIRMED" && (
          <p className="text-sm text-gray-500">Aguardando o restaurante iniciar o preparo.</p>
        )}
        {status === "DELIVERED" && <p className="text-sm text-green-700">Pedido entregue. Obrigado!</p>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
