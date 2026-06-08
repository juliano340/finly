"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface ExpenseByCategoryChartProps {
  data: { name: string; value: number; color: string }[]
}

export function ExpenseByCategoryChart({ data }: ExpenseByCategoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Nenhuma despesa neste mês
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) =>
            Number(value ?? 0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })
          }
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
