# Fase 1: Plano do Mês — Contexto

**Coletado em:** 2026-08-09
**Status:** pronto para planejamento
**Origem:** exploração com o usuário e `.planning/REQUIREMENTS.md`

<domain>
## Limite da fase

Entregar planejamento mensal por usuário com receita prevista ajustável, meta mínima de economia, margem de segurança opcional, despesas comprometidas calculadas pelo Finly e limite diário seguro adaptativo. A fase inclui persistência, cálculo, API, página própria, resumo no dashboard e testes.

</domain>

<decisions>
## Decisões de implementação

### Produto e linguagem

- D-01: a funcionalidade se chama **Plano do Mês**.
- D-02: o indicador principal se chama **Limite diário seguro**.
- D-03: haverá página própria no menu e resumo no dashboard.

### Fontes financeiras

- D-04: a receita prevista deve ser sugerida a partir das receitas recorrentes cadastradas.
- D-05: o usuário pode substituir a receita sugerida apenas para o mês selecionado.
- D-06: despesas comprometidas incluem faturas e lançamentos fixos previstos, sem dupla contagem de custos fixos incluídos em cartão.

### Meta e margem

- D-07: a meta representa o valor mínimo que o usuário pretende economizar.
- D-08: a margem de segurança é opcional e separada da meta de economia.

### Limite adaptativo

- D-09: o limite diário deriva do valor variável ainda disponível dividido pelos dias restantes.
- D-10: valor não gasto não aparece integralmente somado ao limite do dia seguinte; ele é redistribuído pelos dias restantes.
- D-11: gasto acima do ritmo reduz os limites dos dias seguintes.
- D-12: o sistema sinaliza situação normal, atenção ou risco sem depender somente de cor.

### Decisões técnicas fechadas após pesquisa

- D-13: o dia financeiro da primeira versão usa o fuso canônico `America/Sao_Paulo`, com data de referência injetável nos cálculos.
- D-14: a configuração será persistida em entidade `MonthlyPlan` própria, única por usuário e mês; valores derivados não serão persistidos.
- D-15: meses passados permanecem consultáveis/editáveis com limite diário zero; meses futuros permanecem consultáveis/editáveis usando todos os dias civis do mês.
- D-16: `Transaction` representa somente receita/despesa avulsa. Pagamentos internos de fatura e lançamento fixo usam `BankAccountMovement`; `ImportedTransaction` detalha fatura e não entra separadamente no plano. Não haverá deduplicação fuzzy.
- D-17: consultas e mutações aceitam meses somente do início do ano anterior ao fim do próximo ano, calculados em relação a `asOf` no fuso `America/Sao_Paulo`; fora dessa janela a API rejeita antes de materializar recorrências.

### Discrição de implementação

- Estrutura exata dos componentes e rotas, desde que siga os padrões atuais.
- Limiares visuais de atenção e risco, desde que determinísticos e testados.
- Estratégia de cache/refetch e organização interna do serviço.

</decisions>

<canonical_refs>
## Referências canônicas

- `.planning/REQUIREMENTS.md` — requisitos PMES-001 a PMES-011, fórmulas e critérios de aceitação.
- `.planning/ROADMAP.md` — objetivo, entregas e critérios de conclusão da fase.
- `prisma/schema.prisma` e `prisma/schema.sqlite.prisma` — persistência PostgreSQL/SQLite que deve permanecer equivalente.
- `src/features/dashboard/dashboard.service.ts` — composição financeira já usada pelo dashboard.
- `src/features/fixed-costs/fixed-costs.service.ts` — ocorrências e regras de lançamentos fixos.
- `src/features/card-invoices/card-invoices.service.ts` — regras de faturas.
- `src/features/transactions/transactions.service.ts` — gastos realizados.

</canonical_refs>

<specifics>
## Exemplos concretos

- Receita R$ 1.500, compromissos R$ 835 e meta R$ 300 resultam em R$ 365 disponíveis.
- Com 20 dias restantes: R$ 18,25/dia.
- Sem gasto e com 19 dias restantes: aproximadamente R$ 19,21/dia, não R$ 36,50.
- Após gasto de R$ 30 e com 19 dias restantes: aproximadamente R$ 17,63/dia.

</specifics>

<deferred>
## Ideias adiadas

- Integração bancária automática.
- Recomendações por IA.
- Metas compartilhadas.
- Push, SMS ou WhatsApp.
- Planejamento anual e investimentos.
- Proveniência explícita entre uma `Transaction` manual e uma compra/fatura de cartão. Sem essa relação estrutural, duplicidade semântica em dados manuais permanece limitação conhecida; não será inferida por descrição, data ou valor.

</deferred>
