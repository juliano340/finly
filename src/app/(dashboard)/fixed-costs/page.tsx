"use client"

import { useCallback, useEffect, useRef, useState, Suspense, type ReactNode } from "react"
import { CalendarClock, CheckCircle2, Clock3, CreditCard, Loader2, RotateCcw, Settings, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { AddButton } from "@/components/ui/add-button"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  FixedCostForm,
  type FixedCostFormInitial,
  type FixedCostFormValues,
} from "./_components/fixed-cost-form"
import {
  OccurrenceAmountForm,
  type OccurrenceAmountValues,
} from "./_components/occurrence-amount-form"
import { isOccurrenceCustomized, resolveOccurrencePayment } from "@/features/fixed-costs/occurrence-payment"
import { cn, dueLabel, formatCurrency, isOverdue } from "@/lib/utils"
import { ariaSort, sortButtonLabel } from "@/lib/accessible-sort"
import { MonthNavigator, changeMonth, getCurrentMonth } from "@/components/month-navigator"
import { useMonthParam } from "@/hooks/use-month-param"
import { useTableSelection } from "@/components/data-table/use-table-selection"
import { DataTableContainer } from "@/components/data-table/data-table-container"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { SummaryCards } from "@/components/data-table/summary-cards"

interface Category { id: string; name: string; type: string }
interface CardItem { id: string; name: string; color: string }
interface BankAccountItem { id: string; name: string }
interface FixedCostData { id: string; name: string; type: "INCOME" | "EXPENSE"; defaultAmount: number; categoryId: string; paymentMethod: string; dueDay: number | null; paidInsideCard: boolean; cardId: string | null; bankAccountId: string | null; active: boolean; startDate: string | null; frequency: string | null; customInterval: number | null; customUnit: string | null; endType: string | null; endDate: string | null; endAfterCount: number | null; category: Category; card: CardItem | null; bankAccount: BankAccountItem | null }

interface Occurrence {
  id: string
  fixedCostId: string
  month: string
  scheduledDate: string | null
  dueDate: string | null
  amount: number
  status: "PENDING" | "PAID"
  paidAt: string | null
  paidViaCard: boolean
  updatedAt: string
  paymentMethodOverride: "PIX" | "BANK_SLIP" | "DEBIT" | "CREDIT_CARD" | "CASH" | null
  cardIdOverride: string | null
  bankAccountIdOverride: string | null
  dueDateOverridden: boolean
  cardOverride: CardItem | null
  bankAccountOverride: BankAccountItem | null
  fixedCost: FixedCostData
}

type OccurrenceSortField = "name" | "category" | "source" | "dueDate" | "amount" | "status"

function SortIcon({ field, activeField, direction }: { field: OccurrenceSortField; activeField: OccurrenceSortField; direction: "asc" | "desc" }) {
  if (activeField !== field) return <span aria-hidden="true" className="ml-1 text-muted-foreground/40">&#8693;</span>
  return <span aria-hidden="true" className="ml-1">{direction === "asc" ? "\u25B2" : "\u25BC"}</span>
}

function StatusIconTooltip({
  label,
  icon,
  tone,
  onClick,
  loading = false,
}: {
  label: string
  icon: ReactNode
  tone: "success" | "warning" | "info" | "muted"
  onClick?: () => void
  loading?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={label}
        aria-disabled={loading || undefined}
        tabIndex={loading ? -1 : undefined}
        onClick={() => {
          if (loading) return
          onClick?.()
        }}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "cursor-pointer rounded-full border transition-colors",
          loading && "pointer-events-none opacity-50",
          tone === "success" && "border-success/20 bg-success/10 text-success hover:bg-success/20 hover:text-success",
          tone === "warning" && "border-amber-500/20 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 hover:text-amber-700",
          tone === "info" && "border-blue-500/20 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 hover:text-blue-700",
          tone === "muted" && "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function formatDueDate(dueDay: number | null, month: string) {
  if (!dueDay) return "-"
  const [year, m] = month.split("-").map(Number)
  const lastDay = new Date(year, m, 0).getDate()
  const day = Math.min(dueDay, lastDay)
  const date = new Date(Date.UTC(year, m - 1, day))
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" })
}

function formatCalendarDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" })
}

function dueDayIso(dueDay: number | null, month: string) {
  if (!dueDay) return null
  const [year, m] = month.split("-").map(Number)
  const lastDay = new Date(year, m, 0).getDate()
  return `${year}-${String(m).padStart(2, "0")}-${String(Math.min(dueDay, lastDay)).padStart(2, "0")}`
}

function FixedCostsPageInner() {
  const [month, setMonth] = useMonthParam({ defaultMonth: getCurrentMonth() })

  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<CardItem[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([])
  const [occurrences, setOccurrences] = useState<Occurrence[]>([])
  const [activeTab, setActiveTab] = useState<"EXPENSE" | "INCOME">("EXPENSE")
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [unpayingId, setUnpayingId] = useState<string | null>(null)
  const [payingCardId, setPayingCardId] = useState<string | null>(null)
  const [unpayingCardId, setUnpayingCardId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState<"AMOUNT" | "SERIES">("AMOUNT")
  const [sortField, setSortField] = useState<OccurrenceSortField>("dueDate")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const fetchRequestIdRef = useRef(0)

  const filteredOccurrences = occurrences.filter((o) => o.fixedCost.type === activeTab)
  const { selectedIds, toggleSelect, selectAll, clearSelection, allSelected, totalSelected, confirmBatchDelete, setConfirmBatchDelete, batchDeleting, setBatchDeleting } = useTableSelection(filteredOccurrences, (o) => o.amount, { storageKey: `fixed-costs:selection:${month}:${activeTab}` })

  const fetchData = useCallback(async (requestId = ++fetchRequestIdRef.current) => {
    setLoading(true)
    setOccurrences([])
    const [catRes, cardRes, accountRes, occRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/cards"),
      fetch("/api/bank-accounts"),
      fetch(`/api/fixed-costs/occurrences?month=${month}`),
    ])
    const [categoryData, cardData, accountData, occurrenceData] = await Promise.all([
      catRes.ok ? catRes.json() : null,
      cardRes.ok ? cardRes.json() : null,
      accountRes.ok ? accountRes.json() : null,
      occRes.ok ? occRes.json() : null,
    ])
    if (requestId !== fetchRequestIdRef.current) return
    if (categoryData) setCategories(categoryData)
    if (cardData) setCards(cardData)
    if (accountData) setBankAccounts(accountData)
    if (occurrenceData) setOccurrences(occurrenceData)
    setLoading(false)
  }, [month])

  useEffect(() => {
    const requestId = ++fetchRequestIdRef.current
    const timer = window.setTimeout(() => { void fetchData(requestId) }, 0)
    return () => {
      window.clearTimeout(timer)
      fetchRequestIdRef.current += 1
    }
  }, [fetchData])

  const handlePay = async (fixedCostId: string) => {
    setPayingId(fixedCostId)
    try {
      const res = await fetch(`/api/fixed-costs/${fixedCostId}/pay?month=${month}`, { method: "POST" })
      if (res.ok) {
        toast.success(activeTab === "INCOME" ? "Receita marcada como recebida." : "Custo fixo marcado como pago.")
        fetchData()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(
          typeof data.error === "string"
            ? data.error
            : activeTab === "INCOME"
              ? "Não foi possível marcar como recebida."
              : "Não foi possível marcar como pago."
        )
      }
    } finally {
      setPayingId(null)
    }
  }

  const handleUnpay = async (fixedCostId: string) => {
    setUnpayingId(fixedCostId)
    try {
      const res = await fetch(`/api/fixed-costs/${fixedCostId}/unpay?month=${month}`, { method: "POST" })
      if (res.ok) {
        toast.info(activeTab === "INCOME" ? "Recebimento cancelado." : "Pagamento estornado.")
        fetchData()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(
          typeof data.error === "string"
            ? data.error
            : activeTab === "INCOME"
              ? "Não foi possível cancelar o recebimento."
              : "Não foi possível estornar o pagamento."
        )
      }
    } finally {
      setUnpayingId(null)
    }
  }

  const handlePayCard = async (fixedCostId: string) => {
    setPayingCardId(fixedCostId)
    try {
      const res = await fetch(`/api/fixed-costs/${fixedCostId}/pay-card?month=${month}`, { method: "POST" })
      if (res.ok) {
        toast.success("Marcado como pago no cartão.")
        fetchData()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(typeof data.error === "string" ? data.error : "Não foi possível marcar como pago no cartão.")
      }
    } finally {
      setPayingCardId(null)
    }
  }

  const handleUnpayCard = async (fixedCostId: string) => {
    setUnpayingCardId(fixedCostId)
    try {
      const res = await fetch(`/api/fixed-costs/${fixedCostId}/unpay-card?month=${month}`, { method: "POST" })
      if (res.ok) {
        toast.info("Pagamento no cartão estornado.")
        fetchData()
      } else {
        toast.error("Não foi possível estornar pagamento no cartão.")
      }
    } finally {
      setUnpayingCardId(null)
    }
  }

  const filteredCategories = categories.filter((c) => c.type === activeTab)

  const handleCreate = async (values: FixedCostFormValues) => {
    const res = await fetch("/api/fixed-costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? "Erro ao criar lançamento fixo")
    }
    toast.success(activeTab === "EXPENSE" ? "Custo fixo criado com sucesso." : "Receita fixa criada com sucesso.")
    setCreating(false)
    await fetchData()
  }

  const handleUpdate = async (occurrence: Occurrence, values: OccurrenceAmountValues) => {
    const res = await fetch(`/api/fixed-costs/${occurrence.fixedCostId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? "Erro ao atualizar valor")
    }
    const result = await res.json() as { affected: number; skipped: { paid: number; closed: number; deleted: number } }
    const skipped = result.skipped.paid + result.skipped.closed + result.skipped.deleted
    toast.success(`${result.affected} ocorrência${result.affected === 1 ? "" : "s"} atualizada${result.affected === 1 ? "" : "s"}.${skipped > 0 ? ` ${skipped} preservada${skipped === 1 ? "" : "s"}.` : ""}`)
    setSelectedOccurrence(null)
    await fetchData()
  }

  const handleSeriesUpdate = async (occurrence: Occurrence, values: FixedCostFormValues) => {
    const res = await fetch(`/api/fixed-costs/${occurrence.fixedCostId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? "Erro ao atualizar configurações da série")
    }
    toast.success("Configurações da série atualizadas.")
    setSelectedOccurrence(null)
    await fetchData()
  }

  const handleDelete = async (itemId: string) => {
    setIsDeleting(true)
    const res = await fetch(`/api/fixed-costs/${itemId}`, { method: "DELETE" })
    setIsDeleting(false)
    setConfirmDelete(null)
    setSelectedOccurrence(null)
    if (res.ok) {
      toast.success("Lançamento fixo excluído.")
    } else {
      toast.error("Não foi possível excluir o lançamento fixo.")
    }
    fetchData()
  }

  const handleBatchDelete = async () => {
    setBatchDeleting(true)
    const ids = Array.from(selectedIds)
    const res = await fetch("/api/fixed-cost-occurrences/batch-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    })
    setBatchDeleting(false)
    setConfirmBatchDelete(false)
    if (res.ok) {
      toast.success(`${ids.length} ocorrência${ids.length !== 1 ? "s" : ""} excluída${ids.length !== 1 ? "s" : ""}.`)
      clearSelection()
    } else {
      toast.error("Não foi possível excluir as ocorrências.")
    }
    fetchData()
  }

  const openEditSheet = (occurrence: Occurrence) => {
    setSelectedOccurrence(occurrence)
    setEditMode("AMOUNT")
  }

  const selectedTemplate = selectedOccurrence?.fixedCost ?? null
  const seriesInitial: FixedCostFormInitial | null = selectedTemplate
    ? {
        name: selectedTemplate.name,
        categoryId: selectedTemplate.categoryId,
        paymentMethod: selectedTemplate.paymentMethod,
        dueDay: selectedTemplate.dueDay,
        cardId: selectedTemplate.cardId,
        bankAccountId: selectedTemplate.bankAccountId,
        active: selectedTemplate.active,
        startDate: selectedTemplate.startDate,
        frequency: selectedTemplate.frequency,
        customInterval: selectedTemplate.customInterval,
        customUnit: selectedTemplate.customUnit,
        endType: selectedTemplate.endType,
        endDate: selectedTemplate.endDate,
        endAfterCount: selectedTemplate.endAfterCount,
      }
    : null
  const totalPending = filteredOccurrences.filter((o) => o.status === "PENDING").reduce((s, o) => s + o.amount, 0)
  const totalPaid = filteredOccurrences.filter((o) => o.status === "PAID").reduce((s, o) => s + o.amount, 0)
  const totalAll = totalPending + totalPaid

  const occurrenceDue = (occ: Occurrence) => {
    if (occ.dueDate) return new Date(occ.dueDate).getTime()
    if (occ.fixedCost.dueDay) {
      const [year, m] = occ.month.split("-").map(Number)
      const lastDay = new Date(year, m, 0).getDate()
      return new Date(Date.UTC(year, m - 1, Math.min(occ.fixedCost.dueDay, lastDay))).getTime()
    }
    return 0
  }

  const occurrenceSource = (occ: Occurrence) => {
    const payment = resolveOccurrencePayment(occ)
    if (payment.paidInsideCard) {
      return `Cartão ${(occ.cardOverride ?? occ.fixedCost.card)?.name ?? ""}`
    }
    const account = occ.bankAccountOverride ?? occ.fixedCost.bankAccount
    return `Fora do cartão${account ? ` · ${account.name}` : ""}`
  }

  const sortedOccurrences = [...filteredOccurrences].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    switch (sortField) {
      case "name": return dir * a.fixedCost.name.localeCompare(b.fixedCost.name)
      case "category": return dir * a.fixedCost.category.name.localeCompare(b.fixedCost.category.name)
      case "source": return dir * occurrenceSource(a).localeCompare(occurrenceSource(b))
      case "dueDate": return dir * (occurrenceDue(a) - occurrenceDue(b))
      case "amount": return dir * (a.amount - b.amount)
      case "status": return dir * (a.status === b.status ? 0 : a.status === "PAID" ? -1 : 1)
      default: return 0
    }
  })

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortField(field); setSortDir("asc") }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Lançamentos Fixos</h1><p className="text-muted-foreground">Entradas e saídas recorrentes.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthNavigator month={month} onMonthChange={setMonth} />
          <AddButton
            label={`Novo ${activeTab === "EXPENSE" ? "custo fixo" : "receita fixa"}`}
            onClick={() => setCreating(true)}
          />
        </div>
      </div>

      <div className="flex gap-1 rounded-md border bg-background p-1 w-fit">
        <button type="button" onClick={() => setActiveTab("EXPENSE")} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "EXPENSE" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Despesas</button>
        <button type="button" onClick={() => setActiveTab("INCOME")} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "INCOME" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Receitas</button>
      </div>

      <SummaryCards
        total={totalAll}
        paid={totalPaid}
        pending={totalPending}
        loading={loading}
        labels={{
          total: "Total do mês",
          paid: activeTab === "INCOME" ? "Recebido" : "Pago",
          pending: activeTab === "INCOME" ? "A receber" : "A pagar",
        }}
      />

      {!loading && totalPending === 0 && totalAll > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{activeTab === "INCOME" ? "Tudo recebido neste mês! 🎉" : "Tudo pago neste mês! 🎉"}</p>
           <Button size="sm" variant="outline" onClick={() => setMonth(changeMonth(month, 1))}>
            Ver próximo mês
          </Button>
        </div>
      )}

      <DataTableContainer>
        <DataTableToolbar
          selectedCount={selectedIds.size}
          totalSelected={totalSelected}
          itemLabel="lançamento"
          onConfirmDelete={() => setConfirmBatchDelete(true)}
          onClearSelection={clearSelection}
          defaultContent={<span className="text-sm text-muted-foreground">{filteredOccurrences.length} lançamento{filteredOccurrences.length !== 1 ? "s" : ""}</span>}
        />
        <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-3 py-3 text-center">
                <input type="checkbox" className="h-4 w-4" checked={allSelected} onChange={selectAll} />
              </th>
              <th aria-sort={sortField === "name" ? ariaSort(sortDir) : undefined} className="w-[20%] px-4 py-3 text-left font-medium text-muted-foreground"><button type="button" aria-label={sortButtonLabel("Nome", sortField === "name", sortDir)} className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("name")}>Nome<SortIcon field="name" activeField={sortField} direction={sortDir} /></button></th>
              <th aria-sort={sortField === "category" ? ariaSort(sortDir) : undefined} className="w-[15%] px-4 py-3 text-left font-medium text-muted-foreground"><button type="button" aria-label={sortButtonLabel("Categoria", sortField === "category", sortDir)} className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("category")}>Categoria<SortIcon field="category" activeField={sortField} direction={sortDir} /></button></th>
              <th aria-sort={sortField === "source" ? ariaSort(sortDir) : undefined} className="w-[20%] px-4 py-3 text-left font-medium text-muted-foreground"><button type="button" aria-label={sortButtonLabel("Origem", sortField === "source", sortDir)} className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("source")}>Origem<SortIcon field="source" activeField={sortField} direction={sortDir} /></button></th>
              <th aria-sort={sortField === "dueDate" ? ariaSort(sortDir) : undefined} className="w-[15%] px-4 py-3 text-left font-medium text-muted-foreground"><button type="button" aria-label={sortButtonLabel("Vencimento", sortField === "dueDate", sortDir)} className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("dueDate")}>Vencimento<SortIcon field="dueDate" activeField={sortField} direction={sortDir} /></button></th>
              <th aria-sort={sortField === "amount" ? ariaSort(sortDir) : undefined} className="w-[140px] px-4 py-3 text-right font-medium text-muted-foreground"><button type="button" aria-label={sortButtonLabel("Valor do mês", sortField === "amount", sortDir)} className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("amount")}>Valor do mês<SortIcon field="amount" activeField={sortField} direction={sortDir} /></button></th>
              <th aria-sort={sortField === "status" ? ariaSort(sortDir) : undefined} className="w-[160px] px-4 py-3 text-center font-medium text-muted-foreground"><button type="button" aria-label={sortButtonLabel("Status", sortField === "status", sortDir)} className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("status")}>Status<SortIcon field="status" activeField={sortField} direction={sortDir} /></button></th>
              <th className="w-[80px] px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="border-b" aria-hidden="true">
                  {Array.from({ length: 8 }).map((_, columnIndex) => (
                    <td key={columnIndex} className="px-4 py-3">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredOccurrences.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                Nenhum lançamento fixo neste mês.
              </td></tr>
            ) : sortedOccurrences.map((occ) => {
              const isLoading = payingId === occ.fixedCostId || unpayingId === occ.fixedCostId
              const isLoadingCard = payingCardId === occ.fixedCostId || unpayingCardId === occ.fixedCostId
              const payment = resolveOccurrencePayment(occ)
              const customized = isOccurrenceCustomized(occ)
              return (
                <tr key={occ.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="w-10 px-3 py-3 text-center">
                    <input type="checkbox" className="h-4 w-4" checked={selectedIds.has(occ.id)} onChange={() => toggleSelect(occ.id)} />
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => openEditSheet(occ)} className="text-left font-medium hover:underline">
                      {occ.fixedCost.name}
                    </button>
                    {customized && (
                      <span
                        title="Personalizado neste mês"
                        className="ml-2 inline-flex h-5 items-center rounded-full bg-blue-500/10 px-2 text-[10px] font-medium uppercase tracking-wide text-blue-600"
                      >
                        personalizado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{occ.fixedCost.category.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {payment.paidInsideCard
                      ? <span className="font-medium text-foreground">Cartão {(occ.cardOverride ?? occ.fixedCost.card)?.name ?? "-"}</span>
                      : <span className="font-medium text-foreground">Fora do cartão{(occ.bankAccountOverride ?? occ.fixedCost.bankAccount) ? ` · ${(occ.bankAccountOverride ?? occ.fixedCost.bankAccount)!.name}` : ""}</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{occ.dueDate ? formatCalendarDate(occ.dueDate) : formatDueDate(occ.fixedCost.dueDay, occ.month)}</td>
                  <td className="w-[140px] px-4 py-3 text-right font-medium">{formatCurrency(occ.amount)}</td>
                  <td className="w-[160px] px-4 py-3">
                    <div className="flex min-w-[72px] items-center justify-center gap-2">
                      {payment.paidInsideCard ? (
                        occ.status === "PAID" && occ.paidViaCard ? (
                          <StatusIconTooltip label="Pago no cartão" tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5 fill-success text-white" />} />
                        ) : occ.status === "PAID" ? (
                          <StatusIconTooltip label={activeTab === "INCOME" ? "Recebido na fatura" : "Pago na fatura"} tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5 fill-success text-white" />} />
                        ) : (
                          <StatusIconTooltip label="Na fatura" tone="info" icon={<CreditCard className="h-3.5 w-3.5" />} />
                        )
                      ) : occ.status === "PAID" ? (
                        <StatusIconTooltip label={activeTab === "INCOME" ? "Recebido" : "Pago"} tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5 fill-success text-white" />} />
                      ) : (
                        <StatusIconTooltip label="Pendente" tone="warning" icon={<Clock3 className="h-3.5 w-3.5" />} />
                      )}

                      {payment.paidInsideCard ? (
                        occ.status === "PENDING" && activeTab === "EXPENSE" ? (
                          <StatusIconTooltip
                            label="Pagar com cartão"
                            tone="muted"
                            loading={isLoadingCard}
                            onClick={() => handlePayCard(occ.fixedCostId)}
                            icon={<CreditCard className="h-3.5 w-3.5" />}
                          />
                        ) : occ.status === "PAID" && occ.paidViaCard ? (
                          <StatusIconTooltip
                            label="Estornar pagamento"
                            tone="success"
                            loading={isLoadingCard}
                            onClick={() => handleUnpayCard(occ.fixedCostId)}
                            icon={<RotateCcw className="h-3.5 w-3.5" />}
                          />
                        ) : (
                          <span className="h-7 w-7" aria-hidden="true" />
                        )
                      ) : (
                        <StatusIconTooltip
                          label={occ.status === "PAID" ? (activeTab === "INCOME" ? "Cancelar recebimento" : "Estornar pagamento") : (activeTab === "INCOME" ? "Receber" : "Pagar")}
                          tone={occ.status === "PAID" ? "success" : "muted"}
                          loading={isLoading}
                          onClick={() => occ.status === "PAID" ? handleUnpay(occ.fixedCostId) : handlePay(occ.fixedCostId)}
                          icon={occ.status === "PAID" ? <RotateCcw className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Editar custo fixo"
                      onClick={() => openEditSheet(occ)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}
            {filteredOccurrences.length > 0 && (
              <tr className="bg-muted/50 font-medium">
                <td className="w-10 px-3 py-3" />
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
                <td className="w-[140px] px-4 py-3 text-right">
                  {formatCurrency(totalAll)}
                  {selectedIds.size > 0 && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (selec: {formatCurrency(totalSelected)})
                    </span>
                  )}
                </td>
                <td className="w-[160px] px-4 py-3 text-center">
                  <span className="whitespace-nowrap text-xs text-muted-foreground">{filteredOccurrences.filter((o) => o.status === "PAID").length} pago{filteredOccurrences.filter((o) => o.status === "PAID").length !== 1 ? "s" : ""} · {filteredOccurrences.filter((o) => o.status === "PENDING").length} pendente{filteredOccurrences.filter((o) => o.status === "PENDING").length !== 1 ? "s" : ""}</span>
                </td>
                <td className="px-4 py-3" />
              </tr>
            )}
          </tbody>
        </table>
      </DataTableContainer>

      <div className="space-y-2 md:hidden">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={`mobile-skeleton-${index}`} className="rounded-lg border bg-card p-3" aria-hidden="true">
              <div className="flex items-start gap-3">
                <div className="size-9 shrink-0 animate-pulse rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between gap-4">
                    <div className="h-4 w-2/5 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                </div>
              </div>
            </div>
          ))
        ) : filteredOccurrences.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum lançamento fixo neste mês.
          </CardContent></Card>
        ) : filteredOccurrences.map((occ) => {
          const isLoading = payingId === occ.fixedCostId || unpayingId === occ.fixedCostId
          const isLoadingCard = payingCardId === occ.fixedCostId || unpayingCardId === occ.fixedCostId
          const payment = resolveOccurrencePayment(occ)
          const customized = isOccurrenceCustomized(occ)
          const sourceLabel = payment.paidInsideCard
            ? `Cartão ${(occ.cardOverride ?? occ.fixedCost.card)?.name ?? "-"}`
            : "Fora do cartão"
          const dueDateIso = occ.dueDate ?? dueDayIso(occ.fixedCost.dueDay, occ.month)
          const dueTextLabel = dueLabel(dueDateIso)
          const dueOverdue = occ.status === "PENDING" && isOverdue(dueDateIso)
          return (
            <div key={occ.id} className="rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => openEditSheet(occ)} className="min-w-0 truncate text-left font-medium hover:underline">
                      {occ.fixedCost.name}
                    </button>
                    {customized && (
                      <span
                        title="Personalizado neste mês"
                        className="inline-flex h-5 items-center rounded-full bg-blue-500/10 px-2 text-[10px] font-medium uppercase tracking-wide text-blue-600"
                      >
                        personalizado
                      </span>
                    )}
                    <strong className="shrink-0 text-sm tabular-nums">{formatCurrency(occ.amount)}</strong>
                  </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {occ.fixedCost.category.name} · {sourceLabel}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    {dueTextLabel && (
                      <span className={cn("inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-medium", dueOverdue ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
                        <CalendarClock className="h-3.5 w-3.5" />
                        {dueTextLabel}
                      </span>
                    )}

                    {payment.paidInsideCard ? (
                      occ.status === "PAID" && occ.paidViaCard ? (
                        <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-success/10 px-2.5 text-xs font-medium text-success">
                          <CheckCircle2 className="h-3.5 w-3.5 fill-success text-white" />
                          Pago no cartão
                        </span>
                      ) : occ.status === "PAID" ? (
                        <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-success/10 px-2.5 text-xs font-medium text-success">
                          <CheckCircle2 className="h-3.5 w-3.5 fill-success text-white" />
                          {activeTab === "INCOME" ? "Recebido na fatura" : "Pago na fatura"}
                        </span>
                      ) : (
                        <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-blue-500/10 px-2.5 text-xs font-medium text-blue-600">
                          <CreditCard className="h-3.5 w-3.5" />
                          Na fatura
                        </span>
                      )
                    ) : occ.status === "PAID" ? (
                      <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-success/10 px-2.5 text-xs font-medium text-success">
                        <CheckCircle2 className="h-3.5 w-3.5 fill-success text-white" />
                        {activeTab === "INCOME" ? "Recebido" : "Pago"}
                      </span>
                    ) : (
                      <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-500/10 px-2.5 text-xs font-medium text-amber-600">
                        <Clock3 className="h-3.5 w-3.5" />
                        Pendente
                      </span>
                    )}

                    {payment.paidInsideCard && occ.status === "PENDING" && activeTab === "EXPENSE" && (
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        disabled={isLoadingCard}
                        onClick={() => handlePayCard(occ.fixedCostId)}
                        className="h-6 rounded-full bg-muted/60 px-2 text-xs text-muted-foreground"
                      >
                        {isLoadingCard ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                        Pagar
                      </Button>
                    )}

                    {!payment.paidInsideCard && occ.status === "PENDING" && (
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        disabled={isLoading}
                        onClick={() => handlePay(occ.fixedCostId)}
                        className="h-6 rounded-full bg-muted/60 px-2 text-xs text-muted-foreground"
                      >
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {activeTab === "INCOME" ? "Receber" : "Pagar"}
                      </Button>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    type="button"
                    aria-label="Ações do lançamento"
                    className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "h-8 w-8 shrink-0 cursor-pointer rounded-full")}
                  >
                    <Settings className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem className="cursor-pointer" onClick={() => openEditSheet(occ)}>
                      <Settings className="h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    {((!payment.paidInsideCard && occ.status === "PAID") || (payment.paidInsideCard && occ.status === "PAID" && occ.paidViaCard)) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-success focus:text-success"
                          onClick={() => {
                            if (payment.paidInsideCard) handleUnpayCard(occ.fixedCostId)
                            else handleUnpay(occ.fixedCostId)
                          }}
                        >
                          {(payment.paidInsideCard ? isLoadingCard : isLoading) ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                          {activeTab === "INCOME" ? "Cancelar" : "Estornar"}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )
        })}
      </div>

      <Sheet open={creating || !!selectedTemplate} onOpenChange={(open) => { if (!open) { setCreating(false); setSelectedOccurrence(null) } }}>
        <SheetContent className="w-full sm:max-w-md">
          {creating ? (
            <>
              <SheetHeader><SheetTitle>Novo {activeTab === "EXPENSE" ? "custo fixo" : "receita fixa"}</SheetTitle></SheetHeader>
              <FixedCostForm
                key={`create-${activeTab}`}
                mode="create"
                type={activeTab}
                categories={filteredCategories}
                cards={cards}
                bankAccounts={bankAccounts}
                onSubmit={handleCreate}
                onClose={() => setCreating(false)}
              />
            </>
          ) : selectedOccurrence && selectedTemplate ? (
            <>
              <SheetHeader>
                <SheetTitle>{editMode === "AMOUNT" ? selectedTemplate.name : `Configurações · ${selectedTemplate.name}`}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="mt-4 space-y-4">
                  {editMode === "AMOUNT" ? (
                    <OccurrenceAmountForm
                      key={`amount-${selectedOccurrence.id}`}
                      occurrence={selectedOccurrence}
                      cards={cards}
                      bankAccounts={bankAccounts}
                      onSubmit={(values) => handleUpdate(selectedOccurrence, values)}
                      onClose={() => setSelectedOccurrence(null)}
                      onEditSeries={() => setEditMode("SERIES")}
                    />
                  ) : (
                    <FixedCostForm
                      key={`series-${selectedTemplate.id}`}
                      mode="series"
                      type={selectedTemplate.type}
                      categories={categories.filter((category) => category.type === selectedTemplate.type)}
                      cards={cards}
                      bankAccounts={bankAccounts}
                      initial={seriesInitial}
                      onSubmit={(values) => handleSeriesUpdate(selectedOccurrence, values)}
                      onClose={() => setSelectedOccurrence(null)}
                      onBack={() => setEditMode("AMOUNT")}
                    />
                  )}
                  <Button type="button" variant="destructive" className="w-full" onClick={() => setConfirmDelete(selectedTemplate.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />Excluir lançamento fixo
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
        title="Excluir lançamento fixo"
        description="Tem certeza? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        loading={isDeleting}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />

      <ConfirmDialog
        open={confirmBatchDelete}
        onOpenChange={setConfirmBatchDelete}
        title={`Excluir ocorrência${selectedIds.size !== 1 ? "s" : ""} selecionada${selectedIds.size !== 1 ? "s" : ""}`}
        description={`Tem certeza? ${selectedIds.size} ocorrência${selectedIds.size !== 1 ? "s" : ""} será${selectedIds.size !== 1 ? "ão" : "á"} excluída${selectedIds.size !== 1 ? "s" : ""}.`}
        confirmText={batchDeleting ? "Excluindo..." : `Excluir${selectedIds.size !== 1 ? "" : ""}`}
        loading={batchDeleting}
        onConfirm={handleBatchDelete}
      />
    </div>
  )
}

export default function FixedCostsPage() {
  return (
    <Suspense>
      <FixedCostsPageInner />
    </Suspense>
  )
}
