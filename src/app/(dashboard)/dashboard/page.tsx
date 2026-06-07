"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
  ArrowDown,
  ArrowUp,
  Wallet,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExpenseByCategoryChart } from "./_components/expense-by-category-chart"
import { IncomeVsExpenseChart } from "./_components/income-vs-expense-chart"
import { DailyTrendChart } from "./_components/daily-trend-chart"
import { RecentTransactions } from "./_components/recent-transactions"
import type { DashboardStats } from "@/features/dashboard/dashboard.service"

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

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/stats?month=${month}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    if (session?.user) fetchStats()
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
      label: "Saldo atual",
      value: summary.balance,
      icon: Wallet,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Receitas do mês",
      value: summary.income,
      icon: ArrowUp,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
    },
    {
      label: "Despesas do mês",
      value: summary.expense,
      icon: ArrowDown,
      color: "text-red-500",
      bg: "bg-red-50",
    },
  ]

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
                  {loading
                    ? "..."
                    : card.value.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Receitas vs Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeVsExpenseChart data={stats?.dailyTrend ?? []} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseByCategoryChart data={stats?.byCategory ?? []} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Evolução Diária</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyTrendChart data={stats?.dailyTrend ?? []} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Transações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentTransactions transactions={stats?.recentTransactions ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
