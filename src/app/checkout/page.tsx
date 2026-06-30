import { CheckoutClient } from "@/components/checkout/checkout-client";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Finalizar pedido</h1>
      <CheckoutClient user={user ? { name: user.name, email: user.email } : null} />
    </div>
  );
}
