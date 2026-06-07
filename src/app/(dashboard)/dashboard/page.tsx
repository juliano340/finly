"use client"

import {
  ArrowDown,
  ArrowUp,
  Wallet,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function DashboardPage() {
  const summary = { balance: 0, income: 0, expense: 0 }

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral das suas finanças
        </p>
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
                  {card.value.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Wallet className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Nenhuma transação ainda. Comece adicionando sua primeira receita ou
            despesa.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
