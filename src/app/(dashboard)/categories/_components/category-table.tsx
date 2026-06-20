"use client"

import { Loader2, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CategoryWithCount } from "@/features/categories/categories.types"

interface CategoryTableProps {
  categories: CategoryWithCount[]
  loading: boolean
  onEdit: (category: CategoryWithCount) => void
  onDelete: (category: CategoryWithCount) => void
}

const iconMap: Record<string, string> = {
  utensils: "🍽️",
  car: "🚗",
  home: "🏠",
  gamepad: "🎮",
  heart: "❤️",
  book: "📚",
  repeat: "🔄",
  "shopping-bag": "🛍️",
  briefcase: "💼",
  laptop: "💻",
  wallet: "💳",
}

export function CategoryTable({
  categories,
  loading,
  onEdit,
  onDelete,
}: CategoryTableProps) {
  const isEmpty = !loading && categories.length === 0

  return (
    <div className="hidden overflow-hidden rounded-lg border md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Tipo</th>
            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Transações</th>
            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Orçamentos</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody>
          {loading && !isEmpty ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="border-b">
                {Array.from({ length: 5 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </td>
                ))}
              </tr>
            ))
          ) : isEmpty ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </span>
                ) : (
                  "Nenhuma categoria encontrada."
                )}
              </td>
            </tr>
          ) : (
            categories.map((cat, index) => {
              const isIncome = cat.type === "INCOME"
              const emoji = iconMap[cat.icon] ?? "📌"
              return (
                <tr
                  key={cat.id}
                  className={`border-b transition-colors hover:bg-muted/50 ${index === categories.length - 1 ? "border-b-0" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                        style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                      >
                        {emoji}
                      </div>
                      <span className="font-medium">{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        isIncome
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-red-500/10 text-red-600"
                      }`}
                    >
                      {isIncome ? "Receita" : "Despesa"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {cat._count?.transactions ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {cat._count?.budgets ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Editar categoria"
                        onClick={() => onEdit(cat)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Excluir categoria"
                        onClick={() => onDelete(cat)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
