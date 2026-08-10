"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"

  interface ClosingData {
    summary: {
    cardInvoicesTotal: number; cardInvoicesPaidTotal: number; fixedCostsTotal: number; fixedCostsInsideCardTotal: number; fixedCostsOutsideCardTotal: number; fixedCostsOutsideCardTotalAll: number; fixedIncomeTotal: number; looseExpensesTotal: number; incomeTotal: number; receivedIncomeTotal: number; totalToPay: number; totalSpent: number; projectedBalance: number
    estimatedInvoicesByCard: { cardId: string; cardName: string; estimatedAmount: number; invoiceAmount: number; difference: number }[]
    incomeItems: { name: string; amount: number; type: "FIXED" | "LOOSE"; status: "PENDING" | "PAID" }[]
  }
  invoices: { id: string; amount: number; dueDate: string; status: "PENDING" | "PAID"; card: { name: string } }[]
  fixedCosts: { id: string; amount: number; status: "PENDING" | "PAID"; fixedCost: { name: string; type: "INCOME" | "EXPENSE"; paidInsideCard: boolean; paymentMethod: string; category: { name: string }; card: { name: string } | null; bankAccount: { name: string } | null } }[]
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function previousMonth(month: string) {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function nextMonth(month: string) {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

export default function MonthlyClosingPage() {
  const [month, setMonth] = useState(currentMonth)
  const [data, setData] = useState<ClosingData | null>(null)
  const [loading, setLoading] = useState(true)

  function fetchClosing() {
    return fetch(`/api/monthly-closing?month=${month}`)
      .then((res) => res.json())
      .then((d) => setData(d))
  }

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setLoading(true)
    })
    fetchClosing().then(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  const handlePayFixedCost = async (id: string) => {
    await fetch(`/api/fixed-cost-occurrences/${id}/pay`, { method: "POST" })
    fetchClosing()
  }

  const summary = data?.summary

  const pendingFormula = [
    { label: "Faturas pendentes", value: summary?.cardInvoicesTotal ?? 0 },
    { label: "Fixos fora pendentes", value: summary?.fixedCostsOutsideCardTotal ?? 0 },
    { label: "Avulsas", value: summary?.looseExpensesTotal ?? 0 },
  ]

  const paidTotal = (summary?.totalSpent ?? 0) - (summary?.totalToPay ?? 0)
  const paidFormula = [
    { label: "Faturas pagas", value: summary?.cardInvoicesPaidTotal ?? 0 },
    { label: "Fixos fora pagos", value: (summary?.fixedCostsOutsideCardTotalAll ?? 0) - (summary?.fixedCostsOutsideCardTotal ?? 0) },
  ]
  const totalFormula = [
    { label: "Faturas", value: (summary?.cardInvoicesTotal ?? 0) + (summary?.cardInvoicesPaidTotal ?? 0) },
    { label: "Fixos fora", value: summary?.fixedCostsOutsideCardTotalAll ?? 0 },
    { label: "Avulsas", value: summary?.looseExpensesTotal ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fechamento Mensal</h1>
          <p className="text-muted-foreground">Gastos do mês: realizado vs. a pagar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border bg-background px-2 py-1">
            <Button size="sm" variant="ghost" className="size-7 p-0" disabled={loading} onClick={() => setMonth(previousMonth(month))}><ChevronLeft className="size-4" /></Button>
            <span className="min-w-28 text-center text-sm font-medium capitalize">{loading ? <Loader2 className="inline h-4 w-4 animate-spin" /> : monthLabel(month)}</span>
            <Button size="sm" variant="ghost" className="size-7 p-0" disabled={loading} onClick={() => setMonth(nextMonth(month))}><ChevronRight className="size-4" /></Button>
          </div>
          {month !== currentMonth() && (
            <Button size="sm" variant="ghost" disabled={loading} onClick={() => setMonth(currentMonth())}>Hoje</Button>
          )}
        </div>
      </div>

      <MobileClosingSummary
        total={summary?.totalSpent ?? 0}
        paid={paidTotal}
        pending={summary?.totalToPay ?? 0}
        totalItems={totalFormula}
        paidItems={paidFormula}
        pendingItems={pendingFormula}
        loading={loading}
      />

      {!loading && (summary?.totalToPay ?? 0) === 0 && (summary?.totalSpent ?? 0) > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Tudo pago neste mês! 🎉</p>
          <Button size="sm" variant="outline" onClick={() => setMonth(nextMonth(month))}>
            Ver próximo mês
          </Button>
        </div>
      )}
      <div className="hidden space-y-4 md:block">
        <MonthlyOverview
          income={summary?.incomeTotal ?? 0}
          receivedIncome={summary?.receivedIncomeTotal ?? 0}
          expenses={summary?.totalSpent ?? 0}
          result={summary?.projectedBalance ?? 0}
          paid={paidTotal}
          pending={summary?.totalToPay ?? 0}
          loading={loading}
        />
        <ExpenseComposition items={totalFormula} pendingItems={pendingFormula} loading={loading} />
      </div>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm lg:col-span-2"><CardHeader><CardTitle className="text-base">Cartões e faturas</CardTitle><p className="text-sm text-muted-foreground">Compare o valor lançado com a previsão dos custos fixos por cartão.</p></CardHeader><CardContent><CardRows loading={loading} invoices={data?.invoices} estimates={summary?.estimatedInvoicesByCard} /></CardContent></Card>
      </section>
      <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Custos fixos do mês</CardTitle></CardHeader><CardContent><FixedCostRows loading={loading} items={data?.fixedCosts} onPay={handlePayFixedCost} /></CardContent></Card>
    </div>
  )
}

type DetailItem = { name?: string; label?: string; amount?: number; value?: number; status?: string }

function MonthlyOverview({ income, receivedIncome, expenses, result, paid, pending, loading }: {
  income: number
  receivedIncome: number
  expenses: number
  result: number
  paid: number
  pending: number
  loading: boolean
}) {
  const total = paid + pending
  const paidPercent = total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 0

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Como o mês fecha</CardTitle>
        <p className="text-sm text-muted-foreground">Uma visão rápida das receitas, despesas e resultado projetado.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <OverviewValue label="Receitas do mês" value={income} detail={`${formatCurrency(receivedIncome)} recebido`} loading={loading} />
          <OverviewValue label="Despesas do mês" value={expenses} detail="Pagas e pendentes" loading={loading} />
          <OverviewValue label={result >= 0 ? "Saldo projetado" : "Déficit projetado"} value={result} detail="Receitas menos despesas" loading={loading} tone={result >= 0 ? "positive" : "negative"} />
        </div>
        <div className="rounded-lg bg-muted/60 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">Progresso dos pagamentos</span>
            <span className="text-muted-foreground">{loading ? "Calculando..." : `${Math.round(paidPercent)}% pago`}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${paidPercent}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Pago: {formatCurrency(paid)}</span>
            <span>Pendente: {formatCurrency(pending)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function OverviewValue({ label, value, detail, loading, tone = "default" }: {
  label: string
  value: number
  detail: string
  loading: boolean
  tone?: "default" | "positive" | "negative"
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tone === "positive" ? "text-success" : tone === "negative" ? "text-destructive" : ""}`}>
        {loading ? <Loader2 className="h-5 w-5 animate-spin opacity-60" /> : formatCurrency(value)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function ExpenseComposition({ items, pendingItems, loading }: { items: DetailItem[]; pendingItems: DetailItem[]; loading: boolean }) {
  const pendingByLabel = new Map(pendingItems.map((item) => [item.label, item.value ?? 0]))
  const pendingLabels: Record<string, string> = {
    Faturas: "Faturas pendentes",
    "Fixos fora": "Fixos fora pendentes",
    Avulsas: "Avulsas",
  }
  const links: Record<string, string> = {
    Faturas: "/invoices",
    "Fixos fora": "/fixed-costs",
    Avulsas: "/transactions",
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Composição das despesas</CardTitle>
        <p className="text-sm text-muted-foreground">De onde vem o total de saídas e o que ainda está pendente.</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[560px] text-sm">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 border-b px-3 pb-2 text-xs font-medium text-muted-foreground">
              <span>Origem</span><span className="text-right">Total</span><span className="text-right">Pago</span><span className="text-right">Pendente</span>
            </div>
            {loading ? <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div> : items.map((item) => {
              const total = item.value ?? item.amount ?? 0
              const pending = pendingByLabel.get(pendingLabels[item.label ?? ""] ?? "") ?? 0
              return (
                <Link href={links[item.label ?? ""] ?? "#"} key={item.label} className="group grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 border-b px-3 py-3 last:border-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none">
                  <span className="font-medium underline-offset-4 group-hover:underline">{item.label}</span>
                  <span className="text-right font-semibold tabular-nums">{formatCurrency(total)}</span>
                  <span className="text-right tabular-nums text-success">{formatCurrency(total - pending)}</span>
                  <span className="text-right tabular-nums text-muted-foreground">{formatCurrency(pending)}</span>
                </Link>
              )
            })}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Custos fixos dentro do cartão já estão incluídos na fatura e não são somados novamente.</p>
      </CardContent>
    </Card>
  )
}

function CardRows({ loading, invoices = [], estimates = [] }: {
  loading: boolean
  invoices?: ClosingData["invoices"]
  estimates?: ClosingData["summary"]["estimatedInvoicesByCard"]
}) {
  if (loading) return <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
  if (invoices.length === 0 && estimates.length === 0) return <p className="py-4 text-sm text-muted-foreground">Nenhuma fatura ou previsão para este mês.</p>

  const names = [...new Set([...invoices.map((invoice) => invoice.card.name), ...estimates.map((item) => item.cardName)])]
  return (
    <div className="divide-y">
      <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 border-b px-3 pb-2 text-xs font-medium text-muted-foreground sm:grid">
        <span>Cartão</span><span className="text-right">Fatura</span><span className="text-right">Previsão</span><span className="text-right">Diferença</span>
      </div>
      {names.map((name) => {
        const invoice = invoices.find((item) => item.card.name === name)
        const estimate = estimates.find((item) => item.cardName === name)
        return (
          <div key={name} className="grid gap-2 border-b px-3 py-3 text-sm last:border-0 sm:grid-cols-[1.5fr_1fr_1fr_1fr] sm:gap-4">
            <div>
              <span className="font-medium">{name}</span>
              <p className="mt-1 text-xs text-muted-foreground">{invoice ? `Vence em ${formatDate(invoice.dueDate)} · ${invoice.status === "PAID" ? "Pago" : "Pendente"}` : "Sem fatura manual"}</p>
            </div>
            <span className="flex justify-between gap-3 sm:block sm:text-right"><span className="text-muted-foreground sm:hidden">Fatura</span>{formatCurrency(invoice?.amount ?? 0)}</span>
            <span className="flex justify-between gap-3 sm:block sm:text-right"><span className="text-muted-foreground sm:hidden">Previsão</span>{formatCurrency(estimate?.estimatedAmount ?? 0)}</span>
            <span className="flex justify-between gap-3 sm:block sm:text-right"><span className="text-muted-foreground sm:hidden">Diferença</span>{formatCurrency(estimate?.difference ?? 0)}</span>
          </div>
        )
      })}
    </div>
  )
}

function FixedCostRows({ loading, items = [], onPay }: {
  loading: boolean
  items?: ClosingData["fixedCosts"]
  onPay: (id: string) => void
}) {
  if (loading) return <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
  if (items.length === 0) return <p className="py-4 text-sm text-muted-foreground">Nenhum custo fixo neste mês.</p>

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg border p-3 sm:items-start">
          <div className="min-w-0">
            <p className="truncate font-semibold">{item.fixedCost.name}</p>
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{item.fixedCost.category.name}</span>
              <span aria-hidden="true">·</span>
              <span>{item.fixedCost.paidInsideCard ? `Incluído na fatura ${item.fixedCost.card?.name ?? ""}` : "Fora do cartão"}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Conta: {item.fixedCost.bankAccount?.name ?? "não definida"}
            </p>
            <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${item.status === "PAID" ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-600"}`}>
              {item.status === "PAID" ? "Pago" : "Pendente"}
            </span>
          </div>
          <div className="text-right">
            <p className="whitespace-nowrap font-semibold tabular-nums">{formatCurrency(item.amount)}</p>
            {item.status === "PENDING" && item.fixedCost.bankAccount && (
              <Button className="mt-2" size="sm" variant="outline" onClick={() => onPay(item.id)}>
                Lançar na conta
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function MobileClosingSummary({
  total,
  paid,
  pending,
  totalItems,
  paidItems,
  pendingItems,
  loading,
}: {
  total: number
  paid: number
  pending: number
  totalItems: DetailItem[]
  paidItems: DetailItem[]
  pendingItems: DetailItem[]
  loading: boolean
}) {
  return (
    <Card className="border-0 shadow-sm md:hidden">
      <CardContent className="space-y-4 p-4">
        <div className="rounded-xl bg-primary p-4 text-primary-foreground">
          <p className="text-xs font-medium opacity-80">Saídas totais do mês</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{loading ? <Loader2 className="h-5 w-5 animate-spin opacity-70" /> : formatCurrency(total)}</p>
          <div className="mt-3">
            <BreakdownRows items={totalItems} className="bg-white/10 text-primary-foreground/90" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">Já pago</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-success">{loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : formatCurrency(paid)}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">Ainda a pagar</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-destructive">{loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : formatCurrency(pending)}</p>
          </div>
        </div>

        <div className="grid gap-3">
          <MobileBreakdown title="Composição do já pago" items={paidItems} tone="paid" />
          <MobileBreakdown title="Composição do a pagar" items={pendingItems} tone="pending" />
        </div>
      </CardContent>
    </Card>
  )
}

function MobileBreakdown({ title, items, tone }: { title: string; items: DetailItem[]; tone: "paid" | "pending" }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tone === "paid" ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-600"}`}>
          {tone === "paid" ? "Pago" : "Pendente"}
        </span>
      </div>
      <BreakdownRows items={items} />
    </div>
  )
}

function BreakdownRows({ items, className = "bg-muted/50" }: { items: DetailItem[]; className?: string }) {
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.name ?? item.label} className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-xs ${className}`}>
          <span className="min-w-0 truncate">{item.name ?? item.label}</span>
          <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(item.amount ?? item.value ?? 0)}</span>
        </div>
      ))}
    </div>
  )
}
