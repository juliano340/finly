import { describe, it, expect } from "vitest"
import { buildExpenseEvolution, type ExpenseEvolutionInvoice } from "../expense-evolution"

function makeInvoice(overrides: Partial<ExpenseEvolutionInvoice> = {}): ExpenseEvolutionInvoice {
  return {
    effectiveTotal: 0,
    dueDate: new Date("2026-10-10T12:00:00"),
    importedTransactions: [],
    items: [],
    unlinkedFixedOccurrences: [],
    ...overrides,
  }
}

const noBenefit = { benefitAccounts: [] as { initialBalance: number; movements: { date: Date; amount: number; type: "INCOME" | "EXPENSE" }[] }[] }

describe("buildExpenseEvolution", () => {
  it("sem despesas retorna vazio", () => {
    const result = buildExpenseEvolution({ invoices: [], outsideCardOccurrences: [], looseExpenses: [], ...noBenefit })
    expect(result.points).toEqual([])
    expect(result.total).toBe(0)
    expect(result.expenseCount).toBe(0)
    expect(result.periodStart).toBeNull()
    expect(result.periodEnd).toBeNull()
    expect(result.hasBenefit).toBe(false)
  })

  it("uma despesa gera um ponto acumulado", () => {
    const result = buildExpenseEvolution({
      invoices: [],
      outsideCardOccurrences: [],
      looseExpenses: [{ amount: 100, date: new Date("2026-09-15T12:00:00"), description: "Mercado" }],
      ...noBenefit,
    })
    expect(result.points).toHaveLength(1)
    expect(result.points[0]).toEqual({ date: "2026-09-15", daily: 100, cumulative: 100, benefitBalance: null })
    expect(result.total).toBe(100)
    expect(result.expenseCount).toBe(1)
    expect(result.periodStart).toBe("2026-09-15")
    expect(result.periodEnd).toBe("2026-09-15")
  })

  it("várias despesas no mesmo dia somam em um ponto", () => {
    const result = buildExpenseEvolution({
      invoices: [],
      outsideCardOccurrences: [],
      looseExpenses: [
        { amount: 50, date: new Date("2026-09-15T09:00:00"), description: "A" },
        { amount: 30, date: new Date("2026-09-15T18:00:00"), description: "B" },
      ],
      ...noBenefit,
    })
    expect(result.points).toHaveLength(1)
    expect(result.points[0].daily).toBe(80)
    expect(result.points[0].cumulative).toBe(80)
    expect(result.expenseCount).toBe(2)
  })

  it("despesas em dias diferentes ficam em ordem cronológica com acumulado", () => {
    const result = buildExpenseEvolution({
      invoices: [],
      outsideCardOccurrences: [],
      looseExpenses: [
        { amount: 20, date: new Date("2026-09-12T12:00:00"), description: "B" },
        { amount: 10, date: new Date("2026-09-10T12:00:00"), description: "A" },
      ],
      ...noBenefit,
    })
    expect(result.points.map((point) => point.date)).toEqual(["2026-09-10", "2026-09-11", "2026-09-12"])
    expect(result.points.map((point) => point.daily)).toEqual([10, 0, 20])
    expect(result.points.map((point) => point.cumulative)).toEqual([10, 10, 30])
  })

  it("compra do mês anterior em fatura aparece na data da compra", () => {
    const result = buildExpenseEvolution({
      invoices: [
        makeInvoice({
          effectiveTotal: 200,
          items: [{ amount: 200, date: new Date("2026-09-28T12:00:00"), description: "Compra set" }],
        }),
      ],
      outsideCardOccurrences: [],
      looseExpenses: [],
      ...noBenefit,
    })
    expect(result.points).toHaveLength(1)
    expect(result.points[0]).toEqual({ date: "2026-09-28", daily: 200, cumulative: 200, benefitBalance: null })
    expect(result.total).toBe(200)
  })

  it("fatura com importSession usa as datas do extrato", () => {
    const result = buildExpenseEvolution({
      invoices: [
        makeInvoice({
          effectiveTotal: 200,
          importedTransactions: [
            { date: new Date("2026-09-05T12:00:00"), amount: 120, type: "debit", description: "Compra 1" },
            { date: new Date("2026-09-20T12:00:00"), amount: 80, type: "debit", description: "Compra 2" },
            { date: new Date("2026-09-25T12:00:00"), amount: 50, type: "credit", description: "Estorno" },
          ],
          items: [{ amount: 999, date: new Date("2026-09-30T12:00:00"), description: "Ignorado" }],
        }),
      ],
      outsideCardOccurrences: [],
      looseExpenses: [],
      ...noBenefit,
    })
    expect(result.points.filter((point) => point.daily > 0).map((point) => point.date)).toEqual(["2026-09-05", "2026-09-20"])
    expect(result.points[0].date).toBe("2026-09-05")
    expect(result.points[result.points.length - 1].date).toBe("2026-09-20")
    expect(result.points.find((point) => point.date === "2026-09-05")?.daily).toBe(120)
    expect(result.points.find((point) => point.date === "2026-09-20")?.daily).toBe(80)
    expect(result.total).toBe(200)
    expect(result.expenseCount).toBe(2)
  })

  it("fatura sem importSession usa os itens", () => {
    const result = buildExpenseEvolution({
      invoices: [
        makeInvoice({
          effectiveTotal: 200,
          items: [{ amount: 200, date: new Date("2026-09-28T12:00:00"), description: "Item" }],
        }),
      ],
      outsideCardOccurrences: [],
      looseExpenses: [],
      ...noBenefit,
    })
    expect(result.points[0].date).toBe("2026-09-28")
    expect(result.points[0].daily).toBe(200)
  })

  it("item sem data cai no vencimento da fatura", () => {
    const result = buildExpenseEvolution({
      invoices: [makeInvoice({ effectiveTotal: 100, items: [{ amount: 100, date: null, description: "Sem data" }] })],
      outsideCardOccurrences: [],
      looseExpenses: [],
      ...noBenefit,
    })
    expect(result.points[0].date).toBe("2026-10-10")
    expect(result.points[0].daily).toBe(100)
    expect(result.expenseCount).toBe(1)
  })

  it("fatura sem itens e sem import vira um evento único de ajuste no vencimento", () => {
    const result = buildExpenseEvolution({
      invoices: [makeInvoice({ effectiveTotal: 350 })],
      outsideCardOccurrences: [],
      looseExpenses: [],
      ...noBenefit,
    })
    expect(result.points).toHaveLength(1)
    expect(result.points[0]).toEqual({ date: "2026-10-10", daily: 350, cumulative: 350, benefitBalance: null })
    expect(result.expenseCount).toBe(1)
  })

  it("ajuste fina a fatura no effectiveTotal com arredondamento de 2 casas", () => {
    const hundred = buildExpenseEvolution({
      invoices: [makeInvoice({ effectiveTotal: 100.01, items: [{ amount: 100, date: new Date("2026-10-01T12:00:00"), description: "Item" }] })],
      outsideCardOccurrences: [],
      looseExpenses: [],
      ...noBenefit,
    })
    expect(hundred.total).toBe(100.01)

    const thirds = buildExpenseEvolution({
      invoices: [
        makeInvoice({
          effectiveTotal: 99.99,
          importedTransactions: [
            { date: new Date("2026-10-02T12:00:00"), amount: 33.33, type: "debit", description: "A" },
            { date: new Date("2026-10-03T12:00:00"), amount: 33.33, type: "debit", description: "B" },
            { date: new Date("2026-10-04T12:00:00"), amount: 33.33, type: "debit", description: "C" },
          ],
        }),
      ],
      outsideCardOccurrences: [],
      looseExpenses: [],
      ...noBenefit,
    })
    expect(thirds.total).toBe(99.99)
    expect(thirds.expenseCount).toBe(3)
  })

  it("linha do benefício cai com EXPENSE, sobe com INCOME e soma contas e saldo pré-janela", () => {
    const result = buildExpenseEvolution({
      invoices: [],
      outsideCardOccurrences: [],
      looseExpenses: [
        { amount: 10, date: new Date("2026-09-15T12:00:00"), description: "A" },
        { amount: 5, date: new Date("2026-09-17T12:00:00"), description: "B" },
      ],
      benefitAccounts: [
        {
          initialBalance: 100,
          movements: [
            { date: new Date("2026-09-01T12:00:00"), amount: 50, type: "INCOME" },
            { date: new Date("2026-09-15T12:00:00"), amount: 30, type: "EXPENSE" },
            { date: new Date("2026-09-20T12:00:00"), amount: 99, type: "EXPENSE" },
          ],
        },
        {
          initialBalance: 20,
          movements: [{ date: new Date("2026-09-16T12:00:00"), amount: 10, type: "INCOME" }],
        },
      ],
    })

    expect(result.hasBenefit).toBe(true)
    expect(result.points.map((point) => point.date)).toEqual(["2026-09-15", "2026-09-16", "2026-09-17"])
    expect(result.points.map((point) => point.benefitBalance)).toEqual([140, 150, 150])
    expect(result.total).toBe(15)
  })

  it("datas em UTC-meia-noite caem no dia UTC correto", () => {
    const result = buildExpenseEvolution({
      invoices: [],
      outsideCardOccurrences: [],
      looseExpenses: [
        { amount: 10, date: new Date("2026-09-08"), description: "UTC 08" },
        { amount: 20, date: new Date("2026-09-10"), description: "UTC 10" },
      ],
      benefitAccounts: [
        { initialBalance: 100, movements: [{ date: new Date("2026-09-10"), amount: 5, type: "INCOME" }] },
      ],
    })

    expect(result.points[0].date).toBe("2026-09-08")
    expect(result.points.find((point) => point.date === "2026-09-08")?.daily).toBe(10)
    expect(result.points.find((point) => point.date === "2026-09-10")?.daily).toBe(20)
    expect(result.points.find((point) => point.date === "2026-09-09")?.benefitBalance).toBe(100)
    expect(result.points.find((point) => point.date === "2026-09-10")?.benefitBalance).toBe(105)
  })
})
