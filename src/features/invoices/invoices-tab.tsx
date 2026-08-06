"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, Calculator, Check, CheckCircle2, ChevronLeft, ChevronRight, Copy, FileText, Loader2, RotateCcw, Settings, Trash2 } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { isAccountNegative, getAvailableBalance } from "@/lib/balance"
import { ImportPdfDialog } from "./import-pdf-dialog"

interface CardItem { id: string; name: string; color: string }
interface BankAccountItem { id: string; name: string; balance: number; overdraftLimit: number }
interface Invoice { id: string; month: string; dueDate: string; amount: number; status: "PENDING" | "PAID"; card: CardItem; paymentMethod?: string | null; paymentBankAccountId?: string | null; importSessionId?: string | null }

function InvoiceActionIcon({
  label,
  icon,
  tone = "muted",
  onClick,
}: {
  label: string
  icon: ReactNode
  tone?: "muted" | "success"
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={label}
        onClick={onClick}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "cursor-pointer rounded-full border transition-colors",
          tone === "muted" && "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
          tone === "success" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-700"
        )}
      >
        {icon}
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

const paymentMethods = [
  { value: "PIX", label: "Pix", needsAccount: true },
  { value: "TED", label: "TED", needsAccount: true },
  { value: "DEBIT", label: "Débito em conta", needsAccount: true },
  { value: "CASH", label: "Dinheiro", needsAccount: false },
  { value: "BANK_SLIP", label: "Boleto", needsAccount: false },
]

const methodLabels: Record<string, string> = { PIX: "Pix", TED: "TED", DEBIT: "Débito", CASH: "Dinheiro", BANK_SLIP: "Boleto" }

export function InvoicesTab() {
  const router = useRouter()
  const [cards, setCards] = useState<CardItem[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [month, setMonth] = useState(currentMonth)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [creating, setCreating] = useState(false)
  const [copiando, setCopiando] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null)
  const [payMethod, setPayMethod] = useState("PIX")
  const [payAccountId, setPayAccountId] = useState("")
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState("")
  const [simulatorOpen, setSimulatorOpen] = useState(false)
  const [simInvoiceId, setSimInvoiceId] = useState("")
  const [simAccountId, setSimAccountId] = useState("")
  const [simAmount, setSimAmount] = useState("")
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [prevInvoices, setPrevInvoices] = useState<Invoice[]>([])
  const [selectedCopyIds, setSelectedCopyIds] = useState<string[]>([])
  const [loadingPrev, setLoadingPrev] = useState(false)
  const [copySourceMonth, setCopySourceMonth] = useState(() => previousMonth(month))
  const [availableMonths, setAvailableMonths] = useState<{ month: string; count: number }[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [sortField, setSortField] = useState<"card" | "dueDate" | "amount" | "status">("dueDate")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importInvoiceId, setImportInvoiceId] = useState<string | null>(null)
  const [importStandaloneOpen, setImportStandaloneOpen] = useState(false)
  const inFlightUpdateRef = useRef(false)
  const editFormRef = useRef<HTMLFormElement>(null)

  function fetchData() {
    return Promise.all([
      fetch("/api/cards"),
      fetch(`/api/invoices?month=${month}`),
      fetch("/api/bank-accounts"),
    ]).then(async ([cardsRes, invoicesRes, accountsRes]) => {
      if (cardsRes.ok) setCards(await cardsRes.json())
      if (invoicesRes.ok) setInvoices(await invoicesRes.json())
      if (accountsRes.ok) setBankAccounts(await accountsRes.json())
    })
  }

  const loadedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    if (loadedRef.current) setLoading(true)
    fetchData().then(() => {
      if (!cancelled) {
        loadedRef.current = true
        setLoading(false)
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  const openPayDialog = (invoice: Invoice) => {
    setPayingInvoice(invoice)
    setPayMethod("PIX")
    setPayAccountId("")
    setPayError("")
  }

  const handlePay = async () => {
    if (!payingInvoice) return
    const method = paymentMethods.find((m) => m.value === payMethod)
    if (method?.needsAccount && !payAccountId) {
      setPayError("Selecione uma conta")
      return
    }
    setPaying(true)
    setPayError("")
    const res = await fetch(`/api/invoices/${payingInvoice.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentMethod: payMethod,
        bankAccountId: method?.needsAccount ? payAccountId : null,
      }),
    })
    setPaying(false)
    if (res.ok) {
      toast.success("Fatura paga com sucesso!")
      setPayingInvoice(null)
      fetchData()
    } else {
      const err = await res.json()
      setPayError(err.error ?? "Erro ao pagar")
    }
  }

  const handleUnpay = async (invoiceId: string) => {
    const res = await fetch(`/api/invoices/${invoiceId}/unpay`, { method: "POST" })
    if (res.ok) fetchData()
  }

  const handleCreate = async (formData: FormData) => {
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: formData.get("cardId"), month, dueDate: formData.get("dueDate"), amount: formData.get("amount"), status: formData.get("status") }),
    })
    if (res.ok) {
      const created = await res.json()
      toast.success("Fatura criada!")
      setCreating(false)
      setInvoices((prev) => [...prev, created])
    } else {
      toast.error("Erro ao criar fatura")
    }
  }

  const handleUpdate = async (invoiceId: string, formData: FormData) => {
    if (inFlightUpdateRef.current) return
    inFlightUpdateRef.current = true
    setUpdatingId(invoiceId)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: formData.get("cardId"), dueDate: formData.get("dueDate"), amount: formData.get("amount"), status: formData.get("status") }),
      })
      if (res.ok) {
        toast.success("Fatura atualizada!")
        setSelectedInvoice(null)
        fetchData()
      } else {
        toast.error("Erro ao atualizar fatura")
      }
    } finally {
      setUpdatingId(null)
      inFlightUpdateRef.current = false
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/invoices/${deleteTarget}`, { method: "DELETE" })
    setDeleteTarget(null)
    setSelectedInvoice(null)
    if (res.ok) {
      toast.success("Fatura excluída.")
    } else {
      toast.error("Não foi possível excluir a fatura.")
    }
    fetchData()
  }

  const handleCopyFromPrevious = async (invoiceIds?: string[]) => {
    setCopiando(true)
    await fetch("/api/invoices/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromMonth: copySourceMonth, toMonth: month, invoiceIds }),
    })
    setCopiando(false)
    setCopyDialogOpen(false)
    setSelectedCopyIds([])
    fetchData()
  }

  const openCopyDialog = async (sourceMonth?: string) => {
    const src = sourceMonth ?? copySourceMonth
    setCopySourceMonth(src)
    setLoadingPrev(true)
    const [monthsRes, invoicesRes] = await Promise.all([
      fetch("/api/invoices/months"),
      fetch(`/api/invoices?month=${src}`),
    ])
    if (monthsRes.ok) {
      const allMonths = (await monthsRes.json()) as { month: string; count: number }[]
      const months = allMonths.filter((m) => m.month < month)
      setAvailableMonths(months)
      if (months.length > 0 && !months.some((m: { month: string }) => m.month === src)) {
        setCopySourceMonth(months[0].month)
        const fallbackRes = await fetch(`/api/invoices?month=${months[0].month}`)
        if (fallbackRes.ok) {
          const data = await fallbackRes.json()
          setPrevInvoices(data)
          setSelectedCopyIds(data.map((i: Invoice) => i.id))
        }
        setLoadingPrev(false)
        setCopyDialogOpen(true)
        return
      }
    }
    if (invoicesRes.ok) {
      const data = await invoicesRes.json()
      setPrevInvoices(data)
      setSelectedCopyIds(data.map((i: Invoice) => i.id))
    }
    setLoadingPrev(false)
    setCopyDialogOpen(true)
  }

  const fetchPrevMonthInvoices = async (src: string) => {
    setCopySourceMonth(src)
    setLoadingPrev(true)
    const res = await fetch(`/api/invoices?month=${src}`)
    if (res.ok) {
      const data = await res.json()
      setPrevInvoices(data)
      setSelectedCopyIds(data.map((i: Invoice) => i.id))
    }
    setLoadingPrev(false)
  }

  const toggleCopyId = (id: string) => {
    setSelectedCopyIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    const all = invoices.map((i) => i.id)
    const allSelected = all.every((id) => selectedIds.has(id))
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(all))
  }

  function clearSelection() { setSelectedIds(new Set()) }

  const handleBatchDelete = async () => {
    setBatchDeleting(true)
    const ids = Array.from(selectedIds)
    const res = await fetch("/api/invoices/batch-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
    setBatchDeleting(false)
    setConfirmBatchDelete(false)
    if (res.ok) {
      toast.success(`${ids.length} fatura${ids.length !== 1 ? "s" : ""} excluída${ids.length !== 1 ? "s" : ""}.`)
      clearSelection()
    } else {
      toast.error("Não foi possível excluir as faturas.")
    }
    fetchData()
  }

  const currentMethod = paymentMethods.find((m) => m.value === payMethod)
  const totalAll = invoices.reduce((s, i) => s + i.amount, 0)
  const totalPaid = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.amount, 0)
  const totalPending = invoices.filter((i) => i.status === "PENDING").reduce((s, i) => s + i.amount, 0)

  const sortedInvoices = [...invoices].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    switch (sortField) {
      case "card": return dir * a.card.name.localeCompare(b.card.name)
      case "dueDate": return dir * (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      case "amount": return dir * (a.amount - b.amount)
      case "status": return dir * (a.status === b.status ? 0 : a.status === "PAID" ? -1 : 1)
      default: return 0
    }
  })

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortField(field); setSortDir("asc") }
  }

  function SortIcon({ field }: { field: typeof sortField }) {
    if (sortField !== field) return <span className="ml-1 text-muted-foreground/40">&#8693;</span>
    return <span className="ml-1">{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-bold tracking-tight">Faturas</h2><p className="text-sm text-muted-foreground">Valor final lançado manualmente por cartão.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border bg-background px-2 py-1">
            <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => setMonth(previousMonth(month))}><ChevronLeft className="size-4" /></Button>
            <span className="min-w-28 text-center text-sm font-medium capitalize">{monthLabel(month)}</span>
            <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => setMonth(nextMonth(month))}><ChevronRight className="size-4" /></Button>
          </div>
          <Button
            size="sm"
            variant={month === currentMonth() ? "default" : "ghost"}
            onClick={() => setMonth(currentMonth())}
          >
            Hoje
          </Button>
          <div className="h-5 w-px bg-border hidden sm:block" />
          <Button size="sm" variant="outline" onClick={() => openCopyDialog()} disabled={copiando}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copiar
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setSimulatorOpen(true); setSimInvoiceId(""); setSimAccountId(""); setSimAmount("") }}>
            <Calculator className="mr-1 h-4 w-4" /> Simular
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportStandaloneOpen(true)}>
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Importar PDF
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>Nova fatura</Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""}</span>
          <Button size="sm" variant="destructive" className="gap-2" onClick={() => setConfirmBatchDelete(true)}>
            <Trash2 className="h-4 w-4" /> Excluir selecionadas
          </Button>
          <Button size="sm" variant="outline" onClick={clearSelection}>Limpar</Button>
        </div>
      )}

      <div className="hidden gap-4 md:grid md:grid-cols-3">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total do mês</p><p className="text-2xl font-bold">{loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : formatCurrency(totalAll)}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pago</p><p className="text-2xl font-bold">{loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : formatCurrency(totalPaid)}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">A pagar</p><p className="text-2xl font-bold">{loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : formatCurrency(totalPending)}</p></CardContent></Card>
      </div>

      <Card className="border-0 shadow-sm md:hidden">
        <CardContent className="grid grid-cols-3 gap-2 p-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-muted-foreground">Total</p>
            <p className="truncate text-sm font-bold tabular-nums">{loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : formatCurrency(totalAll)}</p>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-muted-foreground">Pago</p>
            <p className="truncate text-sm font-bold tabular-nums">{loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : formatCurrency(totalPaid)}</p>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-muted-foreground">A pagar</p>
            <p className="truncate text-sm font-bold tabular-nums">{loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : formatCurrency(totalPending)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="hidden overflow-hidden rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-3 py-3">
                <div className="flex items-center justify-center">
                  <input type="checkbox" className="h-4 w-4" checked={invoices.length > 0 && invoices.every((i) => selectedIds.has(i.id))} onChange={selectAll} />
                </div>
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><button type="button" className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("card")}>Cartão<SortIcon field="card" /></button></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground"><button type="button" className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("dueDate")}>Vencimento<SortIcon field="dueDate" /></button></th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground"><button type="button" className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("amount")}>Valor<SortIcon field="amount" /></button></th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground"><button type="button" className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("status")}>Status<SortIcon field="status" /></button></th>
              <th className="w-[112px] px-4 py-3 text-center font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Atualizando...</span> : "Nenhuma fatura neste mês."}
              </td></tr>
            ) : sortedInvoices.map((invoice) => (
              <tr key={invoice.id} className="border-b transition-colors hover:bg-muted/50">
                <td className="w-10 px-3 py-3">
                  <div className="flex items-center justify-center">
                    <input type="checkbox" className="h-4 w-4" checked={selectedIds.has(invoice.id)} onChange={() => toggleSelect(invoice.id)} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => setSelectedInvoice(invoice)} className="flex items-center gap-3 text-left font-medium hover:underline">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: invoice.card.color }}>{invoice.card.name.charAt(0)}</span>
                    {invoice.card.name}
                    {invoice.importSessionId && (
                      <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); window.history.replaceState(null, "", "/cards?tab=invoices"); router.push(`/invoices/${invoice.id}/analysis`) }} className="ml-1.5 cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <BarChart3 className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(invoice.dueDate)}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(invoice.amount)}</td>
                <td className="px-4 py-3 text-center">
                  {invoice.status === "PAID" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                      Pago{invoice.paymentMethod ? ` · ${methodLabels[invoice.paymentMethod] ?? invoice.paymentMethod}` : ""}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">Pendente</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-2">
                    {invoice.status === "PENDING" ? (
                      <InvoiceActionIcon
                        label="Pagar fatura"
                        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                        onClick={() => openPayDialog(invoice)}
                      />
                    ) : (
                      <InvoiceActionIcon
                        label="Estornar pagamento"
                        tone="success"
                        icon={<RotateCcw className="h-3.5 w-3.5" />}
                        onClick={() => handleUnpay(invoice.id)}
                      />
                    )}
                    <InvoiceActionIcon
                      label="Editar fatura"
                      icon={<Settings className="h-3.5 w-3.5" />}
                      onClick={() => setSelectedInvoice(invoice)}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length > 0 && (
              <tr className="border-t bg-muted/50 font-medium">
                <td className="w-10 px-3 py-3" />
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right">{formatCurrency(totalAll)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs text-muted-foreground">{invoices.filter((i) => i.status === "PAID").length} pago{invoices.filter((i) => i.status === "PAID").length !== 1 ? "s" : ""} · {invoices.filter((i) => i.status === "PENDING").length} pendente{invoices.filter((i) => i.status === "PENDING").length !== 1 ? "s" : ""}</span>
                </td>
                <td className="px-4 py-3" />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {invoices.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-sm text-muted-foreground">
            {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Atualizando...</span> : "Nenhuma fatura neste mês."}
          </CardContent></Card>
        ) : invoices.map((invoice) => (
          <div key={invoice.id} className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setSelectedInvoice(invoice)} className="flex flex-1 items-center gap-3 text-left min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: invoice.card.color }}>{invoice.card.name.charAt(0)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium truncate">{invoice.card.name}</span>
                      {invoice.importSessionId && <BarChart3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    </div>
                    <strong className="shrink-0">{formatCurrency(invoice.amount)}</strong>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    Vence {formatDate(invoice.dueDate)} ·{" "}
                    {invoice.status === "PAID"
                      ? `Pago${invoice.paymentMethod ? ` via ${methodLabels[invoice.paymentMethod] ?? invoice.paymentMethod}` : ""}`
                      : "Pendente"}
                  </p>
                </div>
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                aria-label="Editar fatura"
                onClick={() => setSelectedInvoice(invoice)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
              <div className="mt-2 ml-12">
                {invoice.status === "PENDING" ? (
                  <span
                    role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); openPayDialog(invoice) } }}
                    onClick={(e) => { e.stopPropagation(); openPayDialog(invoice) }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Pagar
                  </span>
                ) : (
                  <span
                    role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleUnpay(invoice.id) } }}
                    onClick={(e) => { e.stopPropagation(); handleUnpay(invoice.id) }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 fill-emerald-600 text-white" />
                    Estornar
                  </span>
                )}
              </div>
            </div>
        ))}
      </div>

      <Dialog open={!!payingInvoice} onOpenChange={(open) => { if (!open) setPayingInvoice(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Pagar fatura</DialogTitle>
          </DialogHeader>
          {payingInvoice && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: payingInvoice.card.color }}>{payingInvoice.card.name.charAt(0)}</div>
                <div>
                  <p className="font-medium">{payingInvoice.card.name}</p>
                  <p className="text-lg font-bold">{formatCurrency(payingInvoice.amount)}</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Como pagar</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  {paymentMethods.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {currentMethod?.needsAccount && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Conta</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={payAccountId}
                    onChange={(e) => setPayAccountId(e.target.value)}
                  >
                    <option value="">Selecione uma conta</option>
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                    ))}
                  </select>
                </div>
              )}

              {(() => {
                if (!currentMethod?.needsAccount || !payAccountId) return null
                const acc = bankAccounts.find((a) => a.id === payAccountId)
                if (!acc) return null
                const after = acc.balance - payingInvoice.amount
                const available = getAvailableBalance(acc.balance, acc.overdraftLimit)
                return (
                  <div className="space-y-1 rounded-lg bg-muted p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saldo</span>
                      <span className={isAccountNegative(acc.balance, acc.overdraftLimit) ? "font-medium text-red-600" : "font-medium"}>{formatCurrency(acc.balance)}</span>
                    </div>
                    {acc.overdraftLimit > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Disponível (c/ cheque)</span>
                        <span className={available < 0 ? "font-medium text-red-600" : "font-medium text-emerald-600"}>{formatCurrency(available)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-muted-foreground">Após pagamento</span>
                      <span className={isAccountNegative(after, acc.overdraftLimit) ? "font-bold text-destructive" : "font-bold text-emerald-600"}>{formatCurrency(after)}</span>
                    </div>
                    {isAccountNegative(after, acc.overdraftLimit) && (
                      <p className="text-xs text-destructive">Saldo insuficiente (considerando cheque especial).</p>
                    )}
                  </div>
                )
              })()}

              {payError && <p className="text-sm text-destructive">{payError}</p>}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setPayingInvoice(null)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handlePay} disabled={paying}>
                  {paying ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                  Confirmar pagamento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={simulatorOpen} onOpenChange={(open) => { if (!open) setSimulatorOpen(false) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Simular pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Fatura</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={simInvoiceId}
                onChange={(e) => {
                  setSimInvoiceId(e.target.value)
                  const inv = invoices.find((i) => i.id === e.target.value)
                  if (inv) setSimAmount(String(inv.amount))
                }}
              >
                <option value="">Selecione uma fatura</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>{inv.card.name} — {formatCurrency(inv.amount)}{inv.status === "PAID" ? " (paga)" : ""}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Conta</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={simAccountId}
                onChange={(e) => setSimAccountId(e.target.value)}
              >
                <option value="">Selecione uma conta</option>
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Valor a pagar</label>
              <Input type="number" min="0" step="0.01" placeholder="0,00" value={simAmount} onChange={(e) => setSimAmount(e.target.value)} />
            </div>
            {(() => {
              const simInv = invoices.find((i) => i.id === simInvoiceId)
              const simAcc = bankAccounts.find((a) => a.id === simAccountId)
              const amount = Number.parseFloat(simAmount) || 0
              if (!simInv || !simAcc || amount <= 0) return null
              const after = simAcc.balance - amount
              const available = getAvailableBalance(simAcc.balance, simAcc.overdraftLimit)
              return (
                <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saldo atual</span>
                    <span className={isAccountNegative(simAcc.balance, simAcc.overdraftLimit) ? "font-medium text-red-600" : "font-medium"}>{formatCurrency(simAcc.balance)}</span>
                  </div>
                  {simAcc.overdraftLimit > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Disponível (c/ cheque)</span>
                      <span className={available < 0 ? "font-medium text-red-600" : "font-medium text-emerald-600"}>{formatCurrency(available)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pagamento</span>
                    <span className="font-medium text-destructive">-{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Saldo após</span>
                    <span className={`font-bold ${isAccountNegative(after, simAcc.overdraftLimit) ? "text-destructive" : "text-emerald-600"}`}>
                      {formatCurrency(after)}
                    </span>
                  </div>
                  {isAccountNegative(after, simAcc.overdraftLimit) && (
                    <p className="text-xs text-destructive">Saldo insuficiente (considerando cheque especial).</p>
                  )}
                </div>
              )
            })()}
            <Button className="w-full" variant="outline" onClick={() => setSimulatorOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={creating || !!selectedInvoice} onOpenChange={(open) => { if (!open) { setCreating(false); setSelectedInvoice(null) } }}>
        <SheetContent className="w-full sm:max-w-md">
          {creating ? (
            <>
              <SheetHeader><SheetTitle>Nova fatura</SheetTitle></SheetHeader>
              <form action={handleCreate} className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="mt-4 grid gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Cartão</label>
                    <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="cardId" required>
                      {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Data de vencimento</label>
                    <Input name="dueDate" type="date" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Valor</label>
                    <Input name="amount" type="number" min="0" step="0.01" placeholder="0,00" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Status</label>
                    <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="status" defaultValue="PENDING">
                      <option value="PENDING">Pendente</option>
                      <option value="PAID">Pago</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" className="mt-6 w-full">Salvar</Button>
              </form>
            </>
          ) : selectedInvoice ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedInvoice.card.name}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="mt-4 space-y-4">
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="text-2xl font-bold">{formatCurrency(selectedInvoice.amount)}</p>
                  </div>
                  <form ref={editFormRef} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Cartão</label>
                      <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="cardId" defaultValue={selectedInvoice.card.id}>
                        {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Data de vencimento</label>
                      <Input name="dueDate" type="date" defaultValue={selectedInvoice.dueDate.slice(0, 10)} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Valor</label>
                      <Input name="amount" type="number" min="0" step="0.01" defaultValue={selectedInvoice.amount} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Status</label>
                      <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="status" defaultValue={selectedInvoice.status}>
                        <option value="PENDING">Pendente</option>
                        <option value="PAID">Pago</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" className="flex-1" disabled={updatingId === selectedInvoice.id} onClick={() => handleUpdate(selectedInvoice.id, new FormData(editFormRef.current!))}>
                        {updatingId === selectedInvoice.id ? "Salvando..." : "Salvar alterações"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setDeleteTarget(selectedInvoice.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </form>

                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground mb-2">Importação de fatura</p>
                    {selectedInvoice.importSessionId ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => { window.history.replaceState(null, "", "/cards?tab=invoices"); router.push(`/invoices/${selectedInvoice.id}/analysis`) }}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Ver análise
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setImportInvoiceId(selectedInvoice.id)
                          setImportDialogOpen(true)
                        }}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Importar PDF
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }} title="Excluir fatura" description="Tem certeza que deseja excluir esta fatura? Esta ação não pode ser feita." onConfirm={handleDelete} confirmText="Excluir" />

      <ConfirmDialog
        open={confirmBatchDelete}
        onOpenChange={setConfirmBatchDelete}
        title="Excluir faturas selecionadas"
        description={`Tem certeza? ${selectedIds.size} fatura${selectedIds.size !== 1 ? "s" : ""} será${selectedIds.size !== 1 ? "ão" : ""} excluída${selectedIds.size !== 1 ? "s" : ""}.`}
        confirmText={batchDeleting ? "Excluindo..." : "Excluir"}
        loading={batchDeleting}
        onConfirm={handleBatchDelete}
      />

      <Dialog open={copyDialogOpen} onOpenChange={(open) => { if (!open) setCopyDialogOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copiar faturas</DialogTitle>
          </DialogHeader>
          {availableMonths.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma fatura disponível para copiar.</p>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium">Mês de origem</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={copySourceMonth}
                  onChange={(e) => fetchPrevMonthInvoices(e.target.value)}
                >
                  {availableMonths.map((m) => (
                    <option key={m.month} value={m.month}>
                      {monthLabel(m.month)}
                    </option>
                  ))}
                </select>
              </div>
              {loadingPrev ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : prevInvoices.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma fatura encontrada neste mês.</p>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Selecione as faturas que deseja copiar para {monthLabel(month)}:</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {prevInvoices.map((inv) => (
                      <button
                        key={inv.id}
                        type="button"
                        onClick={() => toggleCopyId(inv.id)}
                        className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors ${selectedCopyIds.includes(inv.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${selectedCopyIds.includes(inv.id) ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                          {selectedCopyIds.includes(inv.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                        </span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: inv.card.color }}>{inv.card.name.charAt(0)}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{inv.card.name}</p>
                          <p className="text-xs text-muted-foreground">Vence {formatDate(inv.dueDate)}</p>
                        </div>
                        <span className="text-sm font-medium">{formatCurrency(inv.amount)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setCopyDialogOpen(false)}>Cancelar</Button>
                    <Button
                      className="flex-1"
                      disabled={selectedCopyIds.length === 0 || copiando}
                      onClick={() => handleCopyFromPrevious(selectedCopyIds.length === prevInvoices.length ? undefined : selectedCopyIds)}
                    >
                      {copiando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Copy className="mr-1 h-4 w-4" />}
                      {selectedCopyIds.length === prevInvoices.length ? "Copiar todas" : `Copiar ${selectedCopyIds.length}`}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {importInvoiceId && (
        <ImportPdfDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          invoiceId={importInvoiceId}
          onImportComplete={() => {
            fetchData()
            setSelectedInvoice(null)
          }}
        />
      )}

      {importStandaloneOpen && (
        <ImportPdfDialog
          open={importStandaloneOpen}
          onOpenChange={setImportStandaloneOpen}
          cards={cards}
          onImportComplete={(invId) => {
            fetchData()
            if (invId) { window.history.replaceState(null, "", "/cards?tab=invoices"); router.push(`/invoices/${invId}/analysis`) }
          }}
        />
      )}
    </div>
  )
}
