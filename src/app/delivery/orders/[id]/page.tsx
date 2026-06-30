import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { DeliveryOrderActions } from "@/components/delivery/delivery-order-actions";
import { Chat, type ChatMessage } from "@/components/chat/chat";
import { RealtimeRefresher } from "@/components/realtime/realtime-refresher";
import { channels } from "@/lib/realtime/events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DeliveryOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("DELIVERY");

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      customer: { select: { name: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } },
    },
  });
  if (!order) notFound();

  // Autorização: o pedido precisa estar atribuído a este entregador.
  if (!user.deliveryPersonId || order.deliveryPersonId !== user.deliveryPersonId) {
    redirect("/delivery");
  }

  const chatMessages: ChatMessage[] = order.messages.map((m) => ({
    id: m.id,
    body: m.body,
    senderId: m.senderId,
    senderRole: m.senderRole,
    senderName: m.sender.name,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <RealtimeRefresher channels={[channels.order(order.id)]} />

      <div className="space-y-6">
        <Link href="/delivery" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Pedido #{order.code}</h1>
          <OrderStatusBadge status={order.status} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Atualizar status</CardTitle>
          </CardHeader>
          <CardContent>
            <DeliveryOrderActions orderId={order.id} status={order.status} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cliente e entrega</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-gray-700">
            <p className="font-medium">{order.addrRecipient}</p>
            <p className="inline-flex items-center gap-1 text-gray-500">
              <Phone className="h-3.5 w-3.5" /> {order.addrPhone}
            </p>
            <p className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4 text-brand-600" />
              {order.addrStreet}, {order.addrNumber}
              {order.addrComplement ? ` - ${order.addrComplement}` : ""}
            </p>
            <p className="text-gray-500">
              {order.addrNeighborhood} · {order.addrCity}/{order.addrState} · {order.addrZipCode}
            </p>
            {order.addrReference && <p className="text-gray-500">Ref.: {order.addrReference}</p>}
            {order.customerNote && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
                Obs.: {order.customerNote}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Itens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {order.items.map((it) => (
              <div key={it.id} className="flex justify-between">
                <span className="text-gray-700">
                  {it.quantity}× {it.name}
                </span>
                <span>{formatCurrency(it.lineTotal)}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2">
              <div className="flex justify-between text-gray-500">
                <span>Taxa de entrega</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
              <div className="mt-1 flex justify-between font-bold">
                <span>Total a cobrar</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <Chat
          orderId={order.id}
          currentUserId={user.id}
          initialMessages={chatMessages}
          title={`Chat com ${order.customer.name}`}
          emptyHint="Envie uma mensagem ao cliente sobre a entrega."
        />
      </div>
    </div>
  );
}
