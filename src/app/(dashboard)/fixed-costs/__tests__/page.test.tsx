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

  it("exibe skeleton da tabela enquanto os lançamentos estão carregando", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === "/api/categories" || url === "/api/cards" || url === "/api/bank-accounts") {
        return Promise.resolve(response([]))
      }
      if (url === "/api/fixed-costs/occurrences?month=2026-08") {
        return new Promise<Response>(() => undefined)
      }
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    const { container } = render(<FixedCostsPage />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/fixed-costs/occurrences?month=2026-08"))
    expect(container.querySelectorAll("tbody tr[aria-hidden='true']")).toHaveLength(5)
    expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
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

  it("edita valor com escopo explícito e usa somente esta ocorrência por padrão", async () => {
    const item = occurrence("occurrence-1", "Internet", "2026-08")
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === "/api/categories" || url === "/api/cards" || url === "/api/bank-accounts") return Promise.resolve(response([]))
      if (url === "/api/fixed-costs/occurrences?month=2026-08") return Promise.resolve(response([item]))
      if (url === "/api/fixed-costs/occurrence-1" && init?.method === "PUT") {
        return Promise.resolve(response({ affected: 1, skipped: { paid: 0, closed: 0, deleted: 0 } }))
      }
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<FixedCostsPage />)
    await screen.findAllByText("Internet")
    await user.click(screen.getByRole("button", { name: "Editar custo fixo" }))

    expect(screen.getByRole("radio", { name: /somente esta ocorrência/i })).toBeChecked()
    let amount = document.querySelector<HTMLInputElement>('input[name="amount"]')!
    const scopeFieldset = screen.getByText("Aplicar alteração em").closest("fieldset")!
    expect(scopeFieldset.compareDocumentPosition(amount) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole("button", { name: "Salvar somente agosto de 2026" })).toBeInTheDocument()
    await user.clear(amount)
    await user.type(amount, "150")
    await user.click(screen.getByRole("button", { name: "Salvar somente agosto de 2026" }))

    await waitFor(() => {
      const request = fetchMock.mock.calls.find(([url, init]) => String(url) === "/api/fixed-costs/occurrence-1" && init?.method === "PUT")
      expect(JSON.parse(String(request?.[1]?.body))).toEqual({
        occurrenceId: "occurrence-1",
        month: "2026-08",
        scope: "THIS_MONTH",
        amount: "150",
        expectedUpdatedAt: "2026-08-01T12:00:00.000Z",
      })
    })

    await user.click(screen.getByRole("button", { name: "Editar custo fixo" }))
    await user.click(screen.getByRole("radio", { name: /esta ocorrência e as próximas/i }))
    expect(screen.getByRole("button", { name: "Salvar agosto de 2026 e próximos" })).toBeInTheDocument()
    amount = document.querySelector<HTMLInputElement>('input[name="amount"]')!
    await user.clear(amount)
    await user.type(amount, "175")
    await user.click(screen.getByRole("button", { name: "Salvar agosto de 2026 e próximos" }))

    await user.click(screen.getByRole("button", { name: "Editar custo fixo" }))
    await user.click(screen.getByRole("radio", { name: "Toda a série" }))
    expect(screen.getByRole("button", { name: "Salvar toda a série" })).toBeInTheDocument()
    amount = document.querySelector<HTMLInputElement>('input[name="amount"]')!
    await user.clear(amount)
    await user.type(amount, "200")
    await user.click(screen.getByRole("button", { name: "Salvar toda a série" }))

    await waitFor(() => {
      const payloads = fetchMock.mock.calls
        .filter(([url, init]) => String(url) === "/api/fixed-costs/occurrence-1" && init?.method === "PUT")
        .map(([, init]) => JSON.parse(String(init?.body)))
      expect(payloads.map((payload) => ({ scope: payload.scope, amount: payload.amount }))).toEqual([
        { scope: "THIS_MONTH", amount: "150" },
        { scope: "THIS_AND_FUTURE", amount: "175" },
        { scope: "ENTIRE_SERIES", amount: "200" },
      ])
    })
  })

  it("edita configurações da série por uma ação separada sem enviar valor", async () => {
    const item = occurrence("occurrence-1", "Internet", "2026-08")
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === "/api/categories") return Promise.resolve(response([item.fixedCost.category]))
      if (url === "/api/cards" || url === "/api/bank-accounts") return Promise.resolve(response([]))
      if (url === "/api/fixed-costs/occurrences?month=2026-08") return Promise.resolve(response([item]))
      if (url === "/api/fixed-costs/occurrence-1" && init?.method === "PATCH") return Promise.resolve(response({ id: "occurrence-1" }))
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<FixedCostsPage />)
    await screen.findAllByText("Internet")
    await user.click(screen.getByRole("button", { name: "Editar custo fixo" }))
    await user.click(screen.getByRole("button", { name: "Editar configurações da série" }))

    const name = screen.getByRole("textbox", { name: "Nome" })
    await user.clear(name)
    await user.type(name, "Internet residencial")
    await user.click(screen.getByRole("button", { name: "Salvar configurações da série" }))

    await waitFor(() => {
      const request = fetchMock.mock.calls.find(([url, init]) => String(url) === "/api/fixed-costs/occurrence-1" && init?.method === "PATCH")
      const body = JSON.parse(String(request?.[1]?.body))
      expect(body.name).toBe("Internet residencial")
      expect(body).not.toHaveProperty("defaultAmount")
      expect(body).not.toHaveProperty("scope")
      expect(body).not.toHaveProperty("occurrenceId")
    })
  })

  it("exibe datas ISO de calendário sem recuar no timezone local", async () => {
    const item = occurrence("occurrence-1", "Internet", "2026-09")
    item.dueDate = "2026-09-01T00:00:00.000Z"
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === "/api/categories" || url === "/api/cards" || url === "/api/bank-accounts") return Promise.resolve(response([]))
      if (url === "/api/fixed-costs/occurrences?month=2026-08") return Promise.resolve(response([item]))
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    render(<FixedCostsPage />)

    expect((await screen.findAllByText("01/09/2026")).length).toBeGreaterThan(0)
    expect(screen.queryAllByText("31/08/2026")).toHaveLength(0)
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
    dueDate: null as string | null,
    amount: 100,
    status: "PENDING",
    paidAt: null,
    paidViaCard: false,
    updatedAt: "2026-08-01T12:00:00.000Z",
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
      startDate: "2026-01-01T00:00:00.000Z",
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
