"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatCurrency } from "@/lib/utils"

interface Category { id: string; name: string }
interface CardItem { id: string; name: string }
interface BankAccountItem { id: string; name: string }
interface FixedCost { id: string; name: string; defaultAmount: number; categoryId: string; paymentMethod: string; paidInsideCard: boolean; cardId: string | null; bankAccountId: string | null; active: boolean; category: Category; card: CardItem | null; bankAccount: BankAccountItem | null }

export default function FixedCostsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<CardItem[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([])
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([])
  const [selectedItem, setSelectedItem] = useState<FixedCost | null>(null)
  const [creating, setCreating] = useState(false)
  const [insideCard, setInsideCard] = useState(false)
  const [updateError, setUpdateError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [occurrenceMap, setOccurrenceMap] = useState<Record<string, "PAID" | "PENDING">>({})
  const [payingId, setPayingId] = useState<string | null>(null)
  const [unpayingId, setUnpayingId] = useState<string | null>(null)

  function currentMonth() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  }

  const fetchData = useCallback(async () => {
    const month = currentMonth()
    const [catRes, cardRes, accountRes, fixedRes, occRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/cards"),
      fetch("/api/bank-accounts"),
      fetch("/api/fixed-costs"),
      fetch(`/api/fixed-costs/occurrences?month=${month}`),
    ])
    if (catRes.ok) setCategories((await catRes.json()).filter((c: Category & { type: string }) => c.type === "EXPENSE"))
    if (cardRes.ok) setCards(await cardRes.json())
    if (accountRes.ok) setBankAccounts(await accountRes.json())
    if (fixedRes.ok) setFixedCosts(await fixedRes.json())
    if (occRes.ok) {
      const occurrences: { fixedCostId: string; status: "PAID" | "PENDING" }[] = await occRes.json()
      const map: Record<string, "PAID" | "PENDING"> = {}
      for (const occ of occurrences) map[occ.fixedCostId] = occ.status
      setOccurrenceMap(map)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handlePay = async (fixedCostId: string) => {
    setPayingId(fixedCostId)
    try {
      const res = await fetch(`/api/fixed-costs/${fixedCostId}/pay`, { method: "POST" })
      if (res.ok) setOccurrenceMap((prev) => ({ ...prev, [fixedCostId]: "PAID" }))
    } finally {
      setPayingId(null)
    }
  }

  const handleUnpay = async (fixedCostId: string) => {
    setUnpayingId(fixedCostId)
    try {
      const res = await fetch(`/api/fixed-costs/${fixedCostId}/unpay`, { method: "POST" })
      if (res.ok) setOccurrenceMap((prev) => ({ ...prev, [fixedCostId]: "PENDING" }))
    } finally {
      setUnpayingId(null)
    }
  }

  const [createError, setCreateError] = useState("")

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

  const handleUpdate = async (item: FixedCost, formData: FormData) => {
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
    setSelectedItem(null)
    fetchData()
  }

  const handleDelete = async (itemId: string) => {
    await fetch(`/api/fixed-costs/${itemId}`, { method: "DELETE" })
    setConfirmDelete(null)
    setSelectedItem(null)
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Custos Fixos</h1><p className="text-muted-foreground">Contas mensais recorrentes, dentro ou fora do cartão.</p></div>
        <Button onClick={() => { setInsideCard(false); setCreating(true) }}>Novo custo fixo</Button>
      </div>

      <div className="space-y-2">
        {fixedCosts.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum custo fixo cadastrado.</CardContent></Card>
        ) : fixedCosts.map((item) => {
          const status = occurrenceMap[item.id]
          const isPaid = status === "PAID"
          const loading = payingId === item.id || unpayingId === item.id
          return (
          <div key={item.id} className="flex items-center gap-2">
            <button type="button" onClick={() => { setInsideCard(item.paidInsideCard); setSelectedItem(item) }} className="flex flex-1 items-center justify-between rounded-lg border bg-card p-4 text-left text-sm transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-xs font-bold">{item.name.charAt(0)}</div>
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category.name} · {item.paidInsideCard ? `No cartão ${item.card?.name ?? "-"}` : "Fora do cartão"} · {item.active ? "Ativo" : "Inativo"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!item.paidInsideCard && (
                  <span role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); isPaid ? handleUnpay(item.id) : handlePay(item.id) } }} onClick={(e) => { e.stopPropagation(); isPaid ? handleUnpay(item.id) : handlePay(item.id) }} className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${isPaid ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className={`h-4 w-4 ${isPaid ? "fill-emerald-600 text-white" : ""}`} />}
                  </span>
                )}
                <strong>{formatCurrency(item.defaultAmount)}</strong>
              </div>
            </button>
          </div>
        )})}
      </div>

      <Sheet open={creating || !!selectedItem} onOpenChange={(open) => { if (!open) { setCreating(false); setSelectedItem(null) } }}>
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
          ) : selectedItem ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedItem.name}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="mt-4 space-y-4">
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs text-muted-foreground">Valor padrão</p>
                    <p className="text-2xl font-bold">{formatCurrency(selectedItem.defaultAmount)}</p>
                  </div>
                  <form action={(formData) => handleUpdate(selectedItem, formData)} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Nome</label>
                      <Input name="name" defaultValue={selectedItem.name} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Valor padrão</label>
                      <Input name="defaultAmount" type="number" step="0.01" defaultValue={selectedItem.defaultAmount} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Categoria</label>
                      <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="categoryId" defaultValue={selectedItem.categoryId} required>
                        {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" defaultChecked={selectedItem.paidInsideCard} name="paidInsideCard" onChange={(e) => setInsideCard(e.target.checked)} />
                      Dentro do cartão
                    </label>
                    {!insideCard && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Método de pagamento</label>
                        <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="paymentMethod" defaultValue={selectedItem.paymentMethod}>
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
                        <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="cardId" defaultValue={selectedItem.cardId ?? ""} required>
                          <option value="">Selecione um cartão</option>
                          {cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Conta prevista (débito)</label>
                      <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="bankAccountId" defaultValue={selectedItem.bankAccountId ?? ""}>
                        <option value="">Sem conta prevista</option>
                        {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" defaultChecked={selectedItem.active} name="active" />
                      Ativo
                    </label>
                    {updateError && <p className="text-sm text-destructive">{updateError}</p>}
                    <Button type="submit" className="w-full">Salvar alterações</Button>
                  </form>
                  <Button type="button" variant="destructive" className="w-full" onClick={() => setConfirmDelete(selectedItem.id)}>
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
