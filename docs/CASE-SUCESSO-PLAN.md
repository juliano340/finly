# Plano — Finly como Case de Sucesso

> Objetivo: evoluir o Finly para portfólio profissional voltado a **vagas de emprego no Brasil**.
> Público: recrutadores técnicos e devs entrevistadores. Idioma: PT-BR.

## Fase 1 — Higiene de Engenharia

| # | Tarefa | Critério de pronto |
|---|--------|--------------------|
| 1.1 | Unificar tipo do client Prisma em `src/__tests__/prisma.ts` (services esperam client PG; testes instanciam client SQLite) | ~302 erros TS2345 eliminados |
| 1.2 | Zerar erros TS remanescentes (`e2e/manual` implicit any, `.next` stale, cascatas) | `tsc --noEmit` = 0 |
| 1.3 | Script `"typecheck"` + gate no `ci.yml` antes do lint | CI falha se regressar |
| 1.4 | Zerar warnings residuais de lint | lint 100% limpo |
| 1.5 | Cobertura real → mapa de gaps nos hotspots financeiros (balance, recurrence, money, monthly-closing) | Relatório de gaps |
| 1.6 | Testes novos nos gaps + thresholds 60% → 70-75% | CI verde com novo piso |

## Fase 2 — Vitrine

| # | Tarefa |
|---|--------|
| 2.1 | Script Playwright de screenshots: seed demo → telas principais × light/dark → `docs/screenshots/` |
| 2.2 | README premium PT-BR: hero print, badges, stack visual, features ilustradas, "Destaques de engenharia", quickstart |
| 2.3 | Diagrama Mermaid da arquitetura no README |
| 2.4 | Demo pública Vercel com seed + credenciais demo |
| 2.5 | Social preview image |

## Fase 3 — Profundidade Técnica

| # | Tarefa |
|---|--------|
| 3.1 | ADRs em `docs/adr/`: dual schema SQLite/PG · JWT + invalidação por `passwordChangedAt` · guard por rota sem middleware · changelog-as-code · precisão monetária · rate limiting só em produção |
| 3.2 | `docs/ARCHITECTURE.md`: camadas, pirâmide de testes, convenções feature-based |
| 3.3 | README linkando ADRs |

## Fase 4 — Polimento (opcional)

- Lighthouse documentado · GIF animado · PWA (provável corte)

## Diagnóstico que fundamentou o plano

- ~350 erros TS pré-existentes: **302× TS2345** de causa única (client Prisma SQLite vs PostgreSQL entre helper de teste e services), ~45 implicit any em `e2e/manual`, 1 `.next` stale, resto cascata.
- Testes passam porque os clients têm API idêntica em runtime; apenas tipos divergem.

## Progresso

- [x] Fase 1 — release 0.2.3 (typecheck 0 erros, lint 0/0, thresholds de cobertura 72/57/72/75)
- [x] Fase 2.2 — README premium PT-BR com badges, features, stack visual, quickstart
- [x] Fase 2.3 — Diagrama Mermaid da arquitetura no README
- [x] Fase 3.1 — 6 ADRs em `docs/adr/`
- [x] Fase 3.2 — `docs/ARCHITECTURE.md` com camadas, piramide de testes, convencoes
- [x] Fase 3.3 — README linkando todos os ADRs
- [ ] Fase 2.1 — Script Playwright de screenshots (precisa dev server rodando)
- [ ] Fase 2.4 — Demo publica Vercel (precisa credenciais Vercel)
- [ ] Fase 2.5 — Social preview image
- [ ] Fase 4 — Polimento opcional (Lighthouse, GIF, PWA)
