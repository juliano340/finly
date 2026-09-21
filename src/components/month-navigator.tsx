"use client"

import { useEffect } from "react"
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

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.shiftKey) return
      if (event.defaultPrevented) return
      const target = event.target as HTMLElement
      if (target.closest("input, textarea, select, [contenteditable=true]")) return
      if (document.querySelector("[data-slot=dialog-content], [data-slot=sheet-content]")) return

      if (event.key === "ArrowLeft" && !previousDisabled) {
        event.preventDefault()
        onMonthChange(previous)
      } else if (event.key === "ArrowRight" && !nextDisabled) {
        event.preventDefault()
        onMonthChange(next)
      }
    }

    window.addEventListener("keydown", handleKeydown)
    return () => window.removeEventListener("keydown", handleKeydown)
  }, [previous, next, previousDisabled, nextDisabled, onMonthChange])

  return (
    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap" aria-label="Navegação entre meses">
      {month !== todayMonth && (
        <span className="whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {formatMonthDistance(month, todayMonth)}
        </span>
      )}
      <div className="w-14 shrink-0">
        <Button type="button" variant="ghost" size="sm" className="h-9 w-full" disabled={todayDisabled} onClick={() => onMonthChange(todayMonth)}>
          Hoje
        </Button>
      </div>
      <div className="flex h-11 items-center gap-1 rounded-lg border bg-background p-1">
        <Button type="button" variant="ghost" size="icon" className="size-9" aria-label="Mês anterior" aria-keyshortcuts="Control+ArrowLeft Meta+ArrowLeft" title="Mês anterior - Ctrl/Cmd+seta esquerda" disabled={previousDisabled} onClick={() => onMonthChange(previous)}>
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Button>
        {inputLabel ? (
          <input
            aria-label={inputLabel}
            className="h-9 min-w-36 bg-transparent px-2 text-center text-sm font-medium outline-none"
            type="month"
            min={minMonth}
            max={maxMonth}
            value={month}
            disabled={disabled}
            onChange={(event) => onMonthChange(event.target.value)}
          />
        ) : (
          <span className="min-w-0 px-2 text-center text-sm font-medium sm:min-w-36">{formatMonth(month)}</span>
        )}
        <Button type="button" variant="ghost" size="icon" className="size-9" aria-label="Próximo mês" aria-keyshortcuts="Control+ArrowRight Meta+ArrowRight" title="Próximo mês - Ctrl/Cmd+seta direita" disabled={nextDisabled} onClick={() => onMonthChange(next)}>
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  )
}
