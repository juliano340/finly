"use client"

import { useRef, useState } from "react"
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Stepper } from "@/components/ui/stepper"
import { formatCurrency } from "@/lib/utils"
import { canWithdraw, isAccountNegative, getAvailableBalance } from "@/lib/balance"

const steps = [
  { title: "Contas" },
  { title: "Valor" },
  { title: "Detalhes" },
  { title: "Revisão" },
]

interface Account {
  id: string
  name: string
  institution: string | null
  type: string
  color: string
  initialBalance: number
  overdraftLimit: number
  balance: number
  active: boolean
}

interface TransferWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  onSuccess: () => void
}

export function TransferWizard({ open, onOpenChange, accounts, onSuccess }: TransferWizardProps) {
  const transferSubmittingRef = useRef(false)
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  const [step, setStep] = useState(0)
  const [fromId, setFromId] = useState("")
  const [toId, setToId] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("PIX")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(today)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fromAccounts = accounts.filter((a) => a.id !== toId)
  const toAccounts = accounts.filter((a) => a.id !== fromId)
  const fromAccount = accounts.find((a) => a.id === fromId)
  const toAccount = accounts.find((a) => a.id === toId)
  const parsedAmount = parseFloat(amount) || 0
  const fromAfter = fromAccount ? fromAccount.balance - parsedAmount : null
  const toAfter = toAccount ? toAccount.balance + parsedAmount : null
  const willOverdraw = fromAccount ? !canWithdraw(fromAccount.balance, fromAccount.overdraftLimit, parsedAmount) : false

  const isStep1Valid = !!fromId && !!toId
  const isStep2Valid = parsedAmount > 0

  function resetForm() {
    setStep(0)
    setFromId("")
    setToId("")
    setAmount("")
    setMethod("PIX")
    setDescription("")
    setDate(today)
    setError("")
    setSubmitting(false)
    transferSubmittingRef.current = false
  }

  function handleOpenChange(open: boolean) {
    if (!open) resetForm()
    onOpenChange(open)
  }

  async function handleSubmit() {
    if (transferSubmittingRef.current) return
    transferSubmittingRef.current = true
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/bank-accounts/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId: fromId,
          toAccountId: toId,
          amount,
          method,
          description: description || null,
          date: date || today,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? "Erro ao transferir")
        toast.error(err.error ?? "Erro ao transferir")
        return
      }

      handleOpenChange(false)
      toast.success("Transferência realizada com sucesso!")
      onSuccess()
    } finally {
      transferSubmittingRef.current = false
      setSubmitting(false)
    }
  }

  function goToStep(index: number) {
    setError("")
    setStep(index)
  }

  function goNext() {
    setError("")
    if (step === 0 && !isStep1Valid) return
    if (step === 1 && !isStep2Valid) return
    setStep((s) => Math.min(s + 1, steps.length - 1))
  }

  function goBack() {
    setError("")
    setStep((s) => Math.max(s - 1, 0))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl p-3 sm:p-4 max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transferir entre contas</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Stepper steps={steps} currentStep={step} onStepClick={goToStep} />
        </div>

        <div className="min-h-[260px]">
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Selecione a conta de origem e destino da transferência.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Conta origem</label>
                  <Select value={fromId || null} onValueChange={(v) => setFromId(v ?? "")}>
                    <SelectTrigger className="w-full">
                      {fromId && fromAccount ? (
                        <div className="flex w-full items-center justify-between gap-2 pr-2">
                          <span>{fromAccount.name}</span>
                          <span className="text-xs text-muted-foreground">{formatCurrency(fromAccount.balance)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Selecione</span>
                      )}
                    </SelectTrigger>
                    <SelectContent portal={false}>
                      {fromAccounts.length === 0 ? (
                        <SelectItem value="" disabled>Nenhuma conta disponível</SelectItem>
                      ) : fromAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          <div className="flex w-full items-center justify-between gap-4">
                            <span className="flex items-center gap-2">
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
                              {a.name}
                            </span>
                            <span className={isAccountNegative(a.balance, a.overdraftLimit) ? "text-red-600" : "text-muted-foreground"}>{formatCurrency(a.balance)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fromAccount && (
                    <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: fromAccount.color }} />
                      <span className="truncate">{fromAccount.institution ?? "Sem instituição"}</span>
                      <span className="ml-auto font-medium">{formatCurrency(fromAccount.balance)}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Conta destino</label>
                  <Select value={toId || null} onValueChange={(v) => setToId(v ?? "")}>
                    <SelectTrigger className="w-full">
                      {toId && toAccount ? (
                        <div className="flex w-full items-center justify-between gap-2 pr-2">
                          <span>{toAccount.name}</span>
                          <span className="text-xs text-muted-foreground">{formatCurrency(toAccount.balance)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Selecione</span>
                      )}
                    </SelectTrigger>
                    <SelectContent portal={false}>
                      {toAccounts.length === 0 ? (
                        <SelectItem value="" disabled>Nenhuma conta disponível</SelectItem>
                      ) : toAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          <div className="flex w-full items-center justify-between gap-4">
                            <span className="flex items-center gap-2">
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
                              {a.name}
                            </span>
                            <span className={isAccountNegative(a.balance, a.overdraftLimit) ? "text-red-600" : "text-muted-foreground"}>{formatCurrency(a.balance)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {toAccount && (
                    <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: toAccount.color }} />
                      <span className="truncate">{toAccount.institution ?? "Sem instituição"}</span>
                      <span className="ml-auto font-medium">{formatCurrency(toAccount.balance)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Informe o valor e o método da transferência.</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium">Valor</label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1 text-xs"
                      disabled={!fromAccount || getAvailableBalance(fromAccount.balance, fromAccount.overdraftLimit) <= 0}
                      onClick={() => fromAccount && setAmount(getAvailableBalance(fromAccount.balance, fromAccount.overdraftLimit).toFixed(2))}
                    >
                      Saldo total
                    </Button>
                  </div>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Método</label>
                  <Select value={method} onValueChange={(v) => setMethod(v ?? "PIX")}>
                    <SelectTrigger className="w-full">
                      {method === "PIX" ? "Pix" : method === "TED" ? "TED" : "Transferência"}
                    </SelectTrigger>
                    <SelectContent portal={false}>
                      <SelectItem value="PIX">Pix</SelectItem>
                      <SelectItem value="TED">TED</SelectItem>
                      <SelectItem value="TRANSFER">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {parsedAmount > 0 && fromAccount && toAccount && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border bg-card p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Origem</p>
                    <p className="mt-0.5 text-xs font-semibold">{fromAccount.name}</p>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Antes</span>
                      <span className={isAccountNegative(fromAccount.balance, fromAccount.overdraftLimit) ? "font-medium text-red-600" : "font-medium"}>{formatCurrency(fromAccount.balance)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Depois</span>
                      <span className={isAccountNegative(fromAfter!, fromAccount.overdraftLimit) ? "font-medium text-red-600" : "font-medium text-emerald-600"}>{formatCurrency(fromAfter!)}</span>
                    </div>
                    <div className="mt-1.5 border-t pt-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Impacto</span>
                        <span className="font-medium text-red-600">-{formatCurrency(parsedAmount)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Destino</p>
                    <p className="mt-0.5 text-xs font-semibold">{toAccount.name}</p>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Antes</span>
                      <span className={isAccountNegative(toAccount.balance, toAccount.overdraftLimit) ? "font-medium text-red-600" : "font-medium"}>{formatCurrency(toAccount.balance)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Depois</span>
                      <span className="font-medium text-emerald-600">{formatCurrency(toAfter!)}</span>
                    </div>
                    <div className="mt-1.5 border-t pt-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Impacto</span>
                        <span className="font-medium text-emerald-600">+{formatCurrency(parsedAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {willOverdraw && (
                <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Essa transferência deixará a conta origem negativa.</p>
                    <p className="text-xs text-amber-800">A operação ainda pode ser concluída se esse for o ajuste desejado.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Adicione detalhes opcionais à operação.</p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Descrição</label>
                <Input
                  placeholder="Ex: TRANSFERÊNCIA MENSAL"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Data da transferência
                  <span className="ml-1 text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
                {!date && <p className="text-xs text-destructive">A data é obrigatória.</p>}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Revise os dados antes de confirmar.</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Origem</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: fromAccount?.color }} />
                    <span className="text-sm font-medium">{fromAccount?.name}</span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saldo antes</span>
                      <span>{formatCurrency(fromAccount?.balance ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saldo depois</span>
                      <span className={isAccountNegative(fromAfter!, fromAccount!.overdraftLimit) ? "text-red-600" : "text-emerald-600"}>{formatCurrency(fromAfter!)}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Destino</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: toAccount?.color }} />
                    <span className="text-sm font-medium">{toAccount?.name}</span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saldo antes</span>
                      <span>{formatCurrency(toAccount?.balance ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saldo depois</span>
                      <span className="text-emerald-600">{formatCurrency(toAfter!)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Transferência</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor</span>
                    <span className="font-medium">{formatCurrency(parsedAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Método</span>
                    <span>{method === "PIX" ? "Pix" : method === "TED" ? "TED" : "Transferência"}</span>
                  </div>
                  {date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data</span>
                      <span>{new Date(date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                    </div>
                  )}
                  {description && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Descrição</span>
                      <span className="truncate">{description}</span>
                    </div>
                  )}
                </div>
              </div>

              {willOverdraw && (
                <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="font-medium">A conta origem ficará negativa após a transferência.</p>
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {step > 0 ? (
              <Button type="button" variant="ghost" onClick={goBack} disabled={submitting} className="w-full sm:w-auto">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={submitting} className="w-full sm:w-auto">
                Cancelar
              </Button>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground">
              {step + 1}/{steps.length}
            </span>
            {step < steps.length - 1 ? (
              <Button
                type="button"
                onClick={goNext}
                disabled={(step === 0 && !isStep1Valid) || (step === 1 && !isStep2Valid)}
              >
                Avançar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transferindo...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Confirmar transferência</span>
                    <span className="sm:hidden">Transferir</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
