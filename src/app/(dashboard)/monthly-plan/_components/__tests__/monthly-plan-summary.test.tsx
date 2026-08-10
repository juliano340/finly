import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MonthlyPlanSummary } from "../monthly-plan-summary"
import type { MonthlyPlanDto } from "@/features/monthly-plan/monthly-plan.types"

const basePlan: MonthlyPlanDto = {
  month: "2026-08",
  incomeOverride: null,
  suggestedIncome: 1500,
  incomeSource: "SUGGESTED",
  plannedIncome: 1500,
  committedExpenses: 835,
  savingsGoal: 300,
  safetyMargin: 50,
  variableSpent: 30,
  plannedBalance: 665,
  projectedSavings: 635,
  variableAvailable: 285,
  dailySafeLimit: 15,
  daysRemaining: 19,
  status: {
    code: "NORMAL",
    label: "Dentro da meta",
    reason: "A economia projetada preserva a meta e a margem.",
  },
}

describe("MonthlyPlanSummary", () => {
  it("apresenta projeção canônica e composição sem recalcular valores", () => {
    render(<MonthlyPlanSummary plan={basePlan} />)

    expect(screen.getByRole("heading", { name: /limite diário seguro/i })).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*15,00/)).toBeInTheDocument()
    expect(screen.getByText("19 dias restantes")).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*285,00/)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*635,00/)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*835,00/)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*30,00/)).toBeInTheDocument()
  })

  it.each([
    ["NORMAL", "Dentro da meta"],
    ["ATTENTION", "Atenção"],
    ["RISK", "Meta ameaçada"],
  ] as const)("comunica estado %s por texto e ícone", (code, label) => {
    render(
      <MonthlyPlanSummary
        plan={{
          ...basePlan,
          status: { code, label, reason: `Motivo para ${label}` },
        }}
      />
    )

    const status = screen.getByRole("status")
    expect(status).toHaveTextContent(label)
    expect(status).toHaveTextContent(`Motivo para ${label}`)
    expect(screen.getByRole("img", { name: `Situação: ${label}` })).toBeInTheDocument()
  })

  it("explica quais transações entram no plano e a limitação de duplicidade manual", () => {
    render(<MonthlyPlanSummary plan={basePlan} />)

    expect(document.body).toHaveTextContent(/transações.*despesas avulsas/i)
    expect(document.body).toHaveTextContent(/pagamentos de fatura e lançamentos fixos/i)
    expect(document.body).toHaveTextContent(/transação manual duplicada não é identificada automaticamente/i)
  })
})
