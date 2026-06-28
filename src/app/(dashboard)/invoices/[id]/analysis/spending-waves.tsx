"use client"

import { useMemo, useState } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  ReferenceDot,
  Label,
} from "recharts"
import { formatCurrency } from "@/lib/utils"

type TxDetail = {
  date: string | Date | null
  amount: number
  description: string
  normalizedDesc: string
  categoryId: string | null
}
type Category = { id: string; name: string; color: string | null }

type ChartMode = "description" | "category"

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  const items = payload
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value)
  if (items.length === 0) return null
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-xs">
      <div className="font-medium mb-1">{label}</div>
      {items.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="flex-1">{p.dataKey}</span>
          <span className="font-medium">{formatCurrency(p.value)}</span>
        </div>
      ))}
      {items.length > 1 && (
        <div className="border-t mt-1 pt-1 flex justify-between font-medium">
          <span>Total do dia</span>
          <span>{formatCurrency(items.reduce((s, p) => s + p.value, 0))}</span>
        </div>
      )}
    </div>
  )
}

export function SpendingWaves({
  txs,
  categories,
}: {
  txs: TxDetail[]
  categories: Category[]
}) {
  const [mode, setMode] = useState<ChartMode>("category")
  const [topN, setTopN] = useState(10)

  const allDays = useMemo(() => {
    const daySet = new Set<string>()
    for (const t of txs) {
      if (!t.date) continue
      const d = new Date(t.date)
      daySet.add(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      )
    }
    return Array.from(daySet).sort()
  }, [txs])

  const dayLabels = useMemo(() => {
    const map = new Map<string, string>()
    for (const d of allDays) {
      const date = new Date(d + "T12:00:00")
      map.set(
        d,
        date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
      )
    }
    return map
  }, [allDays])

  const spendingByDesc = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    for (const tx of txs) {
      if (!tx.date) continue
      const d = new Date(tx.date)
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const key = tx.normalizedDesc
      if (!map.has(key)) map.set(key, new Map())
      const dateMap = map.get(key)!
      dateMap.set(dateKey, (dateMap.get(dateKey) ?? 0) + Math.abs(tx.amount))
    }
    return map
  }, [txs])

  const spendingByCategory = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    for (const tx of txs) {
      if (!tx.date) continue
      const d = new Date(tx.date)
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const cat = categories.find((c) => c.id === tx.categoryId)
      const key = cat?.name ?? "Sem categoria"
      if (!map.has(key)) map.set(key, new Map())
      const dateMap = map.get(key)!
      dateMap.set(dateKey, (dateMap.get(dateKey) ?? 0) + Math.abs(tx.amount))
    }
    return map
  }, [txs, categories])

  const { chartData, series, colorMap } = useMemo(() => {
    const spending = mode === "description" ? spendingByDesc : spendingByCategory

    const filtered = new Map<string, Map<string, number>>()
    for (const [key, dateMap] of spending) {
      if (dateMap.size >= 1) {
        filtered.set(key, dateMap)
      }
    }

    const sorted = Array.from(filtered.entries()).sort(
      (a, b) => b[1].size - a[1].size
    )

    const topSeries = sorted.slice(0, topN)
    const seriesKeys = topSeries.map(([key]) => key)
    const colors = [
      "#0EA882",
      "#FF9800",
      "#4CAF50",
      "#F44336",
      "#9C27B0",
      "#795548",
      "#607D8B",
      "#E91E63",
      "#00BCD4",
      "#FF5722",
      "#3F51B5",
      "#8BC34A",
      "#FFC107",
      "#009688",
      "#673AB7",
    ]
    const colorLookup = new Map<string, string>()
    seriesKeys.forEach((key, i) => {
      const cat = categories.find((c) => c.name === key)
      colorLookup.set(key, cat?.color ?? colors[i % colors.length])
    })

    const data = allDays.map((day) => {
      const row: Record<string, string | number> = {
        date: day,
        dateLabel: dayLabels.get(day) ?? day,
      }
      for (const key of seriesKeys) {
        row[key] = spending.get(key)?.get(day) ?? 0
      }
      return row
    })

    return {
      chartData: data,
      series: seriesKeys,
      colorMap: colorLookup,
    }
  }, [spendingByDesc, spendingByCategory, categories, mode, topN, allDays, dayLabels])

  const dailyAvg = useMemo(() => {
    if (chartData.length === 0 || series.length === 0) return 0
    let total = 0
    for (const row of chartData) {
      for (const key of series) {
        total += (row[key] as number) ?? 0
      }
    }
    return total / chartData.length
  }, [chartData, series])

  const peakDay = useMemo(() => {
    if (chartData.length === 0 || series.length === 0) return null
    let best = { dateLabel: "", total: 0 }
    for (const row of chartData) {
      let dayTotal = 0
      for (const key of series) {
        dayTotal += (row[key] as number) ?? 0
      }
      if (dayTotal > best.total) {
        best = { dateLabel: row.dateLabel as string, total: dayTotal }
      }
    }
    return best.total > 0 ? best : null
  }, [chartData, series])

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="flex gap-1">
          <button
            onClick={() => setMode("category")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              mode === "category"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Por Categoria
          </button>
          <button
            onClick={() => setMode("description")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              mode === "description"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Por Estabelecimento
          </button>
        </div>
        {mode === "description" && (
          <div className="flex items-center gap-1 ml-2">
            <span className="text-xs text-muted-foreground">Top:</span>
            {[5, 8, 10, 15].map((n) => (
              <button
                key={n}
                onClick={() => setTopN(n)}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  topN === n
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      <ResponsiveContainer
        width="100%"
        height={Math.max(300, series.length * 25 + 100)}
      >
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
        >
          <defs>
            {series.map((key) => (
              <linearGradient
                key={key}
                id={`grad-${key.replace(/\s/g, "")}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={colorMap.get(key) ?? "#999"}
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor={colorMap.get(key) ?? "#999"}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="dateLabel"
            fontSize={11}
            tick={{ fill: "#999" }}
            interval="preserveStartEnd"
          />
          <YAxis
            fontSize={11}
            tick={{ fill: "#999" }}
            tickFormatter={(v) => `R$ ${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          {dailyAvg > 0 && (
            <ReferenceLine
              y={dailyAvg}
              stroke="#e65100"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: `Média: ${formatCurrency(dailyAvg)}`,
                position: "insideTopRight",
                fill: "#e65100",
                fontSize: 11,
                fontWeight: "bold",
              }}
            />
          )}
          {peakDay && (
            <ReferenceLine
              y={peakDay.total}
              stroke="#F44336"
              strokeDasharray="8 4"
              strokeWidth={1.5}
              label={{
                value: `Máx: ${formatCurrency(peakDay.total)}`,
                position: "insideTopRight",
                fill: "#F44336",
                fontSize: 11,
                fontWeight: "bold",
              }}
            />
          )}
          {peakDay && (
            <ReferenceDot
              x={peakDay.dateLabel}
              y={peakDay.total}
              r={6}
              fill="#F44336"
              stroke="white"
              strokeWidth={2}
            >
              <Label
                value={`🔺 ${peakDay.dateLabel} — ${formatCurrency(peakDay.total)}`}
                position="top"
                offset={12}
                fill="#F44336"
                fontSize={11}
                fontWeight="bold"
              />
            </ReferenceDot>
          )}
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value: string) =>
              value.length > 22 ? value.slice(0, 19) + "..." : value
            }
          />
          {series.map((key) => (
            <Area
              key={key}
              type="basis"
              dataKey={key}
              stroke={colorMap.get(key) ?? "#999"}
              strokeWidth={1.5}
              fill={`url(#grad-${key.replace(/\s/g, "")})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
