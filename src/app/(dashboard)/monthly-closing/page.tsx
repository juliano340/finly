"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Info, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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

  const expenseFixedCosts = data?.fixedCosts?.filter((fc) => fc.fixedCost.type === "EXPENSE") ?? []
  const outsideCardCosts = expenseFixedCosts.filter((fc) => !fc.fixedCost.paidInsideCard)
  const insideCardCosts = expenseFixedCosts.filter((fc) => fc.fixedCost.paidInsideCard)

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

      <div className="hidden gap-4 md:grid md:grid-cols-3">
        <Metric title="Saídas totais do mês" value={summary?.totalSpent ?? 0} description="Tudo: faturas + fixos + avulsas" highlight loading={loading} detailItems={totalFormula} />
        <Metric title="Já pago" value={paidTotal} description="Desse total, já foi pago" loading={loading} detailItems={paidFormula.map((item) => ({ ...item, status: "PAID" }))} />
        <Metric title="Ainda a pagar" value={summary?.totalToPay ?? 0} description="Restante pendente" loading={loading} detailItems={pendingFormula.map((item) => ({ ...item, status: "PENDING" }))} />
      </div>

      {!loading && (summary?.totalToPay ?? 0) === 0 && (summary?.totalSpent ?? 0) > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Tudo pago neste mês! 🎉</p>
          <Button size="sm" variant="outline" onClick={() => setMonth(nextMonth(month))}>
            Ver próximo mês
          </Button>
        </div>
      )}
      <Card className="hidden border-0 shadow-sm md:block">
        <CardContent className="p-5">
          <p className="text-xs font-medium text-muted-foreground">Detalhamento do que ainda falta pagar</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {pendingFormula.map((item) => (
              <div key={item.label} className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-lg font-bold">{formatCurrency(item.value)}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Custos fixos dentro do cartão não somam de novo (já estão na fatura). Gastos já pagos também são excluídos do &ldquo;a pagar&rdquo;.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="Faturas totais" value={(summary?.cardInvoicesTotal ?? 0) + (summary?.cardInvoicesPaidTotal ?? 0)} description={`${formatCurrency(summary?.cardInvoicesPaidTotal ?? 0)} já pago · ${formatCurrency(summary?.cardInvoicesTotal ?? 0)} pendente`} loading={loading} detailItems={data?.invoices.map((inv) => ({ name: `${inv.card.name} — ${formatDate(inv.dueDate)}`, amount: inv.amount, status: inv.status }))} />
        <Metric title="Fixos fora do cartão" value={summary?.fixedCostsOutsideCardTotalAll ?? 0} description={`${formatCurrency(summary?.fixedCostsOutsideCardTotal ?? 0)} pendente · ${formatCurrency((summary?.fixedCostsOutsideCardTotalAll ?? 0) - (summary?.fixedCostsOutsideCardTotal ?? 0))} já pago`} loading={loading} detailItems={outsideCardCosts.map((fc) => ({ name: fc.fixedCost.name, amount: fc.amount, status: fc.status }))} />
        <Metric title="Despesas avulsas" value={summary?.looseExpensesTotal ?? 0} description="Transações não recorrentes" loading={loading} />
        <Metric title="Receitas do mês" value={summary?.receivedIncomeTotal ?? 0} description={`${formatCurrency(summary?.receivedIncomeTotal ?? 0)} recebido · ${formatCurrency((summary?.incomeTotal ?? 0) - (summary?.receivedIncomeTotal ?? 0))} pendente`} loading={loading} detailItems={summary?.incomeItems?.map((item) => ({ name: `${item.name} (${item.type === "FIXED" ? "Fixa" : "Avulsa"})`, amount: item.amount, status: item.status }))} />
        <Metric title="Fixos totais" value={summary?.fixedCostsTotal ?? 0} description="Dentro + fora do cartão" loading={loading} detailItems={expenseFixedCosts.map((fc) => ({ name: fc.fixedCost.name, amount: fc.amount, status: fc.status }))} />
        <Metric title="Fixos dentro do cartão" value={summary?.fixedCostsInsideCardTotal ?? 0} description="Previstos na fatura" loading={loading} detailItems={insideCardCosts.map((fc) => ({ name: fc.fixedCost.name, amount: fc.amount, status: fc.status }))} />
        <Metric title="Resultado do mês" value={summary?.projectedBalance ?? 0} description="Receitas - gastos (pagos e não pagos)" loading={loading} />
      </div>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Faturas por cartão</CardTitle></CardHeader><CardContent className="space-y-3">{loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div> : data?.invoices.map((invoice) => <div key={invoice.id} className="rounded-lg border p-3"><div className="flex justify-between"><strong>{invoice.card.name}</strong><span>{formatCurrency(invoice.amount)}</span></div><p className="text-sm text-muted-foreground">Vence em {formatDate(invoice.dueDate)} · {invoice.status === "PAID" ? "Pago" : "Pendente"}</p></div>)}</CardContent></Card>
        <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Previsão por cartão</CardTitle></CardHeader><CardContent className="space-y-3">{loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div> : summary?.estimatedInvoicesByCard.map((item) => <div key={item.cardId} className="rounded-lg border p-3"><div className="flex justify-between"><strong>{item.cardName}</strong><span>{formatCurrency(item.estimatedAmount)}</span></div><p className="text-sm text-muted-foreground">Previsto pelos fixos no cartão. Fatura manual: {formatCurrency(item.invoiceAmount)} · diferença: {formatCurrency(item.difference)}</p></div>)}</CardContent></Card>
      </section>
      <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Custos fixos do mês</CardTitle></CardHeader><CardContent className="space-y-3">{loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div> : data?.fixedCosts.map((item) => <div key={item.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><div><strong>{item.fixedCost.name}</strong><p className="text-sm text-muted-foreground">{item.fixedCost.category.name} · {item.fixedCost.paidInsideCard ? `Incluído na fatura ${item.fixedCost.card?.name ?? ""}` : "Fora do cartão"} · Conta prevista: {item.fixedCost.bankAccount?.name ?? "não definida"} · {item.status === "PAID" ? "Pago" : "Pendente"}</p></div><div className="text-right"><span className="font-medium">{formatCurrency(item.amount)}</span>{item.status === "PENDING" && item.fixedCost.bankAccount && <Button className="mt-2 block" size="sm" variant="outline" onClick={() => handlePayFixedCost(item.id)}>Lançar na conta</Button>}</div></div></div>)}</CardContent></Card>
    </div>
  )
}

type DetailItem = { name?: string; label?: string; amount?: number; value?: number; status?: string }

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

function Metric({ title, value, description, highlight = false, loading = false, detailItems }: { title: string; value: number; description?: string; highlight?: boolean; loading?: boolean; detailItems?: DetailItem[] }) {
  return <Card className={`border-0 shadow-sm ${highlight ? "bg-primary text-primary-foreground" : ""}`}><CardContent className="p-5">
    <p className="text-xs font-medium opacity-80 flex items-center gap-1.5">
      {title}
      {detailItems && detailItems.length > 0 && !loading && (
        <span className="hidden md:inline-flex">
          <Tooltip>
            <TooltipTrigger>
              <span tabIndex={0} className="inline-flex cursor-help"><Info className="size-3.5" /></span>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start" className="p-0">
              <div className="max-h-48 overflow-y-auto py-1.5">
                {detailItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 px-3 py-1 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate">{item.name ?? item.label}</span>
                      {item.status && <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${item.status === "PAID" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"}`}>{item.status === "PAID" ? "Recebido" : "Pendente"}</span>}
                    </span>
                    <span className="shrink-0 whitespace-nowrap font-medium tabular-nums">{formatCurrency(item.amount ?? item.value ?? 0)}</span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </span>
      )}
    </p>
    <p className="text-xl font-bold">{loading ? <Loader2 className="h-5 w-5 animate-spin opacity-60" /> : formatCurrency(value)}</p>
    {description && <p className="mt-1 text-xs opacity-75">{description}</p>}
    {detailItems && detailItems.length > 0 && !loading && (
      <details className="mt-3 rounded-lg bg-muted/60 p-3 md:hidden">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Ver composição</summary>
        <div className="mt-2">
          <BreakdownRows items={detailItems} className="bg-background" />
        </div>
      </details>
    )}
  </CardContent></Card>
}
