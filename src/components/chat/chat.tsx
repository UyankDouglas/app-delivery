"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { Role } from "@prisma/client";
import { sendMessageAction } from "@/server/actions/messages";
import { useRealtime } from "@/components/realtime/use-realtime";
import { channels } from "@/lib/realtime/events";
import { formatTime } from "@/lib/utils";
import { ROLE_LABEL } from "@/types";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  body: string;
  senderId: string;
  senderRole: Role;
  senderName: string;
  createdAt: string;
};

export function Chat({
  orderId,
  currentUserId,
  initialMessages,
  token,
  title = "Chat do pedido",
  emptyHint = "Nenhuma mensagem ainda. Diga olá!",
}: {
  orderId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
  token?: string;
  title?: string;
  emptyHint?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const append = (m: ChatMessage) =>
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));

  useRealtime(
    [channels.orderChat(orderId)],
    (event) => {
      if (event.type === "message" && event.orderId === orderId) {
        append(event.message as ChatMessage);
        if (event.message.senderId !== currentUserId) setUnread((n) => n + 1);
      }
    },
    token
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const res = await sendMessageAction({ orderId, body, token });
    setSending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setText("");
    append(res.message as ChatMessage);
  }

  return (
    <div className="flex h-[28rem] flex-col rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {unread > 0 && (
          <span className="animate-pulse rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">
            {unread} nova{unread > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div ref={scrollRef} className="chat-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-gray-400">{emptyHint}</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                    mine ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-900"
                  )}
                >
                  {!mine && (
                    <p className="mb-0.5 text-xs font-semibold opacity-80">
                      {m.senderName} · {ROLE_LABEL[m.senderRole]}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={cn("mt-1 text-right text-[10px]", mine ? "text-brand-100" : "text-gray-400")}>
                    {formatTime(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && <p className="px-4 text-xs text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-gray-100 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setUnread(0)}
          placeholder="Escreva uma mensagem..."
          maxLength={1000}
          className="h-10 flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
          aria-label="Enviar"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
