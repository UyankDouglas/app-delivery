import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { ProductsManager, type ProductRow } from "@/components/owner/products-manager";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OwnerProductsPage() {
  const user = await requireRole("OWNER");
  const restaurant = await prisma.restaurant.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!restaurant) return null;

  const products = await prisma.product.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: "desc" },
    include: { category: { select: { name: true } } },
  });

  const rows: ProductRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    imageUrl: p.imageUrl ?? "",
    price: toNumber(p.price),
    isAvailable: p.isAvailable,
    categoryName: p.category?.name ?? "",
  }));

  return <ProductsManager products={rows} />;
}
