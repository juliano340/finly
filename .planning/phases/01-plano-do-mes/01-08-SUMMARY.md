---
phase: 01-plano-do-mes
plan: "08"
status: complete
completed: 2026-08-10
requirements: [PMES-001, PMES-003, PMES-011]
---

# Plano 01-08 — Resumo

## Entregue

- Build de produção falha fechado quando `MIGRATE_DATABASE_URL` está ausente ou vazia.
- Pipeline executa migration, smoke PostgreSQL e somente então o build do Next.js.
- Credencial privilegiada fica restrita aos subprocessos de migration/smoke e não segue para o build.
- Smoke valida migration, tabela `MonthlyPlan`, FK, unique, DML dos runtimes e ausência de CREATE/ALTER.
- Changelog e runbooks documentam D-16, D-17, PostgreSQL efêmero e rollout migration-first.

## Verificação

- Testes do pipeline e PostgreSQL: 8/8 aprovados.
- PostgreSQL 15 efêmero: 17 migrations e smoke aprovados.
- Produção: runtimes com DML e sem CREATE/ownership/membership do owner.
- Cobertura: 43 arquivos e 324 testes aprovados; limites globais atendidos.
- Playwright: 17/17 jornadas aprovadas com um worker.
- Prisma generate, lint e build: aprovados.

## Arquivos

- `scripts/vercel-build.mjs`
- `scripts/verify-production-schema.mjs`
- `src/__tests__/vercel-build.test.ts`
- `CHANGELOG.md`
- `docs/MIGRATIONS.md`
- `docs/deployment-vercel-vps-postgres.md`
