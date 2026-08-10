---
phase: 01-plano-do-mes
status: passed
verified: 2026-08-10
score: 11/11
---

# Verificação — Fase 1: Plano do Mês

## Veredito

**PASS — PMES-001 a PMES-011 possuem implementação e evidência automatizada.**

| Requisito | Evidência principal | Resultado |
|---|---|---|
| PMES-001 | persistência por usuário+mês, API GET/PUT e E2E de edição/troca | PASS |
| PMES-002 | receita recorrente sugerida, override e restauração | PASS |
| PMES-003 | composição canônica sem duplicar fixos dentro da fatura | PASS |
| PMES-004 | meta editável e persistida | PASS |
| PMES-005 | margem independente e persistida | PASS |
| PMES-006 | `variableAvailable` calculado no servidor e exibido | PASS |
| PMES-007 | limite diário Decimal, dias restantes e recálculo | PASS |
| PMES-008 | redistribuição diária e ritmo de gastos testados | PASS |
| PMES-009 | normal/atenção/risco por texto, motivo e ícone | PASS |
| PMES-010 | card no único fetch do dashboard e link do mesmo mês | PASS |
| PMES-011 | sessão/tenant no serviço, API e E2E A/B | PASS |

## Gates

- Vitest/cobertura: 43 arquivos, 324 testes aprovados; limites globais atendidos.
- Playwright: 17/17 jornadas aprovadas com um worker, incluindo 4 do Plano do Mês.
- PostgreSQL 15 efêmero: 17 migrations e smoke estrutural/permissões aprovados.
- Produção: migration `20260809180000_add_monthly_plan`, tabela e restrições de runtime verificadas.
- Prisma generate, lint, TypeScript e build Next.js: aprovados.

## Rollout

O build de produção agora falha fechado sem credencial de migration e executa
`migrate deploy` → smoke de schema/permissões → Next build. A credencial privilegiada
não é propagada ao build da aplicação.
