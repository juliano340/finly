import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import {
  useInvoiceAutoCreate,
  type CardOption,
  type InvoiceOption,
} from "@/app/(dashboard)/transactions/_components/use-invoice-auto-create"

const card: CardOption = { id: "card_1", name: "Nubank", dueDay: 10 }

function jsonResponse(data: unknown, ok = true) {
  return { ok, json: async () => data } as Response
}

describe("useInvoiceAutoCreate", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("seleciona a fatura do mês ativo quando existe", async () => {
    const invoice: InvoiceOption = {
      id: "inv_1",
      month: "2026-09",
      calculationMode: "CALCULATED",
      lifecycleStatus: "OPEN",
      card: { id: "card_1", name: "Nubank" },
    }
    const { result } = renderHook(() =>
      useInvoiceAutoCreate({ cards: [card], invoices: [invoice], activeMonth: "2026-09" }),
    )

    await act(async () => {
      await result.current.selectCard("card_1")
    })

    expect(result.current.invoiceId).toBe("inv_1")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("reutiliza fatura aberta vinda do servidor e notifica o parent", async () => {
    const invoice: InvoiceOption = {
      id: "inv_2",
      month: "2026-09",
      calculationMode: "CALCULATED",
      lifecycleStatus: "OPEN",
      card: { id: "card_1", name: "Nubank" },
    }
    fetchMock.mockResolvedValueOnce(jsonResponse([invoice]))
    const onInvoiceCreated = vi.fn()
    const { result } = renderHook(() =>
      useInvoiceAutoCreate({ cards: [card], invoices: [], activeMonth: "2026-09", onInvoiceCreated }),
    )

    await act(async () => {
      await result.current.selectCard("card_1")
    })

    expect(result.current.invoiceId).toBe("inv_2")
    expect(onInvoiceCreated).toHaveBeenCalledWith(invoice)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("auto-cria fatura quando não existe nenhuma", async () => {
    const created: InvoiceOption = {
      id: "inv_3",
      month: "2026-09",
      calculationMode: "CALCULATED",
      lifecycleStatus: "OPEN",
      card: { id: "card_1", name: "Nubank" },
    }
    fetchMock.mockResolvedValueOnce(jsonResponse([]))
    fetchMock.mockResolvedValueOnce(jsonResponse(created))
    const onInvoiceCreated = vi.fn()
    const { result } = renderHook(() =>
      useInvoiceAutoCreate({ cards: [card], invoices: [], activeMonth: "2026-09", onInvoiceCreated }),
    )

    await act(async () => {
      await result.current.selectCard("card_1")
    })

    expect(result.current.invoiceId).toBe("inv_3")
    expect(onInvoiceCreated).toHaveBeenCalledWith(created)
    const postBody = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(postBody).toMatchObject({ cardId: "card_1", month: "2026-09", autoCreated: true })
  })

  it("lança no mês seguinte quando a fatura do mês ativo está fechada", async () => {
    const closed: InvoiceOption = {
      id: "inv_4",
      month: "2026-09",
      calculationMode: "CALCULATED",
      lifecycleStatus: "CLOSED",
      card: { id: "card_1", name: "Nubank" },
    }
    fetchMock.mockResolvedValueOnce(jsonResponse([closed]))
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...closed, id: "inv_5", month: "2026-10", lifecycleStatus: "OPEN" }))
    const { result } = renderHook(() =>
      useInvoiceAutoCreate({ cards: [card], invoices: [], activeMonth: "2026-09" }),
    )

    await act(async () => {
      await result.current.selectCard("card_1")
    })

    const postBody = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(postBody.month).toBe("2026-10")
    expect(result.current.invoiceNotice).toContain("Set 2026")
  })

  it("expõe erro quando a criação falha", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]))
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Falha" }, false))
    const { result } = renderHook(() =>
      useInvoiceAutoCreate({ cards: [card], invoices: [], activeMonth: "2026-09" }),
    )

    await act(async () => {
      await result.current.selectCard("card_1")
    })

    expect(result.current.invoiceError).toBe("Falha")
    expect(result.current.invoiceId).toBe("")
  })
})
