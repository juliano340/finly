"use client"

import { useState } from "react"
import { Loader2, RotateCcw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/utils"
import type { MonthlyPlanDto, MonthlyPlanUpdateInput } from "@/features/monthly-plan/monthly-plan.types"

interface MonthlyPlanFormProps {
  plan: MonthlyPlanDto
  saving: boolean
  onSubmit: (data: MonthlyPlanUpdateInput) => void | Promise<void>
}

export function MonthlyPlanForm({ plan, saving, onSubmit }: MonthlyPlanFormProps) {
  const [income, setIncome] = useState(() => String(plan.incomeOverride ?? plan.suggestedIncome))
  const [incomeOverride, setIncomeOverride] = useState<number | null>(plan.incomeOverride)
  const [savingsGoal, setSavingsGoal] = useState(() => String(plan.savingsGoal))
  const [safetyMargin, setSafetyMargin] = useState(() => String(plan.safetyMargin))

  function restoreSuggestedIncome() {
    setIncome(String(plan.suggestedIncome))
    setIncomeOverride(null)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit({
      incomeOverride,
      savingsGoal: Number(savingsGoal),
      safetyMargin: Number(safetyMargin),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurar plano</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <fieldset disabled={saving} className="space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="monthly-plan-income">Receita prevista (R$)</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={restoreSuggestedIncome}
                  disabled={incomeOverride === null}
                >
                  <RotateCcw aria-hidden="true" />
                  Usar receita sugerida
                </Button>
              </div>
              <Input
                id="monthly-plan-income"
                type="number"
                inputMode="decimal"
                min="0"
                max="99999999.99"
                step="0.01"
                required
                value={income}
                aria-describedby="monthly-plan-income-help"
                onChange={(event) => {
                  setIncome(event.target.value)
                  setIncomeOverride(Number(event.target.value))
                }}
              />
              <p id="monthly-plan-income-help" className="text-xs text-muted-foreground">
                Sugestão automática pelas receitas recorrentes: {formatCurrency(plan.suggestedIncome)}.
                Alterações valem apenas para este mês.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-plan-savings">Meta mínima de economia (R$)</Label>
              <Input
                id="monthly-plan-savings"
                type="number"
                inputMode="decimal"
                min="0"
                max="99999999.99"
                step="0.01"
                required
                value={savingsGoal}
                onChange={(event) => setSavingsGoal(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Valor mínimo que você pretende guardar.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-plan-margin">Margem de segurança (R$)</Label>
              <Input
                id="monthly-plan-margin"
                type="number"
                inputMode="decimal"
                min="0"
                max="99999999.99"
                step="0.01"
                required
                value={safetyMargin}
                onChange={(event) => setSafetyMargin(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Reserva opcional e separada para imprevistos.</p>
            </div>

            <Button type="submit" className="w-full sm:w-auto">
              {saving ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}
              {saving ? "Salvando…" : "Salvar plano"}
            </Button>
          </fieldset>
          {saving && <p role="status" className="sr-only">Salvando alterações do plano.</p>}
        </form>
      </CardContent>
    </Card>
  )
}
