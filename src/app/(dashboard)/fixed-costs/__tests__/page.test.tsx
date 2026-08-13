import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import FixedCostsPage from "../page"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const navigation = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  router: { replace: vi.fn() },
  pathname: "/fixed-costs",
}))

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.searchParams,
  useRouter: () => navigation.router,
  usePathname: () => navigation.pathname,
}))

describe("FixedCostsPage", () => {
  beforeEach(() => {
    navigation.searchParams = new URLSearchParams()
    navigation.router.replace.mockClear()
    window.localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date("2026-08-13T12:00:00Z"))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("ignora resposta atrasada depois que o usuário volta ao mês atual", async () => {
    let resolvePreviousMonth!: (response: Response) => void
    const previousMonthResponse = new Promise<Response>((resolve) => {
      resolvePreviousMonth = resolve
    })
    let currentMonthRequest = 0

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === "/api/categories" || url === "/api/cards" || url === "/api/bank-accounts") {
        return Promise.resolve(response([]))
      }
      if (url === "/api/fixed-costs/occurrences?month=2026-07") {
        return previousMonthResponse
      }
      if (url === "/api/fixed-costs/occurrences?month=2026-08") {
        currentMonthRequest += 1
        return Promise.resolve(response([
          occurrence(`august-${currentMonthRequest}`, `Agosto ${currentMonthRequest}`, "2026-08"),
        ]))
      }
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<FixedCostsPage />)
    expect(await screen.findAllByText("Agosto 1")).not.toHaveLength(0)

    await user.click(screen.getByRole("button", { name: /mês anterior/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/fixed-costs/occurrences?month=2026-07"))

    await user.click(screen.getByRole("button", { name: /próximo mês/i }))
    expect(await screen.findAllByText("Agosto 2")).not.toHaveLength(0)

    await act(async () => {
      resolvePreviousMonth(response([occurrence("july", "Julho atrasado", "2026-07")]))
      await previousMonthResponse
      await Promise.resolve()
    })

    expect(screen.queryAllByText("Julho atrasado")).toHaveLength(0)
    expect(screen.getAllByText("Agosto 2")).not.toHaveLength(0)
  })
})

function response(data: unknown) {
  return { ok: true, json: async () => data } as Response
}

function occurrence(id: string, name: string, month: string) {
  return {
    id,
    fixedCostId: id,
    month,
    dueDate: null,
    amount: 100,
    status: "PENDING",
    paidAt: null,
    paidViaCard: false,
    fixedCost: {
      id,
      name,
      type: "EXPENSE",
      defaultAmount: 100,
      categoryId: "category",
      paymentMethod: "PIX",
      dueDay: null,
      paidInsideCard: false,
      cardId: null,
      bankAccountId: null,
      active: true,
      startDate: null,
      frequency: "MONTHLY",
      customInterval: null,
      customUnit: null,
      endType: "NONE",
      endDate: null,
      endAfterCount: null,
      category: { id: "category", name: "Moradia", type: "EXPENSE" },
      card: null,
      bankAccount: null,
    },
  }
}
