import { notFound } from "next/navigation";
import { Clock, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge, Card } from "@/components/ui";
import { formatCurrency, toNumber } from "@/lib/utils";
import { PAYMENT_METHOD_LABEL } from "@/types";
import { AddToCartButton } from "@/components/menu/add-to-cart-button";
import { CartBar } from "@/components/menu/cart-bar";

export const dynamic = "force-dynamic";

export default async function RestaurantPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      categories: { orderBy: { sortOrder: "asc" } },
      products: {
        where: { isAvailable: true },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!restaurant) notFound();

  // Agrupa produtos por categoria (mantendo a ordem das categorias).
  const sections = [
    ...restaurant.categories.map((c) => ({
      id: c.id,
      name: c.name,
      products: restaurant.products.filter((p) => p.categoryId === c.id),
    })),
    {
      id: "uncat",
      name: "Outros",
      products: restaurant.products.filter((p) => !p.categoryId),
    },
  ].filter((s) => s.products.length > 0);

  const restaurantRef = { id: restaurant.id, name: restaurant.name };

  return (
    <div className="space-y-6 pb-24">
      <Card>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={restaurant.logoUrl || "https://placehold.co/120x120?text=Logo"}
            alt={restaurant.name}
            className="h-20 w-20 rounded-xl object-cover"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{restaurant.name}</h1>
              {restaurant.isOpen ? (
                <Badge className="bg-green-100 text-green-700">Aberto</Badge>
              ) : (
                <Badge className="bg-gray-200 text-gray-600">Fechado</Badge>
              )}
            </div>
            {restaurant.description && (
              <p className="mt-1 text-sm text-gray-600">{restaurant.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {restaurant.avgPrepTimeMinutes} min de preparo
              </span>
              <span>Entrega {formatCurrency(restaurant.deliveryFee)}</span>
              {toNumber(restaurant.minimumOrder) > 0 && (
                <span>Mínimo {formatCurrency(restaurant.minimumOrder)}</span>
              )}
              {restaurant.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {restaurant.neighborhood}, {restaurant.city}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {restaurant.paymentMethods.map((m) => (
                <Badge key={m} className="bg-gray-100 text-gray-600">
                  {PAYMENT_METHOD_LABEL[m]}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {!restaurant.isOpen && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          O restaurante está fechado no momento. Você pode montar o carrinho, mas não finalizar o
          pedido.
        </div>
      )}

      {sections.length === 0 ? (
        <p className="text-sm text-gray-500">Este restaurante ainda não cadastrou produtos.</p>
      ) : (
        sections.map((section) => (
          <section key={section.id}>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">{section.name}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {section.products.map((p) => (
                <Card key={p.id} className="flex items-center gap-3 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.imageUrl || "https://placehold.co/96x96?text=Prato"}
                    alt={p.name}
                    className="h-20 w-20 shrink-0 rounded-lg object-cover"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    {p.description && (
                      <p className="line-clamp-2 text-sm text-gray-500">{p.description}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-semibold text-gray-900">{formatCurrency(p.price)}</span>
                      <AddToCartButton
                        restaurant={restaurantRef}
                        product={{
                          productId: p.id,
                          name: p.name,
                          price: toNumber(p.price),
                          imageUrl: p.imageUrl,
                        }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}

      <CartBar restaurantId={restaurant.id} />
    </div>
  );
}
