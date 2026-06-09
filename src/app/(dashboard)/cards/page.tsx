"use client"

import { useEffect, useState } from "react"
import { ChevronRight, CreditCard, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

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

  const fetchData = async () => {
    const [cardsRes, accountsRes] = await Promise.all([
      fetch("/api/cards"),
      fetch("/api/bank-accounts"),
    ])
    if (cardsRes.ok) setCards(await cardsRes.json())
    if (accountsRes.ok) setBankAccounts(await accountsRes.json())
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreate = async (formData: FormData) => {
    await fetch("/api/cards", {
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
    fetchData()
  }

  const handleUpdate = async (cardId: string, formData: FormData) => {
    await fetch(`/api/cards/${cardId}`, {
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
    setSelectedCard(null)
    fetchData()
  }

  const handleDelete = async (cardId: string) => {
    await fetch(`/api/cards/${cardId}`, { method: "DELETE" })
    setConfirmDelete(null)
    setSelectedCard(null)
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cartões</h1>
          <p className="text-muted-foreground">Cadastre cartões usados nas faturas mensais.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" />Novo cartão</Button>
      </div>

      <div className="space-y-2">
        {cards.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum cartão cadastrado.</CardContent></Card>
        ) : cards.map((card) => (
          <button key={card.id} type="button" onClick={() => setSelectedCard(card)} className="flex w-full items-center justify-between rounded-lg border bg-card p-4 text-left text-sm transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <span className="rounded-lg p-2 text-white" style={{ backgroundColor: card.color }}><CreditCard className="h-4 w-4" /></span>
              <div>
                <p className="font-medium">{card.name}</p>
                <p className="text-xs text-muted-foreground">{card.brand ?? "Sem bandeira"} · Fecha {card.closingDay ?? "-"} · Vence {card.dueDay ?? "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{card.bankAccount?.name ?? "sem conta"}</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </button>
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
                <form action={(formData) => handleUpdate(selectedCard.id, formData)} className="mt-4 space-y-4">
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
                  <Button type="submit" className="w-full">Salvar alterações</Button>
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
  )
}
