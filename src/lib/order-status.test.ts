import { describe, expect, it } from "vitest";
import { ALLOWED_TRANSITIONS, canTransition } from "@/lib/order-status";

describe("máquina de estados do pedido", () => {
  it("confirma o pedido após o pagamento (PENDING_PAYMENT -> CONFIRMED)", () => {
    expect(canTransition("PENDING_PAYMENT", "CONFIRMED")).toBe(true);
  });

  it("permite o fluxo principal de status", () => {
    expect(canTransition("CONFIRMED", "PREPARING")).toBe(true);
    expect(canTransition("PREPARING", "OUT_FOR_DELIVERY")).toBe(true);
    expect(canTransition("OUT_FOR_DELIVERY", "DELIVERED")).toBe(true);
  });

  it("bloqueia pular etapas (CONFIRMED -> DELIVERED)", () => {
    expect(canTransition("CONFIRMED", "DELIVERED")).toBe(false);
    expect(canTransition("CONFIRMED", "OUT_FOR_DELIVERY")).toBe(false);
  });

  it("não permite reverter um pedido entregue", () => {
    expect(ALLOWED_TRANSITIONS.DELIVERED).toHaveLength(0);
    expect(canTransition("DELIVERED", "PREPARING")).toBe(false);
  });

  it("não permite transição a partir de um pedido cancelado", () => {
    expect(ALLOWED_TRANSITIONS.CANCELLED).toHaveLength(0);
  });
});
