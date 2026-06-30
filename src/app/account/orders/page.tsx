import Link from "next/link";
import { Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Card, EmptyState } from "@/components/ui";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const user = await requireUser();
  const orders = await prisma.order.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { restaurant: { select: { name: true } }, _count: { select: { items: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Meus pedidos</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-8 w-8" />}
          title="Você ainda não fez pedidos"
          description="Quando fizer um pedido, ele aparecerá aqui."
          action={
            <Link
              href="/"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Ver restaurantes
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`}>
              <Card className="flex items-center justify-between p-4 transition-shadow hover:shadow-md">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">#{o.code}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    {o.restaurant.name} · {o._count.items} itens · {formatDateTime(o.createdAt)}
                  </p>
                </div>
                <span className="font-semibold text-gray-900">{formatCurrency(o.total)}</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
