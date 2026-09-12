"use client"

import { useState } from "react"
import { CalendarDays, CreditCard, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormActions } from "@/components/ui/form-actions"
import { FormField } from "@/components/ui/form-field"
import { FormSection } from "@/components/ui/form-section"
import { mapZodErrors } from "@/lib/forms"
import { cardSchema, type CardInput } from "@/features/cards/cards.schema"

interface CardFormCard {
  id: string
  name: string
  brand: string | null
  color: string
  closingDay: number | null
  dueDay: number | null
  bankAccountId: string | null
}

interface BankAccountOption {
  id: string
  name: string
}

interface CardFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card?: CardFormCard | null
  bankAccounts: BankAccountOption[]
  onSubmit: (input: CardInput) => Promise<void>
  onDelete?: () => void
}

const FIELD_ERROR_KEYS: Record<string, string> = {
  name: "name",
  closingDay: "closingDay",
  dueDay: "dueDay",
}

const NO_ACCOUNT = "none"

export function CardForm({
  open,
  onOpenChange,
  card,
  bankAccounts,
  onSubmit,
  onDelete,
}: CardFormProps) {
  const [name, setName] = useState(card?.name ?? "")
  const [brand, setBrand] = useState(card?.brand ?? "")
  const [bankAccountId, setBankAccountId] = useState(card?.bankAccountId ?? NO_ACCOUNT)
  const [closingDay, setClosingDay] = useState(card?.closingDay?.toString() ?? "")
  const [dueDay, setDueDay] = useState(card?.dueDay?.toString() ?? "")
  const [color, setColor] = useState(card?.color ?? "#22C55E")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const accountItems = {
    [NO_ACCOUNT]: "Sem conta vinculada",
    ...Object.fromEntries(bankAccounts.map((account) => [account.id, account.name])),
  }

  function clearError(field: string) {
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      delete next.submit
      return next
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const parsed = cardSchema.safeParse({
      name: name.trim(),
      brand: brand.trim() || null,
      color,
      closingDay: closingDay.trim() || null,
      dueDay: dueDay.trim() || null,
      bankAccountId: bankAccountId === NO_ACCOUNT ? null : bankAccountId,
    })
    if (!parsed.success) {
      setErrors(mapZodErrors(parsed.error, FIELD_ERROR_KEYS))
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
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {card && (
              <span className="rounded-lg p-1.5 text-white" style={{ backgroundColor: card.color }}>
                <CreditCard className="h-4 w-4" />
              </span>
            )}
            {card ? card.name : "Novo cartão"}
          </SheetTitle>
        </SheetHeader>
        <form className="flex-1 overflow-y-auto px-4 pb-4" onSubmit={handleSubmit}>
          <div className="mt-4 space-y-6">
            <FormSection icon={CreditCard} title="Cartão">
              <FormField label="Nome do cartão" required error={errors.name}>
                <Input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    clearError("name")
                  }}
                  placeholder="Ex: NUBANK PLATINUM"
                  maxLength={60}
                />
              </FormField>
              <FormField label="Bandeira">
                <Input
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  placeholder="Ex: MASTERCARD"
                  maxLength={40}
                />
              </FormField>
              <FormField label="Conta vinculada">
                <Select
                  items={accountItems}
                  value={bankAccountId}
                  onValueChange={(value) => setBankAccountId(value ?? NO_ACCOUNT)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sem conta vinculada" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ACCOUNT}>Sem conta vinculada</SelectItem>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Cor">
                <Input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="w-16"
                />
              </FormField>
            </FormSection>

            <FormSection icon={CalendarDays} title="Ciclo da fatura">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Dia fechamento" error={errors.closingDay}>
                  <Input
                    type="number"
                    placeholder="Ex: 15"
                    value={closingDay}
                    onChange={(event) => {
                      setClosingDay(event.target.value)
                      clearError("closingDay")
                    }}
                  />
                </FormField>
                <FormField label="Dia vencimento" error={errors.dueDay}>
                  <Input
                    type="number"
                    placeholder="Ex: 10"
                    value={dueDay}
                    onChange={(event) => {
                      setDueDay(event.target.value)
                      clearError("dueDay")
                    }}
                  />
                </FormField>
              </div>
              {card && (
                <p className="text-xs text-muted-foreground">
                  Ao alterar, faturas abertas deste mês em diante passam a vencer no novo dia. Faturas fechadas/pagas não mudam.
                </p>
              )}
            </FormSection>
          </div>

          {errors.submit && (
            <p className="mt-3 text-sm text-destructive" role="alert">{errors.submit}</p>
          )}

          <FormActions
            onCancel={() => onOpenChange(false)}
            submitLabel={card ? "Salvar alterações" : "Salvar"}
            loading={loading}
          />

          {card && onDelete && (
            <Button
              type="button"
              variant="destructive"
              className="mt-4 w-full gap-2"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              Excluir cartão
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  )
}
