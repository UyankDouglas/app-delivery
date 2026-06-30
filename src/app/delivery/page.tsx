import Link from "next/link";
import { Bike, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { RealtimeRefresher } from "@/components/realtime/realtime-refresher";
import { channels } from "@/lib/realtime/events";
import { Card, EmptyState } from "@/components/ui";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DeliveryHomePage() {
  const user = await requireRole("DELIVERY");

  if (!user.deliveryPersonId) {
    return (
      <EmptyState
        icon={<Bike className="h-8 w-8" />}
        title="Perfil de entregador não configurado"
        description="Peça ao restaurante para vincular seu cadastro como entregador."
      />
    );
  }

  const orders = await prisma.order.findMany({
    where: { deliveryPersonId: user.deliveryPersonId },
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true } } },
  });

  const active = orders.filter((o) =>
    ["CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY"].includes(o.status)
  );
  const done = orders.filter((o) => o.status === "DELIVERED");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <RealtimeRefresher channels={[channels.delivery(user.deliveryPersonId)]} />
      <h1 className="text-xl font-bold text-gray-900">Minhas entregas</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Em andamento</h2>
        {active.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma entrega atribuída no momento.</p>
        ) : (
          active.map((o) => (
            <Link key={o.id} href={`/delivery/orders/${o.id}`}>
              <Card className="flex items-center justify-between p-4 transition-shadow hover:shadow-md">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">#{o.code}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    {o.customer.name} · {o.addrNeighborhood}, {o.addrCity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{formatCurrency(o.total)}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </Card>
            </Link>
          ))
        )}
      </section>

      {done.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Entregues</h2>
          {done.map((o) => (
            <Link key={o.id} href={`/delivery/orders/${o.id}`}>
              <Card className="flex items-center justify-between p-3 text-sm transition-shadow hover:shadow-md">
                <span className="text-gray-700">
                  #{o.code} · {o.customer.name}
                </span>
                <span className="text-gray-400">{formatDateTime(o.createdAt)}</span>
              </Card>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
