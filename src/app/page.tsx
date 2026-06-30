import Link from "next/link";
import { Clock, MapPin, Store } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge, Card, EmptyState } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      city: true,
      deliveryFee: true,
      avgPrepTimeMinutes: true,
      isOpen: true,
    },
  });

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-10 text-white">
        <h1 className="text-3xl font-bold sm:text-4xl">Peça do seu restaurante favorito</h1>
        <p className="mt-2 max-w-xl text-brand-50">
          Monte o carrinho, pague online ou na entrega e acompanhe o pedido em tempo real — com chat
          direto com o entregador.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Restaurantes</h2>

        {restaurants.length === 0 ? (
          <EmptyState
            icon={<Store className="h-8 w-8" />}
            title="Nenhum restaurante cadastrado ainda"
            description="É dono de um restaurante? Crie sua conta para configurar a loja e começar a vender."
            action={
              <Link
                href="/register?role=OWNER"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Cadastrar meu restaurante
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((r) => (
              <Link key={r.id} href={`/r/${r.slug}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-3 p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.logoUrl || "https://placehold.co/96x96?text=Logo"}
                      alt={r.name}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-gray-900">{r.name}</p>
                        {r.isOpen ? (
                          <Badge className="bg-green-100 text-green-700">Aberto</Badge>
                        ) : (
                          <Badge className="bg-gray-200 text-gray-600">Fechado</Badge>
                        )}
                      </div>
                      <p className="line-clamp-1 text-sm text-gray-500">
                        {r.description || "Sem descrição"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {r.avgPrepTimeMinutes} min
                    </span>
                    <span className="inline-flex items-center gap-1">
                      Entrega {formatCurrency(r.deliveryFee)}
                    </span>
                    {r.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {r.city}
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
