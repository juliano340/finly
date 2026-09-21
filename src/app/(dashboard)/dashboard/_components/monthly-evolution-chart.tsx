"use client"

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { MonthlyEvolutionItem } from "@/features/dashboard/dashboard.service"
import { useIsNarrow } from "@/hooks/use-is-narrow"

interface MonthlyEvolutionChartProps {
  data: MonthlyEvolutionItem[]
  metric: keyof Pick<MonthlyEvolutionItem, "total" | "invoices" | "fixedCosts" | "incomeFixedCosts" | "looseExpenses">
}

const metricLabels = {
  total: "Total gasto",
  invoices: "Faturas",
  fixedCosts: "Custos fixos",
  incomeFixedCosts: "Receitas fixas",
  looseExpenses: "Avulsas",
}

const metricColors = {
  total: "#0EA882",
  invoices: "#2563EB",
  fixedCosts: "#F59E0B",
  incomeFixedCosts: "#22C55E",
  looseExpenses: "#E85D5D",
}

export function MonthlyEvolutionChart({ data, metric }: MonthlyEvolutionChartProps) {
  const isNarrow = useIsNarrow()
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Ainda não há dados suficientes para evolução mensal.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 32, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="label" className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip
          formatter={(value) => [
            Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
            metricLabels[metric],
          ]}
          labelFormatter={(label) => `Mês: ${label}`}
        />
        <Bar dataKey={metric} name={metricLabels[metric]} fill={metricColors[metric]} radius={[8, 8, 0, 0]}>
          <LabelList dataKey={metric} content={(props) => <BarTopLabel {...props} compact={isNarrow} />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function BarTopLabel({ x, y, width, value, compact }: { x?: unknown; y?: unknown; width?: unknown; value?: unknown; compact: boolean }) {
  const label = formatBarLabel(value, compact)
  if (!label) return null
  return (
    <text x={Number(x ?? 0) + Number(width ?? 0) / 2} y={Number(y ?? 0) - 6} textAnchor="middle" className="fill-foreground text-[10px]">
      {label}
    </text>
  )
}

function formatBarLabel(value: unknown, compact: boolean) {
  const number = Number(value ?? 0)
  if (number <= 0) return ""
  if (number >= 1000) {
    const short = `${(number / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
    return compact ? short : `R$ ${short}`
  }
  const short = number.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
  return compact ? short : `R$ ${short}`
}
