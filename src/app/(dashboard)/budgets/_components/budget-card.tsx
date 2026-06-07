"use client"

import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface BudgetCardProps {
  id: string
  amount: number
  spent: number
  remaining: number
  percentage: number
  categoryName: string
  categoryColor: string
  onEdit: () => void
  onDelete: () => void
}

export function BudgetCard({
  spent,
  remaining,
  percentage,
  categoryName,
  categoryColor,
  onEdit,
  onDelete,
}: BudgetCardProps) {
  const statusColor =
    percentage >= 100
      ? "text-red-500"
      : percentage >= 80
        ? "text-amber-500"
        : "text-emerald-500"

  const progressColor =
    percentage >= 100
      ? "bg-red-500"
      : percentage >= 80
        ? "bg-amber-500"
        : "bg-emerald-500"

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: categoryColor }}
            />
            <span className="font-medium">{categoryName}</span>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Gasto</span>
            <span className={`font-semibold ${statusColor}`}>
              {spent.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>

          <Progress value={Math.min(percentage, 100)} className="h-2">
            <div
              className={`h-full rounded-full transition-all ${progressColor}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </Progress>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{percentage}%</span>
            <span>
              {remaining >= 0
                ? `${remaining.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} restante`
                : `${Math.abs(remaining).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} acima`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
