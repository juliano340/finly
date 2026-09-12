"use client"

import { useRef, useState } from "react"
import { CalendarDays, Tag, Trash2 } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormField } from "@/components/ui/form-field"
import { TypeToggle } from "@/components/ui/type-toggle"
import { formatMonth } from "@/lib/months"
import { useAmountInput } from "@/hooks/use-amount-input"
import { useInvoiceAutoCreate, type CardOption, type InvoiceOption } from "./use-invoice-auto-create"
import { transactionSchema, type TransactionInput } from "@/features/transactions/transactions.schema"
import type { CategoryWithCount } from "@/features/categories/categories.types"

const DESTINATION_ITEMS: Record<string, string> = {
  NONE: "Sem vinculação",
  ACCOUNT: "Conta bancária",
  CARD: "Cartão de crédito",
}

const FIELD_ERROR_KEYS: Record<string, string> = {
  amount: "amount",
  categoryId: "category",
  bankAccountId: "account",
  invoiceId: "invoice",
}

interface BankAccountOption {
  id: string
  name: string
  institution: string | null
  type: "CHECKING" | "SAVINGS" | "DIGITAL" | "CASH" | "INVESTMENT" | "BENEFIT"
}

interface TransactionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: TransactionInput) => Promise<void>
  categories: CategoryWithCount[]
  bankAccounts?: BankAccountOption[]
  cards?: CardOption[]
  invoices?: InvoiceOption[]
  activeMonth?: string | null
  initial?: Partial<TransactionInput>
  title: string
  onDelete?: () => void
  onInvoiceCreated?: (invoice: InvoiceOption) => void
}

export function TransactionForm({
  open,
  onOpenChange,
  onSubmit,
  categories,
  bankAccounts = [],
  cards = [],
  invoices = [],
  activeMonth,
  initial,
  title,
  onDelete,
  onInvoiceCreated,
}: TransactionFormProps) {
  const amountInput = useAmountInput(initial?.amount)
  const [type, setType] = useState<"INCOME" | "EXPENSE">(initial?.type ?? "EXPENSE")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "")
  const [destinationType, setDestinationType] = useState<"NONE" | "ACCOUNT" | "CARD">(
    initial?.invoiceId ? "CARD" : initial?.bankAccountId ? "ACCOUNT" : "NONE",
  )
  const [bankAccountId, setBankAccountId] = useState(initial?.bankAccountId ?? "")
  const [date, setDate] = useState(
    initial?.date ? new Date(initial.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const inFlightRef = useRef(false)

  const autoCreate = useInvoiceAutoCreate({
    cards,
    invoices,
    activeMonth,
    initialInvoiceId: initial?.invoiceId ?? "",
    onInvoiceCreated,
  })

  const filteredCategories = categories.filter((c) => c.type === type)

  function changeType(nextType: "INCOME" | "EXPENSE") {
    setType(nextType)
    setCategoryId("")
    if (nextType === "INCOME" && destinationType === "CARD") changeDestinationType("NONE")
    clearError("category")
  }

  function changeDestinationType(value: "NONE" | "ACCOUNT" | "CARD") {
    setDestinationType(value)
    if (value !== "CARD") autoCreate.resetCardSelection()
    if (value !== "ACCOUNT") setBankAccountId("")
    clearError("account")
    clearError("invoice")
  }

  function clearError(field: string) {
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      if (field !== "submit") delete next.submit
      return next
    })
  }

  async function handleSubmit() {
    if (inFlightRef.current) return
    inFlightRef.current = true

    const parsed = transactionSchema.safeParse({
      amount: amountInput.parsedValue,
      type,
      description: description.trim() || undefined,
      categoryId,
      date: new Date(date + "T12:00:00"),
      bankAccountId: destinationType === "ACCOUNT" ? bankAccountId : null,
      invoiceId: destinationType === "CARD" ? autoCreate.invoiceId : null,
    })

    const newErrors: Record<string, string> = {}
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = FIELD_ERROR_KEYS[String(issue.path[0])]
        if (key && !newErrors[key]) newErrors[key] = issue.message
      }
    }
    if (destinationType === "ACCOUNT" && !bankAccountId) newErrors.account = "Selecione uma conta bancária"
    if (destinationType === "CARD" && !autoCreate.invoiceId) newErrors.invoice = "Selecione o cartão e a fatura"

    if (Object.keys(newErrors).length > 0 || !parsed.success) {
      setErrors(newErrors)
      inFlightRef.current = false
      return
    }

    setErrors({})
    setLoading(true)
    try {
      await onSubmit(parsed.data)
      onOpenChange(false)
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Erro ao salvar" })
      setLoading(false)
      inFlightRef.current = false
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="flex flex-row items-center justify-between gap-2 pr-10">
          <SheetTitle>{title}</SheetTitle>
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
              aria-label="Excluir transação"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </SheetHeader>
        <form className="flex-1 overflow-y-auto px-4 pb-4" onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
          <div className="mt-4 space-y-6">
            {/* Tipo */}
            <TypeToggle value={type} onChange={changeType} />

            {/* Valor */}
            <FormField label="Valor" required error={errors.amount}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amountInput.amount}
                  onChange={(e) => {
                    amountInput.handleChange(e.target.value)
                    clearError("amount")
                  }}
                  onBlur={amountInput.handleBlur}
                  className="h-10 pl-10 text-base font-medium"
                />
              </div>
            </FormField>

            {/* Seção: Detalhes */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Tag className="h-3.5 w-3.5" />
                Detalhes
              </div>

              <FormField label="Categoria" required error={errors.category}>
                <Select
                  items={Object.fromEntries(filteredCategories.map((c) => [c.id, c.name]))}
                  value={categoryId}
                  onValueChange={(value) => { setCategoryId(value ?? ""); clearError("category") }}
                  disabled={filteredCategories.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Crie uma categoria de {type === "INCOME" ? "receita" : "despesa"} primeiro
                      </div>
                    ) : (
                      filteredCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Destino" hint="Opcional" error={errors.account}>
                <Select
                  items={DESTINATION_ITEMS}
                  value={destinationType}
                  onValueChange={(value) => changeDestinationType((value ?? "NONE") as typeof destinationType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sem vinculação</SelectItem>
                    <SelectItem value="ACCOUNT">Conta bancária</SelectItem>
                    {type === "EXPENSE" && <SelectItem value="CARD">Cartão de crédito</SelectItem>}
                  </SelectContent>
                </Select>
              </FormField>

              {destinationType === "ACCOUNT" && (
                <FormField label="Conta bancária" error={errors.account}>
                  <Select
                    items={Object.fromEntries(
                      bankAccounts.map((a) => [
                        a.id,
                        `${a.name}${a.type === "BENEFIT" ? " • Benefício" : a.institution ? ` • ${a.institution}` : ""}`,
                      ]),
                    )}
                    value={bankAccountId || null}
                    onValueChange={(value) => { setBankAccountId(value ?? ""); clearError("account") }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione uma conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}{a.type === "BENEFIT" ? " • Benefício" : a.institution ? ` • ${a.institution}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {bankAccounts.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma conta bancária cadastrada.</p>
                  )}
                </FormField>
              )}

              {destinationType === "CARD" && (
                <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                  {cards.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum cartão com fatura aberta ou estimada.</p>
                  ) : (
                    <>
                      <FormField label="Cartão" error={!autoCreate.effectiveCardId ? errors.invoice : undefined}>
                        <Select
                          items={Object.fromEntries(cards.map((card) => [card.id, card.name]))}
                          value={autoCreate.effectiveCardId || null}
                          onValueChange={(value) => { autoCreate.selectCard(value ?? ""); clearError("invoice") }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione um cartão" />
                          </SelectTrigger>
                          <SelectContent>
                            {cards.map((card) => <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormField>

                      {autoCreate.effectiveCardId && (
                        <FormField
                          label="Fatura"
                          error={errors.invoice ?? (autoCreate.invoiceError || undefined)}
                          hint={autoCreate.invoiceNotice || undefined}
                        >
                          <Select
                            items={Object.fromEntries(
                              autoCreate.cardInvoices.map((invoice) => [
                                invoice.id,
                                `${formatMonth(invoice.month)}${invoice.month === activeMonth ? " • mês selecionado" : ""}`,
                              ]),
                            )}
                            value={autoCreate.invoiceId || null}
                            onValueChange={(value) => { autoCreate.selectInvoice(value ?? ""); clearError("invoice") }}
                            disabled={autoCreate.creatingInvoice}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={autoCreate.creatingInvoice ? "Criando fatura..." : "Selecione a fatura"} />
                            </SelectTrigger>
                            <SelectContent>
                              {autoCreate.cardInvoices.map((invoice) => (
                                <SelectItem key={invoice.id} value={invoice.id}>
                                  {formatMonth(invoice.month)}{invoice.month === activeMonth ? " • mês selecionado" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>
                      )}

                      {autoCreate.selectedInvoice?.calculationMode === "ENTERED_TOTAL" && (
                        <p className="text-xs text-muted-foreground">
                          O lançamento aparecerá como previsto, mas não altera o total informado da fatura.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Seção: Quando */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Quando
              </div>

              <FormField label="Data" required>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </FormField>

              <FormField label="Nota" hint={description.length > 0 ? `${description.length}/200` : "Opcional"}>
                <Input
                  placeholder="Ex: Supermercado Extra"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={200}
                />
              </FormField>
            </div>
          </div>

          {errors.submit && (
            <p className="mt-3 text-sm text-destructive" role="alert">{errors.submit}</p>
          )}

          <div className="mt-6 flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
