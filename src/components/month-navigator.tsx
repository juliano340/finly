"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MonthNavigatorProps {
  month: string
  onMonthChange: (month: string) => void
  minMonth?: string
  maxMonth?: string
  todayMonth?: string
  disabled?: boolean
  inputLabel?: string
}

export function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export function changeMonth(month: string, amount: -1 | 1) {
  const [year, monthNumber] = month.split("-").map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

export function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number)
  return new Date(Number(year), monthNumber - 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  })
}

function formatMonthDistance(month: string, todayMonth: string) {
  const [year, monthNumber] = month.split("-").map(Number)
  const [todayYear, todayMonthNumber] = todayMonth.split("-").map(Number)
  const distance = (year - todayYear) * 12 + monthNumber - todayMonthNumber
  const absoluteDistance = Math.abs(distance)

  if (absoluteDistance === 1) return distance < 0 ? "mês anterior" : "próximo mês"
  return distance < 0 ? `${absoluteDistance} meses atrás` : `em ${absoluteDistance} meses`
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
          <span className="min-w-36 px-2 text-center text-sm font-medium capitalize">{formatMonth(month)}</span>
        )}
        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Próximo mês" disabled={nextDisabled} onClick={() => onMonthChange(next)}>
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  )
}
