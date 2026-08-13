"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export interface UseTableSelectionOptions {
  storageKey?: string
}

function readStoredSelection(key: string | undefined, items: { id: string }[]) {
  if (!key) return new Set<string>()
  try {
    const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(key) : null
    const stored = raw ? (JSON.parse(raw) as string[]) : []
    const validIds = new Set(items.map((i) => i.id))
    return new Set<string>(stored.filter((id) => validIds.has(id)))
  } catch {
    return new Set<string>()
  }
}

function writeStoredSelection(key: string | undefined, ids: Set<string>) {
  if (!key || typeof window === "undefined") return
  try {
    if (ids.size > 0) window.sessionStorage.setItem(key, JSON.stringify([...ids]))
    else window.sessionStorage.removeItem(key)
  } catch {
    // ignore quota/availability errors
  }
}

export function useTableSelection<T extends { id: string }>(
  items: T[],
  amountSelector: (item: T) => number,
  options?: UseTableSelectionOptions,
) {
  const storageKey = options?.storageKey
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => readStoredSelection(storageKey, items))
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)

  const hydratedKeyRef = useRef<string | undefined>(storageKey)
  const itemsLoadedRef = useRef(false)
  const isHydratedRef = useRef(!storageKey)

  useEffect(() => {
    // Re-hidrata quando a chave muda (troca de mês/tab): reseta state do storage.
    if (hydratedKeyRef.current !== storageKey) {
      hydratedKeyRef.current = storageKey
      itemsLoadedRef.current = false
      isHydratedRef.current = false
      // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
      setSelectedIds(readStoredSelection(storageKey, items))
      if (storageKey && items.length > 0) isHydratedRef.current = true
    }
  }, [storageKey])

  useEffect(() => {
    // Quando items chega (após fetch), re-hidrata se ainda não o fizemos para esta chave.
    // Necessário pq no mount items=[] então readStoredSelection filtra tudo.
    if (!itemsLoadedRef.current && items.length > 0) {
      const restored = readStoredSelection(storageKey, items)
      itemsLoadedRef.current = true
      isHydratedRef.current = true
      // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
      setSelectedIds(restored)
    }
  }, [items.length, storageKey])

  useEffect(() => {
    // Só persiste depois de hidratar; antes disso selectedIds é vazio e não deve
    // sobrescrever o storage preexistente.
    if (!isHydratedRef.current) return
    writeStoredSelection(storageKey, selectedIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds])

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
