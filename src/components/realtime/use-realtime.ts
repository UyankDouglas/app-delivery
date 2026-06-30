"use client";

import { useEffect, useRef } from "react";
import type { RealtimeEvent } from "@/lib/realtime/events";

/**
 * Assina canais via SSE e chama onEvent a cada evento recebido.
 * O EventSource reconecta automaticamente em caso de queda.
 */
export function useRealtime(
  channels: string[],
  onEvent: (event: RealtimeEvent) => void,
  token?: string
) {
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;
  const key = channels.filter(Boolean).join(",");

  useEffect(() => {
    if (!key) return;
    const params = new URLSearchParams({ channels: key });
    if (token) params.set("token", token);

    const es = new EventSource(`/api/realtime?${params.toString()}`);
    es.onmessage = (ev) => {
      try {
        cbRef.current(JSON.parse(ev.data) as RealtimeEvent);
      } catch {
        /* mensagens de keep-alive não são JSON */
      }
    };

    return () => es.close();
  }, [key, token]);
}
