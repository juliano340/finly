# ADR-001: Dual Prisma Schema (SQLite + PostgreSQL)

## Status

Accepted

## Context

O projeto precisa rodar em dois ambientes com bancos diferentes: PostgreSQL em produção e SQLite no desenvolvimento/testes. O Prisma não suporta multiplos adaptadores em um unico schema, entao mantemos dois schemas espelhos.

## Decision

- `prisma/schema.prisma` → PostgreSQL (producao). Campos monetarios usam `@db.Decimal(19,2)`.
- `prisma/schema.sqlite.prisma` → SQLite (dev/teste). Decimal sem anotacao de provider.
- Cada schema gera um client separado em `src/generated/prisma` e `src/generated/prisma-sqlite`.
- `src/lib/prisma.ts` detecta o adaptador em runtime via `DATABASE_URL`.
- Testes usam um client SQLite dedicado em `src/__tests__/prisma.ts`.

## Consequences

**Positivo:**
- Testes rodam sem PostgreSQL (CI rapido, setup simples).
- SQLite replica o comportamento do Prisma com API identica.
- Schema dual e detectado por `schema.test.ts` (garante alinhamento).

**Negativo:**
- Risco de drift entre schemas (mitigado por testes automatizados).
- Manutencao dupla ao adicionar colunas.
- Diferencas de comportamento (ex: `AUTOINCREMENT` vs `SERIAL`, funcoes de data).
