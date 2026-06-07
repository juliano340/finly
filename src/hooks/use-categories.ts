"use client"

import { useState, useCallback, useEffect } from "react"
import type { CategoryWithCount } from "@/features/categories/categories.types"
import type { CategoryInput } from "@/features/categories/categories.schema"

export function useCategories() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/categories")
    if (res.ok) {
      setCategories(await res.json())
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const createCategory = useCallback(
    async (input: CategoryInput) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (res.ok) {
        const created = await res.json()
        setCategories((prev) => [...prev, created])
        return created
      }
      const err = await res.json()
      throw new Error(err.error ?? "Erro ao criar categoria")
    },
    []
  )

  const updateCategory = useCallback(
    async (id: string, input: Partial<CategoryInput>) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (res.ok) {
        const updated = await res.json()
        setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)))
        return updated
      }
      const err = await res.json()
      throw new Error(err.error ?? "Erro ao atualizar categoria")
    },
    []
  )

  const deleteCategory = useCallback(async (id: string) => {
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" })
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== id))
      return
    }
    const err = await res.json()
    throw new Error(err.error ?? "Erro ao remover categoria")
  }, [])

  return {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch: fetchCategories,
  }
}
