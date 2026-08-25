# Finly

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)
![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest)
![Playwright](https://img.shields.io/badge/Playwright-1.60-2EAD33?logo=playwright)
![License](https://img.shields.io/badge/License-MIT-green)

Aplicacao web de finanças pessoais para acompanhar receitas, despesas, contas bancarias, cartoes, faturas, orcamentos, lancamentos recorrentes e fechamento mensal.

## Funcionalidades

- **Dashboard** com metricas, evolucao mensal e graficos interativos
- **Transacoes** com importacao CSV e PDF de faturas de cartao
- **Categorias** com auto-categorizacao por similaridade de texto
- **Contas bancarias** com transferencias e controle de saldo
- **Cartoes de credito** com sincronizacao de faturas e calculo automatico
- **Orcamentos** por categoria com acompanhamento em tempo real
- **Custos fixos** com recorrencia configuravel (9 frequencias + custom)
- **Fechamento mensal** com composicao de despesas e quebra por categoria
- **Plano mensal** para planejamento de gastos
- **Notificacoes** de vencimento proximo
- **Backup** export/restauracao de dados
- **Dark/Light mode** com next-themes

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, shadcn/ui, Tailwind CSS 4 |
| ORM | Prisma 7 |
| Banco (prod) | PostgreSQL via `@prisma/adapter-pg` |
| Banco (dev/teste) | SQLite via `@prisma/adapter-better-sqlite3` |
| Auth | NextAuth v5 (JWT + Credentials) |
| Validacao | Zod 4 |
| Charts | Recharts 3 |
| Testes | Vitest 4 + Playwright 1.60 |
| CI/CD | GitHub Actions + Vercel |

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                     App Router                          │
│  (auth)  (dashboard)  (marketing)  (public)  api/       │
├─────────────────────────────────────────────────────────┤
│                     Features (18)                       │
│  auth · transactions · categories · cards · budgets     │
│  fixed-costs · monthly-closing · dashboard · backup     │
│  pdf-import · import · notifications · billing          │
├─────────────────────────────────────────────────────────┤
│                     Lib (infra)                         │
│  money · recurrence · balance · auth · prisma · email   │
├─────────────────────────────────────────────────────────┤
│                     Prisma ORM                          │
│           PostgreSQL (prod) · SQLite (testes)            │
└─────────────────────────────────────────────────────────┘
```

## Pre-requisitos

- Node.js 22+
- npm

## Desenvolvimento local

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run db:push:sqlite
npm run dev
```

A aplicacao estara disponivel em `http://localhost:3000`.

O fluxo local usa `DATABASE_URL="file:./dev.db"` e o schema [prisma/schema.sqlite.prisma](prisma/schema.sqlite.prisma). Nao execute `prisma migrate deploy` contra o SQLite.

## Bancos e migracoes

O projeto mantem dois schemas equivalentes:

- `prisma/schema.sqlite.prisma`: desenvolvimento local e testes.
- `prisma/schema.prisma`: PostgreSQL de producao e migrations versionadas.

Depois de alterar modelos, mantenha ambos os schemas alinhados e gere os dois clients:

```bash
npm run prisma:generate
npm run db:push:sqlite
```

Migracoes PostgreSQL devem ser criadas em `prisma/migrations` e aplicadas em producao pelo usuario exclusivo de migracao:

```bash
npm run db:migrate:prod
```

Consulte [docs/MIGRATIONS.md](docs/MIGRATIONS.md) para recuperacao de falhas e [docs/deployment-vercel-vps-postgres.md](docs/deployment-vercel-vps-postgres.md) para o ambiente de producao.

## Variaveis de ambiente

Parta de `.env.example`. Valores sensiveis nunca devem ser commitados.

| Variavel | Uso |
|---|---|
| `DATABASE_URL` | SQLite local ou conexao PostgreSQL da aplicacao |
| `AUTH_SECRET` | Assinatura de sessoes do Auth.js |
| `AUTH_URL` | URL publica da aplicacao |
| `SMTP_*` e `EMAIL_FROM` | Recuperacao de senha por e-mail |
| `MIGRATE_DATABASE_URL` | Conexao privilegiada usada somente em migrations de producao |

## Scripts principais

```bash
npm run dev                 # servidor local
npm run lint                # analise estatica
npm test                    # testes Vitest
npm run test:coverage       # testes com cobertura
npm run test:e2e            # testes Playwright
npm run build               # build de producao
npm run prisma:generate     # clients PostgreSQL e SQLite
npm run db:push:sqlite      # sincroniza banco SQLite local
npm run db:migrate:prod     # aplica migrations PostgreSQL via tunel SSH
```

## Organizacao

- `src/app`: paginas e rotas HTTP.
- `src/features`: regras de negocio por dominio.
- `src/lib`: infraestrutura e utilitarios compartilhados.
- `prisma`: schemas, migrations e seed.
- `e2e`: cenarios ponta a ponta.
- `docs`: operacao, deploy e decisoes tecnicas ([ADRs](docs/adr/)).

Toda consulta financeira deve ser isolada por `userId`. Valores monetarios sao persistidos como `Decimal(19,2)` no PostgreSQL e convertidos para numeros somente nas fronteiras da aplicacao. Pagamentos e estornos devem manter vinculo unico com seus movimentos bancarios.

## Qualidade

Antes de publicar uma alteracao:

```bash
npm run lint
npm test
npm run build
```

O CI repete essas verificacoes, mede cobertura, audita dependencias de producao e executa os testes E2E.

## Decisoes Tecnicas

Decisoes de arquitetura sao documentadas como ADRs em [docs/adr/](docs/adr/):

| ADR | Descricao |
|-----|-----------|
| [ADR-001](docs/adr/001-dual-prisma-schema.md) | Dual Prisma Schema (SQLite + PostgreSQL) |
| [ADR-002](docs/adr/002-per-route-auth-guards.md) | Auth Guard por Rota (sem Middleware) |
| [ADR-003](docs/adr/003-jwt-password-changed-at.md) | JWT com Invalidacao por `passwordChangedAt` |
| [ADR-004](docs/adr/004-monetary-precision.md) | Precisao Monetaria com Prisma.Decimal |
| [ADR-005](docs/adr/005-changelog-as-code.md) | Changelog como Codigo Tipado |
| [ADR-006](docs/adr/006-rate-limiting-production-only.md) | Rate Limiting Restrito a Producao |

## Seguranca operacional

- `finly_app` e o usuario restrito de runtime.
- `finly_migrator` e usado apenas para alteracoes de schema.
- A conta de demonstracao bloqueia operacoes mutaveis.
- Credenciais, URLs com senha e arquivos `.env` nao devem aparecer em commits, logs ou documentacao.
