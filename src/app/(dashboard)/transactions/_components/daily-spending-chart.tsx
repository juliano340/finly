"use client"

import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp, Wallet } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
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
  income: number
  expense: number
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

const dayLabel = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
})

function formatDayLabel(date: string) {
  return dayLabel.format(new Date(`${date}T00:00:00`))
}

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
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DailySummary | null) => {
        if (!active) return
        setSummary(data ?? { days: [], total: 0, count: 0, income: 0, expense: 0 })
        setLoadedKey(requestKey)
      })
      .catch(() => {
        if (!active) return
        setSummary({ days: [], total: 0, count: 0, income: 0, expense: 0 })
        setLoadedKey(requestKey)
      })

    return () => {
      active = false
    }
  }, [month, type, categoryId, requestKey])

  const isIncome = type === "INCOME"
  const barColor = isIncome ? "#0EA882" : "#E85D5D"
  const hasData = !!summary && summary.count > 0

  const maxDay =
    summary && hasData
      ? summary.days.reduce((best, point) => (point.total > best.total ? point : best), summary.days[0]).day
      : null
  const average = summary && hasData ? summary.total / summary.days.length : 0
  const lastDay = summary?.days.length ?? 0
  const ticks = lastDay > 0 ? Array.from(new Set([1, ...range(5, lastDay, 5), lastDay])).sort((a, b) => a - b) : []
  const result = summary ? summary.income - summary.expense : 0

  return (
    <>
      <div className="hidden gap-3 md:grid md:grid-cols-3">
        <SummaryCard
          icon={<ArrowUp className="h-4 w-4" />}
          tone="success"
          label="Receitas do mês"
          value={summary ? formatCurrency(summary.income) : ""}
          loading={loading}
        />
        <SummaryCard
          icon={<ArrowDown className="h-4 w-4" />}
          tone="destructive"
          label="Despesas do mês"
          value={summary ? formatCurrency(summary.expense) : ""}
          loading={loading}
        />
        <SummaryCard
          icon={<Wallet className="h-4 w-4" />}
          tone={result >= 0 ? "success" : "destructive"}
          label="Resultado do mês"
          value={summary ? formatCurrency(result) : ""}
          loading={loading}
        />
      </div>

      <div className="hidden rounded-xl border bg-card p-4 md:block">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">{isIncome ? "Receitas por dia" : "Compras por dia"}</h2>
            <p className="text-xs text-muted-foreground">
              {isIncome ? "Quanto entrou em cada dia do mês" : "Quanto saiu em cada dia do mês"}
            </p>
          </div>
          {hasData && summary && (
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.total)} · {summary.count}{" "}
              {summary.count === 1 ? "lançamento" : "lançamentos"}
            </p>
          )}
        </div>

        {loading ? (
          <div className="h-[140px] animate-pulse rounded-lg bg-muted" aria-hidden="true" />
        ) : hasData && summary ? (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={summary.days} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis
                dataKey="day"
                className="text-xs"
                ticks={ticks}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
              />
              <YAxis
                className="text-xs"
                width={52}
                tickFormatter={(value) => compactCurrency.format(Number(value ?? 0))}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                labelFormatter={(_label, payload) => {
                  const point = payload?.[0]?.payload as DailySummaryPoint | undefined
                  return point ? formatDayLabel(point.date) : ""
                }}
                formatter={(value, _name, item) => {
                  const point = (item as { payload?: DailySummaryPoint } | undefined)?.payload
                  const count = point?.count ?? 0
                  return [
                    `${formatCurrency(Number(value ?? 0))} · ${count} ${count === 1 ? "lançamento" : "lançamentos"}`,
                  ]
                }}
              />
              {average > 0 && (
                <ReferenceLine
                  y={average}
                  stroke="#94A3B8"
                  strokeDasharray="4 4"
                  label={{
                    value: `média ${compactCurrency.format(average)}`,
                    position: "insideTopRight",
                    className: "fill-muted-foreground text-[10px]",
                  }}
                />
              )}
              <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={22}>
                {summary.days.map((point) => (
                  <Cell
                    key={point.day}
                    fill={barColor}
                    fillOpacity={point.day === maxDay ? 1 : 0.35}
                  />
                ))}
                <LabelList
                  dataKey="total"
                  content={(props) => {
                    const { x, y, width, index } = props as unknown as {
                      x: number
                      y: number
                      width: number
                      index: number
                    }
                    const point = summary.days[index]
                    if (!point || point.day !== maxDay || point.total <= 0) return null
                    return (
                      <text
                        x={x + width / 2}
                        y={y - 5}
                        textAnchor="middle"
                        className="fill-muted-foreground text-[10px]"
                      >
                        {formatCurrency(point.total)}
                      </text>
                    )
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[140px] items-center justify-center text-sm text-muted-foreground">
            Nenhuma transação neste mês
          </div>
        )}
      </div>
    </>
  )
}

function SummaryCard({
  icon,
  tone,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode
  tone: "success" | "destructive"
  label: string
  value: string
  loading: boolean
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full ${
            tone === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          }`}
        >
          {icon}
        </span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p
        className={`mt-2 truncate text-sm font-bold ${
          tone === "success" ? "text-success" : "text-destructive"
        }`}
      >
        {loading ? (
          <span className="inline-block h-4 w-20 animate-pulse rounded bg-muted" aria-hidden="true" />
        ) : (
          value
        )}
      </p>
    </div>
  )
}

function range(start: number, end: number, step: number) {
  const values: number[] = []
  for (let value = start; value <= end; value += step) values.push(value)
  return values
}
