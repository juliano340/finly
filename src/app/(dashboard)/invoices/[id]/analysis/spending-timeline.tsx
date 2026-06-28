"use client"

import { useMemo } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { formatCurrency } from "@/lib/utils"

type TxDetail = { date: string | Date | null; amount: number }

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { dateLabel: string; daily: number; cumulative: number } }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <div className="font-medium">{d.dateLabel}</div>
      <div className="text-sm text-muted-foreground">
        Gasto do dia: {formatCurrency(d.daily)}
      </div>
      <div className="text-sm text-muted-foreground">
        Acumulado: {formatCurrency(d.cumulative)}
      </div>
    </div>
  )
}

export function SpendingTimeline({ txs }: { txs: TxDetail[] }) {
  const chartData = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const tx of txs) {
      if (!tx.date) continue
      const d = new Date(tx.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      byDate.set(key, (byDate.get(key) ?? 0) + Math.abs(tx.amount))
    }

    const sorted = Array.from(byDate.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    )
    return sorted.reduce<{ date: string; dateLabel: string; daily: number; cumulative: number }[]>(
      (acc, [dateStr, daily]) => {
        const prev = acc.length > 0 ? acc[acc.length - 1].cumulative : 0
        const d = new Date(dateStr + "T12:00:00")
        acc.push({
          date: dateStr,
          dateLabel: d.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          }),
          daily,
          cumulative: prev + daily,
        })
        return acc
      },
      []
    )
  }, [txs])

  if (chartData.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0EA882" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#0EA882" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FF9800" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#FF9800" stopOpacity={0} />
          </linearGradient>
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
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke="#0EA882"
          strokeWidth={2}
          fill="url(#colorCumulative)"
          name="Acumulado"
        />
        <Area
          type="monotone"
          dataKey="daily"
          stroke="#FF9800"
          strokeWidth={1.5}
          fill="url(#colorDaily)"
          name="Diário"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
