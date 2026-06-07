"use client"

import { useState, useCallback, useEffect } from "react"
import type { TransactionWithRelations } from "@/features/transactions/transactions.types"
import type { TransactionInput } from "@/features/transactions/transactions.schema"

export function useTransactions() {
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<{
    type?: "INCOME" | "EXPENSE"
    categoryId?: string
    month?: string
  }>({})

  const limit = 20

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined)
      ),
    })
    const res = await fetch(`/api/transactions?${params}`)
    if (res.ok) {
      const data = await res.json()
      setTransactions(data.transactions)
      setTotal(data.total)
    }
    setLoading(false)
  }, [page, filters])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const createTransaction = useCallback(
    async (input: TransactionInput) => {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (res.ok) {
        const created = await res.json()
        setTransactions((prev) => [created, ...prev])
        setTotal((t) => t + 1)
        return created
      }
      const err = await res.json()
      throw new Error(err.error ?? "Erro ao criar transação")
    },
    []
  )

  const updateTransaction = useCallback(
    async (id: string, input: Partial<TransactionInput>) => {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (res.ok) {
        const updated = await res.json()
        setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)))
        return updated
      }
      const err = await res.json()
      throw new Error(err.error ?? "Erro ao atualizar transação")
    },
    []
  )

  const deleteTransaction = useCallback(async (id: string) => {
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" })
    if (res.ok) {
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      setTotal((t) => t - 1)
    } else {
      const err = await res.json()
      throw new Error(err.error ?? "Erro ao remover transação")
    }
  }, [])

  return {
    transactions,
    total,
    loading,
    page,
    setPage,
    filters,
    setFilters,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
  }
}
