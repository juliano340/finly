---
status: resolved
trigger: "tem um problema serio nos custos fixos. Ao alterar o valor de um lanÃ§amento no mes 11/2026, altera todos os meses, saca? essa feature ta super mal pensada, precisamos revisar todinha"
created: 2026-08-17
updated: 2026-08-18T22:17:00-03:00
---

## Symptoms

- expected: Editar o valor exibido para um lanÃ§amento em novembro de 2026 nÃ£o deve alterar silenciosamente outros meses. Qualquer propagaÃ§Ã£o deve exigir escopo explÃ­cito e preservar histÃ³rico pago ou fechado.
- actual: Alterar o valor de um lanÃ§amento em 11/2026 altera o valor em todos os meses.
- errors: Nenhum erro tÃ©cnico visÃ­vel relatado; o problema Ã© de comportamento e integridade histÃ³rica.
- timeline: Percebido agora; nÃ£o informado se jÃ¡ funcionou de outra forma.
- reproduction: Abrir LanÃ§amentos Fixos, navegar para 11/2026, editar o valor de um lanÃ§amento e salvar; consultar os demais meses.

## Current Focus

- hypothesis: REGRESSÃƒO CONFIRMADA â€” o editor amount-only removeu a configuraÃ§Ã£o da sÃ©rie; datas ISO de calendÃ¡rio sÃ£o exibidas em horÃ¡rio local e podem recuar de 01/09 para 31/08 em America/Sao_Paulo.
- test: VerificaÃ§Ã£o automatizada concluÃ­da; aguardar validaÃ§Ã£o humana do editor de configuraÃ§Ã£o e das datas na tela real.
- expecting: PUT scoped permanece isolado; PATCH altera configuraÃ§Ãµes sem amount/defaultAmount; vencimento dia 1 permanece dia 1.
- next_action: Validar na UI editar valor mensal, editar configuraÃ§Ãµes da sÃ©rie separadamente e conferir vencimento dia 1.
- reasoning_checkpoint:
    hypothesis: "O commit de escopo substituiu integralmente o formulÃ¡rio da sÃ©rie pelo formulÃ¡rio amount-only e datas ISO de calendÃ¡rio ainda sÃ£o formatadas no timezone local."
    confirming_evidence:
      - "Diff de 4973978 remove 162 linhas do formulÃ¡rio de nome, categoria, fonte, recorrÃªncia e ativo, deixando apenas escopo+amount."
      - "A rota PUT agora aceita estritamente o contrato de ocorrÃªncia; nÃ£o existe outro mÃ©todo/rota usado pela UI para updateFixedCost."
      - "Tabela e card mobile chamam new Date(occ.dueDate).toLocaleDateString('pt-BR') sem timeZone UTC."
    falsification_test: "A hipÃ³tese seria falsa se houvesse outra aÃ§Ã£o acessÃ­vel que salvasse configuraÃ§Ãµes da sÃ©rie, ou se 2026-09-01T00:00:00Z fosse sempre renderizado como 01/09 independentemente do timezone."
    fix_rationale: "PATCH autenticado e validado, sem defaultAmount, separa configuraÃ§Ã£o global do PUT por ocorrÃªncia; helper UTC preserva semÃ¢ntica de data de calendÃ¡rio."
    blind_spots: "ConfiguraÃ§Ãµes continuam globais por design e mudanÃ§as de regra nÃ£o reconciliam ocorrÃªncias jÃ¡ materializadas; isso deve ser comunicado no editor, nÃ£o misturado ao escopo de amount."
- tdd_checkpoint:

## Evidence

- timestamp: 2026-08-17T00:05:00-03:00
  checked: InventÃ¡rio inicial do repositÃ³rio e skills locais
  found: NÃ£o hÃ¡ .agents/skills nem .claude/skills no projeto; feature estÃ¡ concentrada em src/features/fixed-costs, src/app/api/fixed-costs*, pÃ¡gina fixed-costs, Prisma, backup e monthly-closing.
  implication: NÃ£o hÃ¡ regras locais adicionais; investigaÃ§Ã£o deve cobrir integraÃ§Ãµes listadas e documentaÃ§Ã£o Next.js empacotada antes de recomendaÃ§Ãµes de UI/rota.

- timestamp: 2026-08-17T00:20:00-03:00
  checked: UI, PUT /api/fixed-costs/:id e updateFixedCost
  found: A linha mensal contÃ©m occurrence, mas o formulÃ¡rio usa occurrence.fixedCost e envia todos os campos ao endpoint da definiÃ§Ã£o, sem occurrenceId, mÃªs ou scope. Alterar defaultAmount atualiza FixedCost.defaultAmount e updateMany de todas as ocorrÃªncias PENDING, mÃªs >= mÃªs corrente do servidor e FinancialMonth OPEN.
  implication: Em 2026-08-17, editar a partir de novembro/2026 altera a definiÃ§Ã£o inteira e amounts de ocorrÃªncias abertas/pendentes desde 2026-08, nÃ£o somente novembro nem somente meses futuros a partir de novembro.

- timestamp: 2026-08-17T00:20:00-03:00
  checked: Modelo Prisma e consultas de listagem/fechamento
  found: Occurrence armazena amount/status/datas, mas nome, tipo, categoria, mÃ©todo, cartÃ£o, conta e regra de recorrÃªncia existem apenas em FixedCost e sÃ£o lidos por join vivo.
  implication: Editar metadados da definiÃ§Ã£o reescreve semanticamente todas as ocorrÃªncias histÃ³ricas, inclusive PAID e meses CLOSED, mesmo quando amount nÃ£o Ã© atualizado.

- timestamp: 2026-08-17T00:20:00-03:00
  checked: GeraÃ§Ã£o de ocorrÃªncias
  found: ensureFixedCostOccurrences usa definiÃ§Ã£o atual para criar faltantes com defaultAmount, considera soft-deleted como existente, e nÃ£o reconcilia/remover ocorrÃªncias antigas quando startDate/frequency/end/dueDay mudam.
  implication: MudanÃ§as de calendÃ¡rio podem deixar ocorrÃªncias antigas e criar novas datas no mesmo mÃªs; soft-delete persiste contra regeneraÃ§Ã£o, mas nÃ£o hÃ¡ versionamento da sÃ©rie.

- timestamp: 2026-08-17T00:30:00-03:00
  checked: Rotas de pagar/estornar, pagamento de fatura e status de mÃªs
  found: Pagamentos e estornos selecionam ocorrÃªncia por fixedCostId+mÃªs (primeira pendente/Ãºltima paga) e nÃ£o verificam FinancialMonth.CLOSED. SincronizaÃ§Ã£o de fatura seleciona ocorrÃªncias pelo cardId/paidInsideCard atuais da definiÃ§Ã£o. NÃ£o hÃ¡ operaÃ§Ã£o de fechamento de FinancialMonth; CLOSED aparece em schema, teste e backup.
  implication: OcorrÃªncias fechadas podem ser pagas, estornadas ou reclassificadas; trocar cartÃ£o/fonte altera retroativamente quais ocorrÃªncias uma fatura paga/estorna, especialmente com recorrÃªncias mÃºltiplas no mesmo mÃªs.

- timestamp: 2026-08-17T00:30:00-03:00
  checked: ExclusÃ£o de ocorrÃªncia, exclusÃ£o de sÃ©rie e reset
  found: Batch delete faz soft-delete de qualquer ocorrÃªncia do usuÃ¡rio sem bloquear PAID/CLOSED; DELETE da definiÃ§Ã£o e reset removem fisicamente a sÃ©rie e todas as ocorrÃªncias por cascade, tambÃ©m sem guardas. Movimentos bancÃ¡rios sÃ£o preservados e podem ficar Ã³rfÃ£os; invoice items perdem o vÃ­nculo por SetNull.
  implication: HistÃ³rico financeiro pode desaparecer enquanto lanÃ§amentos derivados permanecem, quebrando rastreabilidade. Soft-delete nÃ£o Ã© incluÃ­do no backup e pode reaparecer apÃ³s restore+ensure.

- timestamp: 2026-08-17T00:35:00-03:00
  checked: Backup/restore de FixedCostOccurrence
  found: Exporta somente id/fixedCostId/financialMonthId/month/dueDate/amount/status/paidAt; omite scheduledDate, paidViaCard, bankAccountMovementId e deletedAt. Merge considera apenas fixedCostId+mÃªs e colapsa recorrÃªncias mÃºltiplas; replace restaura scheduledDate null.
  implication: Round-trip nÃ£o preserva identidade, exclusÃµes, origem de pagamento nem vÃ­nculos; recorrÃªncias diÃ¡rias/semanais e estornos podem mudar de comportamento apÃ³s restore.

- timestamp: 2026-08-17T00:35:00-03:00
  checked: Cobertura de testes
  found: Teste de serviÃ§o codifica propagaÃ§Ã£o a partir do mÃªs corrente do relÃ³gio, nÃ£o do mÃªs selecionado. Testes de pÃ¡gina cobrem loading/race; E2E manual valida CRUD de definiÃ§Ã£o e hard delete. NÃ£o hÃ¡ testes de scopes, campos histÃ³ricos, CLOSED, paid/card-linked, schedule reconciliation ou round-trip completo.
  implication: Comportamento defeituoso estÃ¡ parcialmente legitimado como requisito e regressÃµes de integridade nÃ£o sÃ£o detectadas.

- timestamp: 2026-08-17T00:40:00-03:00
  checked: DocumentaÃ§Ã£o Next.js 16.2.11 empacotada (Route Handlers, mutations/forms, dynamic routes)
  found: Route Handlers suportam PATCH/DELETE e params dinÃ¢micos sÃ£o Promise; mutaÃ§Ãµes precisam autenticaÃ§Ã£o/autorizaÃ§Ã£o no servidor. Rotas atuais jÃ¡ usam auth e await params, mas nÃ£o possuem contrato de scope/validaÃ§Ã£o de transiÃ§Ã£o.
  implication: CorreÃ§Ã£o pode manter Route Handlers+fetch; deve adicionar payload validado, autorizaÃ§Ã£o por occurrence/series e resposta transacional de registros afetados, sem depender de estado otimista inventado no cliente.

- timestamp: 2026-08-18T22:08:00-03:00
  checked: ImplementaÃ§Ã£o amount-only, revisÃ£o efetiva e geraÃ§Ã£o fora de ordem
  found: PUT exige occurrenceId/month/scope/expectedUpdatedAt; transaÃ§Ã£o protege PAID/CLOSED/deleted. FixedCostAmountRevision registra amount por effectiveAt e ensureFixedCostOccurrences resolve a Ãºltima revisÃ£o anterior Ã  scheduledDate.
  implication: THIS_MONTH altera somente a ocorrÃªncia exata; THIS_AND_FUTURE preserva baseline anterior mesmo se mÃªs antigo for materializado depois; ENTIRE_SERIES pode redefinir baseline e limpar revisÃµes.

- timestamp: 2026-08-18T22:09:00-03:00
  checked: VerificaÃ§Ã£o focada inicial
  found: Teste de pÃ¡gina 3/3 e serviÃ§o 7/7 passaram; ESLint focado limpo; schemas PostgreSQL e SQLite vÃ¡lidos. tsc global falhou em erros preexistentes fora do escopo.
  implication: Fluxo e persistÃªncia nova estÃ£o verdes em testes focados; resta reexecutar apÃ³s assertions finais de reconciliaÃ§Ã£o integral.

- timestamp: 2026-08-18T22:10:00-03:00
  checked: VerificaÃ§Ã£o focada final
  found: ESLint focado e git diff --check passaram; 2 arquivos de teste, 10 testes, todos verdes. RegressÃ£o comprova outubro tardio=baseline 100, dezembro=revisionado 200 e ENTIRE_SERIES=300 para existentes e nova materializaÃ§Ã£o.
  implication: Fix estÃ¡ autocontido e verificado localmente; confirmaÃ§Ã£o humana depende de migration aplicada em ambiente autorizado e uso real da UI.

- timestamp: 2026-08-18T22:16:00-03:00
  checked: Achados obrigatÃ³rios da revisÃ£o de diff
  found: THIS_MONTH protegido lanÃ§a erro de domÃ­nio antes de writes e rota retorna 409 com reason; transaÃ§Ã£o usa isolamento Serializable e traduz P2034 para stale. Editor legado oculto foi removido; escopo aparece antes do valor e botÃ£o/payload mudam nos trÃªs escopos.
  implication: NÃ£o hÃ¡ sucesso enganoso em ocorrÃªncia exata protegida, stale-write safety Ã© atÃ´mica no nÃ­vel transacional e UI amount-only representa fielmente o contrato.

- timestamp: 2026-08-18T22:17:00-03:00
  checked: VerificaÃ§Ã£o final apÃ³s revisÃ£o
  found: ESLint focado passou; 3 arquivos Vitest, 17 testes, todos verdes; schemas Prisma PostgreSQL/SQLite vÃ¡lidos; git diff --check passou.
  implication: Todos os sete achados de revisÃ£o possuem implementaÃ§Ã£o e regressÃ£o automatizada; nenhuma migration foi aplicada nesta continuaÃ§Ã£o.

- timestamp: 2026-08-19T10:10:00-03:00
  checked: RegressÃµes RED para configuraÃ§Ã£o separada e data UTC
  found: 4 testes falharam como previsto: PATCH nÃ£o exportado, botÃ£o de configuraÃ§Ã£o ausente e 01/09/2026 nÃ£o renderizado para ISO meia-noite UTC.
  implication: Testes reproduzem diretamente as duas regressÃµes antes da correÃ§Ã£o e preservam PUT scoped como contrato independente.

- timestamp: 2026-08-19T10:12:00-03:00
  checked: RegressÃµes GREEN apÃ³s PATCH separado, editor explÃ­cito e helper UTC
  found: 2 arquivos Vitest, 10 testes, todos verdes; inclui trÃªs escopos PUT, PATCH sem amount e data 01/09/2026.
  implication: CorreÃ§Ã£o aborda diretamente as duas regressÃµes sem reabrir update global de valor.

- timestamp: 2026-08-19T10:16:00-03:00
  checked: Armazenamento de vencimento gerado no dia 1
  found: GeraÃ§Ã£o usa meia-noite local de SÃ£o Paulo, persistida como 03:00Z; o dia ISO continua 01. O risco 31/08 ocorre ao formatar localmente um valor de calendÃ¡rio recebido como 00:00Z.
  implication: PersistÃªncia gerada nÃ£o recua o dia; helper de exibiÃ§Ã£o UTC normaliza ambos os formatos e teste de geraÃ§Ã£o deve validar identidade do dia, nÃ£o hora absoluta.

## Eliminated

- hypothesis: O update de novembro altera fisicamente amounts de ocorrÃªncias PAID ou em FinancialMonth CLOSED.
  evidence: updateMany filtra status=PENDING e financialMonth.status=OPEN; esses amounts sÃ£o preservados. Metadados continuam mudando retroativamente por join vivo.
  timestamp: 2026-08-17T00:20:00-03:00

- hypothesis: O limite de propagaÃ§Ã£o Ã© o mÃªs selecionado na UI.
  evidence: Payload nÃ£o envia mÃªs e serviÃ§o calcula currentMonth com new Date() no servidor; em 2026-08-17 o limite Ã© 2026-08 mesmo quando ediÃ§Ã£o parte de 2026-11.
  timestamp: 2026-08-17T00:20:00-03:00

## Resolution

- root_cause: A UI apresenta uma ocorrÃªncia mensal mas edita a Ãºnica definiÃ§Ã£o FixedCost. API nÃ£o recebe occurrenceId, mÃªs nem scope. ServiÃ§o atualiza a definiÃ§Ã£o global e propaga amount por um updateMany baseado no mÃªs corrente do servidor, enquanto schema nÃ£o guarda snapshots de nome/tipo/categoria/fonte/regra na ocorrÃªncia. Assim nÃ£o existe fronteira representÃ¡vel entre esta ocorrÃªncia, futuro e sÃ©rie inteira; guardas protegem apenas amount PAID/CLOSED e integraÃ§Ãµes continuam usando metadados atuais.
- fix: EdiÃ§Ã£o mensal limitada a amount com escopo explÃ­cito; PATCH separado e estrito restaura configuraÃ§Ãµes da sÃ©rie sem aceitar amount/defaultAmount; editor distingue os dois fluxos com aviso de alcance global; datas de calendÃ¡rio sÃ£o exibidas em UTC.
- verification: Vitest focado 21/21 verde em serviÃ§o, rota e componente; teste adicional de geraÃ§Ã£o dia 1 verde; ESLint focado e git diff --check verdes. tsc global segue bloqueado por erros preexistentes; o Ãºnico erro novo de fixture foi corrigido. Nenhuma migration aplicada e nenhum commit criado.
- files_changed: [src/features/fixed-costs/fixed-costs.schema.ts, src/app/api/fixed-costs/[id]/route.ts, src/app/api/fixed-costs/[id]/route.test.ts, src/app/(dashboard)/fixed-costs/page.tsx, src/app/(dashboard)/fixed-costs/__tests__/page.test.tsx, src/features/fixed-costs/__tests__/fixed-costs.service.test.ts]
