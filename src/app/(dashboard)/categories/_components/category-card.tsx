"use client"

import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { CategoryWithCount } from "@/features/categories/categories.types"

interface CategoryCardProps {
  category: CategoryWithCount
  onEdit: () => void
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

export function CategoryCard({ category, onEdit }: CategoryCardProps) {
  const emoji = iconMap[category.icon] ?? "📌"

  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl text-xl"
        style={{ backgroundColor: `${category.color}15`, color: category.color }}
      >
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{category.name}</p>
          <Badge
            variant="secondary"
            className={`text-[10px] ${
              category.type === "INCOME"
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {category.type === "INCOME" ? "Receita" : "Despesa"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {category._count?.transactions ?? 0} transações
          {(category._count?.budgets ?? 0) > 0 &&
            ` · ${category._count.budgets} orçamento${category._count.budgets > 1 ? "s" : ""}`}
        </p>
      </div>
      <Button variant="ghost" size="icon" onClick={onEdit}>
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  )
}
