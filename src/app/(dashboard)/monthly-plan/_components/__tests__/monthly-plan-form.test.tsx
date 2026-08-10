import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { MonthlyPlanForm } from "../monthly-plan-form"
import type { MonthlyPlanDto } from "@/features/monthly-plan/monthly-plan.types"

const plan: MonthlyPlanDto = {
  month: "2026-08",
  incomeOverride: 1600,
  suggestedIncome: 1500,
  incomeSource: "OVERRIDE",
  plannedIncome: 1600,
  committedExpenses: 835,
  savingsGoal: 300,
  safetyMargin: 50,
  variableSpent: 0,
  plannedBalance: 765,
  projectedSavings: 765,
  variableAvailable: 415,
  dailySafeLimit: 20.75,
  daysRemaining: 20,
  status: { code: "NORMAL", label: "Dentro da meta", reason: "Meta preservada." },
}

describe("MonthlyPlanForm", () => {
  it("edita receita, meta e margem separadamente e envia somente campos permitidos", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<MonthlyPlanForm plan={plan} saving={false} onSubmit={onSubmit} />)

    const income = screen.getByRole("spinbutton", { name: /receita prevista/i })
    const goal = screen.getByRole("spinbutton", { name: /meta mínima de economia/i })
    const margin = screen.getByRole("spinbutton", { name: /margem de segurança/i })

    await user.clear(income)
    await user.type(income, "1750")
    await user.clear(goal)
    await user.type(goal, "350")
    await user.clear(margin)
    await user.type(margin, "75")
    await user.click(screen.getByRole("button", { name: /salvar plano/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      incomeOverride: 1750,
      savingsGoal: 350,
      safetyMargin: 75,
    })
  })

  it("restaura a receita sugerida sem alterar meta ou margem", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<MonthlyPlanForm plan={plan} saving={false} onSubmit={onSubmit} />)

    await user.click(screen.getByRole("button", { name: /usar receita sugerida/i }))
    expect(screen.getByRole("spinbutton", { name: /receita prevista/i })).toHaveValue(1500)
    await user.click(screen.getByRole("button", { name: /salvar plano/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      incomeOverride: null,
      savingsGoal: 300,
      safetyMargin: 50,
    })
  })

  it("bloqueia alterações e informa progresso durante salvamento", () => {
    render(<MonthlyPlanForm plan={plan} saving onSubmit={() => {}} />)

    expect(screen.getByRole("button", { name: /salvando/i })).toBeDisabled()
    expect(screen.getByRole("spinbutton", { name: /receita prevista/i })).toBeDisabled()
    expect(screen.getByRole("status")).toHaveTextContent(/salvando alterações/i)
  })
})
