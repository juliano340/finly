"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { CreditCard, Loader2, Plus, Settings, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { InvoicesTab } from "@/features/invoices/invoices-tab"

interface CardItem {
  id: string
  name: string
  brand: string | null
  color: string
  closingDay: number | null
  dueDay: number | null
  bankAccountId: string | null
  bankAccount: { id: string; name: string; institution: string | null } | null
}

interface BankAccountItem {
  id: string
  name: string
  institution: string | null
}

export default function CardsPage() {
  const [cards, setCards] = useState<CardItem[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([])
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"cards" | "invoices">("cards")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("tab") === "invoices")
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab("invoices")
  }, [])
  const inFlightUpdateRef = useRef(false)
  const editFormRef = useRef<HTMLFormElement>(null)

  const fetchData = async () => {
    try {
      const [cardsRes, accountsRes] = await Promise.all([
        fetch("/api/cards"),
        fetch("/api/bank-accounts/options"),
      ])
      if (cardsRes.ok) setCards(await cardsRes.json())
      if (accountsRes.ok) setBankAccounts(await accountsRes.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreate = async (formData: FormData) => {
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        brand: formData.get("brand") || null,
        color: formData.get("color") || "#22C55E",
        closingDay: formData.get("closingDay") || null,
        dueDay: formData.get("dueDay") || null,
        bankAccountId: formData.get("bankAccountId") || null,
      }),
    })
    setCreating(false)
    if (res.ok) {
      toast.success("Cartão criado com sucesso.")
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? "Não foi possível criar o cartão.")
    }
    fetchData()
  }

  const handleUpdate = async (cardId: string, formData: FormData) => {
    if (inFlightUpdateRef.current) return
    inFlightUpdateRef.current = true
    setUpdatingId(cardId)
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          brand: formData.get("brand") || null,
          color: formData.get("color") || "#22C55E",
          closingDay: formData.get("closingDay") || null,
          dueDay: formData.get("dueDay") || null,
          bankAccountId: formData.get("bankAccountId") || null,
        }),
      })
      if (res.ok) {
        toast.success("Cartão atualizado com sucesso.")
        setSelectedCard(null)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? "Não foi possível atualizar o cartão.")
      }
      fetchData()
    } finally {
      setUpdatingId(null)
      inFlightUpdateRef.current = false
    }
  }

  const handleDelete = async (cardId: string) => {
    const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" })
    setConfirmDelete(null)
    setSelectedCard(null)
    if (res.ok) {
      toast.success("Cartão excluído.")
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? "Não foi possível excluir o cartão.")
    }
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cartões e Faturas</h1>
        <p className="text-muted-foreground">Gerencie seus cartões de crédito e faturas mensais.</p>
      </div>

      <div className="flex gap-1 rounded-md border bg-background p-1 w-fit">
        <button type="button" onClick={() => setActiveTab("cards")} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Cartões</button>
        <button type="button" onClick={() => setActiveTab("invoices")} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "invoices" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Faturas</button>
      </div>

      {activeTab === "cards" && (
        <div className="space-y-6">
          <div className="flex items-center justify-end">
            <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" />Novo cartão</Button>
          </div>

      <div className="hidden overflow-hidden rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cartão</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bandeira</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Conta</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Fechamento</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Vencimento</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground"><span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</span></td></tr>
            ) : cards.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum cartão cadastrado.</td></tr>
            ) : cards.map((card) => (
              <tr key={card.id} className="border-b transition-colors hover:bg-muted/50">
                <td className="px-4 py-3">
                  <button type="button" onClick={() => setSelectedCard(card)} className="flex items-center gap-3 text-left font-medium hover:underline">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ backgroundColor: card.color }}>
                      <CreditCard className="h-4 w-4" />
                    </span>
                    {card.name}
                  </button>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{card.brand ?? "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{card.bankAccount?.name ?? "-"}</td>
                <td className="px-4 py-3 text-center text-muted-foreground">{card.closingDay ?? "-"}</td>
                <td className="px-4 py-3 text-center text-muted-foreground">{card.dueDay ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Editar cartão"
                    onClick={() => setSelectedCard(card)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {loading ? (
          <Card className="border-0 shadow-sm"><CardContent className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</CardContent></Card>
        ) : cards.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum cartão cadastrado.</CardContent></Card>
        ) : cards.map((card) => (
          <div key={card.id} className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setSelectedCard(card)} className="flex flex-1 items-center gap-3 text-left min-w-0">
                <span className="shrink-0 rounded-lg p-2 text-white" style={{ backgroundColor: card.color }}><CreditCard className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{card.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{card.brand ?? "Sem bandeira"} · Fecha {card.closingDay ?? "-"} · Vence {card.dueDay ?? "-"}</p>
                  <p className="text-xs text-muted-foreground truncate">{card.bankAccount?.name ?? "Sem conta"}</p>
                </div>
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                aria-label="Editar cartão"
                onClick={() => setSelectedCard(card)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Sheet open={creating || !!selectedCard} onOpenChange={(open) => { if (!open) { setCreating(false); setSelectedCard(null) } }}>
        <SheetContent className="w-full sm:max-w-md">
          {creating ? (
            <>
              <SheetHeader><SheetTitle>Novo cartão</SheetTitle></SheetHeader>
              <form action={handleCreate} className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="mt-4 grid gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Nome do cartão</label>
                    <Input name="name" placeholder="Ex: NUBANK PLATINUM" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Bandeira</label>
                    <Input name="brand" placeholder="Ex: MASTERCARD" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Conta vinculada</label>
                    <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="bankAccountId" defaultValue="">
                      <option value="">Sem conta vinculada</option>
                      {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Dia fechamento</label>
                      <Input name="closingDay" type="number" min="1" max="31" placeholder="Ex: 15" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Dia vencimento</label>
                      <Input name="dueDay" type="number" min="1" max="31" placeholder="Ex: 10" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Cor:</label>
                    <Input name="color" type="color" defaultValue="#22C55E" className="w-16" />
                  </div>
                </div>
                <Button type="submit" className="mt-6 w-full">Salvar</Button>
              </form>
            </>
          ) : selectedCard ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="rounded-lg p-1.5 text-white" style={{ backgroundColor: selectedCard.color }}><CreditCard className="h-4 w-4" /></span>
                  {selectedCard.name}
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <form ref={editFormRef} className="mt-4 space-y-4">
                  <div className="grid gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Nome do cartão</label>
                      <Input name="name" defaultValue={selectedCard.name} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Bandeira</label>
                      <Input name="brand" defaultValue={selectedCard.brand ?? ""} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Conta vinculada</label>
                      <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="bankAccountId" defaultValue={selectedCard.bankAccountId ?? ""}>
                        <option value="">Sem conta vinculada</option>
                        {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Dia fechamento</label>
                        <Input name="closingDay" type="number" min="1" max="31" defaultValue={selectedCard.closingDay ?? ""} placeholder="Ex: 15" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Dia vencimento</label>
                        <Input name="dueDay" type="number" min="1" max="31" defaultValue={selectedCard.dueDay ?? ""} placeholder="Ex: 10" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Cor:</label>
                      <Input name="color" type="color" defaultValue={selectedCard.color} className="w-16" />
                    </div>
                  </div>
                  <Button type="button" className="w-full" disabled={updatingId === selectedCard.id} onClick={() => handleUpdate(selectedCard.id, new FormData(editFormRef.current!))}>
                    {updatingId === selectedCard.id ? "Salvando..." : "Salvar alterações"}
                  </Button>
                </form>
                <Button type="button" variant="destructive" className="mt-4 w-full" onClick={() => setConfirmDelete(selectedCard.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />Excluir cartão
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
        title="Excluir cartão"
        description="Tem certeza? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
        </div>
      )}

      {activeTab === "invoices" && (
        <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>}>
          <InvoicesTab />
        </Suspense>
      )}
    </div>
  )
}
