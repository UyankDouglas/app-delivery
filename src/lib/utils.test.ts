import { describe, expect, it } from "vitest";
import { formatCurrency, generateOrderCode, slugify } from "@/lib/utils";

describe("utils", () => {
  it("slugify remove acentos e troca espaços por hífen", () => {
    expect(slugify("Burguer do Zé")).toBe("burguer-do-ze");
    expect(slugify("Pizzaria São João")).toBe("pizzaria-sao-joao");
  });

  it("formatCurrency formata em Reais", () => {
    expect(formatCurrency(24.9)).toContain("24,90");
  });

  it("generateOrderCode gera código de 6 caracteres", () => {
    expect(generateOrderCode()).toHaveLength(6);
  });
});
