import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

interface SummaryCardsProps {
  total: number
  paid: number
  pending: number
  loading?: boolean
  labels?: { total?: string; paid?: string; pending?: string }
}

export function SummaryCards({ total, paid, pending, loading, labels }: SummaryCardsProps) {
  const l = {
    total: labels?.total ?? "Total do mês",
    paid: labels?.paid ?? "Pago",
    pending: labels?.pending ?? "A pagar",
  }

  const skeleton = <span className="mt-1 block h-7 w-28 animate-pulse rounded bg-muted" aria-hidden="true" />
  const skeletonSm = <span className="mt-1 block h-5 w-20 max-w-full animate-pulse rounded bg-muted" aria-hidden="true" />

  return (
    <>
      <div className="hidden gap-4 md:grid md:grid-cols-3">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l.total}</p><div className="text-2xl font-bold">{loading ? skeleton : formatCurrency(total)}</div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l.paid}</p><div className="text-2xl font-bold">{loading ? skeleton : formatCurrency(paid)}</div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l.pending}</p><div className="text-2xl font-bold">{loading ? skeleton : formatCurrency(pending)}</div></CardContent></Card>
      </div>

      <Card className="border-0 shadow-sm md:hidden">
        <CardContent className="flex flex-col p-0">
          <div className="flex items-center justify-between p-3">
            <p className="text-xs text-muted-foreground">{l.total}</p>
            <div className="text-base font-bold tabular-nums">{loading ? skeletonSm : formatCurrency(total)}</div>
          </div>
          <div className="border-b border-border/60" />
          <div className="flex items-center justify-between p-3">
            <p className="text-xs text-muted-foreground">{l.paid}</p>
            <div className="text-base font-bold tabular-nums">{loading ? skeletonSm : formatCurrency(paid)}</div>
          </div>
          <div className="border-b border-border/60" />
          <div className="flex items-center justify-between p-3">
            <p className="text-xs text-muted-foreground">{l.pending}</p>
            <div className="text-base font-bold tabular-nums">{loading ? skeletonSm : formatCurrency(pending)}</div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
