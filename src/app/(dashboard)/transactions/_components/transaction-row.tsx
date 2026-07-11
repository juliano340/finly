"use client"

import { CalendarDays, EllipsisVertical, Landmark, Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import type { TransactionWithRelations } from "@/features/transactions/transactions.types"

interface TransactionRowProps {
  transaction: TransactionWithRelations
  onEdit: () => void
  onDelete: () => void
}

export function TransactionRow({ transaction, onEdit, onDelete }: TransactionRowProps) {
  const isIncome = transaction.type === "INCOME"

  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isIncome ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
          {isIncome ? "+" : "-"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{transaction.description ?? transaction.category.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`text-sm font-bold tabular-nums ${isIncome ? "text-success" : "text-destructive"}`}>
              {isIncome ? "+" : "-"} {formatCurrency(transaction.amount)}
            </span>
            <Badge
              variant="secondary"
              className={`h-5 text-[10px] ${isIncome ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
            >
              {isIncome ? "Receita" : "Despesa"}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2 py-1">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: transaction.category.color }} />
              <span className="truncate">{transaction.category.name}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(transaction.date)}
            </span>
            {transaction.bankAccount && (
              <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2 py-1">
                <Landmark className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{transaction.bankAccount.name}</span>
              </span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            aria-label="Ações da transação"
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "h-8 w-8 shrink-0 cursor-pointer rounded-full")}
          >
            <EllipsisVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem className="cursor-pointer" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" className="cursor-pointer" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
