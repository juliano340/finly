"use client"

import { useMemo, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { formatCurrency } from "@/lib/utils"

type RankingItem = {
  description: string
  count: number
  total: number
  categoryId: string | null
}

type Category = { id: string; name: string; color: string | null }

type ChartMode = "description" | "category"

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; color: string; count: number; total: number } }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <div className="flex items-center gap-2 font-medium">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: d.color ?? "#999" }}
        />
        {d.name}
      </div>
      <div className="text-sm text-muted-foreground">Compras: {d.count}x</div>
      <div className="text-sm text-muted-foreground">
        Total: {formatCurrency(d.total)}
      </div>
      <div className="text-sm text-muted-foreground">
        Ticket médio: {formatCurrency(d.total / d.count)}
      </div>
    </div>
  )
}

export function PurchaseFrequency({
  ranking,
  categories,
}: {
  ranking: RankingItem[]
  categories: Category[]
}) {
  const [mode, setMode] = useState<ChartMode>("category")

  const categoryData = useMemo(() => {
    const map = new Map<
      string,
      { count: number; total: number; color: string }
    >()
    for (const r of ranking) {
      const cat = categories.find((c) => c.id === r.categoryId)
      const key = cat?.name ?? "Sem categoria"
      const entry = map.get(key) ?? {
        count: 0,
        total: 0,
        color: cat?.color ?? "#FF9800",
      }
      entry.count += r.count
      entry.total += r.total
      map.set(key, entry)
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
  }, [ranking, categories])

  const descriptionData = useMemo(() => {
    return ranking
      .map((r) => ({
        name:
          r.description.length > 25
            ? r.description.slice(0, 22) + "..."
            : r.description,
        fullName: r.description,
        count: r.count,
        total: r.total,
        color:
          categories.find((c) => c.id === r.categoryId)?.color ?? "#999",
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
  }, [ranking, categories])

  const data = mode === "category" ? categoryData : descriptionData

  return (
    <div>
      <div className="flex gap-2 mb-4">
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
      <ResponsiveContainer
        width="100%"
        height={Math.max(250, data.length * 32)}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: mode === "description" ? 140 : 100 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" fontSize={12} tick={{ fill: "#999" }} />
          <YAxis
            type="category"
            dataKey="name"
            width={mode === "description" ? 140 : 100}
            fontSize={12}
            tick={{ fill: "#333" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
