import type { OrderStatus } from "@prisma/client";
import { Badge } from "@/components/ui";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/types";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge className={ORDER_STATUS_COLOR[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}
