"use client"

import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { TransactionWithRelations } from "@/features/transactions/transactions.types"

interface TransactionRowProps {
  transaction: TransactionWithRelations
  onEdit: () => void
  onDelete: () => void
}

export function TransactionRow({ transaction, onEdit, onDelete }: TransactionRowProps) {
  const isIncome = transaction.type === "INCOME"

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
          style={{
            backgroundColor: `${transaction.category.color}15`,
          }}
        >
          {transaction.category.icon === "utensils" && "🍽️"}
          {transaction.category.icon === "car" && "🚗"}
          {transaction.category.icon === "home" && ""}
          {transaction.category.icon === "gamepad" && "🎮"}
          {transaction.category.icon === "heart" && "❤️"}
          {transaction.category.icon === "book" && ""}
          {transaction.category.icon === "repeat" && "🔄"}
          {transaction.category.icon === "shopping-bag" && "🛍️"}
          {transaction.category.icon === "briefcase" && "💼"}
          {transaction.category.icon === "laptop" && "💻"}
          {!["utensils","car","home","gamepad","heart","book","repeat","shopping-bag","briefcase","laptop"].includes(transaction.category.icon) && "📌"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium truncate">
              {transaction.description ?? transaction.category.name}
            </p>
            <span className={`shrink-0 text-sm font-semibold ${isIncome ? "text-emerald-500" : "text-red-500"}`}>
              {isIncome ? "+" : "-"} {formatCurrency(transaction.amount)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {transaction.category.name} · {formatDate(transaction.date)}
            {transaction.bankAccount && (
              <> · <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: transaction.bankAccount.color }} />{transaction.bankAccount.name}</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  )
}
