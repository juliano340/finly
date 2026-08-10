"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getBusinessMonthKey, getSupportedMonthWindow } from "@/features/monthly-plan/monthly-plan.schema"
import type { MonthlyPlanDto, MonthlyPlanUpdateInput } from "@/features/monthly-plan/monthly-plan.types"
import { MonthlyPlanForm } from "./_components/monthly-plan-form"
import { MonthlyPlanSummary } from "./_components/monthly-plan-summary"
import { MonthNavigator } from "@/components/month-navigator"

export default function MonthlyPlanPage() {
  return (
    <Suspense fallback={<PlanLoading />}>
      <MonthlyPlanPageContent />
    </Suspense>
  )
}

function MonthlyPlanPageContent() {
  const searchParams = useSearchParams()
  const [{ min, max }] = useState(() => getSupportedMonthWindow())
  const [month, setMonth] = useState(() => {
    const requestedMonth = searchParams.get("month")
    return requestedMonth
      && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)
      && requestedMonth >= min
      && requestedMonth <= max
      ? requestedMonth
      : getBusinessMonthKey(new Date())
  })
  const [plan, setPlan] = useState<MonthlyPlanDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const loadPlan = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/monthly-plan?month=${month}`, {
        cache: "no-store",
        signal,
      })
      if (!response.ok) throw new Error("Não foi possível carregar o plano deste mês.")
      const data = await response.json() as MonthlyPlanDto
      if (!signal?.aborted) setPlan(data)
    } catch (loadError) {
      if (signal?.aborted) return
      setPlan(null)
      setError(loadError instanceof Error ? loadError.message : "Erro ao carregar plano mensal.")
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [month])

  useEffect(() => {
    const controller = new AbortController()
    void loadPlan(controller.signal) // eslint-disable-line react-hooks/set-state-in-effect
    return () => controller.abort()
  }, [loadPlan, reloadKey])

  function selectMonth(nextMonth: string) {
    if (nextMonth < min || nextMonth > max || nextMonth === month) return
    setPlan(null)
    setError(null)
    setLoading(true)
    setMonth(nextMonth)
  }

  async function savePlan(input: MonthlyPlanUpdateInput) {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/monthly-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, ...input }),
      })
      if (!response.ok) throw new Error("Não foi possível salvar o plano.")
      const updatedPlan = await response.json() as MonthlyPlanDto
      setPlan(updatedPlan)
      toast.success("Plano do mês atualizado!")
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Erro ao salvar plano mensal."
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plano do Mês</h1>
          <p className="text-muted-foreground">
            Ajuste sua meta e acompanhe quanto pode gastar por dia com segurança.
          </p>
        </div>

        <MonthNavigator
          month={month}
          minMonth={min}
          maxMonth={max}
          todayMonth={getBusinessMonthKey(new Date())}
          disabled={loading || saving}
          inputLabel="Mês do plano"
          onMonthChange={selectMonth}
        />
      </div>

      {loading ? (
        <PlanLoading />
      ) : error && !plan ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
            <p role="alert" className="text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
              <RefreshCw aria-hidden="true" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : plan ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <MonthlyPlanSummary plan={plan} />
          <MonthlyPlanForm
            key={`${plan.month}-${plan.incomeOverride}-${plan.savingsGoal}-${plan.safetyMargin}`}
            plan={plan}
            saving={saving}
            onSubmit={savePlan}
          />
        </div>
      ) : null}

      {error && plan && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <p aria-live="polite" className="sr-only">
        {saving ? "Salvando plano." : ""}
      </p>
    </div>
  )
}

function PlanLoading() {
  return (
    <div role="status" className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground">
      <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
      Carregando plano do mês…
    </div>
  )
}
