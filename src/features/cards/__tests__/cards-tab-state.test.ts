import { describe, expect, it } from "vitest"
import { resolveCardsTab, withCardsTab } from "../cards-tab-state"

describe("cards tab state", () => {
  it("prioriza a aba informada na URL", () => {
    expect(resolveCardsTab("cards", "invoices")).toBe("cards")
    expect(resolveCardsTab("invoices", "cards")).toBe("invoices")
  })

  it("restaura a aba salva quando a URL não define uma aba", () => {
    expect(resolveCardsTab(null, "invoices")).toBe("invoices")
  })

  it("usa cartões como padrão para valores inválidos", () => {
    expect(resolveCardsTab("invalid", "invalid")).toBe("cards")
  })

  it("atualiza a aba preservando os demais parâmetros", () => {
    const result = withCardsTab(new URLSearchParams("month=2026-08&tab=cards"), "invoices")
    expect(result).toBe("month=2026-08&tab=invoices")
  })
})
