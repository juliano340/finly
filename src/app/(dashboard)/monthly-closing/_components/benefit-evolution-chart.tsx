"use client"

import { useState } from "react"
import {
  ComposedChart,
  Bar,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { formatCurrency } from "@/lib/utils"
import type { BenefitEvolution, BenefitEvolutionPoint } from "@/features/monthly-closing/benefit-evolution"

function formatDayMonth(date: string) {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`
}

function BenefitTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: BenefitEvolutionPoint }> }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <div className="font-medium">{formatDayMonth(point.date)}</div>
      <div className="text-sm text-muted-foreground">Gasto do dia: {formatCurrency(point.daily)}</div>
      <div className="text-sm text-muted-foreground">Saldo: {formatCurrency(point.balance)}</div>
      {point.items.length > 0 && (
        <div className="mt-1 space-y-0.5 border-t pt-1">
          {point.items.map((item, index) => (
            <div key={`${item.description}-${index}`} className="text-xs text-muted-foreground">
              • {item.description} — {formatCurrency(item.amount)}
            </div>
          ))}
          {point.itemsTotal > point.items.length && (
            <div className="text-xs text-muted-foreground">… +{point.itemsTotal - point.items.length}</div>
          )}
        </div>
      )}
    </div>
  )
}

function niceMax(value: number): number {
  if (value <= 5) return Math.max(Math.ceil(value), 1)
  if (value <= 50) return Math.ceil(value / 5) * 5
  return Math.ceil(value / 10) * 10
}

export function BenefitEvolutionChart({ evolution }: { evolution: BenefitEvolution }) {
  const [view, setView] = useState<"movements" | "month">("movements")

  if (evolution.points.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Nenhuma conta de benefício cadastrada.
      </div>
    )
  }

  if (evolution.credited === 0 && evolution.spent === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Sem movimentações de benefício no período.
      </div>
    )
  }

  const movementIndex = evolution.movementEnd
    ? evolution.points.findIndex((point) => point.date === evolution.movementEnd)
    : -1
  const hasTail = movementIndex >= 0 && movementIndex < evolution.points.length - 1
  const visiblePoints = view === "movements" && hasTail ? evolution.points.slice(0, movementIndex + 1) : evolution.points
  const balanceMax = niceMax(Math.max(...visiblePoints.map((point) => point.balance), 0))
  const spendMax = niceMax(Math.max(...visiblePoints.map((point) => point.daily), evolution.averageDaily, 0) * 1.3)

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        {hasTail && (
          <SegmentedControl
            options={[
              { value: "movements", label: "Último movimento" },
              { value: "month", label: "Fim do mês" },
            ]}
            value={view}
            onValueChange={setView}
            aria-label="Período do gráfico"
            className="w-full sm:w-80"
          />
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#FF9800]" />
            Gasto do dia
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#0F766E]" />
            Saldo
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={visiblePoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" fontSize={11} tick={{ fill: "#999" }} interval="preserveStartEnd" tickFormatter={formatDayMonth} />
          <YAxis
            yAxisId="balance"
            orientation="left"
            domain={[0, balanceMax]}
            fontSize={11}
            tick={{ fill: "#999" }}
            tickFormatter={(value) => `R$ ${value}`}
            label={{ value: "saldo", angle: -90, position: "insideLeft", fill: "#999", fontSize: 10 }}
          />
          <YAxis
            yAxisId="spend"
            orientation="right"
            domain={[0, spendMax]}
            fontSize={11}
            tick={{ fill: "#999" }}
            tickFormatter={(value) => `R$ ${value}`}
            label={{ value: "gasto/dia", angle: 90, position: "insideRight", fill: "#999", fontSize: 10 }}
          />
          <Tooltip content={<BenefitTooltip />} />
          <Bar yAxisId="spend" dataKey="daily" fill="#FF9800" fillOpacity={0.85} name="Gasto do dia" radius={[2, 2, 0, 0]} />
          <Line yAxisId="balance" type="monotone" dataKey="balance" stroke="#0F766E" strokeWidth={2} dot={false} name="Saldo" />
          <ReferenceLine
            yAxisId="spend"
            y={evolution.averageDaily}
            stroke="#0F766E"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            label={{ value: "média/dia", position: "insideTopRight", fill: "#999", fontSize: 10 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
