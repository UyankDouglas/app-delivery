import type { OrderStatus } from "@prisma/client";
import { Check } from "lucide-react";
import { ORDER_STATUS_LABEL, ORDER_TIMELINE } from "@/types";
import { cn } from "@/lib/utils";

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="rounded-lg bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700">
        Pedido cancelado.
      </div>
    );
  }
  if (status === "PENDING_PAYMENT") {
    return (
      <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
        Aguardando confirmação do pagamento...
      </div>
    );
  }
  if (status === "PAYMENT_FAILED") {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        O pagamento não foi aprovado. Tente novamente.
      </div>
    );
  }

  const currentIndex = ORDER_TIMELINE.indexOf(status);

  return (
    <ol className="space-y-4">
      {ORDER_TIMELINE.map((step, i) => {
        const done = i <= currentIndex;
        const active = i === currentIndex;
        return (
          <li key={step} className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm",
                done
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-gray-300 bg-white text-gray-400"
              )}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={cn(
                "text-sm",
                active ? "font-semibold text-gray-900" : done ? "text-gray-700" : "text-gray-400"
              )}
            >
              {ORDER_STATUS_LABEL[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
