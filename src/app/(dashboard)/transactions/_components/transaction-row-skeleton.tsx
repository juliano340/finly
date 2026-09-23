export function TransactionRowSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm" aria-hidden="true">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-2/5 animate-pulse rounded bg-muted" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
        <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  )
}
