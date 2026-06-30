import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { OwnerNav } from "@/components/owner/owner-nav";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("OWNER");
  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerId: user.id },
    select: { name: true, slug: true },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
      <aside className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Restaurante</p>
          <p className="font-semibold text-gray-900">{restaurant?.name}</p>
          {restaurant?.slug && (
            <Link
              href={`/r/${restaurant.slug}`}
              target="_blank"
              className="mt-1 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
            >
              Ver página pública <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
        <OwnerNav />
      </aside>
      <div>{children}</div>
    </div>
  );
}
