import { notFound, redirect } from "next/navigation";
import { Phone, Bike } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { verifyOrderToken } from "@/lib/order-token";
import { OrderTimeline } from "@/components/order-timeline";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Chat, type ChatMessage } from "@/components/chat/chat";
import { RealtimeRefresher } from "@/components/realtime/realtime-refresher";
import { channels } from "@/lib/realtime/events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/types";

export const dynamic = "force-dynamic";

export default async function OrderTrackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payment: { select: { status: true, method: true } },
      restaurant: { select: { name: true, phone: true, ownerId: true } },
      customer: { select: { name: true } },
      deliveryPerson: { include: { user: { select: { name: true, phone: true } } } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { name: true } } },
      },
    },
  });
  if (!order) notFound();

  const user = await getCurrentUser();
  const isParticipant =
    !!user &&
    (user.id === order.customerId ||
      user.id === order.deliveryPerson?.userId ||
      user.id === order.restaurant.ownerId);
  const tokenValid = verifyOrderToken(order.id, token);

  if (!isParticipant && !tokenValid) {
    redirect(`/login?callbackUrl=/orders/${order.id}`);
  }

  const currentUserId = user?.id ?? order.customerId;
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
      {/* Atualiza status ao vivo */}
      <RealtimeRefresher channels={[channels.order(order.id)]} token={tokenValid ? token : undefined} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pedido #{order.code}</h1>
            <p className="text-sm text-gray-500">
              {order.restaurant.name} · {formatDateTime(order.createdAt)}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acompanhamento</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderTimeline status={order.status} />
          </CardContent>
        </Card>

        {order.deliveryPerson && (
          <Card>
            <CardHeader>
              <CardTitle>Entregador</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-gray-700">
              <Bike className="h-4 w-4 text-brand-600" />
              {order.deliveryPerson.user.name}
              {order.deliveryPerson.user.phone && (
                <span className="inline-flex items-center gap-1 text-gray-500">
                  <Phone className="h-3.5 w-3.5" /> {order.deliveryPerson.user.phone}
                </span>
              )}
            </CardContent>
          </Card>
        )}

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
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Taxa de entrega</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
              <div className="mt-1 flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
            <p className="pt-2 text-xs text-gray-500">
              Pagamento: {PAYMENT_METHOD_LABEL[order.paymentMethod]}
              {order.payment && ` · ${PAYMENT_STATUS_LABEL[order.payment.status]}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entrega</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700">
            {order.addrStreet}, {order.addrNumber}
            {order.addrComplement ? ` - ${order.addrComplement}` : ""} <br />
            {order.addrNeighborhood} · {order.addrCity}/{order.addrState} · {order.addrZipCode}
            {order.addrReference && <p className="text-gray-500">Ref.: {order.addrReference}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Chat com o entregador */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <Chat
          orderId={order.id}
          currentUserId={currentUserId}
          initialMessages={chatMessages}
          token={tokenValid ? token : undefined}
          title="Chat com o entregador"
          emptyHint="Converse com o entregador aqui quando o pedido sair para entrega."
        />
      </div>
    </div>
  );
}
