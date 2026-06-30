import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { Card, CardContent } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OwnerDashboardPage() {
  const user = await requireRole("OWNER");
  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!restaurant) return null;

  const [activeOrders, deliveredToday, productCount, revenueAgg] = await Promise.all([
    prisma.order.count({
      where: {
        restaurantId: restaurant.id,
        status: { in: ["CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY"] },
      },
    }),
    prisma.order.count({ where: { restaurantId: restaurant.id, status: "DELIVERED" } }),
    prisma.product.count({ where: { restaurantId: restaurant.id } }),
    prisma.order.aggregate({
      where: { restaurantId: restaurant.id, status: { not: "CANCELLED" } },
      _sum: { total: true },
    }),
  ]);

  const stats = [
    { label: "Pedidos ativos", value: String(activeOrders), href: "/owner/orders" },
    { label: "Pedidos entregues", value: String(deliveredToday), href: "/owner/orders" },
    { label: "Produtos", value: String(productCount), href: "/owner/products" },
    {
      label: "Faturamento total",
      value: formatCurrency(revenueAgg._sum.total ?? 0),
      href: "/owner/orders",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Painel</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{s.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="text-sm text-gray-600">
          Bem-vindo ao seu painel. Use o menu para gerenciar{" "}
          <Link href="/owner/orders" className="text-brand-600 hover:underline">
            pedidos
          </Link>
          ,{" "}
          <Link href="/owner/products" className="text-brand-600 hover:underline">
            produtos
          </Link>{" "}
          e as{" "}
          <Link href="/owner/settings" className="text-brand-600 hover:underline">
            configurações da loja
          </Link>
          .
        </CardContent>
      </Card>
    </div>
  );
}
