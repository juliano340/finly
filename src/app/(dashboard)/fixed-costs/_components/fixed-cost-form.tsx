"use client"

import { useState } from "react"
import { CreditCard, Repeat, Tag, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DateInput } from "@/components/ui/date-input"
import { FormActions } from "@/components/ui/form-actions"
import { FormField } from "@/components/ui/form-field"
import { FormSection } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"
import { MoneyInput } from "@/components/ui/money-input"
import { MonthInput } from "@/components/ui/month-input"
import { SegmentedControl } from "@/components/ui/segmented-control"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { mapZodErrors } from "@/lib/forms"
import { parseAmount } from "@/lib/amount"
import { formatIsoDate, todayIso } from "@/lib/dates"
import { formatMonth } from "@/lib/months"
import { formatCurrency } from "@/lib/utils"
import {
  fixedCostSchema,
  fixedCostSeriesUpdateSchema,
} from "@/features/fixed-costs/fixed-costs.schema"

type FixedCostType = "INCOME" | "EXPENSE"
type PaymentMethod = "PIX" | "BANK_SLIP" | "DEBIT" | "CREDIT_CARD" | "CASH"
type Frequency =
  | "DAILY"
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "BIMONTHLY"
  | "QUARTERLY"
  | "SEMIANNUAL"
  | "ANNUAL"
  | "CUSTOM"
type RecurrenceUnit = "DAYS" | "WEEKS" | "MONTHS" | "YEARS"
type EndType = "NONE" | "DATE" | "COUNT"
type FrequencyMode = "standard" | "custom"

export interface FixedCostCategoryOption {
  id: string
  name: string
}

export interface FixedCostCardOption {
  id: string
  name: string
  dueDay?: number | null
}

export interface FixedCostBankAccountOption {
  id: string
  name: string
}

export interface FixedCostFormInitial {
  name: string
  categoryId: string
  paymentMethod: string | null
  dueDay: number | null
  cardId: string | null
  bankAccountId: string | null
  active: boolean
  startDate: string | null
  frequency: string | null
  customInterval: number | null
  customUnit: string | null
  endType: string | null
  endDate: string | null
  endAfterCount: number | null
}

export interface FixedCostFormValues {
  name: string
  type: FixedCostType
  defaultAmount?: number
  categoryId: string
  paymentMethod: PaymentMethod
  dueDay: number | null
  paidInsideCard: boolean
  cardId: string | null
  bankAccountId: string | null
  active: boolean
  startDate: string
  frequency: Frequency
  customInterval: number | null
  customUnit: RecurrenceUnit | null
  endType: EndType
  endDate: string | null
  endAfterCount: number | null
}

interface FixedCostFormProps {
  mode: "create" | "series"
  type: FixedCostType
  categories: FixedCostCategoryOption[]
  cards: FixedCostCardOption[]
  bankAccounts: FixedCostBankAccountOption[]
  initial?: FixedCostFormInitial | null
  onSubmit: (values: FixedCostFormValues) => Promise<void>
  onClose: () => void
  onDelete?: () => void
  onBack?: () => void
}

const PAYMENT_METHOD_ITEMS: Record<string, string> = {
  PIX: "Pix",
  BANK_SLIP: "Boleto",
  DEBIT: "Débito",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartão de crédito",
}

const FREQUENCY_ITEMS: Record<string, string> = {
  DAILY: "Diária",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quinzenal",
  MONTHLY: "Mensal",
  BIMONTHLY: "Bimestral",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
}

const REC_UNIT_ITEMS: Record<string, string> = {
  DAYS: "Dias",
  WEEKS: "Semanas",
  MONTHS: "Meses",
  YEARS: "Anos",
}

const REC_END_ITEMS: Record<string, string> = {
  NONE: "Sem data final",
  DATE: "Encerrar em uma data",
  COUNT: "Após N ocorrências",
}

const FREQUENCY_PREVIEW: Record<string, string> = {
  DAILY: "diário",
  WEEKLY: "semanal",
  BIWEEKLY: "a cada 2 semanas",
  MONTHLY: "mensal",
  BIMONTHLY: "bimestral",
  QUARTERLY: "trimestral",
  SEMIANNUAL: "semestral",
  ANNUAL: "anual",
}

const CUSTOM_UNIT_PREVIEW: Record<string, string> = {
  DAYS: "dias",
  WEEKS: "semanas",
  MONTHS: "meses",
  YEARS: "anos",
}

const FREQUENCY_TYPE_OPTIONS = [
  { value: "standard" as const, label: "Padrão" },
  { value: "custom" as const, label: "Personalizada" },
]

const FIELD_ERROR_KEYS: Record<string, string> = {
  name: "name",
  defaultAmount: "amount",
  categoryId: "category",
  dueDay: "dueDay",
  cardId: "card",
  bankAccountId: "bankAccount",
  paidInsideCard: "payment",
  startDate: "startDate",
  customInterval: "customInterval",
  endDate: "endDate",
  endAfterCount: "endAfterCount",
}

const NO_ACCOUNT = "none"

const MONTH_BASED_FREQUENCIES: Frequency[] = [
  "MONTHLY",
  "BIMONTHLY",
  "QUARTERLY",
  "SEMIANNUAL",
  "ANNUAL",
]

function isMonthBasedFrequency(
  frequencyMode: FrequencyMode,
  frequency: Frequency,
  customUnit: RecurrenceUnit,
) {
  if (frequencyMode === "custom") return customUnit === "MONTHS" || customUnit === "YEARS"
  return MONTH_BASED_FREQUENCIES.includes(frequency)
}

export function FixedCostForm({
  mode,
  type,
  categories,
  cards,
  bankAccounts,
  initial,
  onSubmit,
  onClose,
  onDelete,
  onBack,
}: FixedCostFormProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "")
  const [dueDay, setDueDay] = useState(initial?.dueDay?.toString() ?? "")
  const [payment, setPayment] = useState<PaymentMethod>(
    (initial?.paymentMethod as PaymentMethod) ?? "PIX",
  )
  const [cardId, setCardId] = useState(initial?.cardId ?? "")
  const [bankAccountId, setBankAccountId] = useState(initial?.bankAccountId ?? NO_ACCOUNT)
  const [active, setActive] = useState(initial?.active ?? true)
  const [startDate, setStartDate] = useState(initial?.startDate?.split("T")[0] ?? todayIso())
  const [frequencyMode, setFrequencyMode] = useState<FrequencyMode>(
    initial?.frequency === "CUSTOM" ? "custom" : "standard",
  )
  const [frequency, setFrequency] = useState<Frequency>(
    initial?.frequency && initial.frequency !== "CUSTOM" ? (initial.frequency as Frequency) : "MONTHLY",
  )
  const [customInterval, setCustomInterval] = useState(initial?.customInterval?.toString() ?? "")
  const [customUnit, setCustomUnit] = useState<RecurrenceUnit>(
    (initial?.customUnit as RecurrenceUnit) ?? "MONTHS",
  )
  const [endType, setEndType] = useState<EndType>((initial?.endType as EndType) ?? "NONE")
  const [endDate, setEndDate] = useState(initial?.endDate?.split("T")[0] ?? "")
  const [endAfterCount, setEndAfterCount] = useState(initial?.endAfterCount?.toString() ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const paidInsideCard = type === "EXPENSE" && payment === "CREDIT_CARD"
  const monthBasedStart = isMonthBasedFrequency(frequencyMode, frequency, customUnit)

  function clearError(field: string) {
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      if (field !== "submit") delete next.submit
      return next
    })
  }

  function fillDueDayFromCard(cardIdValue: string) {
    if (dueDay) return
    const card = cards.find((item) => item.id === cardIdValue)
    if (card?.dueDay) setDueDay(String(card.dueDay))
  }

  function handleCardChange(value: string) {
    setCardId(value)
    clearError("card")
    fillDueDayFromCard(value)
  }

  function handlePaymentChange(value: PaymentMethod) {
    setPayment(value)
    clearError("payment")
    if (value === "CREDIT_CARD") fillDueDayFromCard(cardId)
  }

  function handleStartMonthChange(value: string) {
    setStartDate((prev) => (prev.slice(0, 7) === value ? prev : `${value}-01`))
  }

  function buildPayload(): FixedCostFormValues {
    const initialStartDate = initial?.startDate?.split("T")[0] ?? null
    const startMonth = startDate.slice(0, 7)
    const preserveStoredDay =
      mode === "series" && initialStartDate !== null && initialStartDate.slice(0, 7) === startMonth
    const effectiveStartDate = monthBasedStart
      ? preserveStoredDay
        ? initialStartDate
        : `${startMonth}-01`
      : startDate

    const base: FixedCostFormValues = {
      name: name.trim(),
      type,
      categoryId,
      paymentMethod: paidInsideCard ? "CREDIT_CARD" : payment,
      dueDay: dueDay.trim() === "" ? null : Number(dueDay),
      paidInsideCard,
      cardId: paidInsideCard && cardId ? cardId : null,
      bankAccountId: !paidInsideCard && bankAccountId !== NO_ACCOUNT ? bankAccountId : null,
      active,
      startDate: effectiveStartDate,
      frequency: frequencyMode === "custom" ? "CUSTOM" : frequency,
      customInterval:
        frequencyMode === "custom" && customInterval.trim() !== "" ? Number(customInterval) : null,
      customUnit: frequencyMode === "custom" ? customUnit : null,
      endType,
      endDate: endType === "DATE" && endDate ? endDate : null,
      endAfterCount:
        endType === "COUNT" && endAfterCount.trim() !== "" ? Number(endAfterCount) : null,
    }
    if (mode === "create") base.defaultAmount = parseAmount(amount)
    return base
  }

  function buildRecurrencePreview() {
    const parts: string[] = []
    const amountValue = parseAmount(amount)
    if (mode === "create" && amountValue > 0) parts.push(formatCurrency(amountValue))
    if (dueDay.trim() !== "") parts.push(`todo dia ${dueDay.trim()}`)
    parts.push(
      frequencyMode === "custom"
        ? `a cada ${customInterval.trim() || "?"} ${CUSTOM_UNIT_PREVIEW[customUnit]}`
        : FREQUENCY_PREVIEW[frequency],
    )
    if (startDate) {
      parts.push(`a partir de ${monthBasedStart ? formatMonth(startDate.slice(0, 7)) : formatIsoDate(startDate)}`)
    }
    parts.push(
      endType === "NONE"
        ? "sem término"
        : endType === "DATE"
          ? `até ${endDate ? formatIsoDate(endDate) : "?"}`
          : `por ${endAfterCount.trim() || "?"} ocorrências`,
    )
    return parts.join(" · ")
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const payload = buildPayload()
    const parsed = (mode === "create" ? fixedCostSchema : fixedCostSeriesUpdateSchema).safeParse(payload)
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
    <form className="flex-1 overflow-y-auto px-4 pb-4" onSubmit={handleSubmit}>
        <div className="mt-4 space-y-6">
          <FormSection icon={Tag} title="Lançamento">
            <FormField label="Nome" required error={errors.name}>
              <Input
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  clearError("name")
                }}
                placeholder="Ex: Internet"
                maxLength={80}
              />
            </FormField>

            {mode === "create" && (
              <MoneyInput
                label="Valor padrão"
                required
                error={errors.amount}
                value={amount}
                onValueChange={(value) => {
                  setAmount(value)
                  clearError("amount")
                }}
              />
            )}

            <FormField label="Categoria" required error={errors.category}>
              <Select
                items={Object.fromEntries(categories.map((category) => [category.id, category.name]))}
                value={categoryId}
                onValueChange={(value) => {
                  setCategoryId(value ?? "")
                  clearError("category")
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label="Dia de vencimento"
              hint="Meses curtos ajustam para o último dia do mês."
              error={errors.dueDay}
            >
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
          </FormSection>

          {type === "EXPENSE" ? (
            <FormSection icon={CreditCard} title="Pagamento">
              <FormField label="Forma de pagamento" required error={errors.payment}>
                <Select
                  items={PAYMENT_METHOD_ITEMS}
                  value={payment}
                  onValueChange={(value) => handlePaymentChange((value ?? "PIX") as PaymentMethod)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">Pix</SelectItem>
                    <SelectItem value="BANK_SLIP">Boleto</SelectItem>
                    <SelectItem value="DEBIT">Débito</SelectItem>
                    <SelectItem value="CASH">Dinheiro</SelectItem>
                    <SelectItem value="CREDIT_CARD">Cartão de crédito</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              {paidInsideCard ? (
                <FormField label="Cartão" required error={errors.card}>
                  <Select
                    items={Object.fromEntries(cards.map((card) => [card.id, card.name]))}
                    value={cardId || null}
                    onValueChange={(value) => handleCardChange(value ?? "")}
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
                <FormField label="Conta prevista" hint="Opcional" error={errors.bankAccount}>
                  <Select
                    items={{
                      [NO_ACCOUNT]: "Sem conta prevista",
                      ...Object.fromEntries(bankAccounts.map((account) => [account.id, account.name])),
                    }}
                    value={bankAccountId}
                    onValueChange={(value) => {
                      setBankAccountId(value ?? NO_ACCOUNT)
                      clearError("bankAccount")
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sem conta prevista" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_ACCOUNT}>Sem conta prevista</SelectItem>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </FormSection>
          ) : (
            <FormSection icon={CreditCard} title="Recebimento">
              <FormField label="Conta prevista" hint="Opcional">
                <Select
                  items={{
                    [NO_ACCOUNT]: "Sem conta prevista",
                    ...Object.fromEntries(bankAccounts.map((account) => [account.id, account.name])),
                  }}
                  value={bankAccountId}
                  onValueChange={(value) => setBankAccountId(value ?? NO_ACCOUNT)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sem conta prevista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ACCOUNT}>Sem conta prevista</SelectItem>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </FormSection>
          )}

          <FormSection icon={Repeat} title="Recorrência">
            {monthBasedStart ? (
              <MonthInput
                label="Mês de início"
                required
                error={errors.startDate}
                hint="O vencimento segue o Dia de vencimento; se cair antes do início, a primeira ocorrência vai para o mês seguinte."
                value={startDate.slice(0, 7)}
                onValueChange={handleStartMonthChange}
              />
            ) : (
              <DateInput
                label="Data de início"
                required
                error={errors.startDate}
                hint="O vencimento segue o Dia de vencimento; se cair antes do início, a primeira ocorrência vai para o mês seguinte."
                value={startDate}
                onValueChange={setStartDate}
              />
            )}

            <FormField label="Tipo">
              <SegmentedControl
                aria-label="Tipo de recorrência"
                options={FREQUENCY_TYPE_OPTIONS}
                value={frequencyMode}
                onValueChange={setFrequencyMode}
              />
            </FormField>

            {frequencyMode === "standard" ? (
              <FormField label="Frequência">
                <Select
                  items={FREQUENCY_ITEMS}
                  value={frequency}
                  onValueChange={(value) => setFrequency((value ?? "MONTHLY") as Frequency)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Diária</SelectItem>
                    <SelectItem value="WEEKLY">Semanal</SelectItem>
                    <SelectItem value="BIWEEKLY">Quinzenal</SelectItem>
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                    <SelectItem value="BIMONTHLY">Bimestral</SelectItem>
                    <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                    <SelectItem value="SEMIANNUAL">Semestral</SelectItem>
                    <SelectItem value="ANNUAL">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            ) : (
              <div className="grid grid-cols-[1fr_2fr] gap-3">
                <FormField label="A cada" error={errors.customInterval}>
                  <Input
                    type="number"
                    placeholder="1"
                    value={customInterval}
                    onChange={(event) => {
                      setCustomInterval(event.target.value)
                      clearError("customInterval")
                    }}
                  />
                </FormField>
                <FormField label="Unidade">
                  <Select
                    items={REC_UNIT_ITEMS}
                    value={customUnit}
                    onValueChange={(value) => setCustomUnit((value ?? "MONTHS") as RecurrenceUnit)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAYS">Dias</SelectItem>
                      <SelectItem value="WEEKS">Semanas</SelectItem>
                      <SelectItem value="MONTHS">Meses</SelectItem>
                      <SelectItem value="YEARS">Anos</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            )}

            <FormField label="Término">
              <Select
                items={REC_END_ITEMS}
                value={endType}
                onValueChange={(value) => setEndType((value ?? "NONE") as EndType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sem data final</SelectItem>
                  <SelectItem value="DATE">Encerrar em uma data</SelectItem>
                  <SelectItem value="COUNT">Após N ocorrências</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {endType === "DATE" && (
              <DateInput
                label="Data de término"
                required
                error={errors.endDate}
                value={endDate}
                onValueChange={setEndDate}
              />
            )}

            {endType === "COUNT" && (
              <FormField label="Número de ocorrências" error={errors.endAfterCount}>
                <Input
                  type="number"
                  placeholder="Ex: 12"
                  value={endAfterCount}
                  onChange={(event) => {
                    setEndAfterCount(event.target.value)
                    clearError("endAfterCount")
                  }}
                />
              </FormField>
            )}

            <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              {buildRecurrencePreview()}
            </p>
          </FormSection>

          {mode === "series" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
              Ativo (gera ocorrências nos próximos meses)
            </label>
          )}
        </div>

        {errors.submit && (
          <p className="mt-3 text-sm text-destructive" role="alert">{errors.submit}</p>
        )}

        <FormActions
          onCancel={onClose}
          submitLabel={mode === "create" ? "Salvar" : "Salvar configurações da série"}
          loading={loading}
        />

        {mode === "series" && onBack && (
          <Button type="button" variant="outline" className="mt-4 w-full" onClick={onBack}>
            Voltar para valor e escopo
          </Button>
        )}

        {mode === "series" && onDelete && (
          <Button
            type="button"
            variant="destructive"
            className="mt-2 w-full gap-2"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            Excluir lançamento fixo
          </Button>
        )}
      </form>
  )
}
