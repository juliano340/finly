"use client"

import { useState, useMemo } from "react"
import { formatCurrency } from "@/lib/utils"

type TxDetail = {
  date: string | Date | null
  amount: number
  description: string
}
type Category = { id: string; name: string; color: string | null }

type RankingItem = {
  description: string
  count: number
  total: number
  originals: string[]
  txs: TxDetail[]
  categoryId: string | null
}

type SortKey = "description" | "count" | "total" | "ticketMedio" | "category"
type SortDir = "asc" | "desc"

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-muted-foreground">⇅</span>
  return <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>
}

export function RankingTable({
  data,
  categories,
}: {
  data: RankingItem[]
  categories: Category[]
}) {
  const [sorts, setSorts] = useState<{ key: SortKey; dir: SortDir }[]>([
    { key: "total", dir: "desc" },
  ])
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  const handleSort = (key: SortKey, e: React.MouseEvent) => {
    setSorts((prev) => {
      const existing = prev.find((s) => s.key === key)
      if (e.shiftKey) {
        if (existing) {
          return prev.map((s) =>
            s.key === key
              ? { ...s, dir: s.dir === "asc" ? "desc" : "asc" }
              : s
          )
        }
        return [...prev, { key, dir: "desc" }]
      }
      if (existing && prev.length === 1) {
        return [{ key, dir: existing.dir === "asc" ? "desc" : "asc" }]
      }
      return [{ key, dir: "desc" }]
    })
  }

  const sorted = useMemo(() => {
    let items = [...data]
    if (filterCategory === "__none__") {
      items = items.filter((r) => !r.categoryId)
    } else if (filterCategory) {
      items = items.filter((r) => r.categoryId === filterCategory)
    }
    items.sort((a, b) => {
      for (const { key, dir } of sorts) {
        let cmp = 0
        switch (key) {
          case "description":
            cmp = a.description.localeCompare(b.description)
            break
          case "count":
            cmp = a.count - b.count
            break
          case "total":
            cmp = a.total - b.total
            break
          case "ticketMedio":
            cmp = a.total / a.count - b.total / b.count
            break
          case "category": {
            const catA = a.categoryId
              ? categories.find((c) => c.id === a.categoryId)?.name ?? ""
              : "ZZZ"
            const catB = b.categoryId
              ? categories.find((c) => c.id === b.categoryId)?.name ?? ""
              : "ZZZ"
            cmp = catA.localeCompare(catB)
            break
          }
        }
        if (cmp !== 0) return dir === "asc" ? cmp : -cmp
      }
      return 0
    })
    return items
  }, [data, sorts, categories, filterCategory])

  const usedCategoryIds = useMemo(() => {
    const ids = new Set(data.map((r) => r.categoryId).filter(Boolean))
    return Array.from(ids)
  }, [data])

  const usedCategories = categories.filter((c) =>
    usedCategoryIds.includes(c.id)
  )
  const uncategorizedCount = data.filter((r) => !r.categoryId).length

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3 items-center">
        <span className="text-xs text-muted-foreground mr-1">Filtrar:</span>
        <button
          onClick={() => setFilterCategory(null)}
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            filterCategory === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Todos ({data.length})
        </button>
        {usedCategories.map((c) => (
          <button
            key={c.id}
            onClick={() =>
              setFilterCategory(filterCategory === c.id ? null : c.id)
            }
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              filterCategory === c.id
                ? "text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
            style={
              filterCategory === c.id
                ? { backgroundColor: c.color ?? "#999" }
                : undefined
            }
          >
            <span
              className="h-2 w-2 rounded-full mr-1.5"
              style={{
                backgroundColor:
                  filterCategory === c.id ? "white" : (c.color ?? "#999"),
              }}
            />
            {c.name}
          </button>
        ))}
        {uncategorizedCount > 0 && (
          <button
            onClick={() =>
              setFilterCategory(
                filterCategory === "__none__" ? null : "__none__"
              )
            }
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              filterCategory === "__none__"
                ? "bg-amber-500 text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            ⚠ Sem categoria ({uncategorizedCount})
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-3 py-3 text-center font-medium text-muted-foreground">
                #
              </th>
              <th
                className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={(e) => handleSort("description", e)}
              >
                Descrição
                <SortIndicator
                  active={sorts.some((s) => s.key === "description")}
                  dir={
                    sorts.find((s) => s.key === "description")?.dir ?? "desc"
                  }
                />
              </th>
              <th
                className="px-4 py-3 text-center font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={(e) => handleSort("count", e)}
              >
                Qtd
                <SortIndicator
                  active={sorts.some((s) => s.key === "count")}
                  dir={sorts.find((s) => s.key === "count")?.dir ?? "desc"}
                />
              </th>
              <th
                className="px-4 py-3 text-right font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={(e) => handleSort("total", e)}
              >
                Total
                <SortIndicator
                  active={sorts.some((s) => s.key === "total")}
                  dir={sorts.find((s) => s.key === "total")?.dir ?? "desc"}
                />
              </th>
              <th
                className="px-4 py-3 text-right font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={(e) => handleSort("ticketMedio", e)}
              >
                Ticket Médio
                <SortIndicator
                  active={sorts.some((s) => s.key === "ticketMedio")}
                  dir={
                    sorts.find((s) => s.key === "ticketMedio")?.dir ?? "desc"
                  }
                />
              </th>
              <th
                className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={(e) => handleSort("category", e)}
              >
                Categoria
                <SortIndicator
                  active={sorts.some((s) => s.key === "category")}
                  dir={
                    sorts.find((s) => s.key === "category")?.dir ?? "desc"
                  }
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const isGrouped = r.originals.length > 1
              const cat = r.categoryId
                ? categories.find((c) => c.id === r.categoryId)
                : null
              const uncategorized = !r.categoryId
              return (
                <tr
                  key={r.description}
                  className={`border-b ${
                    uncategorized
                      ? "bg-amber-500/5"
                      : isGrouped
                        ? "bg-muted/30"
                        : ""
                  }`}
                >
                  <td className="px-3 py-3 text-center text-muted-foreground">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3">
                    {isGrouped && (
                      <span
                        title={r.originals.join(" ≈ ")}
                        className="inline-block bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded mr-2 cursor-help font-bold"
                      >
                        ≈
                      </span>
                    )}
                    {r.description}
                  </td>
                  <td className="px-4 py-3 text-center">{r.count}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(r.total)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatCurrency(r.total / r.count)}
                  </td>
                  <td className="px-4 py-3">
                    {cat ? (
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: cat.color ?? "#999" }}
                        />
                        {cat.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
