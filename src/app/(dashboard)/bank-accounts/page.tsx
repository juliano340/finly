"use client"

import type { FormEvent } from "react"
import { useEffect, useRef, useState } from "react"
import { AlertTriangle, ArrowLeftRight, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
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
  const transferSubmittingRef = useRef(false)
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null)
  const [creating, setCreating] = useState(false)
  const [detailTab, setDetailTab] = useState("overview")
  const [showForm, setShowForm] = useState<"movement" | "adjust" | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferFromId, setTransferFromId] = useState("")
  const [transferToId, setTransferToId] = useState("")
  const [transferAmount, setTransferAmount] = useState("")
  const [transferMethod, setTransferMethod] = useState("PIX")
  const [transferError, setTransferError] = useState("")
  const [transferSubmitting, setTransferSubmitting] = useState(false)

  const fetchAccounts = async () => {
    const res = await fetch("/api/bank-accounts")
    if (!res.ok) return
    const data = await res.json()
    setAccounts(data)
    setSelectedAccount((prev) => prev ? data.find((a: BankAccount) => a.id === prev.id) ?? prev : null)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchAccounts() }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const handleCreate = async (formData: FormData) => {
    const res = await fetch("/api/bank-accounts", {
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
    setCreating(false)
    if (res.ok) {
      toast.success("Conta criada com sucesso.")
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? "Não foi possível criar a conta.")
    }
    fetchAccounts()
  }

  const handleUpdate = async (accountId: string, formData: FormData) => {
    const res = await fetch(`/api/bank-accounts/${accountId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        institution: formData.get("institution") || null,
        type: formData.get("type"),
        color: formData.get("color") || "#22C55E",
      }),
    })
    if (res.ok) {
      toast.success("Conta atualizada com sucesso.")
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? "Não foi possível atualizar a conta.")
    }
    fetchAccounts()
  }

  const handleDelete = async (accountId: string) => {
    const res = await fetch(`/api/bank-accounts/${accountId}`, { method: "DELETE" })
    setConfirmDelete(null)
    setSelectedAccount(null)
    if (res.ok) {
      toast.success("Conta excluída.")
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? "Não foi possível excluir a conta.")
    }
    fetchAccounts()
  }

  const handleMovement = async (accountId: string, formData: FormData) => {
    const res = await fetch(`/api/bank-accounts/${accountId}/movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: formData.get("amount"),
        type: formData.get("type"),
        description: formData.get("description") || null,
        date: formData.get("date") || new Date(),
      }),
    })
    if (res.ok) {
      toast.success("Movimentação registrada com sucesso.")
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? "Não foi possível registrar a movimentação.")
    }
    fetchAccounts()
  }

  const handleAdjustment = async (accountId: string, formData: FormData) => {
    const res = await fetch(`/api/bank-accounts/${accountId}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetBalance: formData.get("targetBalance"),
        description: formData.get("adjustDescription") || "AJUSTE MANUAL DE SALDO",
        date: formData.get("adjustDate") || new Date(),
      }),
    })
    if (res.ok) {
      toast.success("Saldo ajustado com sucesso.")
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? "Não foi possível ajustar o saldo.")
    }
    fetchAccounts()
  }

  const handleTransfer = async (formData: FormData) => {
    if (transferSubmittingRef.current) return
    transferSubmittingRef.current = true
    setTransferSubmitting(true)
    setTransferError("")
    try {
      const res = await fetch("/api/bank-accounts/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId: formData.get("fromAccountId"),
          toAccountId: formData.get("toAccountId"),
          amount: formData.get("amount"),
          method: formData.get("method"),
          description: formData.get("description") || null,
          date: formData.get("date") || new Date(),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setTransferError(err.error ?? "Erro ao transferir")
        toast.error(err.error ?? "Erro ao transferir")
        return
      }
      setTransferOpen(false)
      setTransferFromId("")
      setTransferToId("")
      setTransferAmount("")
      setTransferMethod("PIX")
      toast.success("Transferência realizada com sucesso!")
      fetchAccounts()
    } finally {
      transferSubmittingRef.current = false
      setTransferSubmitting(false)
    }
  }

  const uppercaseInput = (event: FormEvent<HTMLInputElement>) => {
    event.currentTarget.value = event.currentTarget.value.toUpperCase()
  }

  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0)
  const activeAccounts = accounts.filter((a) => a.active).length
  const linkedCards = accounts.reduce((acc, a) => acc + a.cards.length, 0)
  const negativeAccounts = accounts.filter((a) => a.balance < 0).length
  const transferFrom = accounts.find((account) => account.id === transferFromId)
  const transferTo = accounts.find((account) => account.id === transferToId)
  const transferValue = Number.parseFloat(transferAmount) || 0
  const transferFromBalanceAfter = transferFrom ? transferFrom.balance - transferValue : null
  const transferToBalanceAfter = transferTo ? transferTo.balance + transferValue : null
  const transferWillOverdraw = transferFromBalanceAfter !== null && transferValue > 0 && transferFromBalanceAfter < 0

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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTransferOpen(true)}><ArrowLeftRight className="mr-2 h-4 w-4" />Transferir</Button>
          <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" />Nova conta</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard title="Saldo total" value={formatCurrency(totalBalance)} highlight />
        <SummaryCard title="Contas ativas" value={String(activeAccounts)} />
        <SummaryCard title="Cartões vinculados" value={String(linkedCards)} />
        <SummaryCard title="Contas negativas" value={String(negativeAccounts)} />
      </div>

      <div className="hidden overflow-hidden rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Conta</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Instituição</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Saldo</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nenhuma conta bancária cadastrada.</td></tr>
            ) : accounts.map((account) => (
              <tr key={account.id} className="border-b transition-colors hover:bg-muted/50">
                <td className="px-4 py-3">
                  <button type="button" onClick={() => openDetail(account)} className="flex items-center gap-3 text-left font-medium hover:underline">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: account.color }} />
                    {account.name}
                    {account.cards.length > 0 && (
                      <span className="text-xs text-muted-foreground">· {account.cards.length} {account.cards.length === 1 ? "cartão" : "cartões"}</span>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{account.institution ?? "-"}</td>
                <td className={`px-4 py-3 text-right font-medium ${account.balance < 0 ? "text-red-600" : ""}`}>{formatCurrency(account.balance)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Editar conta"
                      onClick={() => openDetail(account)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Excluir conta"
                      onClick={() => setConfirmDelete(account.id)}
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
        {accounts.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma conta bancária cadastrada.</CardContent></Card>
        ) : accounts.map((account) => (
          <div key={account.id} className="flex items-center gap-2">
            <button type="button" onClick={() => openDetail(account)} className="flex w-full flex-col gap-1 rounded-lg border bg-card p-4 text-left text-sm transition-colors hover:bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: account.color }} />
                  <span className="font-medium">{account.name}</span>
                </div>
                <strong className={account.balance < 0 ? "text-red-600" : ""}>{formatCurrency(account.balance)}</strong>
              </div>
              <p className="pl-6 text-xs text-muted-foreground">{account.institution ?? "Sem instituição"} · {account.cards.length} {account.cards.length === 1 ? "cartão" : "cartões"}</p>
            </button>
            <div className="flex flex-col gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Editar conta"
                onClick={() => openDetail(account)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Excluir conta"
                onClick={() => setConfirmDelete(account.id)}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Sheet open={creating || !!selectedAccount} onOpenChange={(open) => { if (!open) { setCreating(false); setSelectedAccount(null) } }}>
        <SheetContent className="w-full sm:max-w-md">
          {creating ? (
            <>
              <SheetHeader><SheetTitle>Nova conta</SheetTitle></SheetHeader>
              <form action={handleCreate} className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="mt-4 grid gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Nome da conta</label>
                    <Input className="uppercase" name="name" placeholder="Ex: NUBANK" onInput={uppercaseInput} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Instituição</label>
                    <Input className="uppercase" name="institution" placeholder="Ex: NUBANK" onInput={uppercaseInput} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Tipo da conta</label>
                    <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="type" defaultValue="DIGITAL">
                      <option value="CHECKING">Corrente</option>
                      <option value="SAVINGS">Poupança</option>
                      <option value="DIGITAL">Digital</option>
                      <option value="CASH">Dinheiro</option>
                      <option value="INVESTMENT">Investimento</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Saldo inicial</label>
                    <Input name="initialBalance" type="number" step="0.01" placeholder="0,00" defaultValue="0" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Cor:</label>
                    <Input name="color" type="color" defaultValue="#22C55E" className="w-16" />
                  </div>
                </div>
                <Button type="submit" className="mt-6 w-full">Salvar</Button>
              </form>
            </>
          ) : selectedAccount ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedAccount.color }} />
                  {selectedAccount.name}
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="flex gap-1 border-b">
                  {(["overview", "movements", "adjust", "edit"] as const).map((tab) => (
                    <button key={tab} type="button" onClick={() => setDetailTab(tab)} className={`px-3 pb-2 text-sm transition-colors ${detailTab === tab ? "border-b-2 border-foreground font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      {tab === "overview" ? "Visão Geral" : tab === "movements" ? "Movimentações" : tab === "adjust" ? "Ajuste" : "Editar"}
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
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Movimentações</p>
                      <Button size="sm" variant="outline" onClick={() => setShowForm("movement")}><Plus className="h-4 w-4" /></Button>
                    </div>
                    {showForm === "movement" && (
                      <form action={(formData) => { handleMovement(selectedAccount.id, formData); setShowForm(null) }} className="grid gap-2 rounded-lg border p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <Input name="amount" type="number" step="0.01" min="0.01" placeholder="Valor" required />
                          <select className="rounded-md border bg-background px-3 py-2 text-sm" name="type" defaultValue="INCOME"><option value="INCOME">Recebimento</option><option value="EXPENSE">Saída</option></select>
                        </div>
                        <Input className="uppercase" name="description" placeholder="Descrição" onInput={uppercaseInput} />
                        <Input name="date" type="date" />
                        <div className="flex gap-2">
                          <Button type="submit">Adicionar</Button>
                          <Button type="button" variant="ghost" onClick={() => setShowForm(null)}>Cancelar</Button>
                        </div>
                      </form>
                    )}
                    <div className="space-y-1">
                      {selectedAccount.movements.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma movimentação.</p>
                      ) : selectedAccount.movements.map((mov) => (
                        <div key={mov.id} className="flex justify-between rounded-lg border p-2 text-sm">
                          <span>{formatMovementDescription(mov.description, mov.type)} · {formatDate(mov.date)}</span>
                          <span className={mov.type === "INCOME" ? "text-emerald-600" : "text-red-600"}>{mov.type === "INCOME" ? "+" : "-"}{formatCurrency(mov.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailTab === "adjust" && (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Ajuste de saldo</p>
                      <Button size="sm" variant="outline" onClick={() => setShowForm(showForm === "adjust" ? null : "adjust")}><Plus className="h-4 w-4" /></Button>
                    </div>
                    {showForm === "adjust" && (
                      <div className="rounded-lg border p-3 space-y-3">
                        <p className="text-xs text-muted-foreground">Informe o valor correto que deveria aparecer na conta.</p>
                        <form action={(formData) => { handleAdjustment(selectedAccount.id, formData); setShowForm(null) }} className="grid gap-2">
                          <Input name="targetBalance" type="number" step="0.01" placeholder="Saldo correto" required />
                          <Input className="uppercase" name="adjustDescription" placeholder="Motivo do ajuste" onInput={uppercaseInput} />
                          <Input name="adjustDate" type="date" />
                          <div className="flex gap-2">
                            <Button type="submit" variant="outline">Ajustar saldo</Button>
                            <Button type="button" variant="ghost" onClick={() => setShowForm(null)}>Cancelar</Button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )}

                {detailTab === "edit" && (
                  <div className="mt-4 space-y-6">
                    <form action={(formData) => handleUpdate(selectedAccount.id, formData)} className="grid gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Nome da conta</label>
                        <Input className="uppercase" name="name" defaultValue={selectedAccount.name} onInput={uppercaseInput} required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Instituição</label>
                        <Input className="uppercase" name="institution" defaultValue={selectedAccount.institution ?? ""} onInput={uppercaseInput} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Tipo da conta</label>
                        <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="type" defaultValue={selectedAccount.type}>
                          <option value="CHECKING">Corrente</option>
                          <option value="SAVINGS">Poupança</option>
                          <option value="DIGITAL">Digital</option>
                          <option value="CASH">Dinheiro</option>
                          <option value="INVESTMENT">Investimento</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Cor:</label>
                        <Input name="color" type="color" defaultValue={selectedAccount.color} className="w-16" />
                      </div>
                      <Button type="submit" className="w-full">Salvar alterações</Button>
                    </form>
                    <Button type="button" variant="destructive" className="w-full" onClick={() => setConfirmDelete(selectedAccount.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />Excluir conta
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={transferOpen} onOpenChange={(open) => { if (!open) setTransferOpen(false) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transferir entre contas</DialogTitle>
          </DialogHeader>
          <form action={handleTransfer} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Conta origem</label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="fromAccountId" value={transferFromId} onChange={(e) => setTransferFromId(e.target.value)} disabled={transferSubmitting} required>
                  <option value="">Selecione</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id} disabled={account.id === transferToId}>
                      {account.name} - {formatCurrency(account.balance)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Conta destino</label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="toAccountId" value={transferToId} onChange={(e) => setTransferToId(e.target.value)} disabled={transferSubmitting} required>
                  <option value="">Selecione</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id} disabled={account.id === transferFromId}>
                      {account.name} - {formatCurrency(account.balance)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <TransferAccountPreview label="Origem" account={transferFrom} balanceAfter={transferFromBalanceAfter} />
              <TransferAccountPreview label="Destino" account={transferTo} balanceAfter={transferToBalanceAfter} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">Valor</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-xs"
                    disabled={transferSubmitting || !transferFrom || transferFrom.balance <= 0}
                    onClick={() => transferFrom && setTransferAmount(transferFrom.balance.toFixed(2))}
                  >
                    Transferir saldo total
                  </Button>
                </div>
                <Input name="amount" type="number" min="0.01" step="0.01" placeholder="0,00" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} disabled={transferSubmitting} required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Método</label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" name="method" value={transferMethod} onChange={(e) => setTransferMethod(e.target.value)} disabled={transferSubmitting}>
                  <option value="PIX">Pix</option>
                  <option value="TED">TED</option>
                  <option value="TRANSFER">Transferência</option>
                </select>
              </div>
            </div>
            <Input className="uppercase" name="description" placeholder="Descrição opcional" onInput={uppercaseInput} disabled={transferSubmitting} />
            <Input name="date" type="date" disabled={transferSubmitting} />

            {transferWillOverdraw && (
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Essa transferência deixará a conta origem negativa.</p>
                  <p className="text-xs text-amber-800">A operação ainda pode ser concluída se esse for o ajuste desejado.</p>
                </div>
              </div>
            )}

            {transferFrom && transferTo && transferValue > 0 && (
              <div className="grid gap-2 rounded-lg bg-muted p-4 text-sm sm:grid-cols-3">
                <div>
                  <span className="text-xs text-muted-foreground">Valor transferido</span>
                  <strong className="block">{formatCurrency(transferValue)}</strong>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Origem depois</span>
                  <strong className={`block ${transferWillOverdraw ? "text-red-600" : ""}`}>{formatCurrency(transferFrom.balance - transferValue)}</strong>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Destino depois</span>
                  <strong className="block text-emerald-600">{formatCurrency(transferTo.balance + transferValue)}</strong>
                </div>
              </div>
            )}
            {transferError && <p className="text-sm text-destructive">{transferError}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" disabled={transferSubmitting} onClick={() => setTransferOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={transferSubmitting}>{transferSubmitting ? "Transferindo..." : "Transferir"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
        title="Excluir conta"
        description="Tem certeza? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </div>
  )
}

function formatMovementDescription(description: string | null, type: "INCOME" | "EXPENSE") {
  if (!description) return type === "INCOME" ? "Recebimento" : "Saída"
  if (description.startsWith("PAGAMENTO_FATURA:")) return "Pagamento fatura"
  if (description.startsWith("TRANSFERENCIA_SAIDA:")) return `Transferência para ${description.split(":")[2] ?? "conta"}`
  if (description.startsWith("TRANSFERENCIA_ENTRADA:")) return `Transferência de ${description.split(":")[2] ?? "conta"}`
  return description
}

function TransferAccountPreview({
  label,
  account,
  balanceAfter,
}: {
  label: string
  account: BankAccount | undefined
  balanceAfter: number | null
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {account ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: account.color }} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{account.name}</p>
                <p className="truncate text-xs text-muted-foreground">{account.institution ?? "Sem instituição"}</p>
              </div>
            </div>
            <p className={`shrink-0 text-sm font-bold ${account.balance < 0 ? "text-red-600" : ""}`}>{formatCurrency(account.balance)}</p>
          </div>
          {balanceAfter !== null && (
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
              <span className="text-muted-foreground">Saldo após</span>
              <strong className={balanceAfter < 0 ? "text-red-600" : "text-emerald-600"}>{formatCurrency(balanceAfter)}</strong>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Selecione uma conta.</p>
      )}
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
