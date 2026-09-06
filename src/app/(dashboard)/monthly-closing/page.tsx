"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"
import { MonthNavigator, changeMonth, getCurrentMonth } from "@/components/month-navigator"
import { useMonthParam } from "@/hooks/use-month-param"
import { useTableSelection } from "@/components/data-table/use-table-selection"

  interface ClosingData {
    summary: {
    cardInvoicesTotal: number; cardInvoicesPaidTotal: number; fixedCostsTotal: number; fixedCostsInsideCardTotal: number; cardForecastsWithoutInvoiceTotal: number; fixedCostsOutsideCardTotal: number; fixedCostsOutsideCardTotalAll: number; fixedIncomeTotal: number; looseExpensesTotal: number; incomeTotal: number; receivedIncomeTotal: number; totalToPay: number; totalSpent: number; projectedBalance: number
    estimatedInvoicesByCard: { cardId: string; cardName: string; estimatedAmount: number; invoiceAmount: number; difference: number }[]
    incomeItems: { name: string; amount: number; type: "FIXED" | "LOOSE"; status: "PENDING" | "PAID" }[]
  }
  invoices: { id: string; amount: number; dueDate: string; status: "PENDING" | "PAID"; card: { name: string }; items: { id: string; description: string; amount: number }[] }[]
  fixedCosts: { id: string; dueDate: string | null; amount: number; status: "PENDING" | "PAID"; fixedCost: { name: string; type: "INCOME" | "EXPENSE"; paidInsideCard: boolean; paymentMethod: string; category: { name: string }; card: { name: string } | null; bankAccount: { name: string } | null } }[]
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
  const [billFilter, setBillFilter] = useState<"ALL" | "PENDING" | "PAID">("ALL")

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

  const bills: BillRow[] = [
    ...(data?.invoices ?? []).map((invoice): BillRow => ({
      id: invoice.id,
      kind: "INVOICE" as const,
      name: `Fatura ${invoice.card.name}`,
      category: "Cartão de crédito",
      method: `Fatura ${invoice.card.name}`,
      account: invoice.card.name,
      dueDate: invoice.dueDate,
      amount: invoice.amount,
      status: invoice.status,
    })),
    ...(data?.fixedCosts ?? [])
      .filter((item) => item.fixedCost.type === "EXPENSE")
      .map((item): BillRow => ({
        id: item.id,
        kind: "FIXED_COST" as const,
        name: item.fixedCost.name,
        category: item.fixedCost.category.name,
        method: item.fixedCost.paidInsideCard ? `Fatura ${item.fixedCost.card?.name ?? ""}` : "Fora do cartão",
        account: item.fixedCost.bankAccount?.name ?? "não definida",
        dueDate: item.dueDate,
        amount: item.amount,
        status: item.status,
        payable: Boolean(item.fixedCost.bankAccount),
      })),
  ].sort((a, b) => (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31"))

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
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">Contas do mês</CardTitle>
                <p className="text-sm text-muted-foreground">Faturas e custos fixos — o que já foi pago e o que falta.</p>
              </div>
              <div className="flex gap-1.5">
                {(["ALL", "PENDING", "PAID"] as const).map((option) => (
                  <Button key={option} size="sm" variant={billFilter === option ? "default" : "outline"} onClick={() => setBillFilter(option)}>
                    {option === "ALL" ? "Todas" : option === "PENDING" ? "Pendentes" : "Pagas"}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <BillsList loading={loading} bills={bills} filter={billFilter} month={month} onPayFixedCost={handlePayFixedCost} />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm lg:col-span-2"><CardHeader><CardTitle className="text-base">Cartões e faturas</CardTitle><p className="text-sm text-muted-foreground">Compare o valor lançado com a previsão dos custos fixos por cartão.</p></CardHeader><CardContent><CardRows loading={loading} invoices={data?.invoices} estimates={summary?.estimatedInvoicesByCard} /></CardContent></Card>
      </section>
    </div>
  )
}

type BillRow = {
  id: string
  kind: "INVOICE" | "FIXED_COST"
  name: string
  category: string
  method: string
  account: string
  dueDate: string | null
  amount: number
  status: "PENDING" | "PAID"
  payable?: boolean
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

type BillSortField = "name" | "category" | "dueDate" | "method" | "status" | "amount"

const billCollator = new Intl.Collator("pt-BR", { sensitivity: "base" })

function statusRank(bill: BillRow, overdue: boolean): number {
  if (bill.status === "PAID") return 0
  return overdue ? 2 : 1
}

function SortHeader({ label, field, sortField, sortDir, onSort, className = "justify-start" }: {
  label: string
  field: BillSortField
  sortField: BillSortField
  sortDir: "asc" | "desc"
  onSort: (field: BillSortField) => void
  className?: string
}) {
  const active = sortField === field
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ChevronUp : ChevronDown
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`inline-flex w-full items-center gap-1 rounded px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "text-foreground" : ""} ${className}`}
    >
      {label}
      <Icon className={`size-3 shrink-0 ${active ? "" : "opacity-40"}`} aria-hidden="true" />
    </button>
  )
}

function BillBadge({ status, overdue }: { status: "PENDING" | "PAID"; overdue: boolean }) {
  const className = status === "PAID"
    ? "bg-success/10 text-success"
    : overdue
      ? "bg-destructive/10 text-destructive"
      : "bg-amber-500/10 text-amber-600 dark:text-amber-500"
  const label = status === "PAID" ? "Pago" : overdue ? "Atrasada" : "Pendente"
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {label}
    </span>
  )
}

function BillsList({ loading, bills = [], filter, month, onPayFixedCost }: {
  loading: boolean
  bills?: BillRow[]
  filter: "ALL" | "PENDING" | "PAID"
  month: string
  onPayFixedCost: (id: string) => void
}) {
  const visible = bills.filter((bill) => filter === "ALL" || bill.status === filter)
  const [sortField, setSortField] = useState<BillSortField>("dueDate")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const selection = useTableSelection(visible, (bill) => bill.amount, { storageKey: `bills:selection:${month}` })
  const paidCount = bills.filter((bill) => bill.status === "PAID").length
  const paidTotal = bills.filter((bill) => bill.status === "PAID").reduce((total, bill) => total + bill.amount, 0)
  const pendingTotal = bills.filter((bill) => bill.status === "PENDING").reduce((total, bill) => total + bill.amount, 0)
  const todayISO = new Date().toLocaleDateString("en-CA")

  function toggleSort(field: BillSortField) {
    if (field === sortField) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir(field === "amount" ? "desc" : "asc")
    }
  }

  const sorted = [...visible].sort((a, b) => {
    const aOverdue = a.status === "PENDING" && a.dueDate !== null && a.dueDate.slice(0, 10) < todayISO
    const bOverdue = b.status === "PENDING" && b.dueDate !== null && b.dueDate.slice(0, 10) < todayISO
    const dir = sortDir === "asc" ? 1 : -1
    let result = 0
    switch (sortField) {
      case "amount":
        result = a.amount - b.amount
        break
      case "status":
        result = statusRank(a, aOverdue) - statusRank(b, bOverdue)
        break
      case "dueDate":
        if (a.dueDate === null && b.dueDate === null) result = 0
        else if (a.dueDate === null) return 1
        else if (b.dueDate === null) return -1
        else result = a.dueDate.localeCompare(b.dueDate)
        break
      case "name":
        result = billCollator.compare(a.name, b.name)
        break
      case "category":
        result = billCollator.compare(a.category, b.category)
        break
      case "method":
        result = billCollator.compare(a.method, b.method)
        break
    }
    return result * dir
  })

  if (loading) return (
    <div className="space-y-3 py-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded bg-muted" />
      ))}
    </div>
  )

  const emptyLabel = filter === "PENDING" ? "Nenhuma conta pendente neste mês." : filter === "PAID" ? "Nenhuma conta paga neste mês." : "Nenhuma conta neste mês."
  if (visible.length === 0) return <p className="py-4 text-sm text-muted-foreground">{emptyLabel}</p>

  const monthTotal = bills.reduce((total, bill) => total + bill.amount, 0)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{paidCount} de {bills.length} pagas</span>
        <span>Pago: <span className="font-medium text-foreground">{formatCurrency(paidTotal)}</span></span>
        <span>A pagar: <span className="font-medium text-foreground">{formatCurrency(pendingTotal)}</span></span>
      </div>

      {selection.selectedIds.size > 0 && (
        <div className="mb-3 flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm">
          <span className="font-medium">
            {selection.selectedIds.size} selecionada{selection.selectedIds.size !== 1 ? "s" : ""}
            <span className="ml-2 text-xs font-normal text-muted-foreground">({formatCurrency(selection.totalSelected)})</span>
          </span>
          <Button className="ml-auto" size="sm" variant="outline" onClick={selection.clearSelection}>Limpar</Button>
        </div>
      )}

      {/* Desktop: tabela */}
      <table className="hidden w-full text-sm sm:table">
        <thead>
          <tr className="border-b text-left text-xs font-medium text-muted-foreground">
            <th className="w-10 px-3 py-2 text-center">
              <input type="checkbox" className="h-4 w-4" aria-label="Selecionar todas" checked={selection.allSelected} onChange={selection.selectAll} />
            </th>
            <th className="px-3 py-2 font-medium" aria-sort={sortField === "name" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
              <SortHeader label="Conta" field="name" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            </th>
            <th className="px-3 py-2 font-medium" aria-sort={sortField === "category" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
              <SortHeader label="Categoria" field="category" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            </th>
            <th className="px-3 py-2 font-medium" aria-sort={sortField === "dueDate" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
              <SortHeader label="Vencimento" field="dueDate" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            </th>
            <th className="px-3 py-2 font-medium" aria-sort={sortField === "method" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
              <SortHeader label="Pagamento" field="method" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            </th>
            <th className="px-3 py-2 font-medium" aria-sort={sortField === "status" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
              <SortHeader label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
            </th>
            <th className="px-3 py-2 text-right font-medium" aria-sort={sortField === "amount" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
              <SortHeader label="Valor" field="amount" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="justify-end" />
            </th>
            <th className="w-px px-3 py-2 text-right font-medium"><span className="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((bill) => {
            const overdue = bill.status === "PENDING" && bill.dueDate !== null && bill.dueDate.slice(0, 10) < todayISO
            const action = bill.status === "PENDING"
              ? bill.kind === "FIXED_COST"
                ? bill.payable
                  ? <Button size="sm" variant="outline" onClick={() => onPayFixedCost(bill.id)}>Lançar</Button>
                  : null
                : <Link href={`/cards?tab=invoices&month=${month}`}><Button size="sm" variant="outline">Pagar</Button></Link>
              : null
            return (
              <tr key={`${bill.kind}-${bill.id}`} className="border-b last:border-0 hover:bg-muted/40">
                <td className="w-10 px-3 py-3 text-center">
                  <input type="checkbox" className="h-4 w-4" aria-label={`Selecionar ${bill.name}`} checked={selection.selectedIds.has(bill.id)} onChange={() => selection.toggleSelect(bill.id)} />
                </td>
                <td className="max-w-[220px] truncate px-3 py-3 font-medium">{bill.name}</td>
                <td className="px-3 py-3 text-muted-foreground">{bill.category}</td>
                <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{bill.dueDate ? formatDate(bill.dueDate) : "—"}</td>
                <td className="px-3 py-3 text-muted-foreground">{bill.method}</td>
                <td className="px-3 py-3"><BillBadge status={bill.status} overdue={overdue} /></td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums">{formatCurrency(bill.amount)}</td>
                <td className="px-3 py-3 text-right">{action}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/30 font-semibold">
            <td className="px-3 py-3" colSpan={6}>Total do mês</td>
            <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(monthTotal)}</td>
            <td />
          </tr>
        </tfoot>
      </table>

      {/* Mobile: cards */}
      <div className="space-y-3 sm:hidden">
        {sorted.map((bill) => {
          const overdue = bill.status === "PENDING" && bill.dueDate !== null && bill.dueDate.slice(0, 10) < todayISO
          return (
            <div key={`${bill.kind}-${bill.id}`} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate font-semibold">{bill.name}</p>
                <BillBadge status={bill.status} overdue={overdue} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {bill.category} · {bill.method}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Vence em {bill.dueDate ? formatDate(bill.dueDate) : "sem data"} · Conta: {bill.account}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="font-semibold tabular-nums">{formatCurrency(bill.amount)}</p>
                {bill.status === "PENDING" && (bill.kind === "FIXED_COST" ? (
                  bill.payable && (
                    <Button size="sm" variant="outline" onClick={() => onPayFixedCost(bill.id)}>Lançar na conta</Button>
                  )
                ) : (
                  <Link href={`/cards?tab=invoices&month=${month}`}>
                    <Button size="sm" variant="outline">Pagar fatura</Button>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-3 text-sm font-semibold">
          <span>Total do mês</span>
          <span className="tabular-nums">{formatCurrency(monthTotal)}</span>
        </div>
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
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}
