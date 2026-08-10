# Plano 01-02 — Resumo

## Entregue

- DTO canônico separa `MonthlyPlanProjection` de `MonthlyPlanDto`, incluindo receita sugerida/override, fonte, saldo planejado, gasto variável e disponível; também define status, entrada editável e `BUSINESS_TIME_ZONE` (`America/Sao_Paulo`), sem `any`.
- Validação Zod estrita em `monthly-plan.schema.ts`: mês semântico 01–12, campos financeiros finitos/não negativos/teto `99999999.99`, allowlist (`incomeOverride` nulo, `savingsGoal`, `safetyMargin`) e query estrita.
- Janela D-17 server-side com relógio injetável (`getSupportedMonthWindow`/`isMonthWithinSupportedWindow`): 1º de janeiro do ano anterior a 31 de dezembro do próximo ano em São Paulo, extremos inclusivos; mês imediatamente anterior/posterior rejeitado.
- Calculadora pura `monthly-plan.calculator.ts` com `Prisma.Decimal` até o arredondamento final, dia financeiro São Paulo via `@date-fns/tz`/`TZDate`, `asOf` injetável e status determinístico NORMAL/ATTENTION/RISK com código, rótulo e motivo textual.
- Dependência `@date-fns/tz@1.5.0` instalada sem upgrades incidentais.

## Validação

- 47 testes da feature (24 schema + 23 calculadora) aprovados via TDD RED→GREEN.
- Exemplos canônicos: 365 disponíveis, 18,25 (20 dias), 19,21 (19 dias sem gasto), 17,63 (19 dias após gasto de 30).
- Bordas cobertas: hoje inclusivo, primeiro/último dia, futuro com mês civil completo, passado com divisor zero e limite zero, fevereiro bissexto/comum, meia-noite de São Paulo, precisão Decimal (0.1+0.2 e dízima), raw negativo preservado com limite nunca negativo.
- `npm test` completo (285 testes) aprovado; `npm run lint` limpo; `npm run build` ok.

## Observações

- Apenas `package.json`, `package-lock.json` e `src/features/monthly-plan/` foram alterados. Mudanças de Prisma, migrações, testes de schema e `monthly-closing/page.tsx` pertencem a outros planos/ondas e foram preservadas.
- Persistência, composição de fontes, API e UI ficam para planos subsequentes da fase.
