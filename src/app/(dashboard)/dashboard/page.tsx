"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
  ArrowDown,
  ArrowUp,
  Banknote,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Landmark,
  Loader2,
  Wallet,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExpenseByCategoryChart } from "./_components/expense-by-category-chart"
import { IncomeVsExpenseChart } from "./_components/income-vs-expense-chart"
import { DailyTrendChart } from "./_components/daily-trend-chart"
import { MonthlyEvolutionChart } from "./_components/monthly-evolution-chart"
import { CardInvoiceEvolutionChart } from "./_components/card-invoice-evolution-chart"
import { RecentTransactions } from "./_components/recent-transactions"
import { formatCurrency } from "@/lib/utils"
import type { CardInvoiceEvolutionStats, DashboardStats, MonthlyEvolutionItem, MonthlyEvolutionStats } from "@/features/dashboard/dashboard.service"

type EvolutionMetric = keyof Pick<MonthlyEvolutionItem, "total" | "invoices" | "fixedCosts" | "incomeFixedCosts" | "looseExpenses">

const evolutionMetrics: { key: EvolutionMetric; label: string }[] = [
  { key: "total", label: "Total" },
  { key: "invoices", label: "Faturas" },
  { key: "fixedCosts", label: "Custos fixos" },
  { key: "incomeFixedCosts", label: "Receitas fixas" },
  { key: "looseExpenses", label: "Avulsas" },
]

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function formatMonth(month: string) {
  const [year, m] = month.split("-")
  const date = new Date(Number(year), Number(m) - 1)
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [month, setMonth] = useState(getCurrentMonth)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState<{ summary: { totalToPay: number; totalSpent: number } } | null>(null)
  const [bankTotal, setBankTotal] = useState(0)
  const [evolution, setEvolution] = useState<MonthlyEvolutionStats | null>(null)
  const [evolutionMetric, setEvolutionMetric] = useState<EvolutionMetric>("total")
  const [cardEvolution, setCardEvolution] = useState<CardInvoiceEvolutionStats | null>(null)
  const [selectedCardId, setSelectedCardId] = useState("all")

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/summary?month=${month}&months=6`)
      if (!res.ok) return
      const data = await res.json()
      setStats(data.stats)
      setBankTotal(data.bankTotal)
      setClosing(data.closing)
      setEvolution(data.evolution)
      setCardEvolution(data.cardEvolution)
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    if (session?.user) fetchStats() // eslint-disable-line react-hooks/set-state-in-effect
  }, [session, fetchStats])

  const prevMonth = () => {
    const [y, m] = month.split("-").map(Number)
    const d = new Date(y, m - 2)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const nextMonth = () => {
    const [y, m] = month.split("-").map(Number)
    const d = new Date(y, m)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const summary = stats
    ? { balance: stats.balance, income: stats.income, expense: stats.expense }
    : { balance: 0, income: 0, expense: 0 }

  const cards = [
    {
      label: "Receitas do mês",
      value: summary.income,
      icon: ArrowUp,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Despesas do mês",
      value: summary.expense,
      icon: ArrowDown,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Resultado líquido",
      value: summary.balance,
      icon: Wallet,
      color: summary.balance >= 0 ? "text-success" : "text-destructive",
      bg: summary.balance >= 0 ? "bg-success/10" : "bg-destructive/10",
    },
  ]
  const evolutionSummary = getMetricSummary(evolution?.months ?? [], evolutionMetric)
  const selectedCard = cardEvolution?.cards.find((card) => card.id === selectedCardId)
  const cardSummary = getCardInvoiceSummary(cardEvolution?.months ?? [], selectedCardId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral das suas finanças
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium capitalize">
            {formatMonth(month)}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-xl p-3 ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {card.label}
                </p>
                <p className="text-xl font-bold">
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    card.value.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className={`border-0 shadow-sm ${bankTotal >= (closing?.summary.totalToPay ?? 0) ? "bg-success text-white" : "bg-destructive text-white"}`}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-white/20 p-3"><Landmark className="h-5 w-5 text-white" /></div>
            <div>
              <p className="text-xs font-medium opacity-80">Saldo em contas</p>
              <p className="text-xl font-bold">{loading ? <Loader2 className="h-5 w-5 animate-spin opacity-60" /> : formatCurrency(bankTotal)}</p>
              <p className="text-[10px] opacity-60">Soma dos saldos bancários</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-destructive/10 p-3"><ArrowDown className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">A pagar</p>
              <p className="text-xl font-bold text-destructive">{loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : formatCurrency(closing?.summary.totalToPay ?? 0)}</p>
              <p className="text-[10px] text-muted-foreground/60">Faturas pendentes + contas fixas + avulsas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-primary/10 p-3"><Banknote className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Disponível</p>
              <p className="text-xl font-bold">{loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : formatCurrency(bankTotal - (closing?.summary.totalToPay ?? 0))}</p>
              <p className="text-[10px] text-muted-foreground/60">Saldo − A pagar</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-destructive/5">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-destructive/10 p-3"><Banknote className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Gastos do mês</p>
              <p className="text-xl font-bold text-destructive">{loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : formatCurrency(closing?.summary.totalSpent ?? 0)}</p>
              <p className="text-[10px] text-muted-foreground/60">Tudo que entrou na fatura + PIX + avulsas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Evolução mensal
              </CardTitle>
              <p className="text-sm text-muted-foreground">Acompanhe seus gastos dos últimos 6 meses.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {evolutionMetrics.map((metric) => (
                <Button
                  key={metric.key}
                  size="sm"
                  variant={evolutionMetric === metric.key ? "default" : "outline"}
                  onClick={() => setEvolutionMetric(metric.key)}
                >
                  {metric.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <InsightCard title="Mês atual" value={formatCurrency(evolutionSummary.current)} description="Valor da métrica selecionada" loading={loading} />
            <InsightCard
              title="Vs mês anterior"
              value={formatChangePercent(evolutionSummary.changePercent)}
              description={evolutionSummary.changePercent === null ? "Sem base comparável" : formatCurrency(evolutionSummary.current - evolutionSummary.previous)}
              tone={(evolutionSummary.changePercent ?? 0) > 0 ? "bad" : "good"}
              loading={loading}
            />
            <InsightCard title="Média mensal" value={formatCurrency(evolutionSummary.average)} description="Média dos últimos 6 meses" loading={loading} />
            <InsightCard title="Maior mês" value={evolutionSummary.highest?.label ?? "-"} description={formatCurrency(evolutionSummary.highest?.value ?? 0)} loading={loading} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex h-[280px] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div> : <MonthlyEvolutionChart data={evolution?.months ?? []} metric={evolutionMetric} />}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Evolução das faturas
              </CardTitle>
              <p className="text-sm text-muted-foreground">Veja quanto cada cartão fechou mês a mês.</p>
            </div>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={selectedCardId}
              onChange={(event) => setSelectedCardId(event.target.value)}
            >
              <option value="all">Todos os cartões</option>
              {cardEvolution?.cards.map((card) => (
                <option key={card.id} value={card.id}>{card.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <InsightCard title="Fatura atual" value={formatCurrency(cardSummary.current)} description={selectedCard?.name ?? "Todos os cartões"} loading={loading} />
            <InsightCard
              title="Vs mês anterior"
              value={formatChangePercent(cardSummary.changePercent)}
              description={cardSummary.changePercent === null ? "Sem base comparável" : formatCurrency(cardSummary.current - cardSummary.previous)}
              tone={(cardSummary.changePercent ?? 0) > 0 ? "bad" : "good"}
              loading={loading}
            />
            <InsightCard title="Média 6 meses" value={formatCurrency(cardSummary.average)} description="Média das faturas no período" loading={loading} />
            <InsightCard title="Maior fatura" value={cardSummary.highest?.label ?? "-"} description={formatCurrency(cardSummary.highest?.value ?? 0)} loading={loading} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex h-[280px] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div> : <CardInvoiceEvolutionChart data={cardEvolution?.months ?? []} cards={cardEvolution?.cards ?? []} cardId={selectedCardId} color={selectedCard?.color ?? "#2563EB"} />}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Receitas vs Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div className="flex h-[280px] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div> : <IncomeVsExpenseChart data={stats?.dailyTrend ?? []} />}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div className="flex h-[280px] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div> : <ExpenseByCategoryChart data={stats?.byCategory ?? []} />}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Evolução Diária</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div className="flex h-[280px] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div> : <DailyTrendChart data={stats?.dailyTrend ?? []} />}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Transações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div className="flex h-[280px] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div> : <RecentTransactions transactions={stats?.recentTransactions ?? []} />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InsightCard({
  title,
  value,
  description,
  tone = "neutral",
  loading = false,
}: {
  title: string
  value: string
  description: string
  tone?: "neutral" | "good" | "bad"
  loading?: boolean
}) {
  const toneClass = tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : "text-foreground"
  return (
    <div className="rounded-xl bg-muted p-4">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className={`mt-1 text-lg font-bold ${toneClass}`}>{loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground/70">{description}</p>
    </div>
  )
}

function formatChangePercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "-"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
}

function getMetricSummary(items: MonthlyEvolutionItem[], metric: EvolutionMetric) {
  const current = items.at(-1)?.[metric] ?? 0
  const previous = items.at(-2)?.[metric] ?? 0
  const total = items.reduce((sum, item) => sum + item[metric], 0)
  const highest = items.length
    ? items.reduce(
        (best, item) => item[metric] > best.value ? { label: item.label, value: item[metric] } : best,
        { label: items[0].label, value: items[0][metric] }
      )
    : null

  return {
    current,
    previous,
    average: items.length ? total / items.length : 0,
    highest,
    changePercent: previous > 0 ? ((current - previous) / previous) * 100 : null,
  }
}

function getCardInvoiceSummary(items: CardInvoiceEvolutionStats["months"], cardId: string) {
  const valueFor = (item: CardInvoiceEvolutionStats["months"][number]) => cardId === "all" ? item.total : item.cards[cardId] ?? 0
  const current = items.length ? valueFor(items[items.length - 1]) : 0
  const previous = items.length > 1 ? valueFor(items[items.length - 2]) : 0
  const total = items.reduce((sum, item) => sum + valueFor(item), 0)
  const highest = items.length
    ? items.reduce(
        (best, item) => valueFor(item) > best.value ? { label: item.label, value: valueFor(item) } : best,
        { label: items[0].label, value: valueFor(items[0]) }
      )
    : null

  return {
    current,
    previous,
    average: items.length ? total / items.length : 0,
    highest,
    changePercent: previous > 0 ? ((current - previous) / previous) * 100 : null,
  }
}
