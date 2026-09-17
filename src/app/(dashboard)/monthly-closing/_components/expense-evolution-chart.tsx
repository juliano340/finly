"use client"

import { useState } from "react"
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { formatCurrency } from "@/lib/utils"
import type { ExpenseEvolution, ExpenseEvolutionPoint } from "@/features/monthly-closing/expense-evolution"

interface ExpenseEvolutionChartProps {
  evolution: ExpenseEvolution
}

function formatDayMonth(date: string) {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`
}

function EvolutionTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ExpenseEvolutionPoint }> }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <div className="font-medium">{formatDayMonth(point.date)}</div>
      <div className="text-sm text-muted-foreground">No dia: {formatCurrency(point.daily)}</div>
      <div className="text-sm text-muted-foreground">Acumulado: {formatCurrency(point.cumulative)}</div>
      {point.benefitBalance !== null && (
        <div className="text-sm text-muted-foreground">Saldo do benefício: {formatCurrency(point.benefitBalance)}</div>
      )}
    </div>
  )
}

export function ExpenseEvolutionChart({ evolution }: ExpenseEvolutionChartProps) {
  const [mode, setMode] = useState<"cumulative" | "daily">("cumulative")

  if (evolution.points.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Nenhuma despesa está formando este fechamento.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          options={[
            { value: "cumulative", label: "Acumulado" },
            { value: "daily", label: "Por dia" },
          ]}
          value={mode}
          onValueChange={setMode}
          aria-label="Modo do gráfico"
          className="w-full sm:w-64"
        />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#0EA882]" />
            Gastos
          </span>
          {evolution.hasBenefit && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#FF9800]" />
              Saldo do benefício
            </span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={evolution.points} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillExpenseEvolution" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0EA882" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0EA882" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" fontSize={11} tick={{ fill: "#999" }} interval="preserveStartEnd" tickFormatter={formatDayMonth} />
          <YAxis fontSize={11} tick={{ fill: "#999" }} tickFormatter={(value) => `R$ ${value}`} />
          <Tooltip content={<EvolutionTooltip />} />
          <Area
            type="monotone"
            dataKey={mode === "cumulative" ? "cumulative" : "daily"}
            stroke="#0EA882"
            strokeWidth={2}
            fill="url(#fillExpenseEvolution)"
            name="Gastos"
          />
          {evolution.hasBenefit && (
            <Line type="monotone" dataKey="benefitBalance" stroke="#FF9800" strokeWidth={2} dot={false} name="Benefício" />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
