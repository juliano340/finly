import { Loader2 } from "lucide-react"
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

  const spinner = <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  const spinnerSm = <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />

  return (
    <>
      <div className="hidden gap-4 md:grid md:grid-cols-3">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l.total}</p><p className="text-2xl font-bold">{loading ? spinner : formatCurrency(total)}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l.paid}</p><p className="text-2xl font-bold">{loading ? spinner : formatCurrency(paid)}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l.pending}</p><p className="text-2xl font-bold">{loading ? spinner : formatCurrency(pending)}</p></CardContent></Card>
      </div>

      <Card className="border-0 shadow-sm md:hidden">
        <CardContent className="grid grid-cols-3 gap-2 p-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-muted-foreground">{l.total}</p>
            <p className="truncate text-sm font-bold tabular-nums">{loading ? spinnerSm : formatCurrency(total)}</p>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-muted-foreground">{l.paid}</p>
            <p className="truncate text-sm font-bold tabular-nums">{loading ? spinnerSm : formatCurrency(paid)}</p>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-muted-foreground">{l.pending}</p>
            <p className="truncate text-sm font-bold tabular-nums">{loading ? spinnerSm : formatCurrency(pending)}</p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
