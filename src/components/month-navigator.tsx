"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { changeMonth, formatMonth, formatMonthDistance, getCurrentMonth } from "@/lib/months"

export { changeMonth, formatMonth, getCurrentMonth } from "@/lib/months"

interface MonthNavigatorProps {
  month: string
  onMonthChange: (month: string) => void
  minMonth?: string
  maxMonth?: string
  todayMonth?: string
  disabled?: boolean
  inputLabel?: string
}

export function MonthNavigator({
  month,
  onMonthChange,
  minMonth,
  maxMonth,
  todayMonth = getCurrentMonth(),
  disabled = false,
  inputLabel,
}: MonthNavigatorProps) {
  const previous = changeMonth(month, -1)
  const next = changeMonth(month, 1)
  const previousDisabled = disabled || (minMonth !== undefined && month <= minMonth)
  const nextDisabled = disabled || (maxMonth !== undefined && month >= maxMonth)
  const todayDisabled = disabled || month === todayMonth

  return (
    <div className="flex items-center gap-2" aria-label="Navegação entre meses">
      {month !== todayMonth && (
        <span className="whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {formatMonthDistance(month, todayMonth)}
        </span>
      )}
      <div className="w-14 shrink-0">
        <Button type="button" variant="ghost" size="sm" className="w-full" disabled={todayDisabled} onClick={() => onMonthChange(todayMonth)}>
          Hoje
        </Button>
      </div>
      <div className="flex h-10 items-center gap-1 rounded-lg border bg-background p-1">
        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Mês anterior" disabled={previousDisabled} onClick={() => onMonthChange(previous)}>
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Button>
        {inputLabel ? (
          <input
            aria-label={inputLabel}
            className="h-8 min-w-36 bg-transparent px-2 text-center text-sm font-medium outline-none"
            type="month"
            min={minMonth}
            max={maxMonth}
            value={month}
            disabled={disabled}
            onChange={(event) => onMonthChange(event.target.value)}
          />
        ) : (
          <span className="min-w-36 px-2 text-center text-sm font-medium">{formatMonth(month)}</span>
        )}
        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Próximo mês" disabled={nextDisabled} onClick={() => onMonthChange(next)}>
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  )
}
