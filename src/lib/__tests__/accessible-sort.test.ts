import { describe, expect, it } from "vitest"
import { ariaSort, sortButtonLabel } from "@/lib/accessible-sort"

describe("accessible sort", () => {
  it("traduz a direção para aria-sort", () => {
    expect(ariaSort("asc")).toBe("ascending")
    expect(ariaSort("desc")).toBe("descending")
  })

  it("descreve coluna inativa e próxima direção", () => {
    expect(sortButtonLabel("Saldo", false, "desc")).toBe(
      "Ordenar por Saldo em ordem crescente"
    )
  })

  it("comunica ordem atual e ação seguinte", () => {
    expect(sortButtonLabel("Saldo", true, "asc")).toBe(
      "Ordenado por Saldo em ordem crescente; ordenar em ordem decrescente"
    )
  })
})
