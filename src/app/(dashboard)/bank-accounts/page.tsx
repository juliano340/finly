"use client"

import type { FormEvent } from "react"
import { useEffect, useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import { ArrowLeftRight, ArrowUp, ArrowDown, ArrowUpDown, Coins, Eye, Gift, Info, Loader2, Pencil, Plus, Settings, SlidersHorizontal, Trash2, Undo2, Upload, Wallet } from "lucide-react"
import { toast } from "sonner"
import { AddButton } from "@/components/ui/add-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/form-field"
import { FormSection } from "@/components/ui/form-section"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { TransferWizard } from "@/features/bank-accounts/components/transfer-wizard"
import { businessDaysInMonth, estimateBenefitCredit } from "@/features/bank-accounts/benefit"
import { formatCurrency } from "@/lib/utils"
import { getCurrentMonth } from "@/lib/months"
import { isAccountNegative, getAvailableBalance } from "@/lib/balance"
import { ariaSort, sortButtonLabel } from "@/lib/accessible-sort"

const ACCOUNT_TYPE_ITEMS: Record<string, string> = {
  CHECKING: "Corrente",
  SAVINGS: "Poupança",
  DIGITAL: "Digital",
  CASH: "Dinheiro",
  INVESTMENT: "Investimento",
  BENEFIT: "Benefício / Pré-pago",
}
const MOVEMENT_TYPE_ITEMS: Record<string, string> = {
  INCOME: "Recebimento",
  EXPENSE: "Saída",
}

interface BankAccount {
  id: string
  name: string
  institution: string | null
  type: "CHECKING" | "SAVINGS" | "DIGITAL" | "CASH" | "INVESTMENT" | "BENEFIT"
  color: string
  initialBalance: number
  overdraftLimit: number
  benefitDailyRate: number | null
  balance: number
  active: boolean
  cards: { id: string; name: string; brand: string | null }[]
  movements: { id: string; amount: number; type: "INCOME" | "EXPENSE"; description: string | null; date: string; transactionId: string | null }[]
}

type AccountSortField = "name" | "institution" | "balance"

function SortIcon({ field, activeField, direction }: { field: AccountSortField; activeField: AccountSortField; direction: "asc" | "desc" }) {
  if (activeField !== field) return <span aria-hidden="true" className="ml-1 text-muted-foreground/40">&#8693;</span>
  return <span aria-hidden="true" className="ml-1">{direction === "asc" ? "\u25B2" : "\u25BC"}</span>
}

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null)
  const [creating, setCreating] = useState(false)
  const [detailTab, setDetailTab] = useState("overview")
  const [showForm, setShowForm] = useState<"movement" | "adjust" | "recharge" | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState("")
  const [adjustSubmitting, setAdjustSubmitting] = useState(false)
  const [updateSubmitting, setUpdateSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<AccountSortField>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [creatingType, setCreatingType] = useState<BankAccount["type"]>("DIGITAL")
  const [editingType, setEditingType] = useState<BankAccount["type"]>("DIGITAL")
  const [movementType, setMovementType] = useState<"INCOME" | "EXPENSE">("INCOME")
  const [confirmReversal, setConfirmReversal] = useState<string | null>(null)
  const [reversingId, setReversingId] = useState<string | null>(null)
  const [importingStatement, setImportingStatement] = useState(false)
  const [replaceManual, setReplaceManual] = useState(false)
  const statementInputRef = useRef<HTMLInputElement>(null)
  const updateInFlightRef = useRef(false)

  const fetchAccounts = async () => {
    setLoading(true)
    const res = await fetch("/api/bank-accounts")
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setAccounts(data)
    setSelectedAccount((prev) => prev ? data.find((a: BankAccount) => a.id === prev.id) ?? prev : null)
    setLoading(false)
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
        overdraftLimit: formData.get("overdraftLimit") || 0,
        benefitDailyRate: formData.get("benefitDailyRate") || null,
      }),
    })
    setCreating(false)
    setCreatingType("DIGITAL")
    if (res.ok) {
      toast.success("Conta criada com sucesso.")
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? "Não foi possível criar a conta.")
    }
    fetchAccounts()
  }

  const handleUpdate = async (accountId: string, formData: FormData) => {
    if (updateInFlightRef.current) return
    updateInFlightRef.current = true
    setUpdateSubmitting(true)
    try {
      const account = accounts.find((item) => item.id === accountId) ?? selectedAccount
      const res = await fetch(`/api/bank-accounts/${accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          institution: formData.get("institution") || null,
          type: formData.get("type"),
          color: formData.get("color") || "#22C55E",
          initialBalance: account?.initialBalance,
          overdraftLimit: formData.get("overdraftLimit") || 0,
          benefitDailyRate: formData.get("benefitDailyRate") || null,
        }),
      })
      if (res.ok) {
        setSelectedAccount(null)
        toast.success("Conta atualizada com sucesso.")
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? "Não foi possível atualizar a conta.")
      }
      fetchAccounts()
    } finally {
      updateInFlightRef.current = false
      setUpdateSubmitting(false)
    }
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
    setAdjustSubmitting(true)
    try {
      const rawTarget = String(formData.get("targetBalance") ?? "").replace(/\./g, "").replace(",", ".")
      const res = await fetch(`/api/bank-accounts/${accountId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetBalance: rawTarget,
          description: formData.get("adjustDescription") || "AJUSTE MANUAL DE SALDO",
          date: formData.get("adjustDate") || new Date(),
        }),
      })
      if (res.ok) {
        await fetchAccounts()
        toast.success("Saldo ajustado com sucesso.")
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? "Não foi possível ajustar o saldo.")
        fetchAccounts()
      }
    } finally {
      setAdjustSubmitting(false)
    }
  }

  const handleRecharge = async (accountId: string, formData: FormData) => {
    const res = await fetch(`/api/bank-accounts/${accountId}/recharge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: formData.get("amount"),
        description: formData.get("description") || "EMPRESA",
        date: formData.get("date") || new Date(),
      }),
    })
    if (res.ok) toast.success("Recarga de benefício registrada.")
    else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? "Não foi possível registrar a recarga.")
    }
    setShowForm(null)
    fetchAccounts()
  }

  const handleImportStatement = async (accountId: string, file: File) => {
    setImportingStatement(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("replaceManual", replaceManual ? "true" : "false")
      const res = await fetch(`/api/bank-accounts/${accountId}/import-statement`, { method: "POST", body: formData })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const title = `${data.imported} lançamentos importados${data.duplicates > 0 ? ` · ${data.duplicates} duplicados` : ""}`
        const description = [
          `Entrou ${formatCurrency(data.totalIn)}`,
          `Saiu ${formatCurrency(data.totalOut)}`,
          ...(data.finalBalance !== null && data.finalBalance !== undefined
            ? [data.balanceAdjusted !== 0 ? `Saldo ajustado para ${formatCurrency(data.finalBalance)}` : "Saldo já conferia"]
            : []),
          ...(data.manualReplaced > 0 ? [`${data.manualReplaced} manuais substituídos`] : []),
        ].join(" · ")
        toast.success(title, { description })
        await fetchAccounts()
      } else {
        toast.error(data.error ?? "Não foi possível importar o extrato.")
      }
    } finally {
      setImportingStatement(false)
      if (statementInputRef.current) statementInputRef.current.value = ""
    }
  }

  const handleReverse = async (accountId: string, movementId: string) => {
    setReversingId(movementId)
    try {
      const res = await fetch(`/api/bank-accounts/${accountId}/movements/${movementId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Movimentação estornada.")
        fetchAccounts()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? "Não foi possível estornar.")
      }
    } finally {
      setReversingId(null)
      setConfirmReversal(null)
    }
  }

  const uppercaseInput = (event: FormEvent<HTMLInputElement>) => {
    event.currentTarget.value = event.currentTarget.value.toUpperCase()
  }

  const bankBalance = accounts.filter((account) => account.type !== "BENEFIT").reduce((total, account) => total + account.balance, 0)
  const benefitBalance = accounts.filter((account) => account.type === "BENEFIT").reduce((total, account) => total + account.balance, 0)
  const activeAccounts = accounts.filter((a) => a.active).length
  const negativeAccounts = accounts.filter((a) => isAccountNegative(a.balance, a.overdraftLimit)).length

  const sortedAccounts = [...accounts].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    switch (sortField) {
      case "name": return dir * a.name.localeCompare(b.name)
      case "institution": return dir * (a.institution ?? "").localeCompare(b.institution ?? "")
      case "balance": return dir * (a.balance - b.balance)
      default: return 0
    }
  })

  function toggleSort(field: AccountSortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortField(field); setSortDir("asc") }
  }

  const openDetail = (account: BankAccount) => {
    setDetailTab("overview")
    setSelectedAccount(account)
    setEditingType(account.type)
    setShowForm(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas e benefícios</h1>
          <p className="text-muted-foreground">Controle dinheiro disponível e saldos de benefícios separadamente.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <Button variant="outline" size="sm" disabled={accounts.filter((account) => account.type !== "BENEFIT").length < 2} onClick={() => setTransferOpen(true)}><ArrowLeftRight className="mr-2 h-4 w-4" />Transferir</Button>
          <AddButton label="Nova conta" onClick={() => setCreating(true)} />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-3 md:grid-cols-4">
        <SummaryCard
          title="Saldo bancário"
          value={formatCurrency(bankBalance)}
          highlight
          loading={loading}
          className="col-span-3 md:col-span-1"
          infoContent={
            <div className="space-y-1.5">
              <p className="font-medium">Composição do saldo:</p>
              {accounts.filter((a) => a.type !== "BENEFIT" && a.balance > 0).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.color }} />
                    {a.name}
                  </span>
                  <span>{formatCurrency(a.balance)}</span>
                </div>
              ))}
            </div>
          }
        />
        <SummaryCard title="Saldo em benefícios" value={formatCurrency(benefitBalance)} loading={loading} />
        <SummaryCard title="Contas ativas" value={String(activeAccounts)} loading={loading} />
        <SummaryCard title="Contas negativas" value={String(negativeAccounts)} loading={loading} />
      </div>

      <div className="hidden overflow-hidden rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th aria-sort={sortField === "name" ? ariaSort(sortDir) : undefined} className="px-4 py-3 text-left font-medium text-muted-foreground"><button type="button" aria-label={sortButtonLabel("Conta", sortField === "name", sortDir)} className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("name")}>Conta<SortIcon field="name" activeField={sortField} direction={sortDir} /></button></th>
              <th aria-sort={sortField === "institution" ? ariaSort(sortDir) : undefined} className="px-4 py-3 text-left font-medium text-muted-foreground"><button type="button" aria-label={sortButtonLabel("Instituição", sortField === "institution", sortDir)} className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("institution")}>Instituição<SortIcon field="institution" activeField={sortField} direction={sortDir} /></button></th>
              <th aria-sort={sortField === "balance" ? ariaSort(sortDir) : undefined} className="px-4 py-3 text-right font-medium text-muted-foreground"><button type="button" aria-label={sortButtonLabel("Saldo", sortField === "balance", sortDir)} className="inline-flex items-center hover:text-foreground" onClick={() => toggleSort("balance")}>Saldo<SortIcon field="balance" activeField={sortField} direction={sortDir} /></button></th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</span> : "Nenhuma conta bancária cadastrada."}
              </td></tr>
            ) : sortedAccounts.map((account) => (
              <tr key={account.id} className="border-b transition-colors hover:bg-muted/50">
                <td className="px-4 py-3">
                  <button type="button" onClick={() => openDetail(account)} className="flex items-center gap-3 text-left font-medium hover:underline">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: account.color }} />
                    {account.name}
                    {account.type === "BENEFIT" && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Benefício</span>
                    )}
                    {account.cards.length > 0 && (
                      <span className="text-xs text-muted-foreground">· {account.cards.length} {account.cards.length === 1 ? "cartão" : "cartões"}</span>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{account.institution ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-medium ${isAccountNegative(account.balance, account.overdraftLimit) ? "text-destructive" : ""}`}>
                    {formatCurrency(account.balance)}
                  </span>
                  {isAccountNegative(account.balance, account.overdraftLimit) && (
                    <span className="ml-1.5 inline-block rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                      {account.overdraftLimit > 0 ? "Em cheque especial" : "Saldo negativo"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Editar conta"
                    onClick={() => openDetail(account)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {accounts.length > 0 && (
              <>
              <tr className="border-b bg-muted/50 font-medium">
                <td className="px-4 py-3" colSpan={2}>Saldo bancário</td>
                <td className={`px-4 py-3 text-right ${bankBalance < 0 ? "text-destructive" : ""}`}>{formatCurrency(bankBalance)}</td>
                <td className="px-4 py-3" />
              </tr>
              {accounts.some((account) => account.type === "BENEFIT") && (
                <tr className="border-b bg-primary/5 font-medium">
                  <td className="px-4 py-3" colSpan={2}>Saldo em benefícios</td>
                  <td className="px-4 py-3 text-right text-primary">{formatCurrency(benefitBalance)}</td>
                  <td className="px-4 py-3" />
                </tr>
              )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {accounts.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-sm text-muted-foreground">
            {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</span> : "Nenhuma conta bancária cadastrada."}
          </CardContent></Card>
        ) : accounts.map((account) => (
          <button type="button" key={account.id} onClick={() => openDetail(account)} className="flex w-full items-center gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/50">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: account.color }} />
            <div className="min-w-0 flex-1">
              <span className="font-medium truncate block">{account.name}</span>
              <p className="text-xs text-muted-foreground truncate">
                {account.type === "BENEFIT" ? "Benefício pré-pago" : account.institution ?? "Sem instituição"}
                {account.type !== "BENEFIT" && ` · ${account.cards.length} ${account.cards.length === 1 ? "cartão" : "cartões"}`}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <strong className={`text-sm ${isAccountNegative(account.balance, account.overdraftLimit) ? "text-destructive" : ""}`}>
                {formatCurrency(account.balance)}
              </strong>
              {isAccountNegative(account.balance, account.overdraftLimit) && (
                <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                  {account.overdraftLimit > 0 ? "Em cheque especial" : "Saldo negativo"}
                </span>
              )}
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>

      <Sheet open={creating || !!selectedAccount} onOpenChange={(open) => { if (!open) { setCreating(false); setSelectedAccount(null) } }}>
        <SheetContent className="w-full sm:max-w-lg">
          {creating ? (
            <>
              <SheetHeader><SheetTitle>Nova conta</SheetTitle></SheetHeader>
              <form action={handleCreate} className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="space-y-6">
                  <FormSection icon={Wallet} title="Identificação">
                    <FormField label="Nome da conta" required>
                      <Input className="uppercase" name="name" placeholder="Ex: NUBANK" onInput={uppercaseInput} required />
                    </FormField>
                    <FormField label="Instituição" hint="Opcional">
                      <Input className="uppercase" name="institution" placeholder="Ex: NUBANK" onInput={uppercaseInput} />
                    </FormField>
                    <input type="hidden" name="type" value={creatingType} />
                    <FormField
                      label="Tipo da conta"
                      hint={creatingType === "BENEFIT" ? "Para vale-alimentação, refeição e outros saldos fornecidos pela empresa." : undefined}
                    >
                      <Select value={creatingType} items={ACCOUNT_TYPE_ITEMS} onValueChange={(v) => setCreatingType(v as BankAccount["type"])}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CHECKING">Corrente</SelectItem>
                          <SelectItem value="SAVINGS">Poupança</SelectItem>
                          <SelectItem value="DIGITAL">Digital</SelectItem>
                          <SelectItem value="CASH">Dinheiro</SelectItem>
                          <SelectItem value="INVESTMENT">Investimento</SelectItem>
                          <SelectItem value="BENEFIT">Benefício / Pré-pago</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </FormSection>

                  <FormSection icon={Coins} title="Valores">
                    <FormField label="Saldo inicial">
                      <Input name="initialBalance" type="number" step="0.01" placeholder="0,00" defaultValue="0" />
                    </FormField>
                    {creatingType === "BENEFIT" ? (
                      <FormField label="Valor por dia trabalhado" hint="Opcional — usado para sugerir o valor da recarga mensal.">
                        <Input key={creatingType} name="benefitDailyRate" type="number" step="0.01" min="0.01" placeholder="Ex: 22,00" />
                      </FormField>
                    ) : (
                      <FormField label="Limite cheque especial" hint="0 = sem cheque especial">
                        <Input key={creatingType} name="overdraftLimit" type="number" step="0.01" placeholder="0,00" defaultValue="0" />
                      </FormField>
                    )}
                    <FormField label="Cor">
                      <Input name="color" type="color" defaultValue="#22C55E" className="w-16" />
                    </FormField>
                  </FormSection>
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
                <div className="flex border-b">
                  {([["overview", "Visão geral", Eye], ["movements", "Movimentações", ArrowUpDown], ["adjust", "Ajuste de saldo", SlidersHorizontal], ["edit", "Editar conta", Pencil]] as const).map(([tab, label, Icon]) => (
                    <button key={tab} type="button" title={label} aria-label={label} onClick={() => setDetailTab(tab)} className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 pb-2.5 pt-2 transition-colors ${detailTab === tab ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>

                {detailTab === "overview" && (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3">
                      <div className="rounded-lg bg-muted p-4">
                        <p className="text-xs text-muted-foreground">{selectedAccount.type === "BENEFIT" ? "Saldo disponível do benefício" : "Saldo atual"}</p>
                        <div className="flex items-center gap-2">
                          <p className={`text-2xl font-bold ${isAccountNegative(selectedAccount.balance, selectedAccount.overdraftLimit) ? "text-destructive" : ""}`}>
                            {formatCurrency(selectedAccount.balance)}
                          </p>
                          {isAccountNegative(selectedAccount.balance, selectedAccount.overdraftLimit) && (
                            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                              {selectedAccount.overdraftLimit > 0 ? "Em cheque especial" : "Saldo negativo"}
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedAccount.type === "BENEFIT" && (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">Conta de benefício pré-pago</p>
                              <p className="text-xs text-muted-foreground">
                                {selectedAccount.benefitDailyRate
                                  ? `${formatCurrency(selectedAccount.benefitDailyRate)} por dia • estimativa deste mês: ${formatCurrency(estimateBenefitCredit(selectedAccount.benefitDailyRate, getCurrentMonth()))}`
                                  : "As recargas não entram como receita livre."}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <input
                                ref={statementInputRef}
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0]
                                  if (file) void handleImportStatement(selectedAccount.id, file)
                                }}
                              />
                              <Button size="sm" variant="outline" disabled={importingStatement} onClick={() => statementInputRef.current?.click()}>
                                {importingStatement ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                Importar extrato
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => { setDetailTab("movements"); setShowForm("recharge") }}
                              >
                                <Gift className="mr-2 h-4 w-4" />Recarregar
                              </Button>
                            </div>
                          </div>
                          <label className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 shrink-0"
                              checked={replaceManual}
                              onChange={(event) => setReplaceManual(event.target.checked)}
                            />
                            <span>Substituir registros manuais anteriores (ajustes e transações dentro do período do arquivo)</span>
                          </label>
                        </div>
                      )}
                      {selectedAccount.overdraftLimit > 0 && (
                        <div className="rounded-lg border bg-card p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cheque especial</p>
                          <div className="mt-2 space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Limite</span>
                              <span className="font-medium">{formatCurrency(selectedAccount.overdraftLimit)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Disponível</span>
                              <span className={getAvailableBalance(selectedAccount.balance, selectedAccount.overdraftLimit) < 0 ? "font-medium text-destructive" : "font-medium text-success"}>{formatCurrency(getAvailableBalance(selectedAccount.balance, selectedAccount.overdraftLimit))}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Instituição</p><p className="font-medium">{selectedAccount.institution ?? "-"}</p></div>
                        <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Saldo inicial</p><p className="font-medium">{formatCurrency(selectedAccount.initialBalance)}</p></div>
                      </div>
                      {selectedAccount.type !== "BENEFIT" && <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Cartões vinculados</p><p className="font-medium">{selectedAccount.cards.length ? selectedAccount.cards.map((c) => c.name).join(", ") : "Nenhum"}</p></div>}
                    </div>
                  </div>
                )}

                {detailTab === "movements" && (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Movimentações</p>
                      <Button size="sm" variant="outline" onClick={() => setShowForm(selectedAccount.type === "BENEFIT" ? "recharge" : "movement")}>
                        {selectedAccount.type === "BENEFIT" ? <><Gift className="mr-2 h-4 w-4" />Recarga</> : <Plus className="h-4 w-4" />}
                      </Button>
                    </div>
                    {showForm === "recharge" && selectedAccount.type === "BENEFIT" && (
                      <form action={(formData) => handleRecharge(selectedAccount.id, formData)} className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <FormSection icon={Gift} title="Recarga">
                          <FormField
                            label="Valor creditado pela empresa"
                            hint={selectedAccount.benefitDailyRate ? `${businessDaysInMonth(getCurrentMonth())} dias úteis × ${formatCurrency(selectedAccount.benefitDailyRate)}. Ajuste se houve feriado, férias ou ausência.` : undefined}
                          >
                            <Input
                              name="amount"
                              type="number"
                              step="0.01"
                              min="0.01"
                              defaultValue={selectedAccount.benefitDailyRate ? estimateBenefitCredit(selectedAccount.benefitDailyRate, getCurrentMonth()).toFixed(2) : undefined}
                              placeholder="0,00"
                              required
                            />
                          </FormField>
                          <FormField label="Descrição">
                            <Input className="uppercase" name="description" placeholder="Ex: RECARGA DE AGOSTO" onInput={uppercaseInput} />
                          </FormField>
                          <FormField label="Data">
                            <Input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
                          </FormField>
                        </FormSection>
                        <div className="flex gap-2">
                          <Button type="submit">Registrar recarga</Button>
                          <Button type="button" variant="ghost" onClick={() => setShowForm(null)}>Cancelar</Button>
                        </div>
                      </form>
                    )}
                    {showForm === "movement" && (
                      <form action={(formData) => { handleMovement(selectedAccount.id, formData); setShowForm(null) }} className="space-y-4 rounded-lg border p-3">
                        <FormSection icon={ArrowUpDown} title="Movimentação">
                          <div className="grid grid-cols-2 gap-2">
                            <FormField label="Valor" required>
                              <Input name="amount" type="number" step="0.01" min="0.01" placeholder="0,00" required />
                            </FormField>
                            <input type="hidden" name="type" value={movementType} />
                            <FormField label="Tipo">
                              <Select value={movementType} items={MOVEMENT_TYPE_ITEMS} onValueChange={(v) => setMovementType(v as "INCOME" | "EXPENSE")}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="INCOME">Recebimento</SelectItem>
                                  <SelectItem value="EXPENSE">Saída</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormField>
                          </div>
                          <FormField label="Descrição">
                            <Input className="uppercase" name="description" placeholder="EX: PIX RECEBIDO" onInput={uppercaseInput} />
                          </FormField>
                          <FormField label="Data">
                            <Input name="date" type="date" />
                          </FormField>
                        </FormSection>
                        <div className="flex gap-2">
                          <Button type="submit">Adicionar</Button>
                          <Button type="button" variant="ghost" onClick={() => setShowForm(null)}>Cancelar</Button>
                        </div>
                      </form>
                    )}
                    <div className="space-y-1">
                      {selectedAccount.movements.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma movimentação.</p>
                      ) : (() => {
                        const sortedAsc = [...selectedAccount.movements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        const saldoMap = new Map<string, number>()
                        let saldo = selectedAccount.initialBalance
                        for (const m of sortedAsc) {
                          saldo += m.type === "INCOME" ? m.amount : -m.amount
                          saldoMap.set(m.id, saldo)
                        }
                        const displayDesc = [...selectedAccount.movements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        let lastDay = ""
                        return displayDesc.map((mov) => {
                          const dt = new Date(mov.date)
                          const dayKey = dt.toLocaleDateString("pt-BR", { timeZone: "UTC" })
                          const weekday = dt.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" })
                          const showSeparator = dayKey !== lastDay
                          if (showSeparator) lastDay = dayKey
                          const formattedDate = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
                          const formattedTime = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
                          const saldoAtual = saldoMap.get(mov.id)
                          return (
                            <div key={mov.id}>
                              {showSeparator && (
                                <p className="pt-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                  {dayKey} — {weekday}
                                </p>
                              )}
                              <div className="flex items-start gap-3 rounded-lg border p-2.5 text-sm">
                                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${mov.type === "INCOME" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                                  {mov.type === "INCOME" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate font-medium">{formatMovementDescription(mov.description, mov.type)}</span>
                                    {mov.transactionId && (
                                      <a
                                        href={`/transactions?id=${mov.transactionId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="shrink-0 text-xs text-primary hover:underline"
                                        title="Ver transação original"
                                      >
                                        Ver lançamento
                                      </a>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {formattedDate} às {formattedTime}
                                  </p>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-0.5">
                                  <span className={`font-medium ${mov.type === "INCOME" ? "text-success" : "text-destructive"}`}>
                                    {mov.type === "INCOME" ? "+" : "-"}{formatCurrency(mov.amount)}
                                  </span>
                                  {saldoAtual !== undefined && (
                                    <span className="text-xs text-muted-foreground">
                                      saldo {formatCurrency(saldoAtual)}
                                    </span>
                                  )}
                                  {(() => {
                                    const isLinked = !!mov.transactionId
                                    const isTransfer = mov.description?.startsWith("TRANSFERENCIA_") === true
                                    const isAdjust = mov.description?.startsWith("AJUSTE_MANUAL:") === true || mov.description === "AJUSTE MANUAL DE SALDO"
                                    const isDisabled = isLinked || isAdjust || reversingId === mov.id
                                    const tooltipText = isAdjust
                                      ? "Ajustes de saldo não são estornáveis"
                                      : isLinked
                                        ? "Estorne pela transação original"
                                        : isTransfer
                                          ? "Estornar transferência (origem e destino juntos)"
                                          : undefined
                                    return (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger
                                            disabled={isDisabled}
                                            title={tooltipText ?? "Estornar"}
                                            className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted disabled:pointer-events-none disabled:opacity-50 data-[trigger-disabled]:pointer-events-none data-[trigger-disabled]:opacity-50"
                                            onClick={() => !isDisabled && setConfirmReversal(mov.id)}
                                          >
                                            {reversingId === mov.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                                          </TooltipTrigger>
                                          {tooltipText && <TooltipContent>{tooltipText}</TooltipContent>}
                                        </Tooltip>
                                      </TooltipProvider>
                                    )
                                  })()}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                    {selectedAccount.movements.length === 50 && (
                      <p className="pt-1 text-center text-xs text-muted-foreground">
                        Exibindo os 50 movimentos mais recentes.
                      </p>
                    )}
                  </div>
                )}

                {detailTab === "adjust" && selectedAccount && (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Ajuste de saldo</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowForm(showForm === "adjust" ? null : "adjust")
                          setAdjustTarget("")
                        }}
                      >
                        {showForm === "adjust" ? <Trash2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </Button>
                    </div>

                    {(() => {
                      const raw = adjustTarget
                      const targetNum = parseFloat(raw.replace(",", ".")) || 0
                      const currentBalance = selectedAccount.balance
                      const diff = targetNum - currentBalance
                      const hasValidTarget = raw.length > 0 && !isNaN(parseFloat(raw.replace(",", ".")))
                      return hasValidTarget ? (
                        <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Saldo atual</p>
                            <p className="text-sm font-medium">{formatCurrency(currentBalance)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Saldo correto</p>
                            <p className="text-sm font-medium">{formatCurrency(targetNum)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Diferença</p>
                            <p className={`text-sm font-bold ${diff >= 0 ? "text-success" : "text-destructive"}`}>
                              {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-muted px-4 py-3">
                          <p className="text-xs text-muted-foreground">Saldo atual</p>
                          <p className="text-2xl font-bold">{formatCurrency(currentBalance)}</p>
                        </div>
                      )
                    })()}

                    {showForm === "adjust" && (
                      <div className="rounded-lg border p-4 space-y-4">
                        <form action={async (formData) => { await handleAdjustment(selectedAccount.id, formData); setShowForm(null); setAdjustTarget("") }} className="space-y-4">
                          <FormSection icon={SlidersHorizontal} title="Ajuste de saldo">
                          <FormField label="Saldo correto" required>
                            <Input
                              name="targetBalance"
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              required
                              value={adjustTarget}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^\d,]/g, "")
                                setAdjustTarget(raw)
                              }}
                              onBlur={(e) => {
                                const raw = e.target.value
                                if (!raw) return
                                const num = parseFloat(raw.replace(",", "."))
                                if (!isNaN(num)) {
                                  setAdjustTarget(num.toFixed(2).replace(".", ","))
                                }
                              }}
                            />
                          </FormField>
                          <FormField label="Motivo do ajuste">
                            <Input className="uppercase" name="adjustDescription" placeholder="EX: AJUSTE MANUAL DE SALDO" onInput={uppercaseInput} />
                          </FormField>
                          <FormField label="Data do ajuste">
                            <Input name="adjustDate" type="date" />
                          </FormField>
                          </FormSection>
                          <div className="flex gap-2">
                            <AdjustSubmitButton submitting={adjustSubmitting} />
                            <Button type="button" variant="outline" onClick={() => { setShowForm(null); setAdjustTarget("") }}>
                              Cancelar
                            </Button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )}

                {detailTab === "edit" && (
                  <div className="mt-4 space-y-6">
                    <form action={(formData) => handleUpdate(selectedAccount.id, formData)} className="space-y-6">
                      <FormSection icon={Wallet} title="Identificação">
                        <FormField label="Nome da conta" required>
                          <Input className="uppercase" name="name" defaultValue={selectedAccount.name} onInput={uppercaseInput} required />
                        </FormField>
                        <FormField label="Instituição" hint="Opcional">
                          <Input className="uppercase" name="institution" defaultValue={selectedAccount.institution ?? ""} onInput={uppercaseInput} />
                        </FormField>
                        <input type="hidden" name="type" value={editingType} />
                        <FormField
                          label="Tipo da conta"
                          hint={editingType === "BENEFIT" ? "Para vale-alimentação, refeição e outros saldos fornecidos pela empresa." : undefined}
                        >
                          <Select value={editingType} items={ACCOUNT_TYPE_ITEMS} onValueChange={(v) => setEditingType(v as BankAccount["type"])}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CHECKING">Corrente</SelectItem>
                              <SelectItem value="SAVINGS">Poupança</SelectItem>
                              <SelectItem value="DIGITAL">Digital</SelectItem>
                              <SelectItem value="CASH">Dinheiro</SelectItem>
                              <SelectItem value="INVESTMENT">Investimento</SelectItem>
                              <SelectItem value="BENEFIT">Benefício / Pré-pago</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>
                      </FormSection>

                      <FormSection icon={Coins} title="Valores">
                        {editingType === "BENEFIT" ? (
                          <FormField label="Valor por dia trabalhado" hint="Opcional — usado para sugerir o valor da recarga mensal.">
                            <Input key={editingType} name="benefitDailyRate" type="number" step="0.01" min="0.01" placeholder="Ex: 22,00" defaultValue={selectedAccount.benefitDailyRate ?? ""} />
                          </FormField>
                        ) : (
                          <FormField label="Limite cheque especial" hint="0 = sem cheque especial">
                            <Input key={editingType} name="overdraftLimit" type="number" step="0.01" placeholder="0,00" defaultValue={selectedAccount.overdraftLimit.toFixed(2)} />
                          </FormField>
                        )}
                        <FormField label="Cor">
                          <Input name="color" type="color" defaultValue={selectedAccount.color} className="w-16" />
                        </FormField>
                      </FormSection>

                      <Button type="submit" className="w-full" disabled={updateSubmitting}>
                        {updateSubmitting ? "Salvando..." : "Salvar alterações"}
                      </Button>
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

      <TransferWizard
        open={transferOpen}
        onOpenChange={setTransferOpen}
        accounts={accounts.filter((account) => account.type !== "BENEFIT")}
        onSuccess={fetchAccounts}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
        title="Excluir conta"
        description="Tem certeza? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />

      <ConfirmDialog
        open={!!confirmReversal}
        onOpenChange={() => setConfirmReversal(null)}
        title="Estornar movimentação"
        description="O saldo da conta será recalculado. Essa ação não pode ser desfeita."
        confirmText="Estornar"
        onConfirm={() => confirmReversal && selectedAccount && handleReverse(selectedAccount.id, confirmReversal)}
      />
    </div>
  )
}

function formatMovementDescription(description: string | null, type: "INCOME" | "EXPENSE") {
  if (!description) return type === "INCOME" ? "Recebimento" : "Saída"
  if (description.startsWith("PAGAMENTO_FATURA:")) return "Pagamento fatura"
  if (description.startsWith("TRANSFERENCIA_SAIDA:")) return `Transferência para ${description.split(":")[2] ?? "conta"}`
  if (description.startsWith("TRANSFERENCIA_ENTRADA:")) return `Transferência de ${description.split(":")[2] ?? "conta"}`
  if (description.startsWith("RECARGA BENEFÍCIO:")) return description.replace("RECARGA BENEFÍCIO:", "Recarga:")
  if (description.startsWith("TRANSAÇÃO:")) return description.replace("TRANSAÇÃO: ", "")
  return description
}

function AdjustSubmitButton({ submitting }: { submitting: boolean }) {
  const { pending } = useFormStatus()
  const isPending = pending || submitting
  return <Button type="submit" className="flex-1" disabled={isPending}>{isPending ? "Ajustando..." : "Ajustar saldo"}</Button>
}

function SummaryCard({ title, value, highlight = false, loading = false, infoContent, className }: { title: string; value: string; highlight?: boolean; loading?: boolean; infoContent?: React.ReactNode; className?: string }) {
  return (
    <Card className={`border-0 shadow-sm ${highlight ? "bg-primary text-primary-foreground" : ""} ${className ?? ""}`}>
      <CardContent className={highlight ? "p-5" : "p-4"}>
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium opacity-80">{title}</p>
          {infoContent && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="opacity-60 hover:opacity-100 transition-opacity">
                  <Info className="h-3.5 w-3.5" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  {infoContent}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-xl font-bold">{loading ? <Loader2 className="h-5 w-5 animate-spin opacity-60" /> : value}</p>
      </CardContent>
    </Card>
  )
}
