"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { formatCurrency, formatDate } from "@/lib/utils"

interface CardItem { id: string; name: string }
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copiando, setCopiando] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const [cardsRes, invoicesRes] = await Promise.all([fetch("/api/cards"), fetch(`/api/invoices?month=${month}`)])
    if (cardsRes.ok) setCards(await cardsRes.json())
    if (invoicesRes.ok) setInvoices(await invoicesRes.json())
  }, [month])

  useEffect(() => {
    fetchData() // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchData])

  const handleCreate = async (formData: FormData) => {
    await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: formData.get("cardId"), month, dueDate: formData.get("dueDate"), amount: formData.get("amount"), status: formData.get("status") }),
    })
    fetchData()
  }

  const handleUpdate = async (invoiceId: string, formData: FormData) => {
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: formData.get("cardId"), dueDate: formData.get("dueDate"), amount: formData.get("amount"), status: formData.get("status") }),
    })
    setEditingId(null)
    fetchData()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await fetch(`/api/invoices/${deleteTarget}`, { method: "DELETE" })
    setDeleteTarget(null)
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
          <Input className="w-40" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      </div>
      <Card className="border-0 shadow-sm" key={`create-${month}`}>
        <CardHeader><CardTitle className="text-base">Nova fatura</CardTitle></CardHeader>
        <CardContent>
          <form action={handleCreate} className="grid gap-3 md:grid-cols-5">
            <select className="rounded-md border bg-background px-3 py-2 text-sm" name="cardId" required>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select>
            <Input name="dueDate" type="date" required />
            <Input name="amount" type="number" min="0" step="0.01" placeholder="Valor" required />
            <select className="rounded-md border bg-background px-3 py-2 text-sm" name="status" defaultValue="PENDING"><option value="PENDING">Pendente</option><option value="PAID">Pago</option></select>
            <Button type="submit">Salvar</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        {invoices.map((invoice) => (
          <Card key={invoice.id} className="border-0 shadow-sm">
            <CardContent className="p-5">
              {editingId === invoice.id ? (
                <form action={(fd) => handleUpdate(invoice.id, fd)} className="space-y-3">
                  <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="cardId" defaultValue={invoice.card.id}>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select>
                  <Input name="dueDate" type="date" defaultValue={invoice.dueDate.slice(0, 10)} required />
                  <Input name="amount" type="number" min="0" step="0.01" defaultValue={invoice.amount} required />
                  <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="status" defaultValue={invoice.status}><option value="PENDING">Pendente</option><option value="PAID">Pago</option></select>
                  <div className="flex gap-2">
                    <Button size="sm" type="submit">Salvar</Button>
                    <Button size="sm" type="button" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{invoice.card.name}</p>
                      <p className="text-2xl font-bold">{formatCurrency(invoice.amount)}</p>
                      <p className="text-sm text-muted-foreground">Vence em {formatDate(invoice.dueDate)}</p>
                      <p className="text-sm">{invoice.status === "PAID" ? "Pago" : "Pendente"}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditingId(invoice.id)}><Pencil className="mr-2 h-3 w-3" />Editar</Button>
                      <Button size="sm" variant="outline" onClick={() => setDeleteTarget(invoice.id)}><Trash2 className="mr-2 h-3 w-3" />Excluir</Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }} title="Excluir fatura" description="Tem certeza que deseja excluir esta fatura? Esta ação não pode ser desfeita." onConfirm={handleDelete} confirmText="Excluir" />
    </div>
  )
}
