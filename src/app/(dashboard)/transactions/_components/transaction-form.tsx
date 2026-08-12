"use client"

import { useRef, useState } from "react"
import { Trash2 } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TransactionInput } from "@/features/transactions/transactions.schema"
import type { CategoryWithCount } from "@/features/categories/categories.types"

interface BankAccountOption {
  id: string
  name: string
  institution: string | null
  type: "CHECKING" | "SAVINGS" | "DIGITAL" | "CASH" | "INVESTMENT" | "BENEFIT"
}

interface InvoiceOption {
  id: string
  month: string
  calculationMode: "CALCULATED" | "ENTERED_TOTAL"
  card: { id: string; name: string }
}

interface TransactionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: TransactionInput) => Promise<void>
  categories: CategoryWithCount[]
  bankAccounts?: BankAccountOption[]
  invoices?: InvoiceOption[]
  activeMonth?: string | null
  initial?: Partial<TransactionInput>
  title: string
  onDelete?: () => void
}

export function TransactionForm({
  open,
  onOpenChange,
  onSubmit,
  categories,
  bankAccounts = [],
  invoices = [],
  activeMonth,
  initial,
  title,
  onDelete,
}: TransactionFormProps) {
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "")
  const [type, setType] = useState<"INCOME" | "EXPENSE">(initial?.type ?? "EXPENSE")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "")
  const [destinationType, setDestinationType] = useState<"NONE" | "ACCOUNT" | "CARD">(
    initial?.invoiceId ? "CARD" : initial?.bankAccountId ? "ACCOUNT" : "NONE",
  )
  const [bankAccountId, setBankAccountId] = useState(initial?.bankAccountId ?? "")
  const [invoiceId, setInvoiceId] = useState(initial?.invoiceId ?? "")
  const [cardId, setCardId] = useState(
    invoices.find((invoice) => invoice.id === initial?.invoiceId)?.card.id ?? "",
  )
  const [date, setDate] = useState(
    initial?.date ? new Date(initial.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
  )
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const inFlightRef = useRef(false)

  const filteredCategories = categories.filter((c) => c.type === type)
  const availableCards = Array.from(
    new Map(invoices.map((invoice) => [invoice.card.id, invoice.card])).values(),
  )
  const selectedInvoice = invoices.find((invoice) => invoice.id === invoiceId)
  const effectiveCardId = cardId || selectedInvoice?.card.id || ""
  const cardInvoices = invoices.filter((invoice) => invoice.card.id === effectiveCardId)

  function changeDestinationType(value: "NONE" | "ACCOUNT" | "CARD") {
    setDestinationType(value)
    if (value !== "ACCOUNT") setBankAccountId("")
    if (value !== "CARD") {
      setCardId("")
      setInvoiceId("")
    }
  }

  function selectCard(value: string) {
    setCardId(value)
    const matchingInvoices = invoices.filter((invoice) => invoice.card.id === value)
    const preferredInvoice = matchingInvoices.find((invoice) => invoice.month === activeMonth) ?? matchingInvoices[0]
    setInvoiceId(preferredInvoice?.id ?? "")
  }

  async function handleSubmit() {
    if (inFlightRef.current) return
    inFlightRef.current = true
    const numAmount = parseFloat(amount.replace(",", "."))
    if (!numAmount || numAmount <= 0) {
      setError("Valor deve ser maior que zero")
      inFlightRef.current = false
      return
    }
    if (!categoryId) {
      setError("Selecione uma categoria")
      inFlightRef.current = false
      return
    }
    if (destinationType === "ACCOUNT" && !bankAccountId) {
      setError("Selecione uma conta bancária")
      inFlightRef.current = false
      return
    }
    if (destinationType === "CARD" && !invoiceId) {
      setError("Selecione o cartão e a fatura")
      inFlightRef.current = false
      return
    }
    setError("")
    setLoading(true)
    try {
      await onSubmit({
        amount: numAmount,
        type,
        description: description.trim() || undefined,
        categoryId,
        date: new Date(date + "T12:00:00"),
        bankAccountId: destinationType === "ACCOUNT" ? bankAccountId : null,
        invoiceId: destinationType === "CARD" ? invoiceId : null,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
      setLoading(false)
      inFlightRef.current = false
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <form className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="mt-4 space-y-4">
            <div className="space-y-1">
              <Label>Valor</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d,]/g, "")
                  setAmount(raw)
                }}
                onBlur={() => {
                  if (!amount) return
                  const num = parseFloat(amount.replace(",", "."))
                  if (!isNaN(num)) {
                    setAmount(num.toFixed(2).replace(".", ","))
                  }
                }}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => {
                const nextType = (v ?? "EXPENSE") as typeof type
                setType(nextType)
                setCategoryId("")
                if (nextType === "INCOME" && destinationType === "CARD") changeDestinationType("NONE")
              }}>
                <SelectTrigger>
                  <SelectValue>
                    {type === "INCOME" ? "Receita" : "Despesa"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">Despesa</SelectItem>
                  <SelectItem value="INCOME">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? "")} disabled={filteredCategories.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione...">
                    {categoryId
                      ? categories.find((c) => c.id === categoryId)?.name ?? "Selecione..."
                      : filteredCategories.length === 0
                      ? "Nenhuma categoria disponível"
                      : "Selecione..."}
                  </SelectValue>
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
            </div>
            <div className="space-y-1">
              <Label>Destino (opcional)</Label>
              <Select value={destinationType} onValueChange={(value) => changeDestinationType((value ?? "NONE") as typeof destinationType)}>
                <SelectTrigger>
                  <SelectValue>
                    {destinationType === "ACCOUNT"
                      ? "Conta bancária"
                      : destinationType === "CARD" ? "Cartão de crédito" : "Sem vinculação"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sem vinculação</SelectItem>
                  <SelectItem value="ACCOUNT">Conta bancária</SelectItem>
                  {type === "EXPENSE" && <SelectItem value="CARD">Cartão de crédito</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {destinationType === "ACCOUNT" && (
              <div className="space-y-1">
                <Label>Conta bancária</Label>
                <Select value={bankAccountId || null} onValueChange={(value) => setBankAccountId(value ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta">
                      {bankAccountId ? bankAccounts.find((account) => account.id === bankAccountId)?.name : "Selecione uma conta"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                  {bankAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}{a.type === "BENEFIT" ? " • Benefício" : a.institution ? ` • ${a.institution}` : ""}
                    </SelectItem>
                  ))}
                  </SelectContent>
                </Select>
                {bankAccounts.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma conta bancária cadastrada.</p>}
              </div>
            )}

            {destinationType === "CARD" && (
              <div className="space-y-4 rounded-lg border bg-muted/20 p-3">
                <div className="space-y-1">
                  <Label>Cartão</Label>
                  <Select value={effectiveCardId || null} onValueChange={(value) => selectCard(value ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cartão">
                        {effectiveCardId ? availableCards.find((card) => card.id === effectiveCardId)?.name : "Selecione um cartão"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableCards.map((card) => <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {availableCards.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma fatura aberta ou estimada disponível.</p>}
                </div>

                {effectiveCardId && (
                  <div className="space-y-1">
                    <Label>Fatura</Label>
                    <Select value={invoiceId || null} onValueChange={(value) => setInvoiceId(value ?? "")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a fatura">
                          {selectedInvoice ? `Fatura de ${formatMonth(selectedInvoice.month)}` : "Selecione a fatura"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {cardInvoices.map((invoice) => (
                          <SelectItem key={invoice.id} value={invoice.id}>
                            {formatMonth(invoice.month)}{invoice.month === activeMonth ? " • mês selecionado" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedInvoice?.calculationMode === "ENTERED_TOTAL" && (
                  <p className="text-xs text-muted-foreground">
                    O lançamento aparecerá como previsto, mas não altera o total informado da fatura.
                  </p>
                )}
              </div>
            )}
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Ex: Supermercado Extra"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <div className="mt-6 flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" className="flex-1" disabled={loading} onClick={handleSubmit}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
          {onDelete && (
            <Button type="button" variant="destructive" className="mt-2 w-full" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />Excluir transação
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  )
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-")
  return `${monthNumber}/${year}`
}
