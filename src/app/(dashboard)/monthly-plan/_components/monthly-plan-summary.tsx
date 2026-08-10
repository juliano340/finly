import {
  CircleAlert,
  CircleCheckBig,
  PiggyBank,
  TriangleAlert,
  WalletCards,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import type {
  MonthlyPlanDto,
  MonthlyPlanStatusCode,
} from "@/features/monthly-plan/monthly-plan.types"

interface MonthlyPlanSummaryProps {
  plan: MonthlyPlanDto
}

const statusPresentation = {
  NORMAL: {
    Icon: CircleCheckBig,
    className: "border-success/30 bg-success/10 text-success",
  },
  ATTENTION: {
    Icon: TriangleAlert,
    className: "border-warning/30 bg-warning/10 text-warning-foreground",
  },
  RISK: {
    Icon: CircleAlert,
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
} satisfies Record<MonthlyPlanStatusCode, { Icon: typeof CircleCheckBig; className: string }>

export function MonthlyPlanSummary({ plan }: MonthlyPlanSummaryProps) {
  const presentation = statusPresentation[plan.status.code]
  const StatusIcon = presentation.Icon

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr_1fr]">
        <Card className="border-0 bg-primary text-primary-foreground shadow-sm">
          <CardHeader>
            <CardTitle>
              <h2 className="flex items-center gap-2 text-sm font-medium text-primary-foreground/80">
                <WalletCards aria-hidden="true" className="h-4 w-4" />
                Limite diário seguro
              </h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">{formatCurrency(plan.dailySafeLimit)}</p>
            <p className="mt-1 text-sm text-primary-foreground/80">
              {plan.daysRemaining} {plan.daysRemaining === 1 ? "dia restante" : "dias restantes"}
            </p>
          </CardContent>
        </Card>

        <MetricCard label="Disponível para gastos" value={plan.variableAvailable} icon={WalletCards} />
        <MetricCard label="Economia projetada" value={plan.projectedSavings} icon={PiggyBank} />
      </div>

      <div
        role="status"
        aria-live="polite"
        className={`flex items-start gap-3 rounded-xl border p-4 ${presentation.className}`}
      >
        <StatusIcon
          role="img"
          aria-label={`Situação: ${plan.status.label}`}
          className="mt-0.5 h-5 w-5 shrink-0"
        />
        <div>
          <p className="font-semibold">{plan.status.label}</p>
          <p className="text-sm opacity-90">{plan.status.reason}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Composição do plano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <BreakdownRow label="Receita prevista" value={plan.plannedIncome} />
          <BreakdownRow label="Compromissos (faturas e lançamentos fixos)" value={plan.committedExpenses} negative />
          <BreakdownRow label="Transações avulsas realizadas" value={plan.variableSpent} negative />
          <BreakdownRow label="Meta mínima de economia" value={plan.savingsGoal} negative />
          <BreakdownRow label="Margem de segurança" value={plan.safetyMargin} negative />
          <BreakdownRow label="Saldo planejado antes dos gastos avulsos" value={plan.plannedBalance} emphasized />
        </CardContent>
      </Card>

      <Card className="bg-muted/40">
        <CardContent className="space-y-2 pt-1 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Como os gastos são considerados?</p>
          <p>
            “Transações” são despesas avulsas. Pagamentos de fatura e lançamentos fixos,
            assim como itens importados que já pertencem a esses compromissos, não são
            somados novamente.
          </p>
          <p>
            Se uma transação manual repetir semanticamente uma compra ou compromisso, essa
            transação manual duplicada não é identificada automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: typeof PiggyBank
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex items-center gap-4 py-2">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{formatCurrency(value)}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function BreakdownRow({
  label,
  value,
  negative = false,
  emphasized = false,
}: {
  label: string
  value: number
  negative?: boolean
  emphasized?: boolean
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${emphasized ? "border-t pt-3 font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="shrink-0">{negative && value > 0 ? "− " : ""}{formatCurrency(value)}</span>
    </div>
  )
}
