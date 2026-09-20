import Link from "next/link"
import { AlertTriangle, ArrowRight, CircleAlert, Loader2, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import type {
  MonthlyPlanDto,
  MonthlyPlanStatusCode,
} from "@/features/monthly-plan/monthly-plan.types"

interface RitmoDoMesCardProps {
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

export function RitmoDoMesCard({ plan, month, loading = false }: RitmoDoMesCardProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Ritmo do mês</CardTitle>
        <p className="text-sm text-muted-foreground">Quanto ainda dá pra gastar por dia sem furar a meta.</p>
      </CardHeader>
      <CardContent className="space-y-4">
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
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2">
        <div className="border-t border-border p-3 first:border-t-0 sm:border-t-0 sm:border-l sm:first:border-l-0">
          <p className="text-xs font-medium text-muted-foreground">Limite diário seguro</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(plan.dailySafeLimit)}</p>
          <p className="text-[11px] text-muted-foreground">por dia durante os {plan.daysRemaining} dias restantes</p>
        </div>

        <div className="border-t border-border p-3 sm:border-t-0 sm:border-l">
          <p className="text-xs font-medium text-muted-foreground">Status da meta</p>
          <div
            className="mt-1"
            role="status"
            aria-label={`Situação do plano: ${plan.status.label}`}
          >
            <div className="flex items-center gap-2">
              <span className={`rounded-full p-1 ${presentation.className}`}>
                <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <p className="text-base font-bold">{plan.status.label}</p>
            </div>
            <p className="text-[11px] text-muted-foreground">{plan.status.reason}</p>
          </div>
        </div>
      </div>

      <PlanLink month={month} />
    </>
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
