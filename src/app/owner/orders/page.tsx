import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import {
  OrdersBoard,
  type DeliveryOption,
  type OwnerOrder,
} from "@/components/owner/orders-board";
import { RealtimeRefresher } from "@/components/realtime/realtime-refresher";
import { channels } from "@/lib/realtime/events";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OwnerOrdersPage() {
  const user = await requireRole("OWNER");
  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!restaurant) return null;

  const [orders, deliveryPeople] = await Promise.all([
    prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        status: { notIn: ["PENDING_PAYMENT", "PAYMENT_FAILED"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: { select: { name: true, quantity: true } },
        customer: { select: { name: true } },
        payment: { select: { status: true } },
        deliveryPerson: { include: { user: { select: { name: true } } } },
      },
    }),
    prisma.deliveryPerson.findMany({
      where: { restaurantId: restaurant.id },
      include: { user: { select: { name: true } } },
    }),
  ]);

  const data: OwnerOrder[] = orders.map((o) => ({
    id: o.id,
    code: o.code,
    status: o.status,
    customerName: o.customer.name,
    total: toNumber(o.total),
    deliveryFee: toNumber(o.deliveryFee),
    paymentMethod: o.paymentMethod,
    paymentStatus: o.payment?.status ?? null,
    createdAt: o.createdAt.toISOString(),
    addressSummary: `${o.addrStreet}, ${o.addrNumber} - ${o.addrNeighborhood}, ${o.addrCity}/${o.addrState}`,
    items: o.items,
    deliveryPersonId: o.deliveryPersonId,
    deliveryPersonName: o.deliveryPerson?.user.name ?? null,
  }));

  const deliveryOptions: DeliveryOption[] = deliveryPeople.map((d) => ({
    id: d.id,
    name: d.user.name,
  }));

  return (
    <>
      <RealtimeRefresher channels={[channels.restaurantOrders(restaurant.id)]} />
      <OrdersBoard orders={data} deliveryOptions={deliveryOptions} />
    </>
  );
}
