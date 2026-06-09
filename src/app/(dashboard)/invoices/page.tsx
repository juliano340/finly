"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatCurrency, formatDate } from "@/lib/utils"

interface CardItem { id: string; name: string; color: string }
interface Invoice { id: string; month: string; dueDate: string; amount: number; status: "PENDING" | "PAID"; card: CardItem }

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

export default function InvoicesPage() {
  const [cards, setCards] = useState<CardItem[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [month, setMonth] = useState(currentMonth)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [creating, setCreating] = useState(false)
  const [copiando, setCopiando] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const [cardsRes, invoicesRes] = await Promise.all([fetch("/api/cards"), fetch(`/api/invoices?month=${month}`)])
    if (cardsRes.ok) setCards(await cardsRes.json())
    if (invoicesRes.ok) setInvoices(await invoicesRes.json())
  }, [month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreate = async (formData: FormData) => {
    await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: formData.get("cardId"), month, dueDate: formData.get("dueDate"), amount: formData.get("amount"), status: formData.get("status") }),
    })
    setCreating(false)
    fetchData()
  }

  const handleUpdate = async (invoiceId: string, formData: FormData) => {
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: formData.get("cardId"), dueDate: formData.get("dueDate"), amount: formData.get("amount"), status: formData.get("status") }),
    })
    setSelectedInvoice(null)
    fetchData()
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
          <Button onClick={() => setCreating(true)}>Nova fatura</Button>
        </div>
      </div>

      <div className="space-y-2">
        {invoices.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma fatura neste mês.</CardContent></Card>
        ) : invoices.map((invoice) => (
          <button key={invoice.id} type="button" onClick={() => setSelectedInvoice(invoice)} className="flex w-full items-center justify-between rounded-lg border bg-card p-4 text-left text-sm transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: invoice.card.color }}>{invoice.card.name.charAt(0)}</div>
              <div>
                <p className="font-medium">{invoice.card.name}</p>
                <p className="text-xs text-muted-foreground">Vence {formatDate(invoice.dueDate)} · {invoice.status === "PAID" ? "Pago" : "Pendente"}</p>
              </div>
            </div>
            <strong>{formatCurrency(invoice.amount)}</strong>
          </button>
        ))}
      </div>

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

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }} title="Excluir fatura" description="Tem certeza que deseja excluir esta fatura? Esta ação não pode ser desfeita." onConfirm={handleDelete} confirmText="Excluir" />
    </div>
  )
}
