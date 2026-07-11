"use client"

import {
  BookOpen,
  BriefcaseBusiness,
  Car,
  CreditCard,
  Gamepad2,
  Heart,
  House,
  Laptop,
  Pencil,
  Pin,
  Repeat,
  Settings,
  ShoppingBag,
  Utensils,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { CategoryWithCount } from "@/features/categories/categories.types"

interface CategoryCardProps {
  category: CategoryWithCount
  onEdit: () => void
}

const iconMap: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  home: House,
  gamepad: Gamepad2,
  heart: Heart,
  book: BookOpen,
  repeat: Repeat,
  "shopping-bag": ShoppingBag,
  briefcase: BriefcaseBusiness,
  laptop: Laptop,
  wallet: CreditCard,
}

export function CategoryCard({ category, onEdit }: CategoryCardProps) {
  const Icon = iconMap[category.icon] ?? Pin
  const transactionCount = category._count?.transactions ?? 0
  const budgetCount = category._count?.budgets ?? 0

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-3 py-3 shadow-sm transition-shadow hover:shadow-md">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${category.color}15`, color: category.color }}
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{category.name}</p>
          <Badge
            variant="secondary"
            className={`h-5 shrink-0 text-[10px] ${
              category.type === "INCOME"
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {category.type === "INCOME" ? "Receita" : "Despesa"}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {transactionCount} transaç{transactionCount === 1 ? "ão" : "ões"}
          {budgetCount > 0 && ` · ${budgetCount} orçamento${budgetCount > 1 ? "s" : ""}`}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onEdit}
        className="shrink-0 cursor-pointer rounded-full text-muted-foreground"
        aria-label={`Editar categoria ${category.name}`}
      >
        <Pencil className="h-4 w-4 md:hidden" />
        <Settings className="hidden h-4 w-4 md:block" />
      </Button>
    </div>
  )
}
