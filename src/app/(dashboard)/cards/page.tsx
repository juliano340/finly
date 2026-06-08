"use client"

import { useEffect, useState } from "react"
import { CreditCard, Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

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
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchData = async () => {
    const [cardsRes, accountsRes] = await Promise.all([
      fetch("/api/cards"),
      fetch("/api/bank-accounts"),
    ])
    if (cardsRes.ok) setCards(await cardsRes.json())
    if (accountsRes.ok) setBankAccounts(await accountsRes.json())
  }

  useEffect(() => {
    fetchData() // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  const handleSubmit = async (formData: FormData) => {
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
    setEditingId(null)
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cartões</h1>
        <p className="text-muted-foreground">Cadastre cartões usados nas faturas mensais.</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base">Novo cartão</CardTitle></CardHeader>
        <CardContent>
          <form action={handleSubmit} className="grid gap-3 md:grid-cols-6">
            <Input name="name" placeholder="Nome" required />
            <Input name="brand" placeholder="Bandeira" />
            <Input name="color" type="color" defaultValue="#22C55E" />
            <Input name="closingDay" type="number" min="1" max="31" placeholder="Fechamento" />
            <Input name="dueDay" type="number" min="1" max="31" placeholder="Vencimento" />
            <select className="rounded-md border bg-background px-3 py-2 text-sm" name="bankAccountId" defaultValue="">
              <option value="">Sem conta vinculada</option>
              {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
            <Button className="md:col-span-6" type="submit"><Plus className="mr-2 h-4 w-4" />Salvar</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.id} className="border-0 shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-4">
                <div className="rounded-xl p-3 text-white" style={{ backgroundColor: card.color }}>
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{card.name}</p>
                  <p className="text-sm text-muted-foreground">{card.brand ?? "Sem bandeira"}</p>
                  <p className="text-xs text-muted-foreground">Fecha dia {card.closingDay ?? "-"} · vence dia {card.dueDay ?? "-"}</p>
                  <p className="text-xs text-muted-foreground">Conta: {card.bankAccount?.name ?? "não vinculada"}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditingId(editingId === card.id ? null : card.id)}>
                  <Pencil className="mr-2 h-3 w-3" />Editar
                </Button>
              </div>

              {editingId === card.id && (
                <form action={(formData) => handleUpdate(card.id, formData)} className="grid gap-3 border-t pt-4">
                  <Input name="name" defaultValue={card.name} placeholder="Nome" required />
                  <Input name="brand" defaultValue={card.brand ?? ""} placeholder="Bandeira" />
                  <Input name="color" type="color" defaultValue={card.color} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input name="closingDay" type="number" min="1" max="31" defaultValue={card.closingDay ?? ""} placeholder="Fechamento" />
                    <Input name="dueDay" type="number" min="1" max="31" defaultValue={card.dueDay ?? ""} placeholder="Vencimento" />
                  </div>
                  <select className="rounded-md border bg-background px-3 py-2 text-sm" name="bankAccountId" defaultValue={card.bankAccountId ?? ""}>
                    <option value="">Sem conta vinculada</option>
                    {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">Salvar alterações</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
