"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import {
  CURRENT_VERSION,
  releases,
  type ChangeType,
  type Release,
  type ReleaseChange,
} from "@/content/releases"

const PAGE_SIZE = 10

const flatItems = releases.flatMap((release) =>
  release.changes.map((change) => ({ release, change })),
)
const totalPages = Math.ceil(flatItems.length / PAGE_SIZE)

const typeColors: Record<ChangeType, string> = {
  feat: "bg-emerald-500/10 text-emerald-600",
  fix: "bg-amber-500/10 text-amber-600",
  security: "bg-red-500/10 text-red-600",
  docs: "bg-sky-500/10 text-sky-600",
  chore: "bg-zinc-500/10 text-zinc-600",
  refactor: "bg-violet-500/10 text-violet-600",
}

const typeLabels: Record<ChangeType, string> = {
  feat: "Novidade",
  fix: "Correção",
  security: "Segurança",
  docs: "Docs",
  chore: "Manutenção",
  refactor: "Refactor",
}

interface ReleaseGroup {
  release: Release
  changes: ReleaseChange[]
}

function formatReleaseDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

function getReleaseGroups(page: number) {
  const start = (page - 1) * PAGE_SIZE
  const slice = flatItems.slice(start, start + PAGE_SIZE)
  const groups: ReleaseGroup[] = []

  for (const item of slice) {
    const current = groups.at(-1)
    if (current?.release.version !== item.release.version) {
      groups.push({ release: item.release, changes: [] })
    }
    groups.at(-1)?.changes.push(item.change)
  }

  return groups
}

export default function ChangelogPage() {
  const [page, setPage] = useState(1)
  const groups = getReleaseGroups(page)

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-4 -ml-2" })}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />Voltar
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Changelog</h1>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            Versão atual v{CURRENT_VERSION}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Histórico de atualizações do Finly.</p>
      </div>

      <div className="min-h-[480px] space-y-6">
        {groups.map((group) => (
          <section key={group.release.version}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <span>v{group.release.version}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={group.release.date}>{formatReleaseDate(group.release.date)}</time>
            </h2>
            <div className="space-y-2">
              {group.changes.map((change) => (
                <div key={`${change.type}-${change.description}`} className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm">
                  <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[change.type]}`}>
                    {typeLabels[change.type]}
                  </span>
                  <span className="text-muted-foreground">{change.description}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="inline-flex h-7 items-center gap-1 rounded-lg border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-3.5 w-3.5" />Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className="inline-flex h-7 items-center gap-1 rounded-lg border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próxima<ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
