import Link from "next/link"
import { AlertTriangle, ArrowRight, CircleAlert, Loader2, ShieldCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import type {
  MonthlyPlanDto,
  MonthlyPlanStatusCode,
} from "@/features/monthly-plan/monthly-plan.types"

interface DailySafeLimitCardProps {
  plan: MonthlyPlanDto | null
  month: string
  loading?: boolean
}

const statusPresentation: Record<
  MonthlyPlanStatusCode,
  { icon: typeof ShieldCheck; className: string }
> = {
  NORMAL: { icon: ShieldCheck, className: "bg-success/10 text-success" },
  ATTENTION: { icon: CircleAlert, className: "bg-warning/10 text-warning" },
  RISK: { icon: AlertTriangle, className: "bg-destructive/10 text-destructive" },
}

export function DailySafeLimitCard({ plan, month, loading = false }: DailySafeLimitCardProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 sm:p-6">
        {loading ? (
          <div
            className="flex min-h-28 items-center justify-center gap-2 text-sm text-muted-foreground"
            role="status"
            aria-label="Carregando Plano do Mês"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Carregando Plano do Mês...
          </div>
        ) : plan ? (
          <PlanContent plan={plan} month={month} />
        ) : (
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Limite diário seguro</h2>
            <p className="text-sm text-muted-foreground">Não foi possível carregar o plano deste mês.</p>
            <PlanLink month={month} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PlanContent({ plan, month }: { plan: MonthlyPlanDto; month: string }) {
  const presentation = statusPresentation[plan.status.code]
  const StatusIcon = presentation.icon

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
      <div>
        <h2 className="text-base font-semibold">Limite diário seguro</h2>
        <p className="mt-1 text-2xl font-bold tabular-nums">{formatCurrency(plan.dailySafeLimit)}</p>
        <p className="text-xs text-muted-foreground">por dia durante os {plan.daysRemaining} dias restantes</p>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground">Economia projetada</p>
        <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(plan.projectedSavings)}</p>
        <div
          className="mt-2 flex items-start gap-2"
          role="status"
          aria-label={`Situação do plano: ${plan.status.label}`}
        >
          <span className={`mt-0.5 rounded-full p-1 ${presentation.className}`}>
            <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium">{plan.status.label}</p>
            <p className="text-xs text-muted-foreground">{plan.status.reason}</p>
          </div>
        </div>
      </div>

      <PlanLink month={month} />
    </div>
  )
}

function PlanLink({ month }: { month: string }) {
  return (
    <Link
      href={`/monthly-plan?month=${encodeURIComponent(month)}`}
      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      Ver Plano do Mês
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  )
}
