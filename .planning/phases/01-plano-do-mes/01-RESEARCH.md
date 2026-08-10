# Fase 1: Plano do Mês — Pesquisa

**Pesquisado em:** 2026-08-09  
**Domínio:** planejamento financeiro mensal multi-tenant em Next.js/Prisma  
**Confiança:** ALTA para fontes e arquitetura do código; MÉDIA para semântica temporal até confirmação do fuso

<user_constraints>
## User Constraints (from CONTEXT.md)

Conteúdo abaixo copiado verbatim de `01-CONTEXT.md`. [VERIFIED: `.planning/phases/01-plano-do-mes/01-CONTEXT.md`]

### Locked Decisions

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

### Codex's Discretion

- Estrutura exata dos componentes e rotas, desde que siga os padrões atuais.
- Limiares visuais de atenção e risco, desde que determinísticos e testados.
- Estratégia de cache/refetch e organização interna do serviço.

### Deferred Ideas (OUT OF SCOPE)

- Integração bancária automática.
- Recomendações por IA.
- Metas compartilhadas.
- Push, SMS ou WhatsApp.
- Planejamento anual e investimentos.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Descrição | Suporte desta pesquisa |
|---|---|---|
| PMES-001 | Criar/editar plano por mês | `MonthlyPlan` separado, chave `(userId,month)` e PUT idempotente per D-14. [VERIFIED: contexto] |
| PMES-002 | Sugerir receita recorrente e permitir ajuste mensal | Somar ocorrências `INCOME`; persistir override anulável. [VERIFIED: `src/features/monthly-closing/monthly-closing.service.ts:57-118`] |
| PMES-003 | Compromissos sem dupla contagem | Faturas + ocorrências `EXPENSE` fora do cartão; excluir `paidInsideCard=true`. [VERIFIED: `src/features/dashboard/dashboard.service.ts:239-251`] |
| PMES-004 | Meta mínima de economia | Campo Decimal não negativo e componente editável. [VERIFIED: `.planning/REQUIREMENTS.md`] |
| PMES-005 | Margem opcional separada | Campo Decimal independente, default zero. [VERIFIED: `.planning/REQUIREMENTS.md`] |
| PMES-006 | Valor ainda disponível | Fórmula Decimal centralizada e valor bruto separado do limite truncado. [VERIFIED: `.planning/REQUIREMENTS.md`] |
| PMES-007 | Limite por dias restantes | Função pura com `asOf`, divisor inclusivo e arredondamento final. [VERIFIED: `.planning/REQUIREMENTS.md`] |
| PMES-008 | Redistribuição adaptativa | Não persistir “saldo do dia”; recalcular do saldo mensal e divisor atual em toda leitura. [VERIFIED: `.planning/REQUIREMENTS.md`] |
| PMES-009 | Estados normal/atenção/risco | Estado derivado no serviço, texto/ícone além de cor. [VERIFIED: `01-CONTEXT.md`, D-12] |
| PMES-010 | Resumo no dashboard | Consumir o mesmo DTO/serviço da página completa. [VERIFIED: `src/app/(dashboard)/dashboard/page.tsx`] |
| PMES-011 | Isolamento | Sessão fornece `userId`; toda consulta e upsert incluem usuário. [VERIFIED: `src/app/api/budgets/route.ts`, `src/__tests__/tenant-isolation.test.ts`] |

</phase_requirements>

## Summary

O Finly já possui a composição financeira que esta fase deve reutilizar: `FinancialMonth` delimita usuário+mês; `FixedCostOccurrence` materializa recorrências; `CardInvoice` representa o compromisso integral do cartão; `Transaction` representa lançamentos avulsos. O dashboard e o fechamento já evitam somar ocorrências `paidInsideCard=true` fora da fatura. [VERIFIED: `prisma/schema.prisma:186-198,266-352`; `src/features/dashboard/dashboard.service.ts:239-251`; `src/features/monthly-closing/monthly-closing.service.ts:57-118`]

Decisão fechada: criar `MonthlyPlan` separado, único por `(userId,month)`, com `incomeOverride Decimal?`, `savingsGoal Decimal` e `safetyMargin Decimal`; manter cálculo em serviço puro/orquestrador próprio e expor um único recurso autenticado por mês. D-14 prevalece sobre a recomendação inicial de ampliar `FinancialMonth`. `incomeOverride=null` preserva a sugestão dinâmica. [VERIFIED: `01-CONTEXT.md`, D-14]

As fronteiras foram resolvidas: `Transaction` é avulsa; pagamentos internos usam `BankAccountMovement`; itens importados pertencem à fatura; não existe dedupe fuzzy. O dia civil usa `America/Sao_Paulo`; passado tem divisor zero, futuro usa todos os dias; a janela aceita vai do início do ano anterior ao fim do próximo ano em relação a `asOf`. [VERIFIED: D-13/D-15/D-16/D-17]

**Recomendação principal:** uma única composição mensal server-side, Decimal até a borda, usando `fatura + fixos fora do cartão + transações avulsas realizadas`, com `asOf` e fuso explícitos. [VERIFIED: padrões financeiros existentes] [ASSUMED]

## Architectural Responsibility Map

| Capacidade | Tier primário | Tier secundário | Justificativa |
|---|---|---|---|
| Persistência do plano mensal | Database / Storage | API / Backend | `MonthlyPlan` separado é único por usuário+mês per D-14. [VERIFIED: contexto] |
| Sugestão de receita e compromissos | API / Backend | Database / Storage | Agregação e regra contra duplicidade são regras financeiras, não estado de UI. [VERIFIED: serviços dashboard/monthly-closing] |
| Fórmulas, dias restantes e status | API / Backend | — | Resultado deve ser único para página e dashboard, testável com relógio injetado. [ASSUMED] |
| Autorização/isolamento | API / Backend | Database / Storage | Sessão determina `userId`; filtros compostos restringem dados. [VERIFIED: rotas existentes] |
| Edição e feedback imediato | Browser / Client | API / Backend | UI envia PUT e renderiza DTO canônico retornado. [VERIFIED: padrão das páginas atuais] |
| Card do dashboard | Browser / Client | API / Backend | Apenas apresentação resumida; não recalcula valores. [ASSUMED] |

## Project Constraints (from AGENTS.md)

- Ler a documentação instalada em `node_modules/next/dist/docs/` antes de escrever Next.js porque esta versão contém mudanças incompatíveis; respeitar avisos de depreciação. [VERIFIED: `AGENTS.md`]
- Pensar e declarar premissas antes de codificar; escolher solução mínima; alterar somente linhas necessárias; definir verificações objetivas. [VERIFIED: `AGENTS.md`]
- Seguir padrões atuais, validar entradas nas bordas, evitar N+1/refetch desnecessário, manter fonte única de verdade e não deixar `console.log` em produção. [VERIFIED: `AGENTS.md`]
- Executar testes completos antes de commit e manter commits atômicos. [VERIFIED: `AGENTS.md`]
- Usar RTK para comandos quando disponível e comunicação concisa. [VERIFIED: `AGENTS.md`]

## Standard Stack

### Core

| Biblioteca | Versão do projeto | Propósito | Diretriz |
|---|---:|---|---|
| Next.js | 16.2.11 | App Router, Route Handlers, página/dashboard | Manter versão fixada e padrões locais. [VERIFIED: `package.json`; npm registry; docs locais `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`] |
| React | 19.2.4 | UI cliente existente | Reusar componentes e fluxo `fetch` atuais. [VERIFIED: `package.json`; dashboard page] |
| Prisma ORM/Client | 7.9.1 | schemas PostgreSQL/SQLite, Decimal, upsert | Alterar os dois schemas e gerar clientes. [VERIFIED: `package.json`; `npx prisma --version`] |
| Zod | 4.4.3 | validação de query/body | Allowlist estrita de `month`, override, meta e margem. [VERIFIED: npm registry; schemas existentes] |
| date-fns | 4.4.0 | limites e diferença de dias civis | Usar funções de calendário, não milissegundos/86400000. [VERIFIED: `package.json`] [CITED: https://github.com/date-fns/date-fns/blob/main/src/differenceInCalendarDays/index.ts] |

### Supporting

| Biblioteca | Versão | Propósito | Quando usar |
|---|---:|---|---|
| `@date-fns/tz` | 1.5.0 | contexto IANA explícito | Adicionar para o fuso bloqueado `America/Sao_Paulo`; date-fns v4 aceita contexto `in`. [VERIFIED: D-13/npm registry] [CITED: https://github.com/date-fns/tz] |
| Vitest | 4.1.8 | testes puros, serviço/SQLite e componentes | Fórmulas, integração financeira, isolamento e UI. [VERIFIED: `package.json`, `vitest.config.ts`] |
| Playwright | 1.60.0 | fluxo principal responsivo | Navegação, edição e atualização do dashboard. [VERIFIED: npm registry; `playwright.config.ts`] |
| `Prisma.Decimal` | incluído no Prisma 7.9.1 | aritmética monetária exata | Do carregamento até arredondamento final. [VERIFIED: `src/lib/money.ts`] [CITED: https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types] |

### Alternatives Considered

| Em vez de | Poderia usar | Tradeoff |
|---|---|---|
| `MonthlyPlan` separado per D-14 | Estender `FinancialMonth` | Entidade explícita preserva responsabilidade do ciclo de fechamento; decisão bloqueada prevalece sobre alternativa pesquisada. [VERIFIED: contexto/patterns] |
| Override anulável | Persistir receita efetiva | Mais simples de ler, mas congela a sugestão e perde distinção entre sugerido e ajustado. [ASSUMED] |
| `Prisma.Decimal` | Inteiros em centavos | Também exato e oficialmente recomendado em exemplos, mas diverge de todos os campos monetários atuais. [CITED: https://www.prisma.io/docs/orm/next/data-modeling] [VERIFIED: schemas atuais usam Decimal] |

**Instalação:** nenhuma biblioteca nova é necessária se o produto escolher UTC. Se exigir dia civil de São Paulo, instalar `@date-fns/tz@1.5.0`. [VERIFIED: dependências atuais; npm registry] [ASSUMED]

**Verificação de versões:** versões exatas acima confirmadas no registry em 2026-08-09; o projeto deve permanecer em suas versões fixadas durante esta fase, sem upgrade incidental. [VERIFIED: npm registry; `package.json`]

## Architecture Patterns

### System Architecture Diagram

```text
Browser: /monthly-plan + dashboard card
       │ GET/PUT month + campos permitidos
       ▼
Route Handler autenticado
       │ session.user.id (nunca userId do body)
       ▼
MonthlyPlan service/orchestrator ──► função pura calculateMonthlyPlan(inputs, asOf)
       │                                  │
       ├─ ensure FinancialMonth           ├─ projectedSavings
       ├─ ensure fixed occurrences        ├─ availableVariableRaw
       ├─ recurring INCOME occurrences    ├─ max(0)/daysRemaining
       ├─ CardInvoice totals              └─ NORMAL | ATTENTION | RISK
       ├─ outside-card EXPENSE occurrences
       └─ realized EXPENSE Transactions
                    │
                    ▼
        Prisma: PostgreSQL em produção / SQLite em testes
```

[VERIFIED: camadas e fontes existentes] [ASSUMED: nomes do novo recurso/função]

### Recommended Project Structure

```text
prisma/
├── schema.prisma                 # campos do plano — PostgreSQL
├── schema.sqlite.prisma          # equivalente para testes
└── migrations/...                # migração dos campos
src/features/monthly-plan/
├── monthly-plan.schema.ts        # query/body
├── monthly-plan.calculation.ts   # função pura; Decimal; clock injetado
├── monthly-plan.service.ts       # persistência + composição das fontes
└── __tests__/                    # fórmula + integração SQLite
src/app/api/monthly-plan/route.ts # GET e PUT autenticados
src/app/(dashboard)/monthly-plan/ # página própria e componentes
src/app/(dashboard)/dashboard/    # card reutilizando DTO
e2e/monthly-plan.spec.ts          # fluxo principal
```

[ASSUMED: estrutura recomendada conforme padrões existentes]

### Pattern 1: Persistir somente decisão do usuário

**O quê:** criar `MonthlyPlan` com `incomeOverride Decimal?`, `savingsGoal Decimal @default(0)` e `safetyMargin Decimal @default(0)`; a receita efetiva é `incomeOverride ?? suggestedIncome`. [VERIFIED: D-14]

**Quando:** leitura e atualização do mês; PUT deve fazer upsert por `month_userId`. Compound unique constraints são suportadas por Prisma em operações únicas/upsert. [CITED: https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-composite-ids-and-constraints] [VERIFIED: `ensureFinancialMonth` já usa esse padrão]

### Pattern 2: Composição por origem, não por status de pagamento

| Componente | Incluir | Excluir | Motivo |
|---|---|---|---|
| Receita sugerida | Todas ocorrências do mês com `fixedCost.type=INCOME`, `deletedAt=null` | `Transaction` INCOME e status da ocorrência | Previsão recorrente é compromisso do mês, recebida ou não. [VERIFIED: modelos e D-04] [ASSUMED] |
| Faturas comprometidas | Todas `CardInvoice` do usuário+mês, pagas ou pendentes | — | Pagamento muda caixa/status, não elimina compromisso mensal. [VERIFIED: `totalSpent` já soma todas as faturas] |
| Fixos comprometidos | Ocorrências `EXPENSE`, `deletedAt=null`, `paidInsideCard=false`, pagas ou pendentes | `paidInsideCard=true` | Fixos no cartão já compõem a fatura. [VERIFIED: dashboard/monthly-closing] |
| Gastos variáveis realizados | `Transaction` EXPENSE dentro do mês e até `asOf` | Receitas, movimentos bancários, faturas, ocorrências fixas | Movimentos são reflexos de pagamento e não nova despesa. [VERIFIED: services de transaction/monthly-closing] [ASSUMED: corte por `asOf`] |

**Invariante contra dupla contagem:** `committed = invoices + outsideCardFixedOccurrences`; `realizedVariable = expenseTransactions`; nunca somar `FixedCostOccurrence.paidInsideCard`, `BankAccountMovement` ou itens importados da fatura separadamente. [VERIFIED: `dashboard.service.ts`, `monthly-closing.service.ts`]

**Limitação conhecida:** uma `Transaction` criada manualmente para representar pagamento/compra já embutida na fatura não tem FK/proveniência que permita dedução segura. Não usar matching por valor/data/descrição; isso criaria falsos positivos. Tratar prevenção/ligação futura fora desta fase ou documentar que “Transações” são avulsas. [VERIFIED: schema não relaciona Transaction↔CardInvoice] [ASSUMED]

### Pattern 3: Função pura, relógio injetável, arredondamento na saída

```typescript
// Fonte: regra canônica em .planning/REQUIREMENTS.md e Prisma Decimal docs
type Inputs = {
  expectedIncome: Prisma.Decimal
  committedExpenses: Prisma.Decimal
  savingsGoal: Prisma.Decimal
  safetyMargin: Prisma.Decimal
  realizedVariableExpenses: Prisma.Decimal
  daysRemaining: number
}

const projectedSavings = input.expectedIncome.minus(input.committedExpenses).minus(input.realizedVariableExpenses)
const availableRaw = projectedSavings.minus(input.savingsGoal).minus(input.safetyMargin)
const safeDaily = input.daysRemaining > 0 && availableRaw.greaterThan(0)
  ? availableRaw.div(input.daysRemaining).toDecimalPlaces(2)
  : new Prisma.Decimal(0)
```

[CITED: https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types] [VERIFIED: fórmula em REQUIREMENTS]

Não converter agregados em `number` antes de terminar subtração/divisão. O helper atual `sumMoney` retorna `number`; ele é seguro para somas arredondadas já finalizadas, mas não deve ser o núcleo do novo cálculo. [VERIFIED: `src/lib/money.ts`]

### Pattern 4: Semântica de mês e dias restantes

Recomendação determinística, após confirmar fuso: [ASSUMED]

- mês atual: `differenceInCalendarDays(endOfMonth(asOf), asOf) + 1`; hoje participa;
- mês futuro: todos os dias civis do mês; gasto “realizado” é zero até o mês começar;
- mês passado: zero dias restantes e limite diário zero; composição histórica continua visível;
- intervalos de consulta: início inclusivo e próximo início de mês exclusivo; no mês atual, despesa realizada deve ter data anterior ao começo do dia seguinte no fuso de negócio;
- não dividir milissegundos por 86.400.000: dias de calendário podem atravessar mudança de offset; `differenceInCalendarDays` considera fronteiras civis.

[CITED: https://github.com/date-fns/date-fns/blob/main/src/differenceInCalendarDays/index.ts] [VERIFIED: requisito diz que dia atual participa]

### Pattern 5: Estados sem limiar monetário arbitrário

Derivar no backend e devolver código + motivo: [ASSUMED]

- `RISK`: `projectedSavings < savingsGoal`;
- `ATTENTION`: meta ainda coberta, mas margem não (`projectedSavings < savingsGoal + safetyMargin`) ou gasto variável acumulado está acima do orçamento proporcional aos dias decorridos;
- `NORMAL`: meta+margem cobertas e ritmo não excedido;
- para meses futuros não aplicar alerta de ritmo; para passados, classificar pelo resultado final.

Para o mês atual, definir `initialVariableBudget=max(0, expectedIncome-committed-savingsGoal-safetyMargin)`, `elapsedDaysIncludingToday=totalDays-daysRemaining+1` e `paceBudget=initialVariableBudget*elapsedDaysIncludingToday/totalDays`; somente `realizedVariableExpenses > paceBudget` aciona atenção por ritmo. Esse desenho distingue ameaça à meta de consumo da margem e sinaliza gasto acima do ritmo sem inventar percentual. UI deve mostrar “Normal/Atenção/Risco”, ícone e frase explicativa, não somente cor. [VERIFIED: D-12] [ASSUMED]

### Anti-Patterns to Avoid

- **Duplicar `getMonthlyClosingSummary`:** extrair/reusar uma composição financeira compartilhada; duas fórmulas divergirão. [VERIFIED: regras já estão em dashboard e fechamento]
- **Somar fixos dentro do cartão:** a fatura é fonte autoritativa do compromisso do cartão. [VERIFIED: `paidInsideCard` existente]
- **Subtrair só faturas/fixos pendentes:** pago continua gasto/compromisso do mês e desapareceria do plano. [VERIFIED: diferença entre `totalToPay` e `totalSpent`]
- **Persistir limite diário ou saldo de ontem:** viola redistribuição; persistir somente entradas do plano. [VERIFIED: PMES-008]
- **Usar `new Date("YYYY-MM-01")` sem política de fuso:** parsing UTC combinado a getters locais pode deslocar mês/dia. [VERIFIED: código atual mistura `parseISO`, construtores locais e UTC em pontos diferentes]
- **Aceitar `userId` do cliente:** abre BOLA; derivar sempre da sessão. [CITED: https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/]
- **Atualizar o dashboard por cálculo cliente separado:** cria duas fontes de verdade; refetch/usar resposta canônica. [ASSUMED]

## Don't Hand-Roll

| Problema | Não construir | Usar | Por quê |
|---|---|---|---|
| Dinheiro | aritmética IEEE-754/`toFixed` intermediária | `Prisma.Decimal` + `toDecimalPlaces(2)` na borda | `0.1 + 0.2` e divisões não terminantes. [VERIFIED: testes de money] |
| Recorrências | projeção paralela de custos/receitas fixas | `ensureFixedCostOccurrences` e ocorrências materializadas | Já cobre frequência, fim, vencimento e idempotência. [VERIFIED: monthly-closing service/tests] |
| Deduplicação | fuzzy match por descrição/data/valor | flag estrutural `paidInsideCard` e origem da entidade | Heurística perde ou duplica despesas legítimas. [VERIFIED: schema] [ASSUMED] |
| Datas civis | cálculo por milissegundos | date-fns e contexto de fuso | DST/offset e inclusividade. [CITED: date-fns source] |
| Autorização | `userId` em query/body | `auth()` + filtros tenant em todas as consultas | Evita enumeração/alteração horizontal. [VERIFIED: rotas existentes] |
| Estado derivado | salvar status/limite no banco | função pura a cada leitura/mutação | Estado deriva de transações e passagem do dia. [VERIFIED: PMES-007/008] |

**Insight:** a fronteira estrutural já existe; o plano deve compô-la, não criar um segundo ledger financeiro. [VERIFIED: codebase]

## Common Pitfalls

### Pitfall 1: confundir “a pagar” com “comprometido no mês”
**O que ocorre:** fatura/custo pago some do cálculo e o disponível aumenta artificialmente. [VERIFIED: serviços expõem ambos `totalToPay` e `totalSpent`]  
**Prevenção:** somar todos os valores do mês, independentemente do status; status serve ao caixa/fechamento. [ASSUMED]  
**Sinal:** pagar uma fatura aumenta limite diário. [ASSUMED]

### Pitfall 2: receita recorrente duplicada por transação recebida
**O que ocorre:** ocorrência `INCOME` planejada e `Transaction INCOME` real entram juntas. [VERIFIED: ambas as fontes existem]  
**Prevenção:** sugestão vem só da ocorrência recorrente; receita efetiva é override ou sugestão. [ASSUMED]  
**Sinal:** marcar salário recebido aumenta receita prevista. [ASSUMED]

### Pitfall 3: corte temporal dependente do servidor
**O que ocorre:** perto da meia-noite, UTC e São Paulo produzem divisor e despesas “realizadas” diferentes. [VERIFIED: nenhum timezone é persistido/configurado]  
**Prevenção:** definir fuso de negócio, passar `asOf` à função pura e testar fronteiras. [ASSUMED]  
**Sinal:** teste passa localmente e falha no deploy/CI. [ASSUMED]

### Pitfall 4: mês inválido aceito por regex
**O que ocorre:** `YYYY-MM` sozinho aceita `2026-00`/`2026-13`. [VERIFIED: várias rotas checam apenas regex]  
**Prevenção:** schema comum valida forma e intervalo 01–12; rejeitar mês excessivamente distante se necessário. [ASSUMED]  
**Sinal:** `ensureFinancialMonth` cria chaves não canônicas. [ASSUMED]

### Pitfall 5: override zero tratado como ausência
**O que ocorre:** `incomeOverride || suggested` ignora ajuste intencional para zero. [ASSUMED]  
**Prevenção:** usar `??`, manter `null` como único “sem override”. [ASSUMED]  
**Sinal:** usuário zera receita, mas sugestão retorna. [ASSUMED]

### Pitfall 6: mutação GET e concorrência
**O que ocorre:** calcular o plano materializa mês/ocorrências; chamadas simultâneas competem. [VERIFIED: dashboards atuais chamam `ensure*` em GET]  
**Prevenção:** manter upserts por constraints únicas e cobrir chamadas concorrentes; não usar `findFirst`+`create`. [VERIFIED: `ensureFinancialMonth`; unique occurrence]

### Pitfall 7: divergência PostgreSQL/SQLite
**O que ocorre:** testes passam, produção falha ou campos não existem. [VERIFIED: há dois schemas/clientes]  
**Prevenção:** alterar ambos, gerar ambos e adicionar teste de equivalência/schema. [VERIFIED: `npm run prisma:generate`, `src/__tests__/schema.test.ts`]

## Code Examples

### Upsert tenant+mês sem ID fornecido pelo cliente

```typescript
// Fonte: padrão existente em financial-months.service.ts
await db.financialMonth.upsert({
  where: { month_userId: { month, userId } },
  update: { incomeOverride, savingsGoal, safetyMargin },
  create: { month, userId, incomeOverride, savingsGoal, safetyMargin },
})
```

[VERIFIED: `src/features/financial-months/financial-months.service.ts`] [CITED: https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-composite-ids-and-constraints]

### Query anti-dupla-contagem

```typescript
const outsideCardExpenses = await db.fixedCostOccurrence.findMany({
  where: {
    userId,
    month,
    deletedAt: null,
    fixedCost: { type: "EXPENSE", paidInsideCard: false },
  },
  select: { amount: true },
})
```

[VERIFIED: padrão equivalente em `dashboard.service.ts`]

### Route Handler autenticado

```typescript
// Fonte: padrões existentes de src/app/api/**/route.ts e docs Next locais
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  const parsed = monthlyPlanUpdateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 })
  return NextResponse.json(await upsertMonthlyPlan(session.user.id, parsed.data))
}
```

[VERIFIED: rotas existentes] [CITED: https://nextjs.org/docs/app/getting-started/route-handlers]

## State of the Art

| Abordagem antiga/arriscada | Abordagem requerida | Impacto |
|---|---|---|
| `number` durante toda aritmética | Decimal até resposta | Preserva centavos e arredondamento. [VERIFIED: migração `20260809143000_use_decimal_for_money`] |
| Custos fixos inferidos do template | Ocorrências recorrentes materializadas | Respeita frequência, fim e exceções/deleção do mês. [VERIFIED: monthly-closing service] |
| Um registro fixo por mês | `(fixedCostId, scheduledDate)` | Suporta recorrências múltiplas no mesmo mês. [VERIFIED: migração `20260809133000_add_fixed_cost_scheduled_date`] |
| Dedupe de cartão por interpretação | `paidInsideCard` explícito | Mantém fatura como total autoritativo. [VERIFIED: schema/migração] |

**Desatualizado:** replicar exemplos genéricos de Next.js sem consultar os docs instalados; `AGENTS.md` declara que esta versão possui mudanças incompatíveis. [VERIFIED: `AGENTS.md`]

## Assumptions Log

| # | Claim | Seção | Risco se errado |
|---|---|---|---|
| R1 | RESOLVED — usar `MonthlyPlan` separado, não ampliar `FinancialMonth`. | D-14 | Decisão bloqueada. |
| R2 | RESOLVED — `Transaction EXPENSE` é avulsa; pagamentos internos usam BankAccountMovement; ImportedTransaction não soma. | D-16 | Dados manuais semanticamente duplicados exigiriam proveniência fora do escopo. |
| R3 | RESOLVED — futuro usa todos os dias; passado usa divisor zero; ambos editáveis dentro da janela. | D-15/D-17 | Fora da janela, rejeitar antes de materializar. |
| A4 | Status deriva de cobertura da meta/margem e ritmo proporcional. | Pattern 5 | UX pode desejar limiares percentuais diferentes. |
| R5 | RESOLVED — fuso canônico `America/Sao_Paulo`, com `asOf` injetável. | D-13 | Testar cortes perto da meia-noite. |
| A6 | Receita avulsa não aumenta sugestão/limite automaticamente. | Pattern 2 | Produto pode querer incorporar receita realizada adicional. |

## RESOLVED — Product Decisions

1. **Fuso canônico:** RESOLVED — `America/Sao_Paulo`, server-side, com `asOf` injetável; não confiar no timezone do host. [VERIFIED: D-13]

2. **Semântica de Transaction:** RESOLVED — contrato atual considera Transaction avulsa; pagamentos internos geram BankAccountMovement; ImportedTransaction integra a fatura. Não implementar fuzzy dedupe. Dado manual que duplique semanticamente compra de cartão é limitação conhecida; eventual proveniência explícita está fora do escopo. [VERIFIED: D-16 e serviços existentes]

3. **Meses passados/futuros:** RESOLVED — ambos consultáveis/editáveis; passado mostra limite zero e futuro usa mês completo. A janela server-side vai de 1º de janeiro do ano anterior a 31 de dezembro do próximo ano, relativa a `asOf` em São Paulo; extremos inclusivos e valores externos são testados. [VERIFIED: D-15/D-17]

## Environment Availability

| Dependência | Exigida por | Disponível | Versão | Fallback |
|---|---|---:|---:|---|
| Node.js | build/test | ✓ | 24.15.0 | — [VERIFIED: `node --version`] |
| npm | dependências/scripts | ✓ | 11.12.1 | — [VERIFIED: `npm --version`] |
| Prisma CLI | schema/generate | ✓ | 7.9.1 | — [VERIFIED: `npx prisma --version`] |
| SQLite adapter | testes integração | ✓ | 12.10.0 | — [VERIFIED: package.json/test client] |
| Docker | PostgreSQL opcional | ✓ | 29.2.1 | Testes padrão usam SQLite. [VERIFIED: `docker --version`] |
| `psql` | inspeção PostgreSQL local | ✗ | — | Docker ou CI/ambiente remoto. [VERIFIED: probe local] |
| `@date-fns/tz` | fuso explícito confirmado | ✗ | — | instalar 1.5.0 para `America/Sao_Paulo`; sem fallback baseado no host. [VERIFIED: D-13/package.json/npm registry] |

**Fuso resolvido:** instalar `@date-fns/tz@1.5.0` e aplicar `America/Sao_Paulo` em cálculo e cortes de query. [VERIFIED: D-13]

**Dependências ausentes com fallback:** `psql` não bloqueia; integração atual roda em SQLite e Docker está disponível. [VERIFIED: test client/environment]

## Validation Architecture

`workflow.nyquist_validation` não está desativado porque `.planning/config.json` não existe; portanto a arquitetura de validação é obrigatória. [VERIFIED: filesystem]

### Test Framework

| Propriedade | Valor |
|---|---|
| Framework | Vitest 4.1.8 + Testing Library; Playwright 1.60.0 [VERIFIED: package.json] |
| Config | `vitest.config.ts`, `playwright.config.ts` [VERIFIED: filesystem] |
| Banco de integração | Prisma SQLite `file:./test.db`, suite serial (`fileParallelism:false`) [VERIFIED: `src/__tests__/prisma.ts`, `vitest.config.ts`] |
| Quick run | `npm test -- src/features/monthly-plan/__tests__/monthly-plan.calculation.test.ts` [ASSUMED: arquivo Wave 0] |
| Suite da feature | `npm test -- src/features/monthly-plan` [ASSUMED] |
| Full suite | `npm test && npm run lint && npm run build` [VERIFIED: scripts; ROADMAP] |
| E2E | `npm run test:e2e -- e2e/monthly-plan.spec.ts` [ASSUMED: arquivo Wave 0] |

### Phase Requirements → Test Map

| Req ID | Comportamento | Tipo | Comando automatizado | Existe? |
|---|---|---|---|---|
| PMES-001/002/004/005 | upsert mensal, override nulo/zero, meta/margem | integração | `npm test -- src/features/monthly-plan/__tests__/monthly-plan.service.test.ts` | ❌ Wave 0 |
| PMES-003 | fatura + fixo fora; fixo dentro excluído; pagos permanecem | integração | mesmo service test, casos de matriz de origem/status | ❌ Wave 0 |
| PMES-006/007/008 | exemplos 365/20, 365/19, 335/19; clamp; redistribuição | unitário | `npm test -- src/features/monthly-plan/__tests__/monthly-plan.calculation.test.ts` | ❌ Wave 0 |
| PMES-007 | hoje inclusivo, fim do mês, fevereiro bissexto, passado/futuro, meia-noite/fuso | unitário | mesmo calculation test com `asOf` fixo | ❌ Wave 0 |
| PMES-009 | normal/atenção/risco + texto/ícone | unitário/componente | `npm test -- src/app/(dashboard)/monthly-plan/_components` | ❌ Wave 0 |
| PMES-010 | card usa mesmo DTO e atualiza após mudança | componente/E2E | `npm run test:e2e -- e2e/monthly-plan.spec.ts` | ❌ Wave 0 |
| PMES-011 | A não lê/altera mês de B; body não controla userId | integração/API | service test + `src/__tests__/tenant-isolation.test.ts` | ⚠️ arquivo geral existe, casos da fase não |
| Todos | schemas PostgreSQL/SQLite equivalentes, build responsivo | schema/build/E2E | `npm test -- src/__tests__/schema.test.ts && npm run build` | ⚠️ infraestrutura existe, campos/casos não |

### Required Edge-Case Matrix

- dinheiro: 0, `0.1+0.2`, 10.005, valores máximos, negativos rejeitados, divisão com dízima, raw negativo preservado e limite zero; [VERIFIED: critérios Decimal] [ASSUMED]
- fontes: sem dados, só fatura, só fixo, fixo dentro/fora do cartão, pago/pendente, ocorrência deletada, múltiplas recorrências no mês, transação income/expense, dados de outro usuário; [VERIFIED: modelo atual] [ASSUMED]
- datas: primeiro/último dia, hoje inclusivo, fevereiro 28/29, virada de ano, mês passado/futuro, transação exatamente no início e no próximo início, horário perto da meia-noite; [ASSUMED]
- persistência: GET sem override, PUT zero, PUT null para restaurar sugestão, troca de mês, concorrência de dois GET/PUT, mês 00/13; [ASSUMED]
- interface: loading/error/empty, mobile/desktop, teclado/labels, status compreensível sem cor, refetch do card. [VERIFIED: ROADMAP/D-12] [ASSUMED]

### Sampling Rate

- **Por commit de cálculo:** `npm test -- src/features/monthly-plan/__tests__/monthly-plan.calculation.test.ts` [ASSUMED]
- **Por commit de integração:** `npm test -- src/features/monthly-plan` [ASSUMED]
- **Por wave merge:** `npm test && npm run lint` [VERIFIED: scripts]
- **Gate da fase:** `npm run test:coverage && npm run test:e2e -- e2e/monthly-plan.spec.ts && npm run build`; cobertura global precisa manter thresholds 60/50/60/60. [VERIFIED: config/ROADMAP]

### Wave 0 Gaps

- [ ] `src/features/monthly-plan/__tests__/monthly-plan.calculation.test.ts` — fórmulas, status, Decimal, tempo.
- [ ] `src/features/monthly-plan/__tests__/monthly-plan.service.test.ts` — fontes, double count, override, isolamento.
- [ ] `src/features/monthly-plan/__tests__/monthly-plan.schema.test.ts` — mês e valores de entrada.
- [ ] testes dos componentes de status/formulário/card — acessibilidade e estados.
- [ ] `e2e/monthly-plan.spec.ts` — criar/editar/trocar mês/dashboard/mobile.
- [ ] atualizar `src/__tests__/schema.test.ts` — equivalência de novos campos nos dois schemas.

[ASSUMED: arquivos novos; VERIFIED: lacunas não existem no filesystem]

## Security Domain

`security_enforcement` não foi desativado porque `.planning/config.json` não existe. [VERIFIED: filesystem]

### Applicable ASVS Categories

| Categoria ASVS | Aplica | Controle padrão |
|---|---:|---|
| V2 Authentication | sim | `auth()` em GET/PUT; 401 sem sessão. [VERIFIED: padrão de rotas] |
| V3 Session Management | sim | Auth.js/NextAuth existente; não criar sessão paralela. [VERIFIED: `src/lib/auth.ts`] |
| V4 Access Control | sim | derivar `userId` da sessão e filtrar toda consulta por usuário+mês; teste cross-tenant. [CITED: https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/] |
| V5 Input Validation | sim | Zod allowlist, mês canônico, Decimal não negativo/máximo, body limitado. [VERIFIED: padrão existente] |
| V6 Cryptography | não diretamente | nenhuma criptografia nova; reutilizar cookies/sessão do Auth.js. [VERIFIED: escopo] |
| V11 Business Logic | sim | invariantes anti-dupla-contagem, status e limites server-side. [VERIFIED: requisitos financeiros] |

### Known Threat Patterns for Next.js/Prisma Finance API

| Padrão | STRIDE | Mitigação |
|---|---|---|
| BOLA por mês/ID/userId | Information disclosure / Elevation | sessão como tenant; filtros compostos; nunca confiar em `userId` do cliente; teste A/B. [CITED: OWASP API1:2023] |
| Mass assignment (`userId`, status, derivados) | Tampering | schema Zod estrito e DTO de escrita com apenas 3 campos financeiros. [CITED: https://owasp.org/API-Security/editions/2023/en/0x11-t10/] |
| Valores negativos/NaN/enormes | Tampering / DoS | validação finita, não negativa, duas casas e teto coerente com Decimal(19,2). [VERIFIED: schema monetário] |
| Mês arbitrário provoca materialização extensa de recorrências | DoS | validar mês e limitar janela suportada; `computeRecurrenceDates` itera desde startDate até maxDate. [VERIFIED: recurrence/monthly-closing service] |
| Resposta expõe itens financeiros de outro tenant | Information disclosure | nenhuma query por `month` sem `userId`; teste isolamento em todos os agregados. [VERIFIED: padrão atual] |
| Corrida de criação do mês | Tampering/availability | constraint `@@unique([month,userId])` + upsert. [VERIFIED: Prisma schema/service] |
| Cache compartilhado de resposta autenticada | Information disclosure | Route Handler dinâmico; não aplicar cache público/`use cache` a dados tenant sem chave privada correta. [VERIFIED: auth request data; docs Next locais] [ASSUMED] |
| CSRF em PUT autenticado por cookie | Tampering | confirmar proteção SameSite/Origin do Auth.js e seguir política global da aplicação; não assumir que Route Handler customizado valida CSRF. [ASSUMED] |

## Sources

### Primary (HIGH confidence)

- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `01-CONTEXT.md` — requisitos, fórmulas e decisões bloqueadas. [VERIFIED: codebase]
- `prisma/schema.prisma`, `prisma/schema.sqlite.prisma` e migrações — modelos, Decimal, constraints e paridade. [VERIFIED: codebase]
- `dashboard.service.ts`, `monthly-closing.service.ts`, `fixed-costs.service.ts`, `card-invoices.service.ts`, `transactions.service.ts`, `recurrence.ts`, `money.ts` e testes — composição real e edge cases existentes. [VERIFIED: codebase]
- Context7 `/prisma/web` — Decimal e compound unique constraints. [VERIFIED: Context7]
- Context7 `/date-fns/date-fns` — `differenceInCalendarDays`, `endOfMonth` e contexto de timezone. [VERIFIED: Context7]
- [Prisma compound IDs/unique constraints](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-composite-ids-and-constraints) — upsert/unique. [CITED: prisma.io]
- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers) e docs instalados da 16.2.11 — API. [CITED: nextjs.org]
- [OWASP API1:2023 BOLA](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/) — autorização por objeto. [CITED: owasp.org]
- [OWASP ASVS 5.0.0](https://owasp.org/www-project-application-security-verification-standard/) — base de controles verificáveis para aplicações web. [CITED: owasp.org]

### Secondary (MEDIUM confidence)

- npm registry em 2026-08-09 — versões exatas de Next, Prisma, Zod, Vitest, Playwright e `@date-fns/tz`. [VERIFIED: npm registry]
- [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) — BOPLA/mass assignment e consumo de recursos. [CITED: owasp.org]

### Tertiary (LOW confidence)

- Nenhuma fonte comunitária não verificada foi usada. [VERIFIED: pesquisa desta sessão]

## Metadata

**Confidence breakdown:**

- Standard stack: ALTA — versões verificadas em package, CLI, registry e docs locais. [VERIFIED]
- Fontes financeiras/double count: ALTA — regras repetidas em dashboard, fechamento e testes. [VERIFIED]
- Persistência/arquitetura: ALTA — `MonthlyPlan` separado está bloqueado em D-14 e possui análogos de chave composta/Decimal. [VERIFIED]
- Datas: ALTA-MÉDIA — fuso, passado/futuro e janela estão bloqueados em D-13/D-15/D-17; bordas exigem testes. [VERIFIED]
- Segurança: ALTA para isolamento/BOLA; MÉDIA para CSRF até revisar configuração efetiva do Auth.js. [VERIFIED] [ASSUMED]

**Limitação conhecida:** dados manuais podem conter Transaction que semanticamente duplica compra/fatura; o schema não possui proveniência para detectar isso com segurança. Não inferir por descrição/data/valor; proveniência explícita fica fora do escopo. Fuso, janela e semântica temporal estão resolvidos em D-13/D-15/D-17. [VERIFIED: schema/context]

**Research date:** 2026-08-09  
**Valid until:** 2026-09-08 para arquitetura interna; rever versões antes da execução se dependências mudarem. [ASSUMED]

## RESEARCH COMPLETE

Planejamento pode avançar com fuso, janela e semântica de Transaction resolvidos. Ordem: testes/função pura → schema/migration dual → composição/API → página/dashboard → E2E → migration smoke/build fail-closed. Preservar origem contábil e recalcular derivados. [VERIFIED: D-13–D-17]
