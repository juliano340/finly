---
phase: 01-plano-do-mes
plan: "07"
subsystem: e2e
tags: [playwright, monthly-plan, multi-tenant, responsive]
requires: [01-01, 01-05, 01-06]
provides:
  - Jornada E2E do Plano do Mês em desktop e mobile
  - Evidência de isolamento por usuário e janela mensal
  - Evidência de fonte única do card no dashboard
affects: [01-08]
tech-stack:
  added: []
  patterns: [fixture visual determinística, API real para segurança e persistência]
key-files:
  created: [e2e/monthly-plan.spec.ts]
  modified: []
decisions:
  - Valores canônicos de agosto de 2026 usam fixture de rede determinística na jornada visual.
  - Isolamento A/B e janela D-17 atravessam autenticação, API e banco reais.
  - Fonte única do dashboard é comprovada por uma URL summary e ausência de fetch standalone do plano.
metrics:
  tasks: 1
  completed: 2026-08-10
---

# Phase 1 Plan 07: E2E do Plano do Mês Summary

Playwright cobre a jornada mensal completa, responsividade, recálculo, estados acessíveis, contrato Transaction, dashboard e limites de tenant/mês.

## Resultado

- `e2e/monthly-plan.spec.ts`: 4/4 testes passaram.
- Desktop: R$ 365 disponíveis, R$ 18,25/dia, edição, risco, troca de mês e R$ 17,63/dia após gasto.
- Mobile: conteúdo principal, formulário e status permanecem visíveis e operáveis em 375×667.
- D-16: interface explica despesas avulsas, exclusão de compromissos já contabilizados e ausência de deduplicação semântica automática.
- PMES-010: dashboard consome uma única fonte `/api/dashboard/summary` e não chama `/api/monthly-plan` separadamente.
- D-17/PMES-011: extremos inclusivos aceitos, meses externos rejeitados e configurações A/B permanecem isoladas.
- Nenhum `waitForTimeout` foi adicionado.

## Verificação

| Comando | Resultado |
| --- | --- |
| `npm run test:e2e -- e2e/monthly-plan.spec.ts` | PASS — 4/4 |
| `npm run test:all` — Vitest | PASS — 42 arquivos, 317 testes |
| `npm run test:all` — Playwright global | Primeira execução paralela: 12 passaram, 5 falharam fora do arquivo desta wave |
| Repetição serial das jornadas externas | PASS — 6/6 (verificação do orquestrador) |
| `npm run lint` | PASS |
| `npm run build` | PASS |

## Observações do gate

Primeira execução global Playwright apresentou instabilidade sob quatro workers:

- `e2e/auth.spec.ts`, `e2e/budgets.spec.ts`, `e2e/categories.spec.ts` e `e2e/import.spec.ts`: timeout de login aguardando `/dashboard` sob quatro workers.
- `e2e/monthly-closing.spec.ts`: botão `Streaming E2E` não apareceu dentro do timeout.

Os quatro testes de `e2e/monthly-plan.spec.ts` passaram também dentro da execução global. A repetição serial externa passou 6/6, confirmando interferência de paralelismo, não regressão funcional.

## Deviations from Plan

### Auto-fixed Issues

1. Seletores acessíveis ambíguos foram tornados exatos por nível/nome.
2. Contagem do dashboard passou a medir fonte canônica única, pois `next dev` pode repetir o mesmo efeito sob Strict Mode; chamadas standalone continuam proibidas e testadas como zero.
3. Contas auxiliares usam cadastro HTTP real para reduzir interferência de fixture; jornada desktop mantém cadastro pela UI e todos os cenários usam login real.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma nova superfície: o plano adiciona somente testes E2E.

## Self-Check: PASSED

- `e2e/monthly-plan.spec.ts` existe e passou isoladamente.
- Nenhum commit ou push foi realizado, conforme instrução de execução.
