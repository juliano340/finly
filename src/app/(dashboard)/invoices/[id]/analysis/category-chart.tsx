"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { formatCurrency } from "@/lib/utils"

type CategoryData = {
  name: string
  color: string
  total: number
  count: number
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: CategoryData }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <div className="flex items-center gap-2 font-medium">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: d.color }}
        />
        {d.name}
      </div>
      <div className="text-sm text-muted-foreground">
        Total: {formatCurrency(d.total)}
      </div>
      <div className="text-sm text-muted-foreground">
        Transações: {d.count}
      </div>
    </div>
  )
}

export function CategoryChart({ data }: { data: CategoryData[] }) {
  const sorted = [...data].sort((a, b) => b.total - a.total)

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={sorted}
              dataKey="total"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={110}
              innerRadius={55}
              paddingAngle={2}
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={false}
              style={{ fontSize: 12 }}
            >
              {sorted.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sorted} layout="vertical" margin={{ left: 120 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => `R$ ${v}`} fontSize={12} />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              fontSize={12}
              tick={({ x, y, payload }) => {
                const d = sorted.find((s) => s.name === payload.value)
                return (
                  <g transform={`translate(${x},${y})`}>
                    <circle cx={-8} cy={0} r={4} fill={d?.color ?? "#999"} />
                    <text x={-18} y={0} dy={4} textAnchor="end" fontSize={12}>
                      {payload.value}
                    </text>
                  </g>
                )
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {sorted.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
