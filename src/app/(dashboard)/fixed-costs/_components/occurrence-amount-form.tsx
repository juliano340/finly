"use client"

import { useState } from "react"
import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DateInput } from "@/components/ui/date-input"
import { FormField } from "@/components/ui/form-field"
import { FormSection } from "@/components/ui/form-section"
import { MoneyInput } from "@/components/ui/money-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SubmitButton } from "@/components/ui/submit-button"
import { mapZodErrors } from "@/lib/forms"
import { normalizeAmount, parseAmount } from "@/lib/amount"
import { toIsoDate } from "@/lib/dates"
import { formatMonth } from "@/lib/months"
import { fixedCostOccurrenceAmountUpdateSchema } from "@/features/fixed-costs/fixed-costs.schema"
import {
  defaultOccurrenceDueDate,
  type FixedCostPaymentMethod,
  type OccurrencePaymentSource,
} from "@/features/fixed-costs/occurrence-payment"

export type FixedCostEditScope = "THIS_MONTH" | "THIS_AND_FUTURE" | "ENTIRE_SERIES"

export interface OccurrenceAmountValues {
  occurrenceId: string
  month: string
  scope: FixedCostEditScope
  amount: number
  expectedUpdatedAt: string
  paymentMethod?: FixedCostPaymentMethod | null
  cardId?: string | null
  bankAccountId?: string | null
  dueDate?: string | null
}

interface OccurrenceFormData extends OccurrencePaymentSource {
  id: string
  amount: number
  updatedAt: string
}

interface OccurrenceAmountFormProps {
  occurrence: OccurrenceFormData
  cards: { id: string; name: string }[]
  bankAccounts: { id: string; name: string }[]
  onSubmit: (values: OccurrenceAmountValues) => Promise<void>
  onClose: () => void
  onEditSeries: () => void
}

const SCOPE_DESCRIPTIONS: Record<FixedCostEditScope, string> = {
  THIS_MONTH: "Somente o valor desta ocorrência será alterado.",
  THIS_AND_FUTURE:
    "O novo valor será usado nesta ocorrência, nas próximas ocorrências abertas e como padrão para novas ocorrências.",
  ENTIRE_SERIES:
    "O novo valor será aplicado às ocorrências abertas da série e usado como padrão. Valores pagos, meses fechados e ocorrências excluídas serão preservados.",
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: "Pix",
  BANK_SLIP: "Boleto",
  DEBIT: "Débito",
  CREDIT_CARD: "Cartão de crédito",
  CASH: "Dinheiro",
}

const SERIES = "series"
const NONE = "none"

const FIELD_ERROR_KEYS: Record<string, string> = {
  amount: "amount",
  paymentMethod: "payment",
  cardId: "card",
  bankAccountId: "account",
  dueDate: "dueDate",
}

export function OccurrenceAmountForm({
  occurrence,
  cards,
  bankAccounts,
  onSubmit,
  onClose,
  onEditSeries,
}: OccurrenceAmountFormProps) {
  const [scope, setScope] = useState<FixedCostEditScope>("THIS_MONTH")
  const [amount, setAmount] = useState(normalizeAmount(occurrence.amount.toString()) ?? "")
  const [payment, setPayment] = useState<string>(occurrence.paymentMethodOverride ?? SERIES)
  const [cardId, setCardId] = useState<string>(occurrence.cardIdOverride ?? SERIES)
  const [bankAccountId, setBankAccountId] = useState<string>(
    occurrence.bankAccountIdOverride === null ? SERIES : occurrence.bankAccountIdOverride ?? SERIES,
  )
  const defaultDueIso = toIsoDate(defaultOccurrenceDueDate(occurrence))
  const [dueDate, setDueDate] = useState(
    occurrence.dueDate ? toIsoDate(new Date(occurrence.dueDate)) : defaultDueIso,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const isIncome = occurrence.fixedCost.type === "INCOME"
  const effectivePayment = payment === SERIES ? occurrence.fixedCost.paymentMethod : payment
  const isCardPayment = !isIncome && effectivePayment === "CREDIT_CARD"

  const monthLabel = formatMonth(occurrence.month)
  const saveLabel = scope === "THIS_MONTH"
    ? `Salvar somente ${monthLabel}`
    : scope === "THIS_AND_FUTURE"
      ? `Salvar ${monthLabel} e próximos`
      : "Salvar toda a série"

  const scopeOptions = [
    ["THIS_MONTH", `Somente esta ocorrência (${monthLabel})`],
    ["THIS_AND_FUTURE", `Esta ocorrência e as próximas, a partir de ${monthLabel}`],
    ["ENTIRE_SERIES", "Toda a série"],
  ] as const

  const seriesPaymentLabel = PAYMENT_METHOD_LABELS[occurrence.fixedCost.paymentMethod] ?? occurrence.fixedCost.paymentMethod
  const seriesCard = cards.find((card) => card.id === occurrence.fixedCost.cardId)
  const seriesAccount = bankAccounts.find((account) => account.id === occurrence.fixedCost.bankAccountId)

  function clearError(field: string) {
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      delete next.submit
      return next
    })
  }

  function restoreSeriesDefaults() {
    setPayment(SERIES)
    setCardId(SERIES)
    setBankAccountId(SERIES)
    setDueDate(defaultDueIso)
    setErrors({})
  }

  function buildOverrides() {
    if (scope !== "THIS_MONTH") return {}
    return {
      paymentMethod: isIncome ? undefined : (payment === SERIES ? null : (payment as FixedCostPaymentMethod)),
      cardId: isCardPayment ? (cardId === SERIES ? null : cardId) : null,
      bankAccountId: isCardPayment
        ? null
        : (bankAccountId === SERIES || bankAccountId === NONE ? null : bankAccountId),
      dueDate: dueDate === defaultDueIso ? null : dueDate,
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const payload: OccurrenceAmountValues = {
      occurrenceId: occurrence.id,
      month: occurrence.month,
      scope,
      amount: parseAmount(amount),
      expectedUpdatedAt: occurrence.updatedAt,
      ...buildOverrides(),
    }
    const parsed = fixedCostOccurrenceAmountUpdateSchema.safeParse(payload)
    if (!parsed.success) {
      setErrors(mapZodErrors(parsed.error, FIELD_ERROR_KEYS))
      return
    }

    setErrors({})
    setLoading(true)
    try {
      await onSubmit(payload)
      onClose()
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Erro ao salvar" })
      setLoading(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Aplicar alteração em</legend>
        {scopeOptions.map(([value, label]) => (
          <label key={value} className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm">
            <input
              type="radio"
              name="scope"
              value={value}
              checked={scope === value}
              onChange={() => setScope(value)}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <MoneyInput
        label="Novo valor"
        required
        error={errors.amount}
        value={amount}
        onValueChange={(value) => {
          setAmount(value)
          clearError("amount")
        }}
      />

      {scope === "THIS_MONTH" && (
        <FormSection icon={SlidersHorizontal} title="Personalizar esta ocorrência">
          <p className="text-xs text-muted-foreground">
            Vale somente para {monthLabel}; a série continua como está.
          </p>

          {!isIncome && (
            <FormField label="Forma de pagamento" error={errors.payment}>
              <Select
                items={{
                  [SERIES]: `Padrão da série (${seriesPaymentLabel})`,
                  ...PAYMENT_METHOD_LABELS,
                }}
                value={payment}
                onValueChange={(value) => {
                  setPayment(value ?? SERIES)
                  clearError("payment")
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SERIES}>Padrão da série ({seriesPaymentLabel})</SelectItem>
                  <SelectItem value="PIX">Pix</SelectItem>
                  <SelectItem value="BANK_SLIP">Boleto</SelectItem>
                  <SelectItem value="DEBIT">Débito</SelectItem>
                  <SelectItem value="CASH">Dinheiro</SelectItem>
                  <SelectItem value="CREDIT_CARD">Cartão de crédito</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          )}

          {isCardPayment ? (
            <FormField label="Cartão" required error={errors.card}>
              <Select
                items={Object.fromEntries(cards.map((card) => [card.id, card.name]))}
                value={cardId === SERIES ? (occurrence.fixedCost.cardId ?? null) : cardId}
                onValueChange={(value) => {
                  setCardId(value ?? SERIES)
                  clearError("card")
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um cartão" />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : (
            <FormField
              label="Conta prevista"
              hint={seriesAccount ? `Padrão da série: ${seriesAccount.name}` : undefined}
              error={errors.account}
            >
              <Select
                items={{
                  [NONE]: "Sem conta prevista",
                  ...Object.fromEntries(bankAccounts.map((account) => [account.id, account.name])),
                }}
                value={bankAccountId === SERIES ? (occurrence.fixedCost.bankAccountId ?? NONE) : bankAccountId}
                onValueChange={(value) => {
                  setBankAccountId(value ?? SERIES)
                  clearError("account")
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sem conta prevista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem conta prevista</SelectItem>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          <DateInput
            label="Vencimento"
            error={errors.dueDate}
            hint={seriesCard && isCardPayment ? `Fatura do cartão ${seriesCard.name}` : undefined}
            value={dueDate}
            onValueChange={(value) => {
              setDueDate(value)
              clearError("dueDate")
            }}
          />

          <Button type="button" variant="outline" size="sm" className="w-full" onClick={restoreSeriesDefaults}>
            Restaurar padrão da série
          </Button>
        </FormSection>
      )}

      <p className="text-xs text-muted-foreground">{SCOPE_DESCRIPTIONS[scope]}</p>

      {errors.submit && (
        <p className="text-sm text-destructive" role="alert">{errors.submit}</p>
      )}

      <SubmitButton className="w-full" loading={loading}>{saveLabel}</SubmitButton>

      <Button type="button" variant="outline" className="w-full" onClick={onEditSeries}>
        Editar configurações da série
      </Button>
    </form>
  )
}
