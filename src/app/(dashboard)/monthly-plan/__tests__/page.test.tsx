import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import MonthlyPlanPage from "../page"
import type { MonthlyPlanDto } from "@/features/monthly-plan/monthly-plan.types"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const navigation = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  router: { replace: vi.fn() },
  pathname: "/monthly-plan",
}))
vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.searchParams,
  useRouter: () => navigation.router,
  usePathname: () => navigation.pathname,
}))

const plan: MonthlyPlanDto = {
  month: "2026-08",
  incomeOverride: null,
  suggestedIncome: 1500,
  incomeSource: "SUGGESTED",
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
  status: { code: "NORMAL", label: "Dentro da meta", reason: "Meta preservada." },
}

describe("MonthlyPlanPage", () => {
  beforeEach(() => {
    navigation.searchParams.delete("month")
    navigation.router.replace.mockClear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date("2026-08-09T15:00:00Z"))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("busca o mês atual e substitui a projeção ao trocar o mês", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(plan))
      .mockResolvedValueOnce(response({ ...plan, month: "2026-09", dailySafeLimit: 12 }))
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<MonthlyPlanPage />)
    expect(await screen.findByText(/R\$\s*18,25/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/monthly-plan?month=2026-08", expect.any(Object))

    await user.click(screen.getByRole("button", { name: /próximo mês/i }))
    expect(await screen.findByText(/R\$\s*12,00/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/monthly-plan?month=2026-09", expect.any(Object))
  })

  it("abre diretamente o mês informado pelo card do dashboard", async () => {
    navigation.searchParams.set("month", "2026-09")
    const fetchMock = vi.fn().mockResolvedValue(response({ ...plan, month: "2026-09" }))
    vi.stubGlobal("fetch", fetchMock)

    render(<MonthlyPlanPage />)

    await screen.findByText(/R\$\s*18,25/)
    expect(fetchMock).toHaveBeenCalledWith("/api/monthly-plan?month=2026-09", expect.any(Object))
    expect(screen.getByLabelText(/mês do plano/i)).toHaveValue("2026-09")
  })

  it("limita seleção à janela suportada e bloqueia navegação nos extremos", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(plan))
    vi.stubGlobal("fetch", fetchMock)
    render(<MonthlyPlanPage />)
    await screen.findByText(/R\$\s*18,25/)
    const monthInput = screen.getByLabelText(/mês do plano/i)

    fireEvent.change(monthInput, { target: { value: "2027-12" } })
    await waitFor(() => expect(screen.getByRole("button", { name: /próximo mês/i })).toBeDisabled())
    expect(monthInput).toHaveAttribute("min", "2025-01")
    expect(monthInput).toHaveAttribute("max", "2027-12")
  })

  it("envia somente configuração editável e mostra projeção devolvida pelo PUT", async () => {
    const updated = { ...plan, savingsGoal: 350, dailySafeLimit: 15 }
    const fetchMock = vi.fn().mockResolvedValueOnce(response(plan)).mockResolvedValueOnce(response(updated))
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<MonthlyPlanPage />)
    await screen.findByText(/R\$\s*18,25/)
    const goal = screen.getByRole("spinbutton", { name: /meta mínima de economia/i })
    await user.clear(goal)
    await user.type(goal, "350")
    await user.click(screen.getByRole("button", { name: /salvar plano/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/monthly-plan", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ month: "2026-08", incomeOverride: null, savingsGoal: 350, safetyMargin: 0 }),
    }))
    expect(await screen.findByText(/R\$\s*15,00/)).toBeInTheDocument()
  })
})

function response(data: MonthlyPlanDto) {
  return { ok: true, json: async () => data } as Response
}
