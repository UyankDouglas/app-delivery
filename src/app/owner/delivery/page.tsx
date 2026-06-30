import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { DeliveryManager, type DeliveryPersonRow } from "@/components/owner/delivery-manager";

export const dynamic = "force-dynamic";

export default async function OwnerDeliveryPage() {
  const user = await requireRole("OWNER");
  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!restaurant) return null;

  const people = await prisma.deliveryPerson.findMany({
    where: { restaurantId: restaurant.id },
    include: { user: { select: { name: true, email: true, phone: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows: DeliveryPersonRow[] = people.map((p) => ({
    id: p.id,
    name: p.user.name,
    email: p.user.email,
    phone: p.user.phone,
    vehicle: p.vehicle,
  }));

  return <DeliveryManager people={rows} />;
}
