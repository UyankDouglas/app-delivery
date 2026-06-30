import { EventEmitter } from "events";
import type { RealtimeEvent } from "./events";

/**
 * Event bus em processo (single-instance). Publica eventos em canais e a rota
 * SSE (/api/realtime) os repassa aos navegadores conectados.
 *
 * Para escalar horizontalmente (várias instâncias), troque esta implementação
 * por Redis Pub/Sub ou Pusher mantendo a mesma API publish/subscribe.
 */
const globalForBus = globalThis as unknown as { __orderBus?: EventEmitter };

const emitter =
  globalForBus.__orderBus ??
  (() => {
    const e = new EventEmitter();
    e.setMaxListeners(0); // sem limite (muitas conexões SSE)
    globalForBus.__orderBus = e;
    return e;
  })();

export function publish(channel: string, event: RealtimeEvent): void {
  emitter.emit(channel, event);
}

export function subscribe(channel: string, handler: (event: RealtimeEvent) => void): () => void {
  emitter.on(channel, handler);
  return () => emitter.off(channel, handler);
}
