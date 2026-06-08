"use client"

import { useEffect, useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  const [insideCard, setInsideCard] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchData = async () => {
    const [catRes, cardRes, accountRes, fixedRes] = await Promise.all([fetch("/api/categories"), fetch("/api/cards"), fetch("/api/bank-accounts"), fetch("/api/fixed-costs")])
    if (catRes.ok) setCategories((await catRes.json()).filter((c: Category & { type: string }) => c.type === "EXPENSE"))
    if (cardRes.ok) setCards(await cardRes.json())
    if (accountRes.ok) setBankAccounts(await accountRes.json())
    if (fixedRes.ok) setFixedCosts(await fixedRes.json())
  }

  useEffect(() => {
    fetchData() // eslint-disable-line react-hooks/set-state-in-effect
  }, [])

  const handleSubmit = async (formData: FormData) => {
    await fetch("/api/fixed-costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formData.get("name"), defaultAmount: formData.get("defaultAmount"), categoryId: formData.get("categoryId"), paymentMethod: insideCard ? "CREDIT_CARD" : formData.get("paymentMethod"), paidInsideCard: insideCard, cardId: insideCard ? formData.get("cardId") : null, bankAccountId: formData.get("bankAccountId") || null, active: true }),
    })
    fetchData()
  }

  const handleUpdate = async (item: FixedCost, formData: FormData) => {
    const paidInsideCard = formData.get("paidInsideCard") === "on"
    await fetch(`/api/fixed-costs/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formData.get("name"), defaultAmount: formData.get("defaultAmount"), categoryId: formData.get("categoryId"), paymentMethod: paidInsideCard ? "CREDIT_CARD" : formData.get("paymentMethod"), paidInsideCard, cardId: paidInsideCard ? formData.get("cardId") : null, bankAccountId: formData.get("bankAccountId") || null, active: formData.get("active") === "on" }),
    })
    setEditingId(null)
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Custos Fixos</h1><p className="text-muted-foreground">Contas mensais recorrentes, dentro ou fora do cartão.</p></div>
      <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Novo custo fixo</CardTitle></CardHeader><CardContent>
        <form action={handleSubmit} className="grid gap-3 md:grid-cols-6">
          <Input name="name" placeholder="Nome" required />
          <Input name="defaultAmount" type="number" step="0.01" placeholder="Valor padrão" required />
          <select className="rounded-md border bg-background px-3 py-2 text-sm" name="categoryId" required>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select>
          <select className="rounded-md border bg-background px-3 py-2 text-sm" name="paymentMethod" defaultValue="PIX"><option value="PIX">Pix</option><option value="BANK_SLIP">Boleto</option><option value="DEBIT">Débito</option><option value="CASH">Dinheiro</option></select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={insideCard} onChange={(e) => setInsideCard(e.target.checked)} />Dentro do cartão</label>
          <select className="rounded-md border bg-background px-3 py-2 text-sm" name="cardId" disabled={!insideCard} required={insideCard}>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select>
          <select className="rounded-md border bg-background px-3 py-2 text-sm" name="bankAccountId" defaultValue=""><option value="">Sem conta prevista</option>{bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
          <Button className="md:col-span-6" type="submit">Salvar</Button>
        </form>
      </CardContent></Card>
      <div className="grid gap-4 md:grid-cols-3">{fixedCosts.map((item) => <Card key={item.id} className="border-0 shadow-sm"><CardContent className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.name}</p><p className="text-2xl font-bold">{formatCurrency(item.defaultAmount)}</p><p className="text-sm text-muted-foreground">{item.category.name}</p><p className="text-sm">{item.paidInsideCard ? `No cartão ${item.card?.name ?? "-"}` : "Fora do cartão"}</p><p className="text-sm text-muted-foreground">Conta prevista: {item.bankAccount?.name ?? "não definida"}</p></div><Button size="sm" variant="outline" onClick={() => setEditingId(editingId === item.id ? null : item.id)}><Pencil className="mr-2 h-3 w-3" />Editar</Button></div>{editingId === item.id && <form action={(formData) => handleUpdate(item, formData)} className="grid gap-3 border-t pt-4"><Input name="name" defaultValue={item.name} required /><Input name="defaultAmount" type="number" step="0.01" defaultValue={item.defaultAmount} required /><select className="rounded-md border bg-background px-3 py-2 text-sm" name="categoryId" defaultValue={item.categoryId} required>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select><select className="rounded-md border bg-background px-3 py-2 text-sm" name="paymentMethod" defaultValue={item.paymentMethod}><option value="PIX">Pix</option><option value="BANK_SLIP">Boleto</option><option value="DEBIT">Débito</option><option value="CASH">Dinheiro</option></select><label className="flex items-center gap-2 text-sm"><input name="paidInsideCard" type="checkbox" defaultChecked={item.paidInsideCard} />Dentro do cartão</label><select className="rounded-md border bg-background px-3 py-2 text-sm" name="cardId" defaultValue={item.cardId ?? ""}><option value="">Sem cartão</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select><select className="rounded-md border bg-background px-3 py-2 text-sm" name="bankAccountId" defaultValue={item.bankAccountId ?? ""}><option value="">Sem conta prevista</option>{bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select><label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={item.active} />Ativo</label><div className="flex gap-2"><Button size="sm" type="submit">Salvar alterações</Button><Button size="sm" type="button" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button></div></form>}</CardContent></Card>)}</div>
    </div>
  )
}
