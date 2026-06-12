"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatCurrency } from "@/lib/utils"

interface Category { id: string; name: string }
interface CardItem { id: string; name: string; color: string }
interface BankAccountItem { id: string; name: string }
interface FixedCostData { id: string; name: string; defaultAmount: number; categoryId: string; paymentMethod: string; paidInsideCard: boolean; cardId: string | null; bankAccountId: string | null; active: boolean; category: Category; card: CardItem | null; bankAccount: BankAccountItem | null }

interface Occurrence {
  id: string
  fixedCostId: string
  month: string
  amount: number
  status: "PENDING" | "PAID"
  paidAt: string | null
  fixedCost: FixedCostData
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

export default function FixedCostsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<CardItem[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([])
  const [occurrences, setOccurrences] = useState<Occurrence[]>([])
  const [month, setMonth] = useState(currentMonth)
  const [selectedTemplate, setSelectedTemplate] = useState<FixedCostData | null>(null)
  const [creating, setCreating] = useState(false)
  const [insideCard, setInsideCard] = useState(false)
  const [updateError, setUpdateError] = useState("")
  const [createError, setCreateError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [unpayingId, setUnpayingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const [catRes, cardRes, accountRes, occRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/cards"),
      fetch("/api/bank-accounts"),
      fetch(`/api/fixed-costs/occurrences?month=${month}`),
    ])
    if (catRes.ok) setCategories((await catRes.json()).filter((c: Category & { type: string }) => c.type === "EXPENSE"))
    if (cardRes.ok) setCards(await cardRes.json())
    if (accountRes.ok) setBankAccounts(await accountRes.json())
    if (occRes.ok) setOccurrences(await occRes.json())
  }, [month])

  useEffect(() => { fetchData() }, [fetchData])

  const handlePay = async (fixedCostId: string) => {
    setPayingId(fixedCostId)
    try {
      const res = await fetch(`/api/fixed-costs/${fixedCostId}/pay?month=${month}`, { method: "POST" })
      if (res.ok) fetchData()
    } finally {
      setPayingId(null)
    }
  }

  const handleUnpay = async (fixedCostId: string) => {
    setUnpayingId(fixedCostId)
    try {
      const res = await fetch(`/api/fixed-costs/${fixedCostId}/unpay?month=${month}`, { method: "POST" })
      if (res.ok) fetchData()
    } finally {
      setUnpayingId(null)
    }
  }

  const handleCreate = async (formData: FormData) => {
    const paidInsideCard = formData.get("paidInsideCard") === "on"
    setCreateError("")
    const res = await fetch("/api/fixed-costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        defaultAmount: formData.get("defaultAmount"),
        categoryId: formData.get("categoryId"),
        paymentMethod: paidInsideCard ? "CREDIT_CARD" : formData.get("paymentMethod"),
        paidInsideCard,
        cardId: paidInsideCard ? formData.get("cardId") : null,
        bankAccountId: formData.get("bankAccountId") || null,
        active: true,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      setCreateError(err.error ?? "Erro ao salvar")
      return
    }
    setCreating(false)
    fetchData()
  }

  const handleUpdate = async (item: FixedCostData, formData: FormData) => {
    const paidInsideCard = formData.get("paidInsideCard") === "on"
    setUpdateError("")
    const res = await fetch(`/api/fixed-costs/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        defaultAmount: formData.get("defaultAmount"),
        categoryId: formData.get("categoryId"),
        paymentMethod: paidInsideCard ? "CREDIT_CARD" : formData.get("paymentMethod"),
        paidInsideCard,
        cardId: paidInsideCard ? formData.get("cardId") : null,
        bankAccountId: formData.get("bankAccountId") || null,
        active: formData.get("active") === "on",
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      setUpdateError(err.error ?? "Erro ao salvar")
      return
    }
    setSelectedTemplate(null)
    fetchData()
  }

  const handleDelete = async (itemId: string) => {
    await fetch(`/api/fixed-costs/${itemId}`, { method: "DELETE" })
    setConfirmDelete(null)
    setSelectedTemplate(null)
    fetchData()
  }

  const totalPending = occurrences.filter((o) => o.status === "PENDING").reduce((s, o) => s + o.amount, 0)
  const totalPaid = occurrences.filter((o) => o.status === "PAID").reduce((s, o) => s + o.amount, 0)
  const totalAll = totalPending + totalPaid

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Custos Fixos</h1><p className="text-muted-foreground">Contas mensais recorrentes.</p></div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border bg-background px-2 py-1">
            <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => setMonth(previousMonth(month))}><ChevronLeft className="size-4" /></Button>
            <span className="min-w-28 text-center text-sm font-medium capitalize">{monthLabel(month)}</span>
            <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => setMonth(nextMonth(month))}><ChevronRight className="size-4" /></Button>
          </div>
          <Input className="w-32" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <Button onClick={() => { setInsideCard(false); setCreating(true) }}>Novo custo fixo</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total do mês</p><p className="text-2xl font-bold">{formatCurrency(totalAll)}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pago</p><p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">A pagar</p><p className="text-2xl font-bold">{formatCurrency(totalPending)}</p></CardContent></Card>
      </div>

      <div className="hidden overflow-hidden rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoria</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Origem</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {occurrences.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhum custo fixo neste mês.</td></tr>
            ) : occurrences.map((occ) => {
              const isLoading = payingId === occ.fixedCostId || unpayingId === occ.fixedCostId
              return (
                <tr key={occ.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => { setInsideCard(occ.fixedCost.paidInsideCard); setSelectedTemplate(occ.fixedCost) }} className="text-left font-medium hover:underline">
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
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(occ.amount)}</td>
                  <td className="px-4 py-3 text-center">
                    {occ.fixedCost.paidInsideCard ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600">Na fatura</span>
                    ) : occ.status === "PAID" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">Pago</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">Pendente</span>
                    )}
                    {!occ.fixedCost.paidInsideCard && (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => occ.status === "PAID" ? handleUnpay(occ.fixedCostId) : handlePay(occ.fixedCostId)}
                        className={`ml-2 inline-flex items-center gap-1 text-xs transition-colors ${occ.status === "PAID" ? "text-emerald-600 hover:text-emerald-700" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : occ.status === "PAID" ? "Estornar" : "Pagar"}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {occurrences.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum custo fixo neste mês.</CardContent></Card>
        ) : occurrences.map((occ) => {
          const isLoading = payingId === occ.fixedCostId || unpayingId === occ.fixedCostId
          return (
            <div key={occ.id} className="flex items-center gap-2">
              <button type="button" onClick={() => { setInsideCard(occ.fixedCost.paidInsideCard); setSelectedTemplate(occ.fixedCost) }} className="w-full rounded-lg border bg-card p-4 text-left text-sm transition-colors hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-xs font-bold">{occ.fixedCost.name.charAt(0)}</div>
                    <span className="font-medium">{occ.fixedCost.name}</span>
                  </div>
                  <strong>{formatCurrency(occ.amount)}</strong>
                </div>
                <p className="mt-0.5 pl-12 text-xs text-muted-foreground">{occ.fixedCost.category.name} · {occ.fixedCost.paidInsideCard ? `Cartão ${occ.fixedCost.card?.name ?? "-"}` : "Fora do cartão"}</p>
                <div className="mt-1 pl-12">
                  {occ.fixedCost.paidInsideCard ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600">Na fatura</span>
                  ) : (
                    <span
                      role="button" tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); occ.status === "PAID" ? handleUnpay(occ.fixedCostId) : handlePay(occ.fixedCostId) } }}
                      onClick={(e) => { e.stopPropagation(); occ.status === "PAID" ? handleUnpay(occ.fixedCostId) : handlePay(occ.fixedCostId) }}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${occ.status === "PAID" ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                      {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className={`h-3.5 w-3.5 ${occ.status === "PAID" ? "fill-emerald-600 text-white" : ""}`} />}
                      {occ.status === "PAID" ? "Estornar" : "Pagar"}
                    </span>
                  )}
                </div>
              </button>
            </div>
          )
        })}
      </div>

      <Sheet open={creating || !!selectedTemplate} onOpenChange={(open) => { if (!open) { setCreating(false); setSelectedTemplate(null) } }}>
        <SheetContent className="w-full sm:max-w-md">
          {creating ? (
            <>
              <SheetHeader><SheetTitle>Novo custo fixo</SheetTitle></SheetHeader>
              <form action={handleCreate} className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="mt-4 grid gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Nome</label>
                    <Input name="name" placeholder="Ex: INTERNET" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Valor padrão</label>
                    <Input name="defaultAmount" type="number" step="0.01" placeholder="0,00" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Categoria</label>
                    <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="categoryId" required>
                      {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
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
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Conta prevista (débito)</label>
                    <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="bankAccountId" defaultValue="">
                      <option value="">Sem conta prevista</option>
                      {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                    </select>
                  </div>
                </div>
                {createError && <p className="text-sm text-destructive">{createError}</p>}
                <Button type="submit" className="mt-6 w-full">Salvar</Button>
              </form>
            </>
          ) : selectedTemplate ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedTemplate.name}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="mt-4 space-y-4">
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs text-muted-foreground">Valor padrão</p>
                    <p className="text-2xl font-bold">{formatCurrency(selectedTemplate.defaultAmount)}</p>
                  </div>
                  <form action={(formData) => handleUpdate(selectedTemplate, formData)} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Nome</label>
                      <Input name="name" defaultValue={selectedTemplate.name} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Valor padrão</label>
                      <Input name="defaultAmount" type="number" step="0.01" defaultValue={selectedTemplate.defaultAmount} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Categoria</label>
                      <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="categoryId" defaultValue={selectedTemplate.categoryId} required>
                        {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>
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
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Conta prevista (débito)</label>
                      <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="bankAccountId" defaultValue={selectedTemplate.bankAccountId ?? ""}>
                        <option value="">Sem conta prevista</option>
                        {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" defaultChecked={selectedTemplate.active} name="active" />
                      Ativo
                    </label>
                    {updateError && <p className="text-sm text-destructive">{updateError}</p>}
                    <Button type="submit" className="w-full">Salvar alterações</Button>
                  </form>
                  <Button type="button" variant="destructive" className="w-full" onClick={() => setConfirmDelete(selectedTemplate.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />Excluir custo fixo
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
        title="Excluir custo fixo"
        description="Tem certeza? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </div>
  )
}
