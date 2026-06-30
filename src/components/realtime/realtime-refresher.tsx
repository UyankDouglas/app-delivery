"use client";

import { useRouter } from "next/navigation";
import { useRealtime } from "./use-realtime";

/**
 * Componente "headless": assina canais e atualiza os dados do servidor
 * (router.refresh) a cada evento. Basta inseri-lo em qualquer página server.
 */
export function RealtimeRefresher({ channels, token }: { channels: string[]; token?: string }) {
  const router = useRouter();
  useRealtime(channels, () => router.refresh(), token);
  return null;
}
