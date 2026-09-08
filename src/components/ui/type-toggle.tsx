"use client"

import { ArrowDown, ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

type TransactionType = "EXPENSE" | "INCOME"

interface TypeToggleProps {
  value: TransactionType
  onChange: (type: TransactionType) => void
  disabled?: boolean
  className?: string
}

const options = [
  {
    value: "EXPENSE" as const,
    label: "Despesa",
    icon: ArrowDown,
    activeClass: "bg-destructive/10 text-destructive border-destructive/30",
    iconClass: "text-destructive",
  },
  {
    value: "INCOME" as const,
    label: "Receita",
    icon: ArrowUp,
    activeClass: "bg-success/10 text-success border-success/30",
    iconClass: "text-success",
  },
] as const

export function TypeToggle({ value, onChange, disabled, className }: TypeToggleProps) {
  return (
    <div
      className={cn("flex gap-2", className)}
      role="radiogroup"
      aria-label="Tipo de transação"
    >
      {options.map((option) => {
        const isActive = value === option.value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              isActive
                ? option.activeClass
                : "border-border/60 bg-muted/50 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            <Icon className={cn("h-4 w-4", isActive && option.iconClass)} />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
