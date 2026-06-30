import type { OrderStatus, PaymentMethod, PaymentStatus, Role } from "@prisma/client";

/** Item do carrinho (estado no cliente, persistido em localStorage). */
export type CartItem = {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  quantity: number;
  note?: string;
};

/** Rótulos em português para os status do pedido. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  PAYMENT_FAILED: "Pagamento recusado",
  CONFIRMED: "Confirmado",
  PREPARING: "Em preparo",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

/** Cores (classes Tailwind) por status, para badges. */
export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  PAYMENT_FAILED: "bg-red-100 text-red-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-indigo-100 text-indigo-800",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-200 text-gray-700",
};

/** Etapas visíveis ao cliente na linha do tempo do acompanhamento. */
export const ORDER_TIMELINE: OrderStatus[] = [
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CARD: "Cartão (online)",
  CASH: "Dinheiro na entrega",
  PIX: "Pix",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  FAILED: "Falhou",
  REFUNDED: "Estornado",
};

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Dono",
  CUSTOMER: "Cliente",
  DELIVERY: "Entregador",
};

/** Rota inicial após login, conforme o papel. */
export function homeForRole(role: Role): string {
  switch (role) {
    case "OWNER":
      return "/owner";
    case "DELIVERY":
      return "/delivery";
    default:
      return "/account/orders";
  }
}
