# Roadmap — Finly

## Fase 1 — Plano do Mês

**Objetivo:** oferecer um planejamento mensal adaptativo que proteja a meta de economia e converta o saldo realmente disponível em um limite diário seguro.

**Requisitos:** PMES-001 a PMES-011.

### Entregas

1. Persistência do plano por usuário e mês, incluindo receita ajustada, meta de economia e margem de segurança.
2. Serviço de cálculo com receitas previstas, compromissos existentes, gastos realizados, projeção e limite diário.
3. API autenticada para consultar e atualizar o plano.
4. Página **Plano do Mês** com composição dos valores, ajustes e estado da meta.
5. Card **Limite diário seguro** no dashboard.
6. Testes unitários das fórmulas, integração financeira, isolamento entre usuários e fluxo principal de interface.

### Critérios de conclusão

- Todos os critérios de aceitação de `PMES-001` a `PMES-011` passam.
- Valores de fatura e lançamentos fixos não são duplicados.
- Cálculos monetários preservam precisão decimal e arredondamento em centavos.
- Mudanças no plano e novos gastos atualizam a projeção corretamente.
- A interface funciona em desktop e celular e comunica estados normal, atenção e risco sem depender somente de cor.
- Lint, testes relacionados, cobertura e build passam antes da publicação.

### Sequência sugerida

1. Confirmar fontes financeiras e regras contra dupla contagem.
2. Modelar persistência e serviço de cálculo.
3. Implementar API e testes de integração.
4. Implementar página e card do dashboard.
5. Executar validação funcional com os exemplos registrados em `REQUIREMENTS.md`.

### Planos

**Plans:** 8 planos em 6 ondas.

- [x] `01-01-PLAN.md` — entidade MonthlyPlan, schemas duais, migration e permissões runtime (Wave 1).
- [x] `01-02-PLAN.md` — contratos, validação, Decimal e calendário America/Sao_Paulo com TDD (Wave 1).
- [x] `01-03-PLAN.md` — composição financeira sem dupla contagem e serviço isolado (Wave 2; depende 01-01/01-02).
- [x] `01-04-PLAN.md` — API GET/PUT autenticada e estrita (Wave 3; depende 01-03).
- [x] `01-05-PLAN.md` — página Plano do Mês, formulário, estados e menu acessíveis (Wave 4; depende 01-04).
- [x] `01-06-PLAN.md` — card Limite diário seguro no summary do dashboard (Wave 4; depende 01-04).
- [x] `01-07-PLAN.md` — E2E desktop/mobile/multiusuário e contrato Transaction/janela (Wave 5; depende 01-01/01-05/01-06).
- [x] `01-08-PLAN.md` — PostgreSQL smoke, build fail-closed, changelog e runbooks migration-before-deploy (Wave 6; depende 01-01/01-07).
