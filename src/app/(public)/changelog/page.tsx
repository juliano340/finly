"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

const PAGE_SIZE = 10

const entries = [
  {
    date: "Agosto 2026",
    items: [
      { type: "fix", desc: "Valores monetários armazenados com precisão decimal no PostgreSQL e SQLite" },
      { type: "fix", desc: "Recorrências diárias e semanais identificadas por data, sem perdas ou duplicidades" },
      { type: "fix", desc: "Pagamento de lançamentos fixos idempotente contra requisições concorrentes" },
      { type: "fix", desc: "Estorno de lançamento fixo remove somente o movimento bancário vinculado" },
      { type: "fix", desc: "Teste de fechamento mensal independente de data histórica fixa" },
      { type: "feat", desc: "Transições de entrada e melhor aproveitamento de espaço nas telas do dashboard" },
      { type: "feat", desc: "Totalizadores na tela de Faturas (Total, Pago, A pagar)" },
      { type: "feat", desc: "Ordenação nas colunas da tabela de Faturas" },
      { type: "feat", desc: "Atualização automática da tabela ao editar lançamento fixo" },
      { type: "fix", desc: "Select de conta na transferência entre contas posicionado incorretamente" },
      { type: "fix", desc: "Bug na home page ao navegar com âncoras hash após voltar de outra página" },
      { type: "fix", desc: "Teste de sincronização de faturas corrigido com startDate explícito" },
    ],
  },
  {
    date: "Julho 2026",
    items: [
      { type: "feat", desc: "Notificações de vencimento com dias restantes e status computado" },
      { type: "feat", desc: "Pagar/Estornar com Cartão para lançamentos fixos dentro do cartão" },
      { type: "feat", desc: "Ícone de ações com tooltips para faturas" },
      { type: "feat", desc: "Resumo mobile e detalhamento no Fechamento Mensal" },
      { type: "feat", desc: "Linha de ações dropdown no componente de transação" },
      { type: "feat", desc: "API de recuperação de mês e melhoria na cópia de faturas" },
      { type: "feat", desc: "Proteção da conta demo contra escritas" },
      { type: "fix", desc: "Seleção de mês no fechamento mensal previne duplo toque no mobile" },
      { type: "fix", desc: "Timezone nas notificações evita bug de off-by-one day" },
      { type: "fix", desc: "Sidebar recolhe no mobile ao clicar em item de navegação" },
    ],
  },
  {
    date: "Junho 2026",
    items: [
      { type: "feat", desc: "Fase 0 — Fundação do projeto (Next.js + Tailwind + shadcn)" },
      { type: "feat", desc: "Fase 1 — Schema Prisma + seed + 18 testes" },
      { type: "feat", desc: "Fase 2 — Autenticação + multi-tenant" },
      { type: "feat", desc: "Fase 3 — Categorias CRUD completo" },
      { type: "feat", desc: "Fase 4 — Transações CRUD completo" },
      { type: "feat", desc: "Fase 5 — Dashboard + Gráficos com Recharts" },
      { type: "feat", desc: "Fase 6 — Orçamentos CRUD + Resumo" },
      { type: "feat", desc: "Fase 7 — Importação CSV" },
      { type: "feat", desc: "Fase 8 — Stripe + Planos (estrutura)" },
      { type: "feat", desc: "Fase 9 — Landing Page + Onboarding" },
      { type: "feat", desc: "Landing page com tema dark/light" },
      { type: "feat", desc: "Edição/cópia/exclusão de faturas + contas bancárias" },
      { type: "feat", desc: "Pagamento/estorno de custos fixos + dashboard overhaul" },
      { type: "feat", desc: "Refactor de custos fixos para ocorrências por mês" },
      { type: "feat", desc: "Pagamento/estorno de faturas com seleção de método e conta" },
      { type: "feat", desc: "Lembretes de pagamento e transferências bancárias" },
      { type: "feat", desc: "Backup e restauração com exportação/importação de dados" },
      { type: "feat", desc: "Migração do banco de SQLite para PostgreSQL" },
      { type: "feat", desc: "API de resumo do dashboard + otimizações de banco" },
      { type: "feat", desc: "Tabela responsiva para transações + formatação de moeda" },
      { type: "feat", desc: "Pipeline CI com GitHub Actions" },
      { type: "feat", desc: "Campos de recorrência para custos fixos + exclusão em lote" },
      { type: "feat", desc: "Wizard de transferência bancária + correções de timezone" },
      { type: "feat", desc: "Ação de reset de despesas fixas" },
      { type: "feat", desc: "Limite de cheque especial + soft delete" },
      { type: "feat", desc: "Métricas detalhadas e tooltips no Fechamento Mensal" },
      { type: "feat", desc: "Página unificada Cartões e Faturas com abas" },
      { type: "feat", desc: "Transações integradas com contas bancárias + deep link" },
      { type: "feat", desc: "Configuração e script de build para Vercel" },
      { type: "feat", desc: "Importação PDF de faturas com análise e auto-categorização" },
      { type: "feat", desc: "Importação standalone de PDF com seleção de cartão" },
      { type: "feat", desc: "Dark mode alinhado com a landing page" },
      { type: "feat", desc: "Receita recebida e status nos itens do Fechamento Mensal" },
      { type: "feat", desc: "Reset de senha via magic link + infraestrutura de email" },
      { type: "feat", desc: "Serviço de notificações com consultas de fatura e despesa" },
      { type: "fix", desc: "Compilação do middleware + fluxo E2E de autenticação" },
      { type: "fix", desc: "Botão Sair destrói sessão com signOut()" },
      { type: "fix", desc: "Filtros de transações em português" },
      { type: "fix", desc: "Formulários de edição abrem vazios (key reset)" },
      { type: "fix", desc: "Auth usa prisma singleton compartilhado" },
      { type: "fix", desc: "Máscara de moeda no input de saldo" },
      { type: "fix", desc: "Visibilidade da sidebar no dark mode" },
      { type: "fix", desc: "Layout e responsividade da página de Fechamento Mensal" },
      { type: "fix", desc: "Badge de renda/despesa no componente de transação" },
      { type: "fix", desc: "Build do Vercel sem MIGRATE_DATABASE_URL" },
      { type: "fix", desc: "Cast LEAST para integer (compatibilidade PG15)" },
      { type: "docs", desc: "Guia de migração e documentação de deploy" },
    ],
  },
]

const flatItems = entries.flatMap((e) => e.items)
const totalPages = Math.ceil(flatItems.length / PAGE_SIZE)

const typeColors: Record<string, string> = {
  feat: "bg-emerald-500/10 text-emerald-600",
  fix: "bg-amber-500/10 text-amber-600",
  docs: "bg-sky-500/10 text-sky-600",
  chore: "bg-zinc-500/10 text-zinc-600",
  refactor: "bg-violet-500/10 text-violet-600",
}

const typeLabels: Record<string, string> = {
  feat: "Novidade",
  fix: "Correção",
  docs: "Docs",
  chore: "Manutenção",
  refactor: "Refactor",
}

function getMonthGroups(page: number) {
  const start = (page - 1) * PAGE_SIZE
  const slice = flatItems.slice(start, start + PAGE_SIZE)
  const groups: { date: string; items: typeof slice }[] = []
  let current = ""
  for (const item of slice) {
    const entry = entries.find((e) => e.items.includes(item))
    if (entry && entry.date !== current) {
      current = entry.date
      groups.push({ date: current, items: [] })
    }
    groups[groups.length - 1].items.push(item)
  }
  return groups
}

export default function ChangelogPage() {
  const [page, setPage] = useState(1)
  const groups = getMonthGroups(page)

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <div>
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-4 -ml-2" })}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />Voltar
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Changelog</h1>
        <p className="text-sm text-muted-foreground">Histórico de atualizações do Finly.</p>
      </div>

      <div className="min-h-[480px]">
        {groups.map((group) => (
          <section key={group.date}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{group.date}</h2>
            <div className="space-y-2">
              {group.items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm">
                  <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[item.type] ?? typeColors.other}`}>
                    {typeLabels[item.type] ?? item.type}
                  </span>
                  <span className="text-muted-foreground">{item.desc}</span>
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex h-7 items-center gap-1 rounded-lg border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-3.5 w-3.5" />Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
