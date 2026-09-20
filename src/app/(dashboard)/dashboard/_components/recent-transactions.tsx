"use client"

import { ArrowDown, ArrowUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface RecentTransactionsProps {
  transactions: {
    id: string
    description: string | null
    amount: number
    type: "INCOME" | "EXPENSE"
    date: Date
    categoryName: string
    categoryColor: string
    bankAccountName: string | null
  }[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        Nenhuma transação neste mês
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg border p-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                tx.type === "INCOME" ? "bg-success/10" : "bg-destructive/10"
              }`}
            >
              {tx.type === "INCOME" ? (
                <ArrowUp className="h-4 w-4 text-success" />
              ) : (
                <ArrowDown className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {tx.description ?? (tx.type === "INCOME" ? "Receita" : "Despesa")}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className="text-xs"
                  style={{ backgroundColor: `${tx.categoryColor}20`, color: tx.categoryColor }}
                >
                  {tx.categoryName}
                </Badge>
                {tx.bankAccountName && (
                  <Badge variant="outline" className="text-xs">
                    {tx.bankAccountName}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs tabular-nums text-muted-foreground">
            {new Date(tx.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })}
          </p>
          <p
            className={`min-w-[92px] text-right text-sm font-semibold tabular-nums ${
              tx.type === "INCOME" ? "text-success" : "text-destructive"
            }`}
          >
            {tx.type === "INCOME" ? "+" : "-"}{" "}
            {tx.amount.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
        </div>
      ))}
    </div>
  )
}
