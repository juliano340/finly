"use client"

import { Loader2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { TransactionWithRelations } from "@/features/transactions/transactions.types"

interface TransactionTableProps {
  transactions: TransactionWithRelations[]
  loading: boolean
  total: number
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onEdit: (transaction: TransactionWithRelations) => void
}

function CategoryIcon({ icon }: { icon: string }) {
  const icons: Record<string, string> = {
    utensils: "🍽️",
    car: "🚗",
    home: "",
    gamepad: "🎮",
    heart: "❤️",
    book: "",
    repeat: "🔄",
    "shopping-bag": "🛍️",
    briefcase: "💼",
    laptop: "💻",
  }
  return <>{icons[icon] ?? "📌"}</>
}

export function TransactionTable({
  transactions,
  loading,
  total,
  page,
  totalPages,
  onPageChange,
  onEdit,
}: TransactionTableProps) {
  const isEmpty = !loading && transactions.length === 0

  return (
    <div className="hidden overflow-hidden rounded-lg border md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoria</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descrição</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Tipo</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody>
          {loading && !isEmpty ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="border-b">
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </td>
                ))}
              </tr>
            ))
          ) : isEmpty ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </span>
                ) : (
                  "Nenhuma transação encontrada."
                )}
              </td>
            </tr>
          ) : (
            transactions.map((tx, index) => {
              const isIncome = tx.type === "INCOME"
              return (
                <tr
                  key={tx.id}
                  className={`border-b transition-colors hover:bg-muted/50 ${index === transactions.length - 1 ? "border-b-0" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                        style={{ backgroundColor: `${tx.category.color}15` }}
                      >
                        <CategoryIcon icon={tx.category.icon} />
                      </div>
                      <span className="font-medium">{tx.category.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-64">
                    <span className="block truncate">{tx.description ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${isIncome ? "text-emerald-500" : "text-red-500"}`}>
                      {isIncome ? "+ " : "- "}
                      {formatCurrency(tx.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant="secondary"
                      className={`text-[11px] ${isIncome ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}
                    >
                      {isIncome ? "Receita" : "Despesa"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Editar transação"
                      onClick={() => onEdit(tx)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
        {totalPages > 1 && (
          <tfoot>
            <tr>
              <td colSpan={6} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {total} {total === 1 ? "item" : "itens"} · Página {page} de {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => onPageChange(page - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => onPageChange(page + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
