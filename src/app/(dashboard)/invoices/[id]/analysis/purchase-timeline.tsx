"use client"

import { useMemo, useState } from "react"
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
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

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { label: string; dateRaw: string; txCount: number; totalAmount: number; txDescriptions: string[] } }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-xs max-w-[250px]">
      <div className="font-medium mb-1">{d.label}</div>
      <div className="text-muted-foreground">
        {new Date(d.dateRaw).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        })}
      </div>
      <div className="mt-1">
        {d.txCount} compra{d.txCount > 1 ? "s" : ""} •{" "}
        {formatCurrency(d.totalAmount)}
      </div>
      {d.txCount <= 5 && (
        <div className="mt-1 border-t pt-1 text-muted-foreground">
          {d.txDescriptions?.map((t: string, i: number) => (
            <div key={i}>• {t}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export function PurchaseTimeline({
  txs,
  categories,
}: {
  txs: TxDetail[]
  categories: Category[]
}) {
  const [mode, setMode] = useState<ChartMode>("description")
  const [threshold, setThreshold] = useState(1)

  const dateRange = useMemo(() => {
    const dates = txs
      .filter((t) => t.date)
      .map((t) => new Date(t.date!).getTime())
    if (dates.length === 0) return { min: 0, max: 0 }
    return { min: Math.min(...dates), max: Math.max(...dates) }
  }, [txs])

  const groupedByDesc = useMemo(() => {
    const map = new Map<
      string,
      Map<string, { count: number; total: number; descriptions: string[] }>
    >()
    for (const tx of txs) {
      if (!tx.date) continue
      const d = new Date(tx.date)
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const groupKey = tx.normalizedDesc

      if (!map.has(groupKey)) map.set(groupKey, new Map())
      const dateMap = map.get(groupKey)!
      const entry = dateMap.get(dateKey) ?? {
        count: 0,
        total: 0,
        descriptions: [],
      }
      entry.count++
      entry.total += Math.abs(tx.amount)
      if (entry.descriptions.length < 3) entry.descriptions.push(tx.description)
      dateMap.set(dateKey, entry)
    }
    return map
  }, [txs])

  const groupedByCategory = useMemo(() => {
    const map = new Map<
      string,
      Map<string, { count: number; total: number; descriptions: string[] }>
    >()
    for (const tx of txs) {
      if (!tx.date) continue
      const d = new Date(tx.date)
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const cat = categories.find((c) => c.id === tx.categoryId)
      const groupKey = cat?.name ?? "Sem categoria"

      if (!map.has(groupKey)) map.set(groupKey, new Map())
      const dateMap = map.get(groupKey)!
      const entry = dateMap.get(dateKey) ?? {
        count: 0,
        total: 0,
        descriptions: [],
      }
      entry.count++
      entry.total += Math.abs(tx.amount)
      if (entry.descriptions.length < 3) entry.descriptions.push(tx.description)
      dateMap.set(dateKey, entry)
    }
    return map
  }, [txs, categories])

  const { chartData, yLabels, colorMap } = useMemo(() => {
    const grouped = mode === "description" ? groupedByDesc : groupedByCategory

    const filtered = new Map<
      string,
      Map<string, { count: number; total: number; descriptions: string[] }>
    >()
    for (const [key, dateMap] of grouped) {
      const totalCompras = Array.from(dateMap.values()).reduce(
        (s, e) => s + e.count,
        0
      )
      if (totalCompras >= threshold) {
        filtered.set(key, dateMap)
      }
    }

    const sorted = Array.from(filtered.entries()).sort((a, b) => {
      const totalA = Array.from(a[1].values()).reduce(
        (s, e) => s + e.count,
        0
      )
      const totalB = Array.from(b[1].values()).reduce(
        (s, e) => s + e.count,
        0
      )
      return totalB - totalA
    })

    const labels = sorted.map(([key]) => key)
    const colorLookup = new Map<string, string>()

    type ScatterPoint = {
      x: number
      y: number
      z: number
      label: string
      dateRaw: string
      txCount: number
      totalAmount: number
      txDescriptions: string[]
      color: string
    }

    const data: ScatterPoint[] = []
    sorted.forEach(([key, dateMap], yIndex) => {
      const cat = categories.find((c) => c.name === key)
      const color = cat?.color ?? "#0EA882"
      colorLookup.set(key, color)

      for (const [dateStr, entry] of dateMap) {
        const dateMs = new Date(dateStr + "T12:00:00").getTime()
        data.push({
          x: dateMs,
          y: yIndex,
          z: entry.count * entry.total,
          label: key,
          dateRaw: dateStr + "T12:00:00",
          txCount: entry.count,
          totalAmount: entry.total,
          txDescriptions: entry.descriptions,
          color,
        })
      }
    })

    return { chartData: data, yLabels: labels, colorMap: colorLookup }
  }, [groupedByDesc, groupedByCategory, categories, mode, threshold])

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
        <div className="flex items-center gap-1 ml-2">
          <span className="text-xs text-muted-foreground">Mín. compras:</span>
          {[1, 2, 3, 5].map((n) => (
            <button
              key={n}
              onClick={() => setThreshold(n)}
              className={`rounded-full px-2 py-0.5 text-xs ${
                threshold === n
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-stretch gap-0">
        <div
          className="flex flex-col justify-start pt-8 flex-shrink-0"
          style={{ width: mode === "description" ? 140 : 110 }}
        >
          {yLabels.map((label) => (
            <div
              key={label}
              className="text-xs text-foreground flex items-center overflow-hidden text-ellipsis whitespace-nowrap"
              style={{
                height: Math.max(
                  28,
                  chartData.length > 0 ? 300 / yLabels.length : 28
                ),
              }}
            >
              <span
                className="h-2 w-2 rounded-full mr-2 flex-shrink-0"
                style={{ backgroundColor: colorMap.get(label) ?? "#999" }}
              />
              {label.length > 18 ? label.slice(0, 15) + "..." : label}
            </div>
          ))}
        </div>

        <div className="flex-1">
          <ResponsiveContainer
            width="100%"
            height={Math.max(250, yLabels.length * 30)}
          >
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                type="number"
                dataKey="x"
                domain={[dateRange.min, dateRange.max]}
                tickFormatter={(ms) => {
                  const d = new Date(ms)
                  return d.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  })
                }}
                fontSize={11}
                tick={{ fill: "#999" }}
                name="Data"
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[-0.5, yLabels.length - 0.5]}
                tick={false}
                name="Item"
              />
              <ZAxis type="number" dataKey="z" range={[80, 600]} />
              <Tooltip content={<CustomTooltip />} />
              <Scatter data={chartData} fillOpacity={0.7}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
