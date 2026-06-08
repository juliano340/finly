"use client"

import type { FormEvent } from "react"
import { useEffect, useState } from "react"
import { ChevronRight, Landmark, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatCurrency, formatDate } from "@/lib/utils"

interface BankAccount {
  id: string
  name: string
  institution: string | null
  type: string
  color: string
  initialBalance: number
  balance: number
  active: boolean
  cards: { id: string; name: string; brand: string | null }[]
  movements: { id: string; amount: number; type: "INCOME" | "EXPENSE"; description: string | null; date: string }[]
}

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null)
  const [detailTab, setDetailTab] = useState("overview")

  const fetchAccounts = async () => {
    const res = await fetch("/api/bank-accounts")
    if (res.ok) setAccounts(await res.json())
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handleCreate = async (formData: FormData) => {
    await fetch("/api/bank-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        institution: formData.get("institution") || null,
        type: formData.get("type"),
        color: formData.get("color") || "#22C55E",
        initialBalance: formData.get("initialBalance") || 0,
      }),
    })
    setShowCreate(false)
    fetchAccounts()
  }

  const handleMovement = async (accountId: string, formData: FormData) => {
    await fetch(`/api/bank-accounts/${accountId}/movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: formData.get("amount"),
        type: formData.get("type"),
        description: formData.get("description") || null,
        date: formData.get("date") || new Date(),
      }),
    })
    fetchAccounts()
  }

  const handleAdjustment = async (accountId: string, formData: FormData) => {
    await fetch(`/api/bank-accounts/${accountId}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetBalance: formData.get("targetBalance"),
        description: formData.get("adjustDescription") || "AJUSTE MANUAL DE SALDO",
        date: formData.get("adjustDate") || new Date(),
      }),
    })
    fetchAccounts()
  }

  const uppercaseInput = (event: FormEvent<HTMLInputElement>) => {
    event.currentTarget.value = event.currentTarget.value.toUpperCase()
  }

  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0)
  const activeAccounts = accounts.filter((a) => a.active).length
  const linkedCards = accounts.reduce((acc, a) => acc + a.cards.length, 0)
  const negativeAccounts = accounts.filter((a) => a.balance < 0).length

  const openDetail = (account: BankAccount) => {
    setDetailTab("overview")
    setSelectedAccount(account)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas Bancárias</h1>
          <p className="text-muted-foreground">Controle saldos por conta e vincule cartões a elas.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />Nova conta</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard title="Saldo total" value={formatCurrency(totalBalance)} highlight />
        <SummaryCard title="Contas ativas" value={String(activeAccounts)} />
        <SummaryCard title="Cartões vinculados" value={String(linkedCards)} />
        <SummaryCard title="Contas negativas" value={String(negativeAccounts)} />
      </div>

      <div className="space-y-2">
        {accounts.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma conta bancária cadastrada.</CardContent></Card>
        ) : accounts.map((account) => (
          <button key={account.id} type="button" onClick={() => openDetail(account)} className="flex w-full items-center justify-between rounded-lg border bg-card p-4 text-left text-sm transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: account.color }} />
              <div>
                <p className="font-medium">{account.name}</p>
                <p className="text-xs text-muted-foreground">{account.institution ?? "Sem instituição"} · {account.cards.length} cartão{account.cards.length !== 1 ? "es" : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <strong className={account.balance < 0 ? "text-red-600" : ""}>{formatCurrency(account.balance)}</strong>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova conta</DialogTitle></DialogHeader>
          <form action={handleCreate} className="space-y-4">
            <div className="grid gap-3">
              <Input className="uppercase" name="name" placeholder="Nome da conta" onInput={uppercaseInput} required />
              <Input className="uppercase" name="institution" placeholder="Instituição" onInput={uppercaseInput} />
              <select className="rounded-md border bg-background px-3 py-2 text-sm" name="type" defaultValue="DIGITAL">
                <option value="CHECKING">Corrente</option>
                <option value="SAVINGS">Poupança</option>
                <option value="DIGITAL">Digital</option>
                <option value="CASH">Dinheiro</option>
                <option value="INVESTMENT">Investimento</option>
              </select>
              <Input name="initialBalance" type="number" step="0.01" placeholder="Saldo inicial" defaultValue="0" />
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Cor:</label>
                <Input name="color" type="color" defaultValue="#22C55E" className="w-16" />
              </div>
            </div>
            <Button type="submit" className="w-full">Salvar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selectedAccount} onOpenChange={(open) => { if (!open) setSelectedAccount(null) }}>
        <SheetContent className="w-full sm:max-w-md">
          {selectedAccount && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedAccount.color }} />
                  {selectedAccount.name}
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="flex gap-1 border-b">
                  {(["overview", "movements", "adjust"] as const).map((tab) => (
                    <button key={tab} type="button" onClick={() => setDetailTab(tab)} className={`px-3 pb-2 text-sm transition-colors ${detailTab === tab ? "border-b-2 border-foreground font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      {tab === "overview" ? "Visão Geral" : tab === "movements" ? "Movimentações" : "Ajuste"}
                    </button>
                  ))}
                </div>

                {detailTab === "overview" && (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3">
                      <div className="rounded-lg bg-muted p-4">
                        <p className="text-xs text-muted-foreground">Saldo atual</p>
                        <p className="text-2xl font-bold">{formatCurrency(selectedAccount.balance)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Instituição</p><p className="font-medium">{selectedAccount.institution ?? "-"}</p></div>
                        <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Saldo inicial</p><p className="font-medium">{formatCurrency(selectedAccount.initialBalance)}</p></div>
                      </div>
                      <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Cartões vinculados</p><p className="font-medium">{selectedAccount.cards.length ? selectedAccount.cards.map((c) => c.name).join(", ") : "Nenhum"}</p></div>
                    </div>
                  </div>
                )}

                {detailTab === "movements" && (
                  <div className="mt-4 space-y-4">
                    <form action={(formData) => { handleMovement(selectedAccount.id, formData) }} className="grid gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input name="amount" type="number" step="0.01" min="0.01" placeholder="Valor" required />
                        <select className="rounded-md border bg-background px-3 py-2 text-sm" name="type" defaultValue="INCOME"><option value="INCOME">Recebimento</option><option value="EXPENSE">Saída</option></select>
                      </div>
                      <Input className="uppercase" name="description" placeholder="Descrição" onInput={uppercaseInput} />
                      <Input name="date" type="date" />
                      <Button type="submit">Adicionar</Button>
                    </form>
                    <div className="space-y-1">
                      {selectedAccount.movements.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma movimentação.</p>
                      ) : selectedAccount.movements.map((mov) => (
                        <div key={mov.id} className="flex justify-between rounded-lg border p-2 text-sm">
                          <span>{mov.description ?? (mov.type === "INCOME" ? "Recebimento" : "Saída")} · {formatDate(mov.date)}</span>
                          <span className={mov.type === "INCOME" ? "text-emerald-600" : "text-red-600"}>{mov.type === "INCOME" ? "+" : "-"}{formatCurrency(mov.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailTab === "adjust" && (
                  <div className="mt-4 space-y-4">
                    <p className="text-sm text-muted-foreground">Informe o valor correto que deveria aparecer na conta.</p>
                    <form action={(formData) => { handleAdjustment(selectedAccount.id, formData) }} className="grid gap-2">
                      <Input name="targetBalance" type="number" step="0.01" placeholder="Saldo correto" required />
                      <Input className="uppercase" name="adjustDescription" placeholder="Motivo do ajuste" onInput={uppercaseInput} />
                      <Input name="adjustDate" type="date" />
                      <Button type="submit" variant="outline">Ajustar saldo</Button>
                    </form>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function SummaryCard({ title, value, highlight = false }: { title: string; value: string; highlight?: boolean }) {
  return (
    <Card className={`border-0 shadow-sm ${highlight ? "bg-primary text-primary-foreground" : ""}`}>
      <CardContent className="p-5">
        <p className="text-xs font-medium opacity-80">{title}</p>
        <p className="text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}
