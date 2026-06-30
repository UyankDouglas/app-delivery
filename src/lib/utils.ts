import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Prisma } from "@prisma/client";

/** Combina classes do Tailwind com resolucao de conflitos. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Converte Decimal do Prisma (ou number/string) para number de forma segura. */
export function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value.toNumber();
}

/** Formata um valor monetario em Reais (pt-BR). */
export function formatCurrency(value: Prisma.Decimal | number | string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(toNumber(value));
}

/** Formata data/hora no padrao brasileiro. */
export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date(date));
}

/** Gera um codigo de pedido curto e legivel (ex.: "A1B2C3"). */
export function generateOrderCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Cria um slug a partir de um texto (para a URL publica do restaurante). */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFKD")
    .replace(/[^\x00-\x7f]/g, "") // remove marcas de acentuacao apos NFKD
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Remove caracteres de controle e espacos extras de uma string. */
export function sanitizeText(input: string): string {
  return input.replace(/[\x00-\x1f\x7f]/g, "").trim();
}
