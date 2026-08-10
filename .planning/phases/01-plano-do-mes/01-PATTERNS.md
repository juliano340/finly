# Fase 1: Plano do Mês - Mapa de Padrões

**Mapeado em:** 2026-08-09  
**Fontes:** `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `01-CONTEXT.md`  
**RESEARCH.md:** não existe para esta fase  
**Arquivos classificados:** 15  
**Cobertura por análogos:** 14/15 (a fórmula pura não possui análogo exato)

## Direção principal

Implementar `MonthlyPlan` como configuração mensal própria, única por `(userId, month)`. Não colocar meta, margem ou override de receita em `FinancialMonth`: esse modelo representa ciclo de fechamento (`OPEN`/`CLOSED`) e já é criado sob demanda por `ensureFinancialMonth`.

Separar o feature em duas camadas:

1. uma função de cálculo pura, determinística, sem Prisma, que recebe centavos/valores monetários normalizados e uma data de referência injetável;
2. um serviço de composição que carrega/upserta o plano e consulta as mesmas fontes usadas por `getMonthlyClosingSummary`.

Para compromissos, copiar a fronteira existente em `src/features/monthly-closing/monthly-closing.service.ts:getMonthlyClosingSummary`: faturas do mês + ocorrências fixas de despesa fora do cartão. Nunca somar ocorrências cujo `fixedCost.paidInsideCard` seja verdadeiro, pois elas já estão embutidas na fatura.

## Arquivos previstos e classificação

| Novo/modificado | Papel | Fluxo | Análogo mais próximo | Qualidade |
|---|---|---|---|---|
| `prisma/schema.prisma` | model/config | CRUD | `FinancialMonth` + `Budget` no mesmo arquivo | exato |
| `prisma/schema.sqlite.prisma` | model/config | CRUD | espelho do schema PostgreSQL | exato |
| `prisma/migrations/<timestamp>_add_monthly_plan/migration.sql` | migration | batch/DDL | `20260809143000_use_decimal_for_money/migration.sql` | role-match |
| `src/features/monthly-plan/monthly-plan.schema.ts` | validation | transform | `src/features/budgets/budgets.schema.ts` | exato |
| `src/features/monthly-plan/monthly-plan.types.ts` | types | transform | interfaces em `dashboard.service.ts` | role-match |
| `src/features/monthly-plan/monthly-plan.calculator.ts` | utility | transform | `src/lib/money.ts` | parcial; fórmula nova |
| `src/features/monthly-plan/monthly-plan.service.ts` | service | request-response + aggregate/CRUD | `monthly-closing.service.ts:getMonthlyClosingSummary` + `financial-months.service.ts:ensureFinancialMonth` | exato combinado |
| `src/app/api/monthly-plan/route.ts` | route/controller | request-response | `src/app/api/budgets/route.ts` | exato |
| `src/app/(dashboard)/monthly-plan/page.tsx` | page/component | request-response | `src/app/(dashboard)/budgets/page.tsx` | exato |
| `src/app/(dashboard)/monthly-plan/_components/monthly-plan-form.tsx` | component | form/transform | `budget-form.tsx` | role-match |
| `src/app/(dashboard)/dashboard/_components/daily-safe-limit-card.tsx` | component | request-response | cards inline em `dashboard/page.tsx` | role-match |
| `src/app/api/dashboard/summary/route.ts` | route/controller | request-response | próprio arquivo | exato |
| `src/app/(dashboard)/dashboard/page.tsx` | page/component | request-response | próprio arquivo | exato |
| `src/app/(dashboard)/layout.tsx` | navigation/component | event-driven | `navItems` no próprio arquivo | exato |
| `src/features/monthly-plan/__tests__/*`, componente test e `e2e/monthly-plan.spec.ts` | tests | CRUD/request-response | budgets, dashboard e tenant-isolation tests | exato combinado |

Nome de diretório recomendado: `monthly-plan`, alinhado aos features ingleses existentes; rótulo visível permanece **Plano do Mês**.

## Atribuições de padrão

### 1. Schemas Prisma e migration

**Análogos:** `prisma/schema.prisma:71-100`, `186-199`, `355-366`; mesmos símbolos em `prisma/schema.sqlite.prisma`.

Relação no usuário segue listas existentes:

```prisma
model User {
  // ...
  budgets         Budget[]
  financialMonths FinancialMonth[]
}
```

Identidade mensal/tenant segue `FinancialMonth`:

```prisma
model FinancialMonth {
  id     String @id @default(cuid())
  month  String
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([month, userId])
}
```

Campos monetários seguem `Budget` e demais modelos:

```prisma
// PostgreSQL
amount Decimal @db.Decimal(19, 2)

// SQLite
amount Decimal
```

Aplicação recomendada ao novo modelo:

- `id`, `month`, `userId`, `createdAt`, `updatedAt`;
- `incomeOverride Decimal?` — `null` significa usar sugestão recorrente; zero é override válido e não pode ser convertido em `null` por truthiness;
- `savingsGoal Decimal` e `safetyMargin Decimal @default(0)`;
- relação `user` com `onDelete: Cascade`;
- `@@unique([month, userId])` e, se o plano for consultado apenas pela chave única, nenhum índice redundante é necessário.

Não persistir valores derivados (`committedExpenses`, `variableSpent`, `available`, `dailySafeLimit`, status): ficariam obsoletos após qualquer transação/fatura/ocorrência. Calcular na leitura.

**Regra dual:** toda mudança estrutural deve ser repetida nos dois schemas. A única diferença monetária é `@db.Decimal(19, 2)` no PostgreSQL; SQLite usa `Decimal` sem atributo nativo. `package.json` confirma geração dupla em `prisma:generate` e sincronização local por `db:push:sqlite`. `docs/MIGRATIONS.md` documenta schema PostgreSQL + espelho SQLite.

**Migration PostgreSQL:** criar tabela, FK com cascade e unique composto, seguindo SQL quoted/case-sensitive das migrations atuais. O diretório `prisma/migrations/` é configurado apenas para `schema.prisma` em `prisma.config.ts`; não criar uma segunda migration SQLite. SQLite é atualizado pelo schema espelho + `prisma db push --schema prisma/schema.sqlite.prisma`.

Risco operacional: `npx prisma migrate dev` deve apontar ao datasource PostgreSQL configurado; a descrição antiga em `docs/MIGRATIONS.md` que diz que esse comando compara SQLite é inconsistente com `prisma.config.ts`. Planejador deve usar fluxo real do ambiente, sem presumir migration SQLite.

### 2. Validação e tipos

**Análogo:** `src/features/budgets/budgets.schema.ts:1-20`.

```ts
import { z } from "zod"

const monthRegex = /^\d{4}-\d{2}$/

export const budgetSchema = z.object({
  amount: z.coerce.number().positive().max(99999999.99),
  month: z.string().regex(monthRegex).refine(/* data válida */),
})

export type BudgetInput = z.infer<typeof budgetSchema>
```

Copiar `z.coerce.number()`, limite superior e validação semântica do mês. Para o plano:

- `savingsGoal` e `safetyMargin`: `.min(0)`, pois zero é válido;
- `incomeOverride`: nullable/opcional no payload conforme contrato explícito; `null` restaura sugestão automática;
- mês obrigatório em GET e PUT, sempre `YYYY-MM` válido;
- não aceitar `NaN`, infinito ou valores com magnitude acima do padrão monetário.

Definir um tipo público de resultado, à semelhança de `DashboardStats` em `dashboard.service.ts:7-23`, contendo pelo menos:

- configuração persistida e `incomeOverride`;
- `suggestedIncome`, `plannedIncome` e indicação da fonte (`SUGGESTED`/`OVERRIDE`);
- `committedExpenses`, `variableSpent`, `plannedBalance`, `variableAvailable` (bruto, pode ser negativo), `dailySafeLimit` (nunca negativo), `daysRemaining`;
- `projectedSavings` e estado textual/enum `NORMAL | ATTENTION | RISK`;
- breakdown de faturas, fixos fora do cartão e fixos dentro do cartão excluídos, para UI explicável e teste anti-duplicação.

### 3. Calculadora pura

**Análogo parcial:** `src/lib/money.ts:1-23`.

```ts
export function toMoney(value: MoneyValue) {
  return new Prisma.Decimal(value.toString()).toDecimalPlaces(2)
}

export function sumMoney(values: MoneyValue[]): number {
  return values
    .reduce<Prisma.Decimal>((total, value) => total.plus(value.toString()), new Prisma.Decimal(0))
    .toNumber()
}

export function subtractMoney(value: MoneyValue, ...subtrahends: MoneyValue[]): number {
  return subtrahends
    .reduce<Prisma.Decimal>((total, item) => total.minus(item.toString()), toMoney(value))
    .toNumber()
}
```

Não usar adição/subtração JS direta para dinheiro como ocorre em trechos legados de `monthly-closing.service.ts:84-92`. Reusar `sumMoney`, `subtractMoney` e `toMoney`; arredondar o limite exibido a centavos somente após divisão. Manter valor bruto negativo para status/explicação, mas retornar `dailySafeLimit = 0` quando disponível for negativo.

Contrato sugerido para testabilidade:

```ts
calculateMonthlyPlan(input, asOf: Date): MonthlyPlanProjection
```

`asOf` evita teste dependente do relógio. Dias restantes:

- mês atual: do dia local atual até o último dia, inclusivo;
- mês futuro: todos os dias do mês;
- mês passado: zero; evitar divisão por zero e retornar limite zero;
- não basear fronteiras em `toISOString()` UTC, pois timezone pode trocar o dia no Brasil.

Status normal/atenção/risco deve ser uma função pura e testada. Como limiares estão sob discrição em `01-CONTEXT.md`, registrar constantes nomeadas no calculator, sem magic numbers nem decisão visual duplicada no componente. Estado precisa retornar texto/ícone além de classe de cor.

### 4. Serviço de composição e persistência

**Análogo de upsert:** `src/features/financial-months/financial-months.service.ts:4-14`.

```ts
return db.financialMonth.upsert({
  where: { month_userId: { month, userId } },
  update: {},
  create: { month, userId },
})
```

Atualização do plano deve ser atômica por chave composta `(month, userId)`, não por `id` recebido do cliente. Isso elimina IDOR e implementa PMES-001/011 naturalmente:

```ts
db.monthlyPlan.upsert({
  where: { month_userId: { month, userId } },
  update: { ...campos validados },
  create: { month, userId, ...campos validados },
})
```

**Análogo financeiro principal:** `src/features/monthly-closing/monthly-closing.service.ts:getMonthlyClosingSummary` (`134-190`). Copiar a sequência:

```ts
const financialMonth = await ensureFinancialMonth(userId, month, db)
await ensureFixedCostOccurrences(userId, month, financialMonth.id, db)

const [invoices, occurrences, looseExpenses, income] = await Promise.all([
  db.cardInvoice.findMany({ where: { userId, month }, /* ... */ }),
  db.fixedCostOccurrence.findMany({
    where: { userId, month, deletedAt: null },
    select: { amount: true, fixedCost: { select: { type: true, paidInsideCard: true } } },
  }),
  aggregateTransactions(userId, month, "EXPENSE", db),
  aggregateTransactions(userId, month, "INCOME", db),
])
```

E copiar exatamente a separação anti-duplicação de `monthly-closing.service.ts:161-175`:

```ts
const allCardInvoices = sum(invoices.map((inv) => inv.amount))
const expenseOccurrences = occurrences.filter((item) => item.fixedCost.type === "EXPENSE")
const incomeOccurrences = occurrences.filter((item) => item.fixedCost.type === "INCOME")
const insideCard = expenseOccurrences.filter((item) => item.fixedCost.paidInsideCard)
const outsideCard = expenseOccurrences.filter((item) => !item.fixedCost.paidInsideCard)
const fixedCostsOutsideCardTotalAll = sum(outsideCard.map((item) => item.amount))
```

Para **compromissos planejados**, usar todas as faturas do mês e todas as ocorrências fora do cartão, independentemente de `PENDING`/`PAID`. Status de pagamento muda fluxo de caixa, não o custo comprometido do mês. O análogo confirma isso em `totalSpent = allCardInvoices + fixedCostsOutsideCardTotalAll + looseExpenses` (`174`); `totalToPay` usa somente pendentes e não representa o requisito PMES-003.

Para **receita sugerida**, somar apenas ocorrências recorrentes `INCOME` geradas por `ensureFixedCostOccurrences`, conforme D-04. Não somar também todas as `Transaction` de receita na sugestão: uma transação manual pode representar o recebimento da própria recorrência e o schema não possui vínculo direto que permita deduplicar.

Para **gastos variáveis realizados**, agregar `Transaction` de `EXPENSE` no intervalo `[primeiro dia, primeiro dia do mês seguinte)`, copiando `aggregateTransactions` (`monthly-closing.service.ts:548-563`) e sempre filtrando `userId`. `ImportedTransaction` de fatura é outro modelo e não deve entrar: seu valor já compõe `CardInvoice.amount`.

Todo método aceita `client?: PrismaClient` e usa `client ?? defaultPrisma`, como `dashboard.service.ts:62-70` e `budgets.service.ts:7-20`, permitindo integração SQLite real em testes.

### 5. API autenticada

**Análogo:** `src/app/api/budgets/route.ts:1-55`; agregação de dashboard em `src/app/api/dashboard/summary/route.ts:12-45`.

Padrão obrigatório:

```ts
const session = await auth()
if (!session?.user?.id) {
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
}
```

GET:

- extrair `month` da query;
- validar formato e mês real antes do serviço;
- passar apenas `session.user.id`, nunca `userId` de query/body;
- retornar configuração + projeção numa resposta única para evitar refetch/N+1.

PUT (recomendado em vez de POST+rota `[id]`):

- `safeParse(await request.json())`;
- upsert por `(session.user.id, month)`;
- 400 com `{ error: "Dados inválidos", issues }` como budgets;
- 401 sem sessão;
- 200 com projeção recalculada.

O projeto usa `try/catch` local e mensagens genéricas em mutações (`budgets/route.ts:46-53`), sem wrapper central. Não vazar erro Prisma.

**Dashboard:** preferir incluir `monthlyPlan` no payload já agregado de `/api/dashboard/summary`, adicionando a chamada ao `Promise.all` de `route.ts:31-37`. Não criar segunda chamada no dashboard: ela duplicaria consultas de ocorrências/faturas e permitiria respostas de instantes diferentes. Melhor ainda, fatorar um helper financeiro compartilhado pelo fechamento e plano antes de fazer ambos em paralelo; caso contrário ambos chamarão `ensureFixedCostOccurrences` e repetirão queries.

### 6. Página Plano do Mês

**Análogo:** `src/app/(dashboard)/budgets/page.tsx:1-220`.

Copiar:

- página client com `useState`, `useCallback`, `useEffect`;
- seletor mensal local (`getCurrentMonth`, `prevMonth`, `nextMonth`, `formatMonth`) das linhas `33-89`;
- `fetch('/api/monthly-plan?month=...')` dependente de `month`;
- loading em `finally` e refetch após save (`54-77`, `91-109`);
- grid responsivo e cards `border-0 shadow-sm` (`144-183`);
- empty/loading state explícito (`194-210`).

Diferenças necessárias:

- não indexar resumo e entidade por posição, como budgets faz em `summary[idx]`; plano é objeto único;
- formulário deve distinguir receita automática de override. Ação “Usar sugestão” envia `incomeOverride: null`;
- após PUT, usar a projeção retornada para atualização imediata e então opcionalmente revalidar; desabilitar submit durante request;
- breakdown deve explicar fórmula: receita prevista − compromissos − meta − margem − gastos variáveis;
- exibir valor bruto negativo como déficit/risco, mas limite diário como R$ 0,00;
- estados devem ter rótulo e ícone (`Dentro da meta`, `Atenção`, `Meta ameaçada`) além de verde/amarelo/vermelho.

O formulário deve copiar os componentes de `budget-form.tsx` (Dialog, Label/Input, submit assíncrono), mas validar números também no servidor; coerção client não é fronteira de segurança.

### 7. Card do dashboard e menu

**Dashboard análogo:** `src/app/(dashboard)/dashboard/page.tsx:48-78`, `127-194`, `196-260`.

Estado vem do único fetch `/api/dashboard/summary?month=${month}&months=6`; acrescentar `monthlyPlan` ao tipo/payload e renderizar componente dedicado. O card deve seguir:

```tsx
<Card className="border-0 shadow-sm">
  <CardContent className="flex items-center gap-4 p-6">
    {/* ícone, rótulo, valor, descrição */}
  </CardContent>
</Card>
```

Usar `formatCurrency` e `Loader2`, já adotados no dashboard. Incluir link/CTA para `/monthly-plan?month=YYYY-MM`. Garantir variante mobile; dashboard possui blocos separados `sm:hidden` e `hidden ... sm:grid`, portanto adicionar o resumo em ambos ou criar um componente responsivo único para evitar divergência.

**Menu análogo:** `src/app/(dashboard)/layout.tsx:8-46`, `173-191`.

Adicionar ícone Lucide e item em `navItems`:

```ts
{ href: "/monthly-plan", label: "Plano do Mês", icon: /* ícone */ }
```

`navItems` alimenta sidebar e menu mobile. `isActive` atual usa igualdade para rotas comuns (`layout.tsx:175`); suficiente para a página única. A ordem recomendada é após Dashboard e antes de Fechamento Mensal, refletindo prioridade do recurso.

### 8. Testes

#### Unitário da fórmula

Novo `monthly-plan.calculator.test.ts`, sem banco. Cobrir literalmente os exemplos:

- `1500 - 835 - 300 = 365`;
- `365 / 20 = 18.25`;
- sem gasto e 19 dias: `365 / 19 ≈ 19.21`, não saldo acumulado diário;
- gasto 30: `335 / 19 ≈ 17.63`;
- margem separada da meta;
- déficit mantém valor bruto negativo e limite zero;
- limites de mês, ano bissexto, passado/futuro e inclusão do dia atual;
- arredondamento com entradas como `0.1 + 0.2` via helpers Decimal;
- três estados e seus limiares exatos.

#### Integração do serviço

**Análogos:** `budgets.service.test.ts:14-85` e `dashboard.service.test.ts:105-151`.

Copiar cliente injetado de `getTestClient()`, setup real por `beforeAll`, cleanup em ordem FK no `afterAll` e assertions de isolamento. Cenários essenciais:

- upsert cria e edita somente `(userId, month)`;
- outro mês não herda override/meta;
- outro usuário não lê nem altera plano;
- renda sugerida inclui ocorrência recorrente `INCOME`;
- fatura 800 + fixo 120 `paidInsideCard=true` resulta compromisso 800, não 920;
- fixo fora do cartão soma uma vez;
- `deletedAt` exclui ocorrência;
- fatura paga continua no custo comprometido do mês;
- transação `EXPENSE` reduz disponível variável;
- `ImportedTransaction` de fatura não entra novamente;
- mudança em transação/fatura gera projeção nova sem atualizar coluna derivada.

`src/__tests__/tenant-isolation.test.ts:76-81` documenta risco arquitetural: Prisma não possui middleware automático de tenant. Cada consulta precisa conter `where: { userId, ... }`; teste deve chamar o serviço, não provar apenas Prisma direto.

#### Schema e componente

- Estender `src/__tests__/schema.test.ts` para insert/Decimal do novo modelo e `relations.test.ts` para relação/cascade, seguindo Budget.
- `monthly-plan.schema.test.ts` segue `budgets.schema.test.ts`: válido, negativos, zero permitido, teto, mês inválido, `null` do override.
- componente de status/card segue Testing Library de `category-card.test.tsx:1-42`: `render`, `screen`, `userEvent`, assertions por role/texto. Testar que cada estado tem texto/ícone perceptível sem cor.

#### E2E

**Análogo:** `e2e/budgets.spec.ts:1-53`.

Reusar cadastro/login real e seletores por role/label. Fluxo mínimo:

1. abrir `/monthly-plan` autenticado;
2. escolher mês e salvar receita/meta/margem;
3. verificar valor e rótulo do limite;
4. trocar mês e confirmar isolamento;
5. voltar ao dashboard e verificar card/link;
6. viewport mobile: menu contém Plano do Mês e estado continua textual.

Evitar `waitForTimeout` novo; esperar URL, resposta ou elemento visível.

## Padrões compartilhados

### Tenant/auth

**Fontes:** `src/app/api/budgets/route.ts:6-10`, `budgets.service.ts:7-20`, `monthly-closing.service.ts:144-159`.

- API deriva tenant da sessão.
- Serviço recebe `userId` obrigatório.
- Todas as leituras, aggregates e writes filtram `userId` e `month`.
- Nunca aceitar `userId` no DTO público.

### Precisão monetária

**Fontes:** `prisma/schema.prisma:168`, `272`, `297`, `333`, `357`; `src/lib/money.ts`.

- PostgreSQL `Decimal(19,2)`, SQLite `Decimal`.
- Soma/subtração com Prisma Decimal helpers.
- Converter para `number` somente no DTO JSON.
- Divisão e arredondamento de exibição definidos/testados em centavos.

### Datas/mês

**Fontes:** `budgets.schema.ts:3-16`, `dashboard.service.ts:68-70`, `budgets/page.tsx:33-41`.

- chave canônica `YYYY-MM`;
- intervalo de transações `[new Date(y,m-1,1), new Date(y,m,1))`;
- UI pt-BR;
- cálculo de dias com data local e `asOf` injetado.

### Geração de recorrências

**Fonte:** `monthly-closing.service.ts:362-498`.

Sempre chamar `ensureFinancialMonth` e `ensureFixedCostOccurrences` antes de consultar ocorrências. O gerador é idempotente via unique `(fixedCostId, scheduledDate)` e upsert. Não reimplementar recorrência no feature.

## Matriz contra dupla contagem

| Fonte | Receita sugerida | Compromissos | Gastos variáveis realizados | Regra |
|---|---:|---:|---:|---|
| `FixedCostOccurrence` INCOME | sim | não | não | recorrência prevista; não somar Transaction INCOME correspondente |
| `CardInvoice` | não | sim, valor total do mês | não | incluir paga e pendente uma vez |
| `FixedCostOccurrence` EXPENSE, `paidInsideCard=false` | não | sim | não | incluir uma vez, independentemente de pago |
| `FixedCostOccurrence` EXPENSE, `paidInsideCard=true` | não | não | não | já contida em CardInvoice; apenas expor como excluída no breakdown |
| `Transaction` EXPENSE | não | não | sim | gasto avulso/variável no intervalo mensal |
| `Transaction` INCOME | não para sugestão | não | não | não confundir recebimento realizado com previsão recorrente |
| `ImportedTransaction` | não | não | não | detalhe de importação; total já em CardInvoice |
| `BankAccountMovement` | não | não | não | movimento de caixa pode representar pagamento já contado |

## Riscos e conflitos

1. **Duplicar lógica de fechamento.** Copiar filtros para outro serviço tende a divergir. Preferir helper compartilhado de composição financeira, mantendo o contrato atual do fechamento.
2. **Executar fechamento e plano em paralelo com side effects.** Ambos podem chamar `ensureFixedCostOccurrences`. Upsert protege integridade, mas duplica trabalho; compor uma vez na rota/dashboard ou compartilhar consulta.
3. **Usar `totalToPay` como comprometido.** Ele exclui itens pagos e faria o disponível aumentar após pagamento, embora o gasto do mês continue existindo. Usar totais all-month.
4. **Somar fixo no cartão + fatura.** Filtro obrigatório `!fixedCost.paidInsideCard` nos compromissos.
5. **Somar fatura + ImportedTransaction.** Importados detalham a fatura e não são outra despesa.
6. **Somar receita recorrente + Transaction INCOME.** Não há vínculo para deduplicar salário previsto/recebido.
7. **Persistir derivados.** Novos gastos deixariam limite obsoleto; calcular a cada GET e após PUT.
8. **Prisma sem isolamento automático.** Qualquer query sem `userId` vaza dados; unique composto e sessão não substituem filtro em aggregates.
9. **Decimal convertido cedo.** JS float pode quebrar centavos e critérios; manter Decimal até DTO.
10. **Timezone/dia inclusivo.** UTC via `toISOString()` pode deslocar dia; testar localmente e injetar relógio.
11. **Zero vs ausência de override.** `0` é valor; somente `null` significa automático.
12. **Índice de resumo por posição.** Padrão de budgets `summary[idx]` é frágil e não deve ser copiado.
13. **Menu atual não lista Orçamentos.** A página `/budgets` existe, mas `navItems` não a expõe; não aproveitar esta fase para corrigir escopo alheio.
14. **Conflito de edição provável.** `dashboard/page.tsx`, `dashboard/summary/route.ts`, `layout.tsx` e ambos schemas são hotspots; agrupar alterações por plano e rebasear sem sobrescrever trabalho paralelo.

## Sem análogo exato

| Arquivo | Motivo | Fonte alternativa |
|---|---|---|
| `src/features/monthly-plan/monthly-plan.calculator.ts` | não existe cálculo diário adaptativo nem política de três estados | fórmulas e critérios em `.planning/REQUIREMENTS.md`; dinheiro em `src/lib/money.ts` |

## Ordem recomendada ao planejador

1. Modelo dual + migration + geração Prisma + schema/relations tests.
2. Schema/types + calculadora pura e testes de todos os critérios numéricos.
3. Helper/composição financeira + serviço/upsert + integração/isolamento/anti-duplicação.
4. API de plano e extensão do summary do dashboard.
5. Página/form/componentes + card dashboard + menu + testes de componente.
6. E2E desktop/mobile, lint, cobertura e build.

## Metadados

**Escopo pesquisado:** `prisma/`, `src/features/`, `src/app/api/`, `src/app/(dashboard)/`, `src/__tests__/`, `e2e/`, scripts/configuração Prisma.  
**Análogos fortes lidos:** schemas Prisma, `monthly-closing.service.ts`, `dashboard.service.ts`, budgets schema/service/API/page/tests, financial-month service, dashboard route/page/test, layout, tenant/schema/relations tests e E2E budgets.  
**Data:** 2026-08-09.
