"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { formatCurrency, formatDate } from "@/lib/utils"

interface ClosingData {
  summary: {
    cardInvoicesTotal: number; fixedCostsTotal: number; fixedCostsInsideCardTotal: number; fixedCostsOutsideCardTotal: number; looseExpensesTotal: number; incomeTotal: number; totalToPay: number; projectedBalance: number
    estimatedInvoicesByCard: { cardId: string; cardName: string; estimatedAmount: number; invoiceAmount: number; difference: number }[]
  }
  invoices: { id: string; amount: number; dueDate: string; status: "PENDING" | "PAID"; card: { name: string } }[]
  fixedCosts: { id: string; amount: number; status: "PENDING" | "PAID"; fixedCost: { name: string; paidInsideCard: boolean; paymentMethod: string; category: { name: string }; card: { name: string } | null; bankAccount: { name: string } | null } }[]
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export default function MonthlyClosingPage() {
  const [month, setMonth] = useState(currentMonth)
  const [data, setData] = useState<ClosingData | null>(null)

  const fetchClosing = useCallback(async () => {
    fetch(`/api/monthly-closing?month=${month}`).then((res) => res.json()).then(setData)
  }, [month])

  useEffect(() => {
    fetchClosing()
  }, [fetchClosing])

  const handlePayFixedCost = async (id: string) => {
    await fetch(`/api/fixed-cost-occurrences/${id}/pay`, { method: "POST" })
    fetchClosing()
  }

  const summary = data?.summary
  const payableFormula = [
    { label: "Faturas", value: summary?.cardInvoicesTotal ?? 0 },
    { label: "Fixos fora do cartão", value: summary?.fixedCostsOutsideCardTotal ?? 0 },
    { label: "Avulsas", value: summary?.looseExpensesTotal ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold tracking-tight">Fechamento Mensal</h1><p className="text-muted-foreground">Quanto precisa sair do bolso neste mês, sem descontar receitas.</p></div><Input className="w-40" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
        <Metric title="Saídas a pagar no mês" value={summary?.totalToPay ?? 0} description="Faturas + fixos fora do cartão + avulsas" highlight />
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">Como esse total é calculado</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {payableFormula.map((item) => (
                <div key={item.label} className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-bold">{formatCurrency(item.value)}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Custos fixos pagos no cartão aparecem para controle, mas não somam de novo porque já estão dentro da fatura lançada.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="Faturas lançadas" value={summary?.cardInvoicesTotal ?? 0} description="Valor manual final das faturas" />
        <Metric title="Fixos fora do cartão" value={summary?.fixedCostsOutsideCardTotal ?? 0} description="Somam direto no total" />
        <Metric title="Despesas avulsas" value={summary?.looseExpensesTotal ?? 0} description="Transações não recorrentes" />
        <Metric title="Receitas do mês" value={summary?.incomeTotal ?? 0} description="Informativo; não reduz o total" />
        <Metric title="Fixos totais" value={summary?.fixedCostsTotal ?? 0} description="Dentro + fora do cartão" />
        <Metric title="Fixos no cartão" value={summary?.fixedCostsInsideCardTotal ?? 0} description="Só previsão da fatura" />
        <Metric title="Saldo após receitas" value={summary?.projectedBalance ?? 0} description="Receitas - saídas a pagar" />
      </div>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Faturas por cartão</CardTitle></CardHeader><CardContent className="space-y-3">{data?.invoices.map((invoice) => <div key={invoice.id} className="rounded-lg border p-3"><div className="flex justify-between"><strong>{invoice.card.name}</strong><span>{formatCurrency(invoice.amount)}</span></div><p className="text-sm text-muted-foreground">Vence em {formatDate(invoice.dueDate)} · {invoice.status === "PAID" ? "Pago" : "Pendente"}</p></div>)}</CardContent></Card>
        <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Previsão por cartão</CardTitle></CardHeader><CardContent className="space-y-3">{summary?.estimatedInvoicesByCard.map((item) => <div key={item.cardId} className="rounded-lg border p-3"><div className="flex justify-between"><strong>{item.cardName}</strong><span>{formatCurrency(item.estimatedAmount)}</span></div><p className="text-sm text-muted-foreground">Previsto pelos fixos no cartão. Fatura manual: {formatCurrency(item.invoiceAmount)} · diferença: {formatCurrency(item.difference)}</p></div>)}</CardContent></Card>
      </section>
      <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Custos fixos do mês</CardTitle></CardHeader><CardContent className="space-y-3">{data?.fixedCosts.map((item) => <div key={item.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><div><strong>{item.fixedCost.name}</strong><p className="text-sm text-muted-foreground">{item.fixedCost.category.name} · {item.fixedCost.paidInsideCard ? `Incluído na fatura ${item.fixedCost.card?.name ?? ""}` : "Fora do cartão"} · Conta prevista: {item.fixedCost.bankAccount?.name ?? "não definida"} · {item.status === "PAID" ? "Pago" : "Pendente"}</p></div><div className="text-right"><span className="font-medium">{formatCurrency(item.amount)}</span>{item.status === "PENDING" && item.fixedCost.bankAccount && <Button className="mt-2 block" size="sm" variant="outline" onClick={() => handlePayFixedCost(item.id)}>Lançar na conta</Button>}</div></div></div>)}</CardContent></Card>
    </div>
  )
}

function Metric({ title, value, description, highlight = false }: { title: string; value: number; description?: string; highlight?: boolean }) {
  return <Card className={`border-0 shadow-sm ${highlight ? "bg-primary text-primary-foreground" : ""}`}><CardContent className="p-5"><p className="text-xs font-medium opacity-80">{title}</p><p className="text-xl font-bold">{formatCurrency(value)}</p>{description && <p className="mt-1 text-xs opacity-75">{description}</p>}</CardContent></Card>
}
