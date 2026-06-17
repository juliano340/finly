"use client"

import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { CardInvoiceEvolutionCard, CardInvoiceEvolutionMonth } from "@/features/dashboard/dashboard.service"

interface ChartItem {
  label: string
  value: number
  [key: string]: string | number
}

interface CardInvoiceEvolutionChartProps {
  data: CardInvoiceEvolutionMonth[]
  cards: CardInvoiceEvolutionCard[]
  cardId: string
  color?: string
}

interface TooltipPayloadItem {
  name?: string | number
  value?: string | number | readonly (string | number)[]
  color?: string
}

interface CardTooltipProps {
  active?: boolean
  label?: string | number
  payload?: readonly TooltipPayloadItem[]
}

export function CardInvoiceEvolutionChart({ data, cards, cardId, color = "#2563EB" }: CardInvoiceEvolutionChartProps) {
  const visibleCards = cardId === "all" ? cards : cards.filter((card) => card.id === cardId)
  const chartData: ChartItem[] = data.map((item) => {
    const values: ChartItem = { label: item.label, value: cardId === "all" ? item.total : item.cards[cardId] ?? 0 }
    for (const card of visibleCards) values[card.id] = item.cards[card.id] ?? 0
    return values
  })

  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        Ainda não há faturas para analisar.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 32, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="label" className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip content={(props) => <CardTooltip {...props} cards={cards} showTotal={cardId === "all"} />} />
        {cardId === "all" ? <Legend /> : null}
        {cardId === "all" ? (
          visibleCards.map((card) => (
            <Bar key={card.id} dataKey={card.id} name={card.name} fill={card.color} radius={[8, 8, 0, 0]}>
              <LabelList dataKey={card.id} position="top" formatter={formatBarLabel} className="fill-foreground text-[10px]" />
            </Bar>
          ))
        ) : (
          <Bar dataKey="value" name="Fatura" fill={color} radius={[8, 8, 0, 0]}>
            <LabelList dataKey="value" position="top" formatter={formatBarLabel} className="fill-foreground text-[10px]" />
          </Bar>
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}

function CardTooltip({ active, label, payload, cards, showTotal }: CardTooltipProps & { cards: CardInvoiceEvolutionCard[]; showTotal: boolean }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((sum, item) => sum + tooltipValue(item.value), 0)

  return (
    <div className="rounded-md border bg-background p-3 text-sm shadow-sm">
      <p className="mb-2 font-medium">Mês: {label}</p>
      {showTotal && <p className="mb-2 font-semibold">Total: {formatTooltipCurrency(total)}</p>}
      <div className="space-y-1">
        {payload.map((item) => {
          const name = String(item.name ?? "Fatura")
          const card = cards.find((cardItem) => cardItem.name === name)
          return (
            <p key={name} style={{ color: card?.color ?? item.color }}>
              {name}: {formatTooltipCurrency(tooltipValue(item.value))}
            </p>
          )
        })}
      </div>
    </div>
  )
}

function formatTooltipCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatBarLabel(value: unknown) {
  const number = Number(value ?? 0)
  if (number <= 0) return ""
  if (number >= 1000) return `R$ ${(number / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
  return `R$ ${number.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
}

function tooltipValue(value: TooltipPayloadItem["value"]) {
  if (Array.isArray(value)) return Number(value[0] ?? 0)
  return Number(value ?? 0)
}
