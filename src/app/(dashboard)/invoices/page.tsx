"use client"

import { useCallback, useEffect, useState } from "react"
import { Calculator, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/utils"

interface CardItem { id: string; name: string; color: string }
interface BankAccountItem { id: string; name: string; balance: number }
interface Invoice { id: string; month: string; dueDate: string; amount: number; status: "PENDING" | "PAID"; card: CardItem; paymentMethod?: string | null; paymentBankAccountId?: string | null }

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

export default function InvoicesPage() {
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

  const fetchData = useCallback(async () => {
    const [cardsRes, invoicesRes, accountsRes] = await Promise.all([
      fetch("/api/cards"),
      fetch(`/api/invoices?month=${month}`),
      fetch("/api/bank-accounts"),
    ])
    if (cardsRes.ok) setCards(await cardsRes.json())
    if (invoicesRes.ok) setInvoices(await invoicesRes.json())
    if (accountsRes.ok) setBankAccounts(await accountsRes.json())
  }, [month])

  useEffect(() => { fetchData() }, [fetchData])

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
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await fetch(`/api/invoices/${deleteTarget}`, { method: "DELETE" })
    setDeleteTarget(null)
    setSelectedInvoice(null)
    fetchData()
  }

  const handleCopyFromPrevious = async () => {
    const prev = previousMonth(month)
    setCopiando(true)
    await fetch("/api/invoices/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromMonth: prev, toMonth: month }),
    })
    setCopiando(false)
    fetchData()
  }

  const currentMethod = paymentMethods.find((m) => m.value === payMethod)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Faturas</h1><p className="text-muted-foreground">Valor final lançado manualmente por cartão.</p></div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleCopyFromPrevious} disabled={copiando}>
            {copiando ? "Copiando..." : `Copiar de ${previousMonth(month)}`}
          </Button>
          <div className="flex items-center gap-1 rounded-md border bg-background px-2 py-1">
            <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => setMonth(previousMonth(month))}><ChevronLeft className="size-4" /></Button>
            <span className="min-w-28 text-center text-sm font-medium capitalize">{monthLabel(month)}</span>
            <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => setMonth(nextMonth(month))}><ChevronRight className="size-4" /></Button>
          </div>
          <Input className="w-32" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <Button variant="outline" size="sm" onClick={() => { setSimulatorOpen(true); setSimInvoiceId(""); setSimAccountId(""); setSimAmount("") }}>
            <Calculator className="mr-1 h-4 w-4" /> Simular
          </Button>
          <Button onClick={() => setCreating(true)}>Nova fatura</Button>
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cartão</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vencimento</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhuma fatura neste mês.</td></tr>
            ) : invoices.map((invoice) => (
              <tr key={invoice.id} className="border-b transition-colors hover:bg-muted/50">
                <td className="px-4 py-3">
                  <button type="button" onClick={() => setSelectedInvoice(invoice)} className="flex items-center gap-3 text-left font-medium hover:underline">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: invoice.card.color }}>{invoice.card.name.charAt(0)}</span>
                    {invoice.card.name}
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
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    {invoice.status === "PENDING" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openPayDialog(invoice)}
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Pagar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-emerald-600 hover:text-emerald-700"
                        onClick={() => handleUnpay(invoice.id)}
                      >
                        Estornar
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Editar fatura"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Excluir fatura"
                      onClick={() => setDeleteTarget(invoice.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {invoices.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma fatura neste mês.</CardContent></Card>
        ) : invoices.map((invoice) => (
          <div key={invoice.id} className="flex items-center gap-2">
            <button type="button" onClick={() => setSelectedInvoice(invoice)} className="w-full rounded-lg border bg-card p-4 text-left text-sm transition-colors hover:bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: invoice.card.color }}>{invoice.card.name.charAt(0)}</div>
                  <span className="font-medium">{invoice.card.name}</span>
                </div>
                <strong>{formatCurrency(invoice.amount)}</strong>
              </div>
              <p className="mt-0.5 pl-12 text-xs text-muted-foreground">
                Vence {formatDate(invoice.dueDate)} ·{" "}
                {invoice.status === "PAID"
                  ? `Pago${invoice.paymentMethod ? ` via ${methodLabels[invoice.paymentMethod] ?? invoice.paymentMethod}` : ""}`
                  : "Pendente"}
              </p>
              <div className="mt-1 pl-12">
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
            </button>
            <div className="flex flex-col gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Editar fatura"
                onClick={() => setSelectedInvoice(invoice)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Excluir fatura"
                onClick={() => setDeleteTarget(invoice.id)}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
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
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              )}

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
              return (
                <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saldo atual</span>
                    <span className="font-medium">{formatCurrency(simAcc.balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pagamento</span>
                    <span className="font-medium text-destructive">-{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Saldo após</span>
                    <span className={`font-bold ${after >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {formatCurrency(after)}
                    </span>
                  </div>
                  {after < 0 && (
                    <p className="text-xs text-destructive">Saldo insuficiente após o pagamento.</p>
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
                  <form action={(formData) => handleUpdate(selectedInvoice.id, formData)} className="space-y-4">
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
                      <Button type="submit" className="flex-1">Salvar alterações</Button>
                      <Button type="button" variant="outline" onClick={() => setDeleteTarget(selectedInvoice.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </form>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }} title="Excluir fatura" description="Tem certeza que deseja excluir esta fatura? Esta ação não pode ser feita." onConfirm={handleDelete} confirmText="Excluir" />
    </div>
  )
}
