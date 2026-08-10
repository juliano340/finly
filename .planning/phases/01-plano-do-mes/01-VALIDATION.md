---
phase: 1
slug: plano-do-mes
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-09
updated: 2026-08-09
---

# Fase 1 — Estratégia de validação

## Infraestrutura de testes

| Propriedade | Valor |
|---|---|
| Framework | Vitest 4.1.8, Testing Library e Playwright 1.60.0 |
| Configuração | `vitest.config.ts`, `playwright.config.ts` |
| Banco de integração | Prisma SQLite em `file:./test.db`, execução serial |
| Execução rápida | `npm test -- src/features/monthly-plan` |
| Suite completa | `npm run test:coverage && npm run lint && npm run build` |
| E2E da fase | `npm run test:e2e -- e2e/monthly-plan.spec.ts` |

## Frequência de amostragem

- Após tarefas `01-02-T01/T02`: testes de schema/calculadora.
- Após tarefas `01-01-T01/T02`: validação/generate dos dois schemas e testes estruturais.
- Após tarefas `01-03-T01/T02`: suites monthly-plan e monthly-closing.
- Após `01-04-T01/T02`: contrato da rota e lint.
- Após `01-05-T01/T02` e `01-06-T01/T02`: testes de componentes e lint; planos são paralelos sem arquivos compartilhados.
- Em `01-07-T01`: E2E funcional, seguido de suite completa/lint/build antes do commit da wave.
- Em `01-08-T01/T02`: pipeline fail-closed, PostgreSQL efêmero, coverage, lint, E2E e build como gate final.
- Nenhum modo watch ou verificação manual isolada é aceito como evidência.

## Mapa requisito–tarefa–verificação

| Requisito | Tarefas donas | Evidência automatizada |
|---|---|---|
| PMES-001 | 01-01-T01/T02, 01-03-T01/T02, 01-04-T01/T02, 01-05-T02 | schema/relations, service, route e fluxo E2E |
| PMES-002 | 01-02-T01, 01-03-T01/T02, 01-04-T01/T02, 01-05-T02 | schema, sugestão/override, HTTP e formulário |
| PMES-003 | 01-03-T01/T02, 01-05-T01, 01-07-T01 | matriz anti-dupla-contagem, pagamentos sem Transaction, ImportedTransaction excluída e contrato UI/E2E |
| PMES-004 | 01-01-T01/T02, 01-02-T01, 01-03-T01/T02, 01-05-T02 | persistência Decimal, validação, service e formulário |
| PMES-005 | 01-01-T01/T02, 01-02-T01, 01-03-T01/T02, 01-05-T02 | margem separada em schema, cálculo e UI |
| PMES-006 | 01-02-T02, 01-03-T01/T02, 01-05-T01 | exemplos Decimal, composição e apresentação |
| PMES-007 | 01-02-T02, 01-03-T01/T02, 01-05-T01 | dias São Paulo, recálculo e limite exibido |
| PMES-008 | 01-02-T02, 01-03-T01/T02, 01-07-T01 | redistribuição unitária, recálculo e jornada |
| PMES-009 | 01-02-T02, 01-05-T01/T02, 01-06-T01 | política determinística e estados acessíveis |
| PMES-010 | 01-06-T01/T02, 01-07-T01 | card/summary sem segundo fetch e E2E |
| PMES-011 | 01-01-T01/T02, 01-03-T01/T02, 01-04-T01/T02, 01-07-T01, 01-08-T01/T02 | unique/FK, isolamento A/B, grants e pipeline fail-closed |

## Matriz crítica de casos

| Domínio | Casos | Tarefa |
|---|---|---|
| Dinheiro | 0; 0.1/0.2; 10.005; teto; negativos; dízima; bruto negativo + limite zero | 01-02-T01/T02 |
| Datas/janela | cortes query São Paulo; hoje; 28/29; passado/futuro; extremos inclusivos ano−1/ano+1; externos rejeitados antes de materializar | 01-02-T01/T02, 01-03-T01/T02, 01-04-T01/T02 |
| Fontes | Transaction somente avulsa; pagamentos de fatura/fixo criam BankAccountMovement, não Transaction; ImportedTransaction excluída; sem fuzzy dedupe | 01-03-T01/T02, 01-05-T01, 01-07-T01 |
| Persistência | GET sem registro; PUT zero/null; troca de mês; concorrência; user A/B | 01-01-T01/T02, 01-03-T01/T02 |
| API | 401; mês/body inválido; chaves extras; Origin cruzada; 5xx genérico; cache não público | 01-04-T01/T02 |
| Interface | loading/error/empty; teclado/labels; estado sem cor; desktop/mobile; dashboard/link; um fetch | 01-05-T01/T02, 01-06-T01/T02, 01-07-T01 |
| PostgreSQL | container efêmero aplica migrations; tabela/FK/unique; DML por table privilege; CREATE por schema privilege; ALTER por owner/membership | 01-01-T01/T02 |
| Release | MIGRATE_DATABASE_URL obrigatória; migrate→smoke→build; falhas interrompem; coverage/lint/E2E/build | 01-08-T01/T02 |

## Wave 0 / testes primeiro

- [ ] `01-01-T01` — testes SQLite e PostgreSQL efêmero antes dos schemas/migration.
- [ ] `01-02-T01` — testes de contrato/validação antes do schema Zod.
- [ ] `01-02-T02` — testes de fórmula/Decimal/timezone/status antes da calculadora.
- [ ] `01-03-T01` — matriz financeira/tenant antes do serviço.
- [ ] `01-04-T01` — contrato HTTP antes da rota.
- [ ] `01-05-T01/T02` e `01-06-T01` — testes de componentes antes da UI.
- [ ] `01-07-T01` — jornada E2E antes do gate final.
- [ ] `01-08-T01` — testes fail-closed e ordem antes de alterar `vercel-build.mjs`.

`wave_0_complete` permanece `false` até os arquivos serem criados e RED→GREEN executado. `nyquist_compliant` é `true` porque toda produção planejada possui comando automatizado anterior ou na mesma tarefa TDD, nenhuma cadeia de três tarefas fica sem feedback e o gate final cobre regressão completa.

## Segurança

- T-01-01/02/03: estrutura, relação tenant e grants DML limitados.
- T-01-04/05/06: validação, Decimal e abuso temporal.
- T-01-07/08/09/10: BOLA, upsert, dupla contagem e concorrência.
- T-01-11/12/13: auth, mass assignment/CSRF e cache/erros.
- T-01-14/15/16: payload UI, dados obsoletos e feedback.
- T-01-17/18/19: summary tenant, fonte única e custo de consultas.
- T-01-20/21: isolamento E2E e janela mensal.
- T-01-23/24/25: fail-closed, checks corretos de DML/CREATE/ALTER e sigilo da URL.

## Assinatura

- [x] tarefas mapeadas para verificações automatizadas;
- [x] nenhuma sequência de três tarefas sem feedback automatizado;
- [x] gaps de testes são tarefas predecessoras explícitas;
- [x] cobertura final preserva thresholds configurados;
- [x] PMES-001 a PMES-011 têm dono e evidência;
- [x] D-15/D-16/D-17 têm testes e contratos explícitos;
- [x] cada plano exige suite completa, lint e build antes do commit/checkpoint da wave;
- [x] `nyquist_compliant: true` após auditoria do conjunto de planos.
