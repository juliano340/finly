import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { DailySafeLimitCard } from "../daily-safe-limit-card"
import type { MonthlyPlanDto } from "@/features/monthly-plan/monthly-plan.types"

const plan: MonthlyPlanDto = {
  month: "2026-08",
  plannedIncome: 1500,
  committedExpenses: 835,
  savingsGoal: 300,
  safetyMargin: 0,
  variableSpent: 0,
  plannedBalance: 665,
  projectedSavings: 665,
  variableAvailable: 365,
  dailySafeLimit: 18.25,
  daysRemaining: 20,
  status: {
    code: "NORMAL",
    label: "Normal",
    reason: "O plano está dentro da meta.",
  },
  incomeOverride: null,
  suggestedIncome: 1500,
  incomeSource: "SUGGESTED",
}

describe("DailySafeLimitCard", () => {
  it("mostra limite, economia projetada e situação sem recalcular o DTO", () => {
    render(<DailySafeLimitCard plan={plan} month="2026-08" />)

    expect(screen.getByRole("heading", { name: "Limite diário seguro" })).toBeInTheDocument()
    expect(screen.getByText("R$ 18,25")).toBeInTheDocument()
    expect(screen.getByText("R$ 665,00")).toBeInTheDocument()
    expect(screen.getByRole("status", { name: "Situação do plano: Normal" })).toHaveTextContent(
      "O plano está dentro da meta.",
    )
  })

  it.each([
    ["NORMAL", "Normal", "Plano dentro da meta."],
    ["ATTENTION", "Atenção", "O limite diário está reduzido."],
    ["RISK", "Risco", "A meta de economia está ameaçada."],
  ] as const)("comunica o estado %s por texto", (code, label, reason) => {
    render(
      <DailySafeLimitCard
        plan={{ ...plan, status: { code, label, reason } }}
        month="2026-08"
      />,
    )

    expect(screen.getByRole("status", { name: `Situação do plano: ${label}` })).toHaveTextContent(
      reason,
    )
  })

  it("abre a página completa no mês selecionado", () => {
    render(<DailySafeLimitCard plan={plan} month="2026-08" />)

    expect(screen.getByRole("link", { name: "Ver Plano do Mês" })).toHaveAttribute(
      "href",
      "/monthly-plan?month=2026-08",
    )
  })

  it("expõe carregamento acessível sem mostrar valores antigos", () => {
    render(<DailySafeLimitCard plan={plan} month="2026-08" loading />)

    expect(screen.getByRole("status", { name: "Carregando Plano do Mês" })).toBeInTheDocument()
    expect(screen.queryByText("R$ 18,25")).not.toBeInTheDocument()
  })
})
