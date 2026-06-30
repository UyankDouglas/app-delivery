import "./globals.css";
import type { Metadata } from "next";
import { CartProvider } from "@/components/cart/cart-context";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "App Pedido — Sistema de pedidos para restaurante",
  description:
    "Faça pedidos online, pague e acompanhe a entrega em tempo real. Painel para dono, cliente e entregador.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="pt-BR">
      <body>
        <CartProvider>
          <SiteHeader user={user ? { name: user.name, role: user.role } : null} />
          <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
