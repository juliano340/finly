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
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                tx.type === "INCOME" ? "bg-emerald-50" : "bg-red-50"
              }`}
            >
              {tx.type === "INCOME" ? (
                <ArrowUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <ArrowDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">
                {tx.description ?? (tx.type === "INCOME" ? "Receita" : "Despesa")}
              </p>
              <Badge
                variant="secondary"
                className="mt-0.5 text-xs"
                style={{ backgroundColor: `${tx.categoryColor}20`, color: tx.categoryColor }}
              >
                {tx.categoryName}
              </Badge>
            </div>
          </div>
          <p
            className={`text-sm font-semibold ${
              tx.type === "INCOME" ? "text-emerald-500" : "text-red-500"
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
