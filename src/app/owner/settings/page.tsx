import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { SettingsForm, type SettingsData } from "@/components/owner/settings-form";
import { Card, CardContent } from "@/components/ui";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OwnerSettingsPage() {
  const user = await requireRole("OWNER");
  const r = await prisma.restaurant.findUnique({ where: { ownerId: user.id } });
  if (!r) return null;

  const data: SettingsData = {
    name: r.name,
    description: r.description ?? "",
    logoUrl: r.logoUrl ?? "",
    phone: r.phone ?? "",
    street: r.street ?? "",
    number: r.number ?? "",
    complement: r.complement ?? "",
    neighborhood: r.neighborhood ?? "",
    city: r.city ?? "",
    state: r.state ?? "",
    zipCode: r.zipCode ?? "",
    deliveryFee: toNumber(r.deliveryFee),
    minimumOrder: toNumber(r.minimumOrder),
    avgPrepTimeMinutes: r.avgPrepTimeMinutes,
    paymentMethods: r.paymentMethods,
    isOpen: r.isOpen,
    openingHours: (r.openingHours as SettingsData["openingHours"]) ?? null,
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
      <Card>
        <CardContent>
          <SettingsForm restaurant={data} />
        </CardContent>
      </Card>
    </div>
  );
}
