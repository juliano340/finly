"use client"

import { useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatCurrency } from "@/lib/utils"

interface DailySummaryPoint {
  day: number
  date: string
  total: number
  count: number
}

interface DailySummary {
  days: DailySummaryPoint[]
  total: number
  count: number
}

interface DailySpendingChartProps {
  month: string
  type?: "INCOME" | "EXPENSE"
  categoryId?: string
}

const compactCurrency = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export function DailySpendingChart({ month, type, categoryId }: DailySpendingChartProps) {
  const requestKey = `${month}|${type ?? ""}|${categoryId ?? ""}`
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const loading = loadedKey !== requestKey

  useEffect(() => {
    const params = new URLSearchParams({ month })
    if (type) params.set("type", type)
    if (categoryId) params.set("categoryId", categoryId)

    let active = true
    fetch(`/api/transactions/summary?${params}`)
      .then((res) => (res.ok ? res.json() : { days: [], total: 0, count: 0 }))
      .then((data: DailySummary) => {
        if (!active) return
        setSummary(data)
        setLoadedKey(requestKey)
      })
      .catch(() => {
        if (!active) return
        setSummary({ days: [], total: 0, count: 0 })
        setLoadedKey(requestKey)
      })

    return () => {
      active = false
    }
  }, [month, type, categoryId, requestKey])

  const isIncome = type === "INCOME"
  const barColor = isIncome ? "#0EA882" : "#E85D5D"

  return (
    <div className="hidden rounded-xl border bg-card p-4 md:block">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{isIncome ? "Receitas por dia" : "Compras por dia"}</h2>
          <p className="text-xs text-muted-foreground">
            {isIncome ? "Quanto entrou em cada dia do mês" : "Quanto saiu em cada dia do mês"}
          </p>
        </div>
        {summary && summary.count > 0 && (
          <p className="text-xs text-muted-foreground">
            {formatCurrency(summary.total)} · {summary.count}{" "}
            {summary.count === 1 ? "lançamento" : "lançamentos"}
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
          Carregando…
        </div>
      ) : summary && summary.count > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={summary.days}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis dataKey="day" className="text-xs" interval="preserveStartEnd" minTickGap={16} />
            <YAxis
              className="text-xs"
              width={56}
              tickFormatter={(value) => compactCurrency.format(Number(value ?? 0))}
            />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              labelFormatter={(day) => `Dia ${day}`}
              formatter={(value) => formatCurrency(Number(value ?? 0))}
            />
            <Bar
              dataKey="total"
              name={isIncome ? "Receitas" : "Compras"}
              fill={barColor}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
          Nenhuma transação neste mês
        </div>
      )}
    </div>
  )
}
