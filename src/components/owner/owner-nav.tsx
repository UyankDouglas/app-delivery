"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bike, ClipboardList, LayoutDashboard, Settings, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/owner", label: "Painel", icon: LayoutDashboard, exact: true },
  { href: "/owner/orders", label: "Pedidos", icon: ClipboardList },
  { href: "/owner/products", label: "Produtos", icon: UtensilsCrossed },
  { href: "/owner/delivery", label: "Entregadores", icon: Bike },
  { href: "/owner/settings", label: "Configurações", icon: Settings },
];

export function OwnerNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 lg:flex-col">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium",
              active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
