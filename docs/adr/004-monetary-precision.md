# ADR-004: Precisao Monetaria com Prisma.Decimal

## Status

Accepted

## Context

JavaScript usa IEEE 754 float, que causa erros de precisao em calculos financeiros (`0.1 + 0.2 = 0.30000000000000004`). Para um app de financas pessoais, isso e inaceitavel.

## Decision

- Valores monetarios sao persistidos como `Decimal(19,2)` no PostgreSQL e `Decimal` no SQLite.
- Toda aritmetica interna usa `Prisma.Decimal`: `toMoney()`, `sumMoney()`, `subtractMoney()`.
- Conversao para `number` so acontece nas fronteiras: resposta da API e rendering no UI.
- UI formata com `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.
- Parse de input usa `parseCurrency()` que entende formato brasileiro (`R$ 1.234,56`).

## Consequences

**Positivo:**
- Precisao exata em todos os calculos (saldos, orcamentos, fechamento mensal).
- Formatacao consistente no Brasil.
- Zero erros de arredondamento em relatorios.

**Negativo:**
- `Decimal` e mais lento que `number` (irrelevante para volume do app).
- Conversoes manuais entre Decimal e number nas bordas.
- SQLite nao tem tipo Decimal nativo (Prisma simula com REAL).
