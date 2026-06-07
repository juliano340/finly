# Finly — SaaS de Controle Financeiro Pessoal

> **Documento canônico do projeto.** Leia antes de qualquer alteração.
> Fase atual: **3 (Categorias CRUD) concluída** — próxima: **4 (Transações CRUD)**

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) |
| ORM | Prisma 7 + PostgreSQL |
| UI | Tailwind CSS 4 + shadcn/ui |
| Auth | NextAuth.js (email + Google OAuth) |
| Pagamentos | Stripe (Free + Pro) |
| Gráficos | Recharts |
| Validação | Zod + react-hook-form |
| CSV/OFX | papaparse + ofx-js |

## Testes

| Tipo | Ferramenta |
|------|-----------|
| Unitário | Vitest |
| Componente | @testing-library/react |
| Integração | Vitest + Prisma (SQLite) |
| E2E | Playwright |

**90 testes planejados:** 41 unitários, 29 integração, 20 E2E

---

## Design System

**Inspiração:** Paleta análoga ao Bling ERP (azul petróleo + verde-água).

| Token | Cor | Uso |
|-------|-----|-----|
| `--primary` | #0EA882 (verde-água) | CTAs, links, receitas |
| `--secondary` | #1E3B4A (navy) | Sidebar, header, textos |
| `--destructive` | #E85D5D | Despesas, alertas |
| `--warning` | #F59E0B | Orçamento >80% |
| `--success` | #0EA882 | Saldo positivo |

**Tipografia:** Geist (Inter via next/font) | **Raio:** 0.625rem

---

## Arquitetura

```
src/
├── app/                  # Rotas (só composição)
│   ├── (marketing)/      # Landing, pricing (público)
│   ├── (dashboard)/      # App logado
│   └── api/              # API routes
├── components/ui/        # shadcn (primitivos)
├── features/             # Lógica de domínio
│   ├── auth/
│   ├── categories/
│   ├── transactions/
│   ├── budgets/
│   ├── import/
│   ├── billing/
│   └── dashboard/
├── hooks/                # React hooks
├── lib/                  # Utilitários puros
├── types/                # Tipos compartilhados
└── e2e/                  # Testes Playwright
```

**Fluxo de dados:** Componente → Hook → Service → Prisma → DB
**Regra:** Componente NUNCA toca Prisma diretamente.

---

## Princípios de Código

1. **Single Responsibility** — cada arquivo faz UMA coisa
2. **Arquivos ≤150 linhas** — se passar, extrai
3. **Clean Code** — nomes em português do domínio, funções puras, zero `any`
4. **Composição sobre herança** — hooks compostos
5. **TypeScript strict** — sem `as` casts desnecessários
6. **Todo arquivo `.ts` de lógica** → 1 arquivo `__tests__/*.test.ts` irmão
7. **Toda API route** → testa 4 verbos + tenant isolation
8. **Toda feature E2E** → 1 happy path + 1 edge case

---

## Micro-Fases

| Fase | Entregável | Testes |
|------|-----------|--------|
| 0 | Projeto rodando + setup | 5 |
| 1 | Schema Prisma + Seed | 6 |
| 2 | Auth + Multi-tenant | 7 |
| 3 | Categorias CRUD | 10 |
| 4 | Transações CRUD | 13 |
| 5 | Dashboard + Gráficos | 10 |
| 6 | Orçamentos | 9 |
| 7 | Importação CSV/OFX | 12 |
| 8 | Stripe + Planos | 10 |
| 9 | Landing + Onboarding | 8 |

---

## Comandos

```bash
npm run dev          # Dev server (localhost:3000)
npm test             # Unitários + integração (Vitest)
npm run test:e2e     # E2E (Playwright)
npm run test:all     # Tudo
npm run lint         # ESLint
npx prisma studio    # Visualizar DB
npx prisma migrate dev  # Rodar migrations
```
