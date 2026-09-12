"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MoneyInput } from "@/components/ui/money-input"
import { SubmitButton } from "@/components/ui/submit-button"
import { mapZodErrors } from "@/lib/forms"
import { normalizeAmount, parseAmount } from "@/lib/amount"
import { formatMonth } from "@/lib/months"
import { fixedCostOccurrenceAmountUpdateSchema } from "@/features/fixed-costs/fixed-costs.schema"

export type FixedCostEditScope = "THIS_MONTH" | "THIS_AND_FUTURE" | "ENTIRE_SERIES"

export interface OccurrenceAmountValues {
  occurrenceId: string
  month: string
  scope: FixedCostEditScope
  amount: number
  expectedUpdatedAt: string
}

interface OccurrenceAmountFormProps {
  occurrence: {
    id: string
    month: string
    amount: number
    updatedAt: string
  }
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

export function OccurrenceAmountForm({
  occurrence,
  onSubmit,
  onClose,
  onEditSeries,
}: OccurrenceAmountFormProps) {
  const [scope, setScope] = useState<FixedCostEditScope>("THIS_MONTH")
  const [amount, setAmount] = useState(normalizeAmount(occurrence.amount.toString()) ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const payload: OccurrenceAmountValues = {
      occurrenceId: occurrence.id,
      month: occurrence.month,
      scope,
      amount: parseAmount(amount),
      expectedUpdatedAt: occurrence.updatedAt,
    }
    const parsed = fixedCostOccurrenceAmountUpdateSchema.safeParse(payload)
    if (!parsed.success) {
      setErrors(mapZodErrors(parsed.error, { amount: "amount" }))
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
          setErrors((prev) => {
            const next = { ...prev }
            delete next.amount
            delete next.submit
            return next
          })
        }}
      />

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
