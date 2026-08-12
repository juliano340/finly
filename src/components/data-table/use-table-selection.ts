"use client"

import { useCallback, useMemo, useState } from "react"

export function useTableSelection<T extends { id: string }>(items: T[], amountSelector: (item: T) => number) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    const all = items.map((i) => i.id)
    const allSelected = all.length > 0 && all.every((id) => selectedIds.has(id))
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(all))
  }, [items, selectedIds])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id))

  const totalSelected = useMemo(
    () => items.filter((i) => selectedIds.has(i.id)).reduce((s, i) => s + amountSelector(i), 0),
    [items, selectedIds, amountSelector],
  )

  return {
    selectedIds,
    setSelectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    allSelected,
    totalSelected,
    confirmBatchDelete,
    setConfirmBatchDelete,
    batchDeleting,
    setBatchDeleting,
  }
}
