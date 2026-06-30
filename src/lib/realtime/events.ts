/** Tipos de evento trafegados pelo event bus / SSE. */
export type RealtimeEvent =
  | { type: "order_status"; orderId: string; status: string }
  | { type: "order_new"; orderId: string }
  | { type: "order_assigned"; orderId: string; deliveryPersonId: string }
  | {
      type: "message";
      orderId: string;
      message: {
        id: string;
        body: string;
        senderId: string;
        senderRole: string;
        senderName: string;
        createdAt: string;
      };
    };

// -------- Convenções de nomes de canais --------
export const channels = {
  /** Eventos de um pedido específico (status). */
  order: (orderId: string) => `order:${orderId}`,
  /** Chat de um pedido. */
  orderChat: (orderId: string) => `order:${orderId}:chat`,
  /** Fila de pedidos de um restaurante (para o painel do dono). */
  restaurantOrders: (restaurantId: string) => `restaurant:${restaurantId}:orders`,
  /** Pedidos atribuídos a um entregador. */
  delivery: (deliveryPersonId: string) => `delivery:${deliveryPersonId}`,
};
