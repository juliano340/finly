# Arquitetura do Finly

## Visao Geral

Finly e uma aplicacao web de financas pessoais construida com Next.js 16 (App Router). O codigo segue uma arquitetura **feature-based** onde logica de negocio, validacao e testes sao co-localizados por dominio.

## Camadas

```
src/
├── app/              # Rotas HTTP e paginas (Next.js App Router)
│   ├── (auth)/       # Login, registro, recuperacao de senha
│   ├── (dashboard)/  # 13 paginas autenticadas
│   ├── (marketing)/  # Landing page e pricing
│   ├── (public)/     # Changelog, politica de privacidade, termos
│   └── api/          # ~60 handlers REST
├── features/         # Modulos de dominio (18 features)
├── lib/              # Infraestrutura compartilhada
├── components/       # UI reutilizavel (shadcn/ui + data-table)
├── hooks/            # React hooks customizados
├── content/          # Dados tipados (releases.ts)
└── generated/        # Clients Prisma auto-gerados
```

## Padrao Feature-Based

Cada feature em `src/features/` e um modulo autonomo:

```
features/transactions/
├── transactions.service.ts    # Logica de negocio (queries Prisma)
├── transactions.schema.ts     # Validacao Zod
├── transactions.types.ts      # Interfaces TypeScript
├── __tests__/                 # Testes unitarios/integracao
└── components/                # UI especifica (quando necessario)
```

**Regras:**
- Imports sao diretos (sem barrel exports `index.ts`).
- Services aceitam `PrismaClient` opcional para testabilidade.
- Components nunca acessam Prisma diretamente.
- Fluxo: Component → Hook → Service → Prisma → DB.

## Fluxo de Dados

```
┌─────────────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐
│  Component   │────▶│   Hook   │────▶│ Service  │────▶│ Prisma  │
│  (React)     │     │ (custom) │     │ (pure)   │     │ (DB)    │
└─────────────┘     └──────────┘     └──────────┘     └─────────┘
       ▲                                              │
       └──────────── API Response ◀───────────────────┘
```

## Autenticacao

- **NextAuth v5** com JWT (nao database sessions).
- Cada rota API chama `auth()` individualmente (sem middleware).
- Invalidacao via `passwordChangedAt` no modelo User.
- Protecao garantida por teste automatizado (`api-auth-guard.test.ts`).

## Precisao Monetaria

- Valores persistidos como `Decimal(19,2)`.
- Aritmetica interna via `Prisma.Decimal`.
- Conversao para `number` so nas bordas (API/UI).
- Formatacao: `Intl.NumberFormat("pt-BR")`.

## Banco de Dados

```
┌─────────────────────┐     ┌─────────────────────┐
│   PostgreSQL (prod) │     │   SQLite (dev/test) │
│   schema.prisma     │     │   schema.sqlite.prisma│
│   @db.Decimal(19,2) │     │   Decimal (nativo)  │
└─────────────────────┘     └─────────────────────┘
         │                           │
         ▼                           ▼
   src/generated/prisma    src/generated/prisma-sqlite
         │                           │
         └───────────┬───────────────┘
                     ▼
              src/lib/prisma.ts
           (detecta adaptador em runtime)
```

## Testes

```
┌─────────────────────────────────────────────────────┐
│                    Piramide de Testes                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │            E2E (Playwright)                  │   │
│  │   11 specs · Chromium · 60s timeout         │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │        Integracao (Vitest + Prisma)          │   │
│  │   api-auth-guard · tenant-isolation · seed   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │          Unitario (Vitest + jsdom)           │   │
│  │   18 features · money · recurrence · balance │   │
│  │   Thresholds: 72% stmts / 57% branch        │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Seguranca

- Auth guard por rota (teste automatizado garante 401 em todas).
- Rate limiting: login (sempre ativo) + request (producao apenas).
- Zod em todos os inputs da API.
- Secrets: `AUTH_SECRET` com fallback bloqueado em producao.
- Upload validation: magic bytes + tamanho maximo.
- Headers de seguranca via Next.js (CSP, HSTS, X-Frame-Options).

## Deploy

- **Plataforma**: Vercel
- **CI**: GitHub Actions (typecheck → lint → test:coverage → build → e2e)
- **Producao**: PostgreSQL via `pg` adapter com pool configuravel
- **Migrations**: `prisma migrate deploy` via script dedicado
