import { act, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import DashboardPage from "../page"
import { LAST_SELECTED_MONTH_STORAGE_KEY } from "@/hooks/use-month-param"

const navigation = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  router: { replace: vi.fn() },
  pathname: "/dashboard",
}))
const auth = vi.hoisted(() => ({ session: { user: { id: "user-1" } } }))

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.searchParams,
  useRouter: () => navigation.router,
  usePathname: () => navigation.pathname,
}))

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: auth.session }),
}))

vi.mock("@/features/monthly-plan/monthly-plan.schema", () => ({
  getBusinessMonthKey: () => "2026-08",
  getSupportedMonthWindow: () => ({ min: "2025-01", max: "2027-12" }),
}))

vi.mock("../_components/monthly-evolution-chart", () => ({ MonthlyEvolutionChart: () => null }))
vi.mock("../_components/card-invoice-evolution-chart", () => ({ CardInvoiceEvolutionChart: () => null }))
vi.mock("../_components/expense-by-category-chart", () => ({ ExpenseByCategoryChart: () => null }))
vi.mock("../_components/income-vs-expense-chart", () => ({ IncomeVsExpenseChart: () => null }))
vi.mock("../_components/daily-trend-chart", () => ({ DailyTrendChart: () => null }))
vi.mock("../_components/recent-transactions", () => ({ RecentTransactions: () => null }))
vi.mock("../_components/daily-safe-limit-card", () => ({ DailySafeLimitCard: () => null }))

describe("DashboardPage", () => {
  beforeEach(() => {
    navigation.searchParams = new URLSearchParams()
    navigation.router.replace.mockClear()
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("aguarda restaurar o mês persistido antes de carregar o resumo", async () => {
    window.localStorage.setItem(LAST_SELECTED_MONTH_STORAGE_KEY, "2026-09")
    const fetchMock = vi.fn().mockResolvedValue(responseFor(900))
    vi.stubGlobal("fetch", fetchMock)

    render(<DashboardPage />)

    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("month=2026-09"))).toBe(true))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain("month=2026-09")
  })

  it("ignora resposta antiga quando o mês muda com uma carga em andamento", async () => {
    navigation.searchParams.set("month", "2026-08")
    const august = deferred<Response>()
    const september = deferred<Response>()
    const fetchMock = vi.fn((url: string) => url.includes("month=2026-08") ? august.promise : september.promise)
    vi.stubGlobal("fetch", fetchMock)

    const view = render(<DashboardPage />)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    navigation.searchParams = new URLSearchParams("month=2026-09")
    view.rerender(<DashboardPage />)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await act(async () => september.resolve(responseFor(900)))
    expect(screen.getAllByText(/R\$\s*900,00/)).not.toHaveLength(0)

    await act(async () => august.resolve(responseFor(800)))
    expect(screen.queryAllByText(/R\$\s*800,00/)).toHaveLength(0)
    expect(screen.getAllByText(/R\$\s*900,00/)).not.toHaveLength(0)
  })
})

function responseFor(balance: number) {
  return {
    ok: true,
    json: async () => ({
      stats: {
        balance,
        income: 0,
        expense: 0,
        byCategory: [],
        dailyTrend: [],
        recentTransactions: [],
      },
      bankTotal: 0,
      closing: null,
      evolution: { months: [] },
      cardEvolution: { months: [], cards: [] },
      monthlyPlan: null,
    }),
  } as Response
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => { resolve = next })
  return { promise, resolve }
}
