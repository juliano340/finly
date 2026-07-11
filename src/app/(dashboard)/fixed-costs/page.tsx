"use client"

import { useCallback, useEffect, useRef, useState, Suspense, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Clock3, CreditCard, Loader2, RotateCcw, Settings, Trash2 } from "lucide-react"
import { toast } from "sonner"
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
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn, formatCurrency } from "@/lib/utils"

interface Category { id: string; name: string; type: string }
interface CardItem { id: string; name: string; color: string }
interface BankAccountItem { id: string; name: string }
interface FixedCostData { id: string; name: string; type: "INCOME" | "EXPENSE"; defaultAmount: number; categoryId: string; paymentMethod: string; dueDay: number | null; paidInsideCard: boolean; cardId: string | null; bankAccountId: string | null; active: boolean; startDate: string | null; frequency: string | null; customInterval: number | null; customUnit: string | null; endType: string | null; endDate: string | null; endAfterCount: number | null; category: Category; card: CardItem | null; bankAccount: BankAccountItem | null }

interface Occurrence {
  id: string
  fixedCostId: string
  month: string
  dueDate: string | null
  amount: number
  status: "PENDING" | "PAID"
  paidAt: string | null
  paidViaCard: boolean
  fixedCost: FixedCostData
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

function formatDueDate(dueDay: number | null, month: string) {
  if (!dueDay) return "-"
  const [year, m] = month.split("-").map(Number)
  const lastDay = new Date(year, m, 0).getDate()
  const day = Math.min(dueDay, lastDay)
  const date = new Date(Date.UTC(year, m - 1, day))
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" })
}

function FixedCostsPageInner() {
  const searchParams = useSearchParams()
  const urlMonth = searchParams.get("month")
  const validUrlMonth = urlMonth && /^\d{4}-\d{2}$/.test(urlMonth) ? urlMonth : null

  const [interactiveMonth, setInteractiveMonth] = useState<string | null>(null)

  // Reset interactive month when URL param changes externally (e.g. notification click)
  // Render-time state update — avoids useEffect + setState anti-pattern
  const urlKey = urlMonth ?? ""
  const [prevUrlKey, setPrevUrlKey] = useState(urlKey)
  if (urlKey !== prevUrlKey) {
    setInteractiveMonth(null)
    setPrevUrlKey(urlKey)
  }

  const month = interactiveMonth ?? validUrlMonth ?? currentMonth()
  const setMonth = useCallback((m: string) => setInteractiveMonth(m), [])

  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<CardItem[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([])
  const [occurrences, setOccurrences] = useState<Occurrence[]>([])
  const [activeTab, setActiveTab] = useState<"EXPENSE" | "INCOME">("EXPENSE")
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null)
  const [creating, setCreating] = useState(false)
  const [insideCard, setInsideCard] = useState(false)
  const [updateError, setUpdateError] = useState("")
  const [createError, setCreateError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [recStartDate, setRecStartDate] = useState("")
  const [recFrequency, setRecFrequency] = useState("MONTHLY")
  const [recFrequencyType, setRecFrequencyType] = useState<"standard" | "custom">("standard")
  const [recCustomInterval, setRecCustomInterval] = useState("")
  const [recCustomUnit, setRecCustomUnit] = useState("MONTHS")
  const [recEndType, setRecEndType] = useState("NONE")
  const [recEndDate, setRecEndDate] = useState("")
  const [recEndAfterCount, setRecEndAfterCount] = useState("")
  const [payingId, setPayingId] = useState<string | null>(null)
  const [unpayingId, setUnpayingId] = useState<string | null>(null)
  const [payingCardId, setPayingCardId] = useState<string | null>(null)
  const [unpayingCardId, setUnpayingCardId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [creatingLoading, setCreatingLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)

  const inFlightUpdateRef = useRef(false)
  const inFlightCreateRef = useRef(false)
  const editFormRef = useRef<HTMLFormElement>(null)
  const createFormRef = useRef<HTMLFormElement>(null)

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    const all = filteredOccurrences.map((o) => o.id)
    const allSelected = all.every((id) => selectedIds.has(id))
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(all))
  }

  function clearSelection() { setSelectedIds(new Set()) }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setOccurrences([])
    const [catRes, cardRes, accountRes, occRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/cards"),
      fetch("/api/bank-accounts"),
      fetch(`/api/fixed-costs/occurrences?month=${month}`),
    ])
    if (catRes.ok) setCategories(await catRes.json())
    if (cardRes.ok) setCards(await cardRes.json())
    if (accountRes.ok) setBankAccounts(await accountRes.json())
    if (occRes.ok) setOccurrences(await occRes.json())
    setLoading(false)
  }, [month])

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchData() }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchData])

  const handlePay = async (fixedCostId: string) => {
    setPayingId(fixedCostId)
    try {
      const res = await fetch(`/api/fixed-costs/${fixedCostId}/pay?month=${month}`, { method: "POST" })
      if (res.ok) {
        toast.success(activeTab === "INCOME" ? "Receita marcada como recebida." : "Custo fixo marcado como pago.")
        fetchData()
      } else {
        toast.error(activeTab === "INCOME" ? "Não foi possível marcar como recebida." : "Não foi possível marcar como pago.")
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
        toast.error(activeTab === "INCOME" ? "Não foi possível cancelar o recebimento." : "Não foi possível estornar o pagamento.")
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
        toast.error("Não foi possível marcar como pago no cartão.")
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

  const handleCreate = async (formData: FormData) => {
    if (inFlightCreateRef.current) return
    inFlightCreateRef.current = true
    setCreatingLoading(true)
    const paidInsideCard = activeTab === "EXPENSE" && formData.get("paidInsideCard") === "on"
    setCreateError("")
    try {
      const res = await fetch("/api/fixed-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          type: activeTab,
          defaultAmount: String(formData.get("defaultAmount") ?? "").replace(",", "."),
          categoryId: formData.get("categoryId"),
          paymentMethod: paidInsideCard ? "CREDIT_CARD" : formData.get("paymentMethod") || "PIX",
          dueDay: formData.get("dueDay") || null,
          paidInsideCard,
          cardId: paidInsideCard ? formData.get("cardId") : null,
          bankAccountId: formData.get("bankAccountId") || null,
          active: true,
          startDate: recStartDate,
          frequency: recFrequencyType === "custom" ? "CUSTOM" : recFrequency,
          customInterval: recFrequencyType === "custom" ? (Number(recCustomInterval) || null) : null,
          customUnit: recFrequencyType === "custom" ? recCustomUnit : null,
          endType: recEndType,
          endDate: recEndType === "DATE" ? recEndDate : null,
          endAfterCount: recEndType === "COUNT" ? (Number(recEndAfterCount) || null) : null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setCreateError(err.error ?? "Erro ao salvar")
        toast.error(err.error ?? "Erro ao criar custo fixo")
        return
      }
      toast.success(activeTab === "EXPENSE" ? "Custo fixo criado com sucesso." : "Receita fixa criada com sucesso.")
      setCreating(false)
      await fetchData()
    } finally {
      setCreatingLoading(false)
      inFlightCreateRef.current = false
    }
  }

  const handleUpdate = async (item: FixedCostData, formData: FormData) => {
    if (inFlightUpdateRef.current) return
    inFlightUpdateRef.current = true
    const paidInsideCard = item.type === "EXPENSE" && formData.get("paidInsideCard") === "on"
    setUpdateError("")
    setUpdatingId(item.id)
    try {
      const res = await fetch(`/api/fixed-costs/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          type: item.type,
          defaultAmount: String(formData.get("defaultAmount") ?? "").replace(",", "."),
          categoryId: formData.get("categoryId"),
          paymentMethod: paidInsideCard ? "CREDIT_CARD" : formData.get("paymentMethod") || "PIX",
          dueDay: formData.get("dueDay") || null,
          paidInsideCard,
          cardId: paidInsideCard ? formData.get("cardId") : null,
          bankAccountId: formData.get("bankAccountId") || null,
          active: formData.get("active") === "on",
          startDate: recStartDate,
          frequency: recFrequencyType === "custom" ? "CUSTOM" : recFrequency,
          customInterval: recFrequencyType === "custom" ? (Number(recCustomInterval) || null) : null,
          customUnit: recFrequencyType === "custom" ? recCustomUnit : null,
          endType: recEndType,
          endDate: recEndType === "DATE" ? recEndDate : null,
          endAfterCount: recEndType === "COUNT" ? (Number(recEndAfterCount) || null) : null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setUpdateError(err.error ?? "Erro ao salvar")
        toast.error(err.error ?? "Erro ao atualizar custo fixo")
        return
      }
      const newAmount = parseFloat(String(formData.get("defaultAmount") ?? "0").replace(",", "."))
      setOccurrences((prev) =>
        prev.map((o) =>
          o.fixedCostId === item.id
            ? {
                ...o,
                amount: newAmount,
                fixedCost: { ...o.fixedCost, defaultAmount: newAmount },
              }
            : o
        )
      )
      toast.success("Custo fixo atualizado.")
      setSelectedOccurrence(null)
    } finally {
      setUpdatingId(null)
      inFlightUpdateRef.current = false
    }
  }

  const handleDelete = async (itemId: string) => {
    const res = await fetch(`/api/fixed-costs/${itemId}`, { method: "DELETE" })
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
    setInsideCard(occurrence.fixedCost.paidInsideCard)
    setSelectedOccurrence(occurrence)
    setRecStartDate(occurrence.fixedCost.startDate?.split("T")[0] ?? new Date().toISOString().split("T")[0])
    setRecFrequency(occurrence.fixedCost.frequency ?? "MONTHLY")
    setRecFrequencyType(occurrence.fixedCost.frequency === "CUSTOM" ? "custom" : "standard")
    setRecCustomInterval(occurrence.fixedCost.customInterval?.toString() ?? "")
    setRecCustomUnit(occurrence.fixedCost.customUnit ?? "MONTHS")
    setRecEndType(occurrence.fixedCost.endType ?? "NONE")
    setRecEndDate(occurrence.fixedCost.endDate?.split("T")[0] ?? "")
    setRecEndAfterCount(occurrence.fixedCost.endAfterCount?.toString() ?? "")
  }

  const selectedTemplate = selectedOccurrence?.fixedCost ?? null
  const filteredOccurrences = occurrences.filter((o) => o.fixedCost.type === activeTab)
  const totalPending = filteredOccurrences.filter((o) => o.status === "PENDING").reduce((s, o) => s + o.amount, 0)
  const totalPaid = filteredOccurrences.filter((o) => o.status === "PAID").reduce((s, o) => s + o.amount, 0)
  const totalAll = totalPending + totalPaid

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Lançamentos Fixos</h1><p className="text-muted-foreground">Entradas e saídas recorrentes.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border bg-background px-2 py-1">
            <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => setMonth(previousMonth(month))}><ChevronLeft className="size-4" /></Button>
            <span className="min-w-28 text-center text-sm font-medium capitalize">{monthLabel(month)}</span>
            <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => setMonth(nextMonth(month))}><ChevronRight className="size-4" /></Button>
          </div>
          {month !== currentMonth() && (
            <Button size="sm" variant="ghost" onClick={() => setMonth(currentMonth())}>Hoje</Button>
          )}
          <Button onClick={() => {
            setInsideCard(false)
            setCreating(true)
            setRecStartDate(new Date().toISOString().split("T")[0])
            setRecFrequency("MONTHLY")
            setRecFrequencyType("standard")
            setRecCustomInterval("")
            setRecCustomUnit("MONTHS")
            setRecEndType("NONE")
            setRecEndDate("")
            setRecEndAfterCount("")
          }}>Novo {activeTab === "EXPENSE" ? "custo fixo" : "receita fixa"}</Button>
        </div>
      </div>

      <div className="flex gap-1 rounded-md border bg-background p-1 w-fit">
        <button type="button" onClick={() => { setActiveTab("EXPENSE"); clearSelection() }} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "EXPENSE" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Despesas</button>
        <button type="button" onClick={() => { setActiveTab("INCOME"); clearSelection() }} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "INCOME" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Receitas</button>
      </div>

      <div className="hidden gap-4 md:grid md:grid-cols-3">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total do mês</p><p className="text-2xl font-bold">{loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : formatCurrency(totalAll)}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{activeTab === "INCOME" ? "Recebido" : "Pago"}</p><p className="text-2xl font-bold">{loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : formatCurrency(totalPaid)}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{activeTab === "INCOME" ? "A receber" : "A pagar"}</p><p className="text-2xl font-bold">{loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : formatCurrency(totalPending)}</p></CardContent></Card>
      </div>

      <Card className="border-0 shadow-sm md:hidden">
        <CardContent className="grid grid-cols-3 gap-2 p-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-muted-foreground">Total</p>
            <p className="truncate text-sm font-bold tabular-nums">{loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : formatCurrency(totalAll)}</p>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-muted-foreground">{activeTab === "INCOME" ? "Recebido" : "Pago"}</p>
            <p className="truncate text-sm font-bold tabular-nums">{loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : formatCurrency(totalPaid)}</p>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-muted-foreground">{activeTab === "INCOME" ? "A receber" : "A pagar"}</p>
            <p className="truncate text-sm font-bold tabular-nums">{loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : formatCurrency(totalPending)}</p>
          </div>
        </CardContent>
      </Card>

      {!loading && totalPending === 0 && totalAll > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{activeTab === "INCOME" ? "Tudo recebido neste mês! 🎉" : "Tudo pago neste mês! 🎉"}</p>
          <Button size="sm" variant="outline" onClick={() => setMonth(nextMonth(month))}>
            Ver próximo mês
          </Button>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}</span>
          <Button size="sm" variant="destructive" className="gap-2" onClick={() => setConfirmBatchDelete(true)}>
            <Trash2 className="h-4 w-4" /> Excluir selecionados
          </Button>
          <Button size="sm" variant="outline" onClick={clearSelection}>Limpar</Button>
        </div>
      )}

      <div className="hidden overflow-hidden rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-3 py-3 text-center">
                <input type="checkbox" className="h-4 w-4" checked={filteredOccurrences.length > 0 && filteredOccurrences.every((o) => selectedIds.has(o.id))} onChange={selectAll} />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoria</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Origem</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vencimento</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor do mês</th>
              <th className="w-[128px] px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredOccurrences.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</span> : "Nenhum lançamento fixo neste mês."}
              </td></tr>
            ) : filteredOccurrences.map((occ) => {
              const isLoading = payingId === occ.fixedCostId || unpayingId === occ.fixedCostId
              const isLoadingCard = payingCardId === occ.fixedCostId || unpayingCardId === occ.fixedCostId
              return (
                <tr key={occ.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="w-10 px-3 py-3 text-center">
                    <input type="checkbox" className="h-4 w-4" checked={selectedIds.has(occ.id)} onChange={() => toggleSelect(occ.id)} />
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => openEditSheet(occ)} className="text-left font-medium hover:underline">
                      {occ.fixedCost.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{occ.fixedCost.category.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {occ.fixedCost.paidInsideCard
                      ? <span className="font-medium text-foreground">Cartão {occ.fixedCost.card?.name}</span>
                      : <span className="font-medium text-foreground">Fora do cartão{occ.fixedCost.bankAccount ? ` · ${occ.fixedCost.bankAccount.name}` : ""}</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{occ.dueDate ? new Date(occ.dueDate).toLocaleDateString("pt-BR") : formatDueDate(occ.fixedCost.dueDay, occ.month)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(occ.amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-[72px] items-center justify-center gap-2">
                      {occ.fixedCost.paidInsideCard ? (
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

                      {occ.fixedCost.paidInsideCard ? (
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
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {filteredOccurrences.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-sm text-muted-foreground">
            {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</span> : "Nenhum lançamento fixo neste mês."}
          </CardContent></Card>
        ) : filteredOccurrences.map((occ) => {
          const isLoading = payingId === occ.fixedCostId || unpayingId === occ.fixedCostId
          const isLoadingCard = payingCardId === occ.fixedCostId || unpayingCardId === occ.fixedCostId
          const sourceLabel = occ.fixedCost.paidInsideCard ? `Cartão ${occ.fixedCost.card?.name ?? "-"}` : "Fora do cartão"
          const dueLabel = occ.dueDate ? new Date(occ.dueDate).toLocaleDateString("pt-BR") : occ.fixedCost.dueDay ? formatDueDate(occ.fixedCost.dueDay, occ.month) : null
          return (
            <div key={occ.id} className="rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold">
                  {occ.fixedCost.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => openEditSheet(occ)} className="min-w-0 truncate text-left font-medium hover:underline">
                      {occ.fixedCost.name}
                    </button>
                    <strong className="shrink-0 text-sm tabular-nums">{formatCurrency(occ.amount)}</strong>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {occ.fixedCost.category.name} · {sourceLabel}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {dueLabel && (
                      <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Vence {dueLabel}
                      </span>
                    )}

                    {occ.fixedCost.paidInsideCard ? (
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

                    {occ.fixedCost.paidInsideCard && occ.status === "PENDING" && activeTab === "EXPENSE" && (
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

                    {!occ.fixedCost.paidInsideCard && occ.status === "PENDING" && (
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
                    {((!occ.fixedCost.paidInsideCard && occ.status === "PAID") || (occ.fixedCost.paidInsideCard && occ.status === "PAID" && occ.paidViaCard)) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-success focus:text-success"
                          onClick={() => {
                            if (occ.fixedCost.paidInsideCard) handleUnpayCard(occ.fixedCostId)
                            else handleUnpay(occ.fixedCostId)
                          }}
                        >
                          {(occ.fixedCost.paidInsideCard ? isLoadingCard : isLoading) ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
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
              <form ref={createFormRef} className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="mt-4 grid gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Nome</label>
                    <Input name="name" placeholder="Ex: INTERNET" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Valor padrão</label>
                    <Input name="defaultAmount" type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" placeholder="0,00" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Dia de vencimento</label>
                    <Input name="dueDay" type="number" min="1" max="31" placeholder="Ex: 10" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Categoria</label>
                    <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="categoryId" required>
                      {filteredCategories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                  {activeTab === "EXPENSE" && (
                    <>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={insideCard} onChange={(e) => setInsideCard(e.target.checked)} name="paidInsideCard" />
                        Dentro do cartão
                      </label>
                      {!insideCard && (
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Método de pagamento</label>
                          <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="paymentMethod" defaultValue="PIX">
                            <option value="PIX">Pix</option>
                            <option value="BANK_SLIP">Boleto</option>
                            <option value="DEBIT">Débito</option>
                            <option value="CASH">Dinheiro</option>
                          </select>
                        </div>
                      )}
                      {insideCard && (
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Cartão</label>
                          <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="cardId" required>
                            {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Conta prevista (débito)</label>
                    <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="bankAccountId" defaultValue="">
                      <option value="">Sem conta prevista</option>
                      {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                    </select>
                  </div>
                  <div className="border-t pt-4">
                    <p className="mb-3 text-sm font-medium">Recorrência</p>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Data de início</label>
                        <input type="date" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={recStartDate} onChange={(e) => setRecStartDate(e.target.value)} required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Tipo</label>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setRecFrequencyType("standard")} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${recFrequencyType === "standard" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Padrão</button>
                          <button type="button" onClick={() => setRecFrequencyType("custom")} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${recFrequencyType === "custom" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Personalizada</button>
                        </div>
                      </div>
                      {recFrequencyType === "standard" ? (
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Frequência</label>
                          <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={recFrequency} onChange={(e) => setRecFrequency(e.target.value)}>
                            <option value="DAILY">Diária</option>
                            <option value="WEEKLY">Semanal</option>
                            <option value="BIWEEKLY">Quinzenal</option>
                            <option value="MONTHLY">Mensal</option>
                            <option value="BIMONTHLY">Bimestral</option>
                            <option value="QUARTERLY">Trimestral</option>
                            <option value="SEMIANNUAL">Semestral</option>
                            <option value="ANNUAL">Anual</option>
                          </select>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <div className="flex-1 space-y-1">
                            <label className="text-sm font-medium">A cada</label>
                            <Input type="number" min="1" className="w-full" value={recCustomInterval} onChange={(e) => setRecCustomInterval(e.target.value)} placeholder="1" />
                          </div>
                          <div className="flex-[2] space-y-1">
                            <label className="text-sm font-medium">Unidade</label>
                            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={recCustomUnit} onChange={(e) => setRecCustomUnit(e.target.value)}>
                              <option value="DAYS">Dias</option>
                              <option value="WEEKS">Semanas</option>
                              <option value="MONTHS">Meses</option>
                              <option value="YEARS">Anos</option>
                            </select>
                          </div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Término</label>
                        <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={recEndType} onChange={(e) => setRecEndType(e.target.value)}>
                          <option value="NONE">Sem data final</option>
                          <option value="DATE">Encerrar em uma data</option>
                          <option value="COUNT">Após N ocorrências</option>
                        </select>
                      </div>
                      {recEndType === "DATE" && (
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Data de término</label>
                          <input type="date" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={recEndDate} onChange={(e) => setRecEndDate(e.target.value)} />
                        </div>
                      )}
                      {recEndType === "COUNT" && (
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Número de ocorrências</label>
                          <Input type="number" min="1" className="w-full" value={recEndAfterCount} onChange={(e) => setRecEndAfterCount(e.target.value)} placeholder="Ex: 12" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {createError && <p className="text-sm text-destructive">{createError}</p>}
                <Button type="button" className="mt-6 w-full" disabled={creatingLoading} onClick={() => handleCreate(new FormData(createFormRef.current!))}>
                  {creatingLoading ? "Salvando..." : "Salvar"}
                </Button>
              </form>
            </>
          ) : selectedOccurrence && selectedTemplate ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedTemplate.name}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="mt-4 space-y-4">
                  <div className="grid gap-3">
                    <div className="rounded-lg bg-muted p-4">
                      <p className="text-xs text-muted-foreground">Valor deste mês ({monthLabel(selectedOccurrence.month)})</p>
                      <p className="text-2xl font-bold">{formatCurrency(selectedOccurrence.amount)}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">Valor padrão do cadastro</p>
                      <p className="text-2xl font-bold">{formatCurrency(selectedTemplate.defaultAmount)}</p>
                    </div>
                  </div>
                  <form ref={editFormRef} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Nome</label>
                      <Input name="name" defaultValue={selectedTemplate.name} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Valor padrão do cadastro</label>
                      <Input name="defaultAmount" type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" defaultValue={selectedTemplate.defaultAmount} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Dia de vencimento</label>
                      <Input name="dueDay" type="number" min="1" max="31" defaultValue={selectedTemplate.dueDay ?? ""} placeholder="Ex: 10" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Categoria</label>
                      <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="categoryId" defaultValue={selectedTemplate.categoryId} required>
                        {filteredCategories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>
                    {selectedTemplate.type === "EXPENSE" && (
                      <>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" defaultChecked={selectedTemplate.paidInsideCard} name="paidInsideCard" onChange={(e) => setInsideCard(e.target.checked)} />
                          Dentro do cartão
                        </label>
                        {!insideCard && (
                          <div className="space-y-1">
                            <label className="text-sm font-medium">Método de pagamento</label>
                            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="paymentMethod" defaultValue={selectedTemplate.paymentMethod}>
                              <option value="PIX">Pix</option>
                              <option value="BANK_SLIP">Boleto</option>
                              <option value="DEBIT">Débito</option>
                              <option value="CASH">Dinheiro</option>
                            </select>
                          </div>
                        )}
                        {insideCard && (
                          <div className="space-y-1">
                            <label className="text-sm font-medium">Cartão</label>
                            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="cardId" defaultValue={selectedTemplate.cardId ?? ""} required>
                              <option value="">Selecione um cartão</option>
                              {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
                            </select>
                          </div>
                        )}
                      </>
                    )}
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Conta prevista (débito)</label>
                      <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="bankAccountId" defaultValue={selectedTemplate.bankAccountId ?? ""}>
                        <option value="">Sem conta prevista</option>
                        {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                      </select>
                    </div>
                    <div className="border-t pt-4">
                      <p className="mb-3 text-sm font-medium">Recorrência</p>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Data de início</label>
                          <input type="date" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={recStartDate} onChange={(e) => setRecStartDate(e.target.value)} required />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Tipo</label>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setRecFrequencyType("standard")} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${recFrequencyType === "standard" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Padrão</button>
                            <button type="button" onClick={() => setRecFrequencyType("custom")} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${recFrequencyType === "custom" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Personalizada</button>
                          </div>
                        </div>
                        {recFrequencyType === "standard" ? (
                          <div className="space-y-1">
                            <label className="text-sm font-medium">Frequência</label>
                            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={recFrequency} onChange={(e) => setRecFrequency(e.target.value)}>
                              <option value="DAILY">Diária</option>
                              <option value="WEEKLY">Semanal</option>
                              <option value="BIWEEKLY">Quinzenal</option>
                              <option value="MONTHLY">Mensal</option>
                              <option value="BIMONTHLY">Bimestral</option>
                              <option value="QUARTERLY">Trimestral</option>
                              <option value="SEMIANNUAL">Semestral</option>
                              <option value="ANNUAL">Anual</option>
                            </select>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <div className="flex-1 space-y-1">
                              <label className="text-sm font-medium">A cada</label>
                              <Input type="number" min="1" className="w-full" value={recCustomInterval} onChange={(e) => setRecCustomInterval(e.target.value)} placeholder="1" />
                            </div>
                            <div className="flex-[2] space-y-1">
                              <label className="text-sm font-medium">Unidade</label>
                              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={recCustomUnit} onChange={(e) => setRecCustomUnit(e.target.value)}>
                                <option value="DAYS">Dias</option>
                                <option value="WEEKS">Semanas</option>
                                <option value="MONTHS">Meses</option>
                                <option value="YEARS">Anos</option>
                              </select>
                            </div>
                          </div>
                        )}
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Término</label>
                          <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={recEndType} onChange={(e) => setRecEndType(e.target.value)}>
                            <option value="NONE">Sem data final</option>
                            <option value="DATE">Encerrar em uma data</option>
                            <option value="COUNT">Após N ocorrências</option>
                          </select>
                        </div>
                        {recEndType === "DATE" && (
                          <div className="space-y-1">
                            <label className="text-sm font-medium">Data de término</label>
                            <input type="date" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={recEndDate} onChange={(e) => setRecEndDate(e.target.value)} />
                          </div>
                        )}
                        {recEndType === "COUNT" && (
                          <div className="space-y-1">
                            <label className="text-sm font-medium">Número de ocorrências</label>
                            <Input type="number" min="1" className="w-full" value={recEndAfterCount} onChange={(e) => setRecEndAfterCount(e.target.value)} placeholder="Ex: 12" />
                          </div>
                        )}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" defaultChecked={selectedTemplate.active} name="active" />
                      Ativo
                    </label>
                    {updateError && <p className="text-sm text-destructive">{updateError}</p>}
                    <Button type="button" className="w-full" disabled={updatingId === selectedTemplate.id} onClick={() => handleUpdate(selectedTemplate, new FormData(editFormRef.current!))}>
                      {updatingId === selectedTemplate.id ? "Salvando..." : "Salvar alterações"}
                    </Button>
                  </form>
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
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />

      <ConfirmDialog
        open={confirmBatchDelete}
        onOpenChange={setConfirmBatchDelete}
        title="Excluir ocorrências selecionadas"
        description={`Tem certeza? ${selectedIds.size} ocorrência${selectedIds.size !== 1 ? "s" : ""} será${selectedIds.size !== 1 ? "ão" : "á"} excluída${selectedIds.size !== 1 ? "s" : ""}.`}
        confirmText={batchDeleting ? "Excluindo..." : "Excluir"}
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
