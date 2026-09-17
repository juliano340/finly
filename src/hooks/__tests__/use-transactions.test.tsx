import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useTransactions } from "../use-transactions"
import type { TransactionInput } from "@/features/transactions/transactions.schema"

function jsonResponse(data: unknown) {
  return { ok: true, json: async () => data } as unknown as Response
}

function makeTx(overrides: Record<string, unknown> = {}) {
  return {
    id: "tx-1",
    date: "2026-09-10T12:00:00.000Z",
    description: "Compra",
    amount: 100,
    type: "EXPENSE",
    categoryId: "cat-1",
    ...overrides,
  }
}

const input = {
  amount: 100,
  type: "EXPENSE",
  categoryId: "cat-1",
  date: new Date("2026-09-10T12:00:00"),
} as unknown as TransactionInput

describe("useTransactions", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  it("create no mês filtrado faz prepend e incrementa o total", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ transactions: [], total: 0 }))
    const { result } = renderHook(() => useTransactions({ month: "2026-09" }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    fetchMock.mockResolvedValueOnce(jsonResponse(makeTx({ id: "novo" })))
    await act(async () => {
      await result.current.createTransaction(input)
    })

    expect(result.current.transactions).toHaveLength(1)
    expect(result.current.transactions[0].id).toBe("novo")
    expect(result.current.total).toBe(1)
  })

  it("create em outro mês não faz prepend nem incrementa o total", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ transactions: [], total: 0 }))
    const { result } = renderHook(() => useTransactions({ month: "2026-09" }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    fetchMock.mockResolvedValueOnce(
      jsonResponse(makeTx({ id: "fora", date: "2026-10-05T12:00:00.000Z" }))
    )
    await act(async () => {
      await result.current.createTransaction(input)
    })

    expect(result.current.transactions).toHaveLength(0)
    expect(result.current.total).toBe(0)
  })

  it("update no mesmo mês substitui a linha", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ transactions: [makeTx()], total: 1 }))
    const { result } = renderHook(() => useTransactions({ month: "2026-09" }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    fetchMock.mockResolvedValueOnce(jsonResponse(makeTx({ description: "Editada" })))
    await act(async () => {
      await result.current.updateTransaction("tx-1", input)
    })

    expect(result.current.transactions).toHaveLength(1)
    expect(result.current.transactions[0].description).toBe("Editada")
    expect(result.current.total).toBe(1)
  })

  it("update para mês diferente do filtro remove a linha e decrementa o total", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ transactions: [makeTx()], total: 1 }))
    const { result } = renderHook(() => useTransactions({ month: "2026-09" }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    fetchMock.mockResolvedValueOnce(
      jsonResponse(makeTx({ date: "2026-10-05T12:00:00.000Z" }))
    )
    await act(async () => {
      await result.current.updateTransaction("tx-1", input)
    })

    expect(result.current.transactions).toHaveLength(0)
    expect(result.current.total).toBe(0)
  })
})
