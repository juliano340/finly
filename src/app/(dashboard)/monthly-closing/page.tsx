"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"
import { MonthNavigator, changeMonth, getCurrentMonth } from "@/components/month-navigator"
import { useMonthParam } from "@/hooks/use-month-param"

  interface ClosingData {
    summary: {
    cardInvoicesTotal: number; cardInvoicesPaidTotal: number; fixedCostsTotal: number; fixedCostsInsideCardTotal: number; cardForecastsWithoutInvoiceTotal: number; fixedCostsOutsideCardTotal: number; fixedCostsOutsideCardTotalAll: number; fixedIncomeTotal: number; looseExpensesTotal: number; incomeTotal: number; receivedIncomeTotal: number; totalToPay: number; totalSpent: number; projectedBalance: number
    estimatedInvoicesByCard: { cardId: string; cardName: string; estimatedAmount: number; invoiceAmount: number; difference: number }[]
    incomeItems: { name: string; amount: number; type: "FIXED" | "LOOSE"; status: "PENDING" | "PAID" }[]
  }
  invoices: { id: string; amount: number; dueDate: string; status: "PENDING" | "PAID"; card: { name: string }; items: { id: string; description: string; amount: number }[] }[]
  fixedCosts: { id: string; amount: number; status: "PENDING" | "PAID"; fixedCost: { name: string; type: "INCOME" | "EXPENSE"; paidInsideCard: boolean; paymentMethod: string; category: { name: string }; card: { name: string } | null; bankAccount: { name: string } | null } }[]
  looseExpenses: { id: string; amount: number; description: string | null; category: { name: string } }[]
}

export default function MonthlyClosingPage() {
  return (
    <Suspense fallback={<ClosingSkeleton />}>
      <MonthlyClosingPageContent />
    </Suspense>
  )
}

function MonthlyClosingPageContent() {
  const [month, setMonth] = useMonthParam({ defaultMonth: getCurrentMonth() })
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
    ...(summary?.cardForecastsWithoutInvoiceTotal ? [{ label: "Fixos no cartão sem fatura", value: summary.cardForecastsWithoutInvoiceTotal }] : []),
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
    ...(summary?.cardForecastsWithoutInvoiceTotal ? [{ label: "Fixos no cartão sem fatura", value: summary.cardForecastsWithoutInvoiceTotal }] : []),
    { label: "Fixos fora", value: summary?.fixedCostsOutsideCardTotalAll ?? 0 },
    { label: "Avulsas", value: summary?.looseExpensesTotal ?? 0 },
  ]
  const invoiceCardIds = new Set((data?.invoices ?? []).map((invoice) => invoice.card.name))
  const expenseDetails: Record<string, ExpenseDetail[]> = {
    Faturas: (data?.invoices ?? []).map((invoice) => ({
      id: invoice.id,
      name: `Fatura ${invoice.card.name}`,
      amount: invoice.amount,
      status: invoice.status,
      children: invoice.items.map((item) => ({ id: item.id, name: item.description, amount: item.amount })),
    })),
    "Fixos fora": (data?.fixedCosts ?? [])
      .filter((item) => item.fixedCost.type === "EXPENSE" && !item.fixedCost.paidInsideCard)
      .map((item) => ({ id: item.id, name: item.fixedCost.name, amount: item.amount, status: item.status })),
    Avulsas: (data?.looseExpenses ?? []).map((item) => ({
      id: item.id,
      name: item.description ?? item.category.name,
      amount: item.amount,
      status: "PAID" as const,
    })),
    "Fixos no cartão sem fatura": (data?.fixedCosts ?? [])
      .filter((item) => item.fixedCost.type === "EXPENSE" && item.fixedCost.paidInsideCard && (!item.fixedCost.card || !invoiceCardIds.has(item.fixedCost.card.name)))
      .map((item) => ({ id: item.id, name: item.fixedCost.name, amount: item.amount, status: item.status })),
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fechamento Mensal</h1>
          <p className="text-muted-foreground">Gastos do mês: realizado vs. a pagar.</p>
        </div>
        <MonthNavigator month={month} disabled={loading} onMonthChange={setMonth} />
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
          <Button size="sm" variant="outline" onClick={() => setMonth(changeMonth(month, 1))}>
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
        <ExpenseComposition items={totalFormula} pendingItems={pendingFormula} details={expenseDetails} loading={loading} month={month} />
      </div>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm lg:col-span-2"><CardHeader><CardTitle className="text-base">Cartões e faturas</CardTitle><p className="text-sm text-muted-foreground">Compare o valor lançado com a previsão dos custos fixos por cartão.</p></CardHeader><CardContent><CardRows loading={loading} invoices={data?.invoices} estimates={summary?.estimatedInvoicesByCard} /></CardContent></Card>
      </section>
      <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Custos fixos do mês</CardTitle></CardHeader><CardContent><FixedCostRows loading={loading} items={data?.fixedCosts} onPay={handlePayFixedCost} /></CardContent></Card>
    </div>
  )
}

type DetailItem = { name?: string; label?: string; amount?: number; value?: number; status?: string }
type ExpenseDetail = { id: string; name: string; amount: number; status: string; children?: { id: string; name: string; amount: number }[] }

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
        {loading ? <span className="inline-block h-6 w-32 animate-pulse rounded bg-muted" /> : formatCurrency(value)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function ExpenseComposition({ items, pendingItems, details, loading, month }: { items: DetailItem[]; pendingItems: DetailItem[]; details: Record<string, ExpenseDetail[]>; loading: boolean; month: string }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const pendingByLabel = new Map(pendingItems.map((item) => [item.label, item.value ?? 0]))
  const pendingLabels: Record<string, string> = {
    Faturas: "Faturas pendentes",
    "Fixos fora": "Fixos fora pendentes",
    Avulsas: "Avulsas",
    "Fixos no cartão sem fatura": "Fixos no cartão sem fatura",
  }
  const monthQuery = `month=${month}`
  const links: Record<string, string> = {
    Faturas: `/cards?tab=invoices&${monthQuery}`,
    "Fixos fora": `/fixed-costs?${monthQuery}`,
    Avulsas: `/transactions?${monthQuery}`,
    "Fixos no cartão sem fatura": `/fixed-costs?${monthQuery}`,
  }
  const totals = items.reduce(
    (acc, item) => {
      const total = item.value ?? item.amount ?? 0
      const pending = pendingByLabel.get(pendingLabels[item.label ?? ""] ?? "") ?? 0
      acc.total += total
      acc.paid += total - pending
      acc.pending += pending
      return acc
    },
    { total: 0, paid: 0, pending: 0 },
  )

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
            {loading ? (
              <div className="space-y-3 px-3 py-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4">
                    <div className="h-4 animate-pulse rounded bg-muted" />
                    <div className="h-4 animate-pulse rounded bg-muted" />
                    <div className="h-4 animate-pulse rounded bg-muted" />
                    <div className="h-4 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : items.map((item) => {
              const total = item.value ?? item.amount ?? 0
              const pending = pendingByLabel.get(pendingLabels[item.label ?? ""] ?? "") ?? 0
              const label = item.label ?? ""
              const itemDetails = details[label] ?? []
              const isExpanded = expanded[label] ?? false
              return (
                <div key={item.label} className="border-b last:border-0">
                  <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 px-3 py-3 hover:bg-muted/40">
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => setExpanded((current) => ({ ...current, [label]: !isExpanded }))}
                        className="min-w-0 truncate text-left font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {item.label}
                      </button>
                      {itemDetails.length > 0 && <Link href={links[label] ?? "#"} className="shrink-0 text-xs text-muted-foreground hover:text-foreground">Abrir lista</Link>}
                    </div>
                    <span className="text-right font-semibold tabular-nums">{formatCurrency(total)}</span>
                    <span className="text-right tabular-nums text-success">{formatCurrency(total - pending)}</span>
                    <span className="text-right tabular-nums text-muted-foreground">{formatCurrency(pending)}</span>
                  </div>
                  {isExpanded && (
                    <div className="space-y-1 bg-muted/20 px-3 pb-3 pt-1">
                      {itemDetails.map((detail) => (
                        <div key={detail.id}>
                          <div className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-xs font-medium">
                            <span className="min-w-0 truncate">{detail.name}</span>
                            <span className="shrink-0 tabular-nums">{formatCurrency(detail.amount)}</span>
                          </div>
                          {detail.children?.map((child) => (
                            <div key={child.id} className="flex items-center justify-between gap-3 px-6 py-1 text-xs text-muted-foreground">
                              <span className="min-w-0 truncate">{child.name}</span>
                              <span className="shrink-0 tabular-nums">{formatCurrency(child.amount)}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                      {itemDetails.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum lançamento detalhado.</p>}
                    </div>
                  )}
                </div>
              )
            })}
            {!loading && (
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 border-t bg-muted/30 px-3 py-3 font-semibold">
                <span>Total</span>
                <span className="text-right tabular-nums">{formatCurrency(totals.total)}</span>
                <span className="text-right tabular-nums text-success">{formatCurrency(totals.paid)}</span>
                <span className="text-right tabular-nums text-muted-foreground">{formatCurrency(totals.pending)}</span>
              </div>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">No modo valor total, a fatura já inclui os fixos. No modo calculado, eles compõem a previsão. Sem fatura, aparecem separadamente como previsão do cartão.</p>
      </CardContent>
    </Card>
  )
}

function CardRows({ loading, invoices = [], estimates = [] }: {
  loading: boolean
  invoices?: ClosingData["invoices"]
  estimates?: ClosingData["summary"]["estimatedInvoicesByCard"]
}) {
  if (loading) return (
    <div className="space-y-3 py-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4">
          <div className="space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-4 animate-pulse rounded bg-muted" />
          <div className="h-4 animate-pulse rounded bg-muted" />
          <div className="h-4 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
  if (invoices.length === 0 && estimates.length === 0) return <p className="py-4 text-sm text-muted-foreground">Nenhuma fatura ou previsão para este mês.</p>

  const names = [...new Set([...invoices.map((invoice) => invoice.card.name), ...estimates.map((item) => item.cardName)])]
  const cardTotals = names.reduce((totals, name) => {
    const invoice = invoices.find((item) => item.card.name === name)
    const estimate = estimates.find((item) => item.cardName === name)
    totals.invoice += invoice?.amount ?? 0
    totals.estimate += estimate?.estimatedAmount ?? 0
    totals.difference += estimate?.difference ?? 0
    return totals
  }, { invoice: 0, estimate: 0, difference: 0 })
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
      <div className="grid gap-2 border-t bg-muted/30 px-3 py-3 text-sm font-semibold sm:grid-cols-[1.5fr_1fr_1fr_1fr] sm:gap-4">
        <span>Total</span>
        <span className="flex justify-between gap-3 sm:block sm:text-right"><span className="text-muted-foreground sm:hidden">Fatura</span>{formatCurrency(cardTotals.invoice)}</span>
        <span className="flex justify-between gap-3 sm:block sm:text-right"><span className="text-muted-foreground sm:hidden">Previsão</span>{formatCurrency(cardTotals.estimate)}</span>
        <span className="flex justify-between gap-3 sm:block sm:text-right"><span className="text-muted-foreground sm:hidden">Diferença</span>{formatCurrency(cardTotals.difference)}</span>
      </div>
    </div>
  )
}

function FixedCostRows({ loading, items = [], onPay }: {
  loading: boolean
  items?: ClosingData["fixedCosts"]
  onPay: (id: string) => void
}) {
  if (loading) return (
    <div className="space-y-3 py-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[1.5fr_1fr_1.2fr_1.2fr_auto_auto] gap-4">
          <div className="h-4 animate-pulse rounded bg-muted" />
          <div className="h-4 animate-pulse rounded bg-muted" />
          <div className="h-4 animate-pulse rounded bg-muted" />
          <div className="h-4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
  if (items.length === 0) return <p className="py-4 text-sm text-muted-foreground">Nenhum custo fixo neste mês.</p>

  return (
    <div>
      <div className="hidden grid-cols-[1.5fr_1fr_1.2fr_1.2fr_auto_auto] gap-4 border-b px-3 pb-2 text-xs font-medium text-muted-foreground sm:grid">
        <span>Custo</span><span>Categoria</span><span>Pagamento</span><span>Conta</span><span>Status</span><span className="text-right">Valor</span>
      </div>
      <div className="space-y-3 sm:space-y-0">
      {items.map((item) => (
        <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg border p-3 sm:grid-cols-[1.5fr_1fr_1.2fr_1.2fr_auto_auto] sm:items-center sm:gap-4 sm:rounded-none sm:border-0 sm:border-b sm:px-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{item.fixedCost.name}</p>
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground sm:hidden">
              <span>{item.fixedCost.category.name}</span>
              <span aria-hidden="true">·</span>
              <span>{item.fixedCost.paidInsideCard ? `Incluído na fatura ${item.fixedCost.card?.name ?? ""}` : "Fora do cartão"}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:hidden">
              Conta: {item.fixedCost.bankAccount?.name ?? "não definida"}
            </p>
            <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium sm:hidden ${item.status === "PAID" ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-600"}`}>
              {item.status === "PAID" ? "Pago" : "Pendente"}
            </span>
          </div>
          <div className="text-right sm:col-start-6">
            <p className="whitespace-nowrap font-semibold tabular-nums">{formatCurrency(item.amount)}</p>
            {item.status === "PENDING" && item.fixedCost.bankAccount && (
              <Button className="mt-2" size="sm" variant="outline" onClick={() => onPay(item.id)}>
                Lançar na conta
              </Button>
            )}
          </div>
          <span className="hidden text-sm sm:col-start-2 sm:block">{item.fixedCost.category.name}</span>
          <span className="hidden text-sm text-muted-foreground sm:col-start-3 sm:block">{item.fixedCost.paidInsideCard ? `Fatura ${item.fixedCost.card?.name ?? ""}` : "Fora do cartão"}</span>
          <span className="hidden text-sm text-muted-foreground sm:col-start-4 sm:block">{item.fixedCost.bankAccount?.name ?? "não definida"}</span>
          <span className="hidden text-xs sm:col-start-5 sm:block">{item.status === "PAID" ? "Pago" : "Pendente"}</span>
        </div>
      ))}
      </div>
      <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-3 text-sm font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatCurrency(items.reduce((total, item) => total + item.amount, 0))}</span>
      </div>
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
          <p className="mt-1 text-2xl font-bold tabular-nums">{loading ? <span className="inline-block h-7 w-36 animate-pulse rounded bg-white/20" /> : formatCurrency(total)}</p>
          <div className="mt-3">
            <BreakdownRows items={totalItems} className="bg-white/10 text-primary-foreground/90" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">Já pago</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-success">{loading ? <span className="inline-block h-5 w-24 animate-pulse rounded bg-muted" /> : formatCurrency(paid)}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">Ainda a pagar</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-destructive">{loading ? <span className="inline-block h-5 w-24 animate-pulse rounded bg-muted" /> : formatCurrency(pending)}</p>
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

function ClosingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-44 animate-pulse rounded bg-muted" />
          <div className="h-4 w-52 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-48 animate-pulse rounded bg-muted" />
      </div>

      <div className="rounded-xl border-0 bg-card shadow-sm p-6 space-y-4 md:hidden">
        <div className="rounded-xl bg-primary p-4 space-y-3">
          <div className="h-3 w-32 animate-pulse rounded bg-white/20" />
          <div className="h-7 w-36 animate-pulse rounded bg-white/20" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/50 p-3 space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="rounded-xl bg-muted/50 p-3 space-y-2">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>

      <div className="hidden md:block space-y-4">
        <div className="rounded-xl border-0 bg-card shadow-sm p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-56 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="h-6 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-36 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-muted/60 p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
            <div className="flex justify-between">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border-0 bg-card shadow-sm p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-5 w-44 animate-pulse rounded bg-muted" />
            <div className="h-4 w-60 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4">
                <div className="h-4 animate-pulse rounded bg-muted" />
                <div className="h-4 animate-pulse rounded bg-muted" />
                <div className="h-4 animate-pulse rounded bg-muted" />
                <div className="h-4 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border-0 bg-card shadow-sm p-6 space-y-4">
        <div className="space-y-2">
          <div className="h-5 w-36 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4">
              <div className="space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 animate-pulse rounded bg-muted" />
              <div className="h-4 animate-pulse rounded bg-muted" />
              <div className="h-4 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border-0 bg-card shadow-sm p-6 space-y-4">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[1.5fr_1fr_1.2fr_1.2fr_auto_auto] gap-4">
              <div className="h-4 animate-pulse rounded bg-muted" />
              <div className="h-4 animate-pulse rounded bg-muted" />
              <div className="h-4 animate-pulse rounded bg-muted" />
              <div className="h-4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
