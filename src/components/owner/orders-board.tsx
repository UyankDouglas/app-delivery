"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { assignDeliveryAction, updateOrderStatusAction } from "@/server/actions/orders";
import { Button, Card, Select } from "@/components/ui";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/types";

export type OwnerOrder = {
  id: string;
  code: string;
  status: OrderStatus;
  customerName: string;
  total: number;
  deliveryFee: number;
  paymentMethod: keyof typeof PAYMENT_METHOD_LABEL;
  paymentStatus: keyof typeof PAYMENT_STATUS_LABEL | null;
  createdAt: string;
  addressSummary: string;
  items: { name: string; quantity: number }[];
  deliveryPersonId: string | null;
  deliveryPersonName: string | null;
};

export type DeliveryOption = { id: string; name: string };

function StatusButton({
  orderId,
  status,
  label,
  variant = "primary",
}: {
  orderId: string;
  status: OrderStatus;
  label: string;
  variant?: "primary" | "outline" | "danger";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("orderId", orderId);
    fd.set("status", status);
    const res = await updateOrderStatusAction({}, fd);
    setLoading(false);
    if (res?.error) setError(res.error);
    else router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button size="sm" variant={variant} loading={loading} onClick={go}>
        {label}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}

function AssignDelivery({
  orderId,
  options,
  current,
}: {
  orderId: string;
  options: DeliveryOption[];
  current: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assign() {
    if (!value) return;
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("orderId", orderId);
    fd.set("deliveryPersonId", value);
    const res = await assignDeliveryAction({}, fd);
    setLoading(false);
    if (res?.error) setError(res.error);
    else router.refresh();
  }

  if (options.length === 0) {
    return <span className="text-xs text-gray-400">Nenhum entregador cadastrado</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onChange={(e) => setValue(e.target.value)} className="h-8 w-44 text-sm">
        <option value="">Atribuir entregador...</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </Select>
      <Button size="sm" variant="outline" loading={loading} onClick={assign} disabled={!value}>
        Atribuir
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

function OrderActions({ order, deliveryOptions }: { order: OwnerOrder; deliveryOptions: DeliveryOption[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {order.status === "CONFIRMED" && (
        <StatusButton orderId={order.id} status="PREPARING" label="Iniciar preparo" />
      )}
      {order.status === "PREPARING" && (
        <StatusButton orderId={order.id} status="OUT_FOR_DELIVERY" label="Saiu para entrega" />
      )}
      {order.status === "OUT_FOR_DELIVERY" && (
        <StatusButton orderId={order.id} status="DELIVERED" label="Marcar entregue" />
      )}
      {(order.status === "CONFIRMED" || order.status === "PREPARING") && (
        <StatusButton orderId={order.id} status="CANCELLED" label="Cancelar" variant="danger" />
      )}
      {(order.status === "CONFIRMED" ||
        order.status === "PREPARING" ||
        order.status === "OUT_FOR_DELIVERY") && (
        <AssignDelivery
          orderId={order.id}
          options={deliveryOptions}
          current={order.deliveryPersonId}
        />
      )}
    </div>
  );
}

export function OrdersBoard({
  orders,
  deliveryOptions,
}: {
  orders: OwnerOrder[];
  deliveryOptions: DeliveryOption[];
}) {
  const [filter, setFilter] = useState<"ATIVOS" | "TODOS">("ATIVOS");
  const active: OrderStatus[] = ["CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY"];
  const visible = filter === "ATIVOS" ? orders.filter((o) => active.includes(o.status)) : orders;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Pedidos</h1>
        <div className="flex gap-1 rounded-lg border border-gray-200 p-1 text-sm">
          {(["ATIVOS", "TODOS"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                filter === f ? "rounded-md bg-brand-600 px-3 py-1 text-white" : "px-3 py-1 text-gray-600"
              }
            >
              {f === "ATIVOS" ? "Ativos" : "Todos"}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum pedido por aqui.</p>
      ) : (
        visible.map((order) => (
          <Card key={order.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Link href={`/orders/${order.id}`} className="font-semibold text-gray-900 hover:underline">
                    #{order.code}
                  </Link>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="text-sm text-gray-500">
                  {order.customerName} · {formatDateTime(order.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{formatCurrency(order.total)}</p>
                <p className="text-xs text-gray-500">
                  {PAYMENT_METHOD_LABEL[order.paymentMethod]}
                  {order.paymentStatus && ` · ${PAYMENT_STATUS_LABEL[order.paymentStatus]}`}
                </p>
              </div>
            </div>

            <div className="text-sm text-gray-700">
              {order.items.map((i, idx) => (
                <span key={idx}>
                  {i.quantity}× {i.name}
                  {idx < order.items.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500">{order.addressSummary}</p>
            {order.deliveryPersonName && (
              <p className="text-xs text-gray-500">Entregador: {order.deliveryPersonName}</p>
            )}

            <OrderActions order={order} deliveryOptions={deliveryOptions} />
          </Card>
        ))
      )}
    </div>
  );
}
