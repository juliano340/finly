---
status: awaiting_human_verify
trigger: "tem um problema serio nos custos fixos. Ao alterar o valor de um lançamento no mes 11/2026, altera todos os meses, saca? essa feature ta super mal pensada, precisamos revisar todinha"
created: 2026-08-17
updated: 2026-08-18T22:17:00-03:00
---

## Symptoms

- expected: Editar o valor exibido para um lançamento em novembro de 2026 não deve alterar silenciosamente outros meses. Qualquer propagação deve exigir escopo explícito e preservar histórico pago ou fechado.
- actual: Alterar o valor de um lançamento em 11/2026 altera o valor em todos os meses.
- errors: Nenhum erro técnico visível relatado; o problema é de comportamento e integridade histórica.
- timeline: Percebido agora; não informado se já funcionou de outra forma.
- reproduction: Abrir Lançamentos Fixos, navegar para 11/2026, editar o valor de um lançamento e salvar; consultar os demais meses.

## Current Focus

- hypothesis: REGRESSÃO CONFIRMADA — o editor amount-only removeu a configuração da série; datas ISO de calendário são exibidas em horário local e podem recuar de 01/09 para 31/08 em America/Sao_Paulo.
- test: Verificação automatizada concluída; aguardar validação humana do editor de configuração e das datas na tela real.
- expecting: PUT scoped permanece isolado; PATCH altera configurações sem amount/defaultAmount; vencimento dia 1 permanece dia 1.
- next_action: Validar na UI editar valor mensal, editar configurações da série separadamente e conferir vencimento dia 1.
- reasoning_checkpoint:
    hypothesis: "O commit de escopo substituiu integralmente o formulário da série pelo formulário amount-only e datas ISO de calendário ainda são formatadas no timezone local."
    confirming_evidence:
      - "Diff de 4973978 remove 162 linhas do formulário de nome, categoria, fonte, recorrência e ativo, deixando apenas escopo+amount."
      - "A rota PUT agora aceita estritamente o contrato de ocorrência; não existe outro método/rota usado pela UI para updateFixedCost."
      - "Tabela e card mobile chamam new Date(occ.dueDate).toLocaleDateString('pt-BR') sem timeZone UTC."
    falsification_test: "A hipótese seria falsa se houvesse outra ação acessível que salvasse configurações da série, ou se 2026-09-01T00:00:00Z fosse sempre renderizado como 01/09 independentemente do timezone."
    fix_rationale: "PATCH autenticado e validado, sem defaultAmount, separa configuração global do PUT por ocorrência; helper UTC preserva semântica de data de calendário."
    blind_spots: "Configurações continuam globais por design e mudanças de regra não reconciliam ocorrências já materializadas; isso deve ser comunicado no editor, não misturado ao escopo de amount."
- tdd_checkpoint:

## Evidence

- timestamp: 2026-08-17T00:05:00-03:00
  checked: Inventário inicial do repositório e skills locais
  found: Não há .agents/skills nem .claude/skills no projeto; feature está concentrada em src/features/fixed-costs, src/app/api/fixed-costs*, página fixed-costs, Prisma, backup e monthly-closing.
  implication: Não há regras locais adicionais; investigação deve cobrir integrações listadas e documentação Next.js empacotada antes de recomendações de UI/rota.

- timestamp: 2026-08-17T00:20:00-03:00
  checked: UI, PUT /api/fixed-costs/:id e updateFixedCost
  found: A linha mensal contém occurrence, mas o formulário usa occurrence.fixedCost e envia todos os campos ao endpoint da definição, sem occurrenceId, mês ou scope. Alterar defaultAmount atualiza FixedCost.defaultAmount e updateMany de todas as ocorrências PENDING, mês >= mês corrente do servidor e FinancialMonth OPEN.
  implication: Em 2026-08-17, editar a partir de novembro/2026 altera a definição inteira e amounts de ocorrências abertas/pendentes desde 2026-08, não somente novembro nem somente meses futuros a partir de novembro.

- timestamp: 2026-08-17T00:20:00-03:00
  checked: Modelo Prisma e consultas de listagem/fechamento
  found: Occurrence armazena amount/status/datas, mas nome, tipo, categoria, método, cartão, conta e regra de recorrência existem apenas em FixedCost e são lidos por join vivo.
  implication: Editar metadados da definição reescreve semanticamente todas as ocorrências históricas, inclusive PAID e meses CLOSED, mesmo quando amount não é atualizado.

- timestamp: 2026-08-17T00:20:00-03:00
  checked: Geração de ocorrências
  found: ensureFixedCostOccurrences usa definição atual para criar faltantes com defaultAmount, considera soft-deleted como existente, e não reconcilia/remover ocorrências antigas quando startDate/frequency/end/dueDay mudam.
  implication: Mudanças de calendário podem deixar ocorrências antigas e criar novas datas no mesmo mês; soft-delete persiste contra regeneração, mas não há versionamento da série.

- timestamp: 2026-08-17T00:30:00-03:00
  checked: Rotas de pagar/estornar, pagamento de fatura e status de mês
  found: Pagamentos e estornos selecionam ocorrência por fixedCostId+mês (primeira pendente/última paga) e não verificam FinancialMonth.CLOSED. Sincronização de fatura seleciona ocorrências pelo cardId/paidInsideCard atuais da definição. Não há operação de fechamento de FinancialMonth; CLOSED aparece em schema, teste e backup.
  implication: Ocorrências fechadas podem ser pagas, estornadas ou reclassificadas; trocar cartão/fonte altera retroativamente quais ocorrências uma fatura paga/estorna, especialmente com recorrências múltiplas no mesmo mês.

- timestamp: 2026-08-17T00:30:00-03:00
  checked: Exclusão de ocorrência, exclusão de série e reset
  found: Batch delete faz soft-delete de qualquer ocorrência do usuário sem bloquear PAID/CLOSED; DELETE da definição e reset removem fisicamente a série e todas as ocorrências por cascade, também sem guardas. Movimentos bancários são preservados e podem ficar órfãos; invoice items perdem o vínculo por SetNull.
  implication: Histórico financeiro pode desaparecer enquanto lançamentos derivados permanecem, quebrando rastreabilidade. Soft-delete não é incluído no backup e pode reaparecer após restore+ensure.

- timestamp: 2026-08-17T00:35:00-03:00
  checked: Backup/restore de FixedCostOccurrence
  found: Exporta somente id/fixedCostId/financialMonthId/month/dueDate/amount/status/paidAt; omite scheduledDate, paidViaCard, bankAccountMovementId e deletedAt. Merge considera apenas fixedCostId+mês e colapsa recorrências múltiplas; replace restaura scheduledDate null.
  implication: Round-trip não preserva identidade, exclusões, origem de pagamento nem vínculos; recorrências diárias/semanais e estornos podem mudar de comportamento após restore.

- timestamp: 2026-08-17T00:35:00-03:00
  checked: Cobertura de testes
  found: Teste de serviço codifica propagação a partir do mês corrente do relógio, não do mês selecionado. Testes de página cobrem loading/race; E2E manual valida CRUD de definição e hard delete. Não há testes de scopes, campos históricos, CLOSED, paid/card-linked, schedule reconciliation ou round-trip completo.
  implication: Comportamento defeituoso está parcialmente legitimado como requisito e regressões de integridade não são detectadas.

- timestamp: 2026-08-17T00:40:00-03:00
  checked: Documentação Next.js 16.2.11 empacotada (Route Handlers, mutations/forms, dynamic routes)
  found: Route Handlers suportam PATCH/DELETE e params dinâmicos são Promise; mutações precisam autenticação/autorização no servidor. Rotas atuais já usam auth e await params, mas não possuem contrato de scope/validação de transição.
  implication: Correção pode manter Route Handlers+fetch; deve adicionar payload validado, autorização por occurrence/series e resposta transacional de registros afetados, sem depender de estado otimista inventado no cliente.

- timestamp: 2026-08-18T22:08:00-03:00
  checked: Implementação amount-only, revisão efetiva e geração fora de ordem
  found: PUT exige occurrenceId/month/scope/expectedUpdatedAt; transação protege PAID/CLOSED/deleted. FixedCostAmountRevision registra amount por effectiveAt e ensureFixedCostOccurrences resolve a última revisão anterior à scheduledDate.
  implication: THIS_MONTH altera somente a ocorrência exata; THIS_AND_FUTURE preserva baseline anterior mesmo se mês antigo for materializado depois; ENTIRE_SERIES pode redefinir baseline e limpar revisões.

- timestamp: 2026-08-18T22:09:00-03:00
  checked: Verificação focada inicial
  found: Teste de página 3/3 e serviço 7/7 passaram; ESLint focado limpo; schemas PostgreSQL e SQLite válidos. tsc global falhou em erros preexistentes fora do escopo.
  implication: Fluxo e persistência nova estão verdes em testes focados; resta reexecutar após assertions finais de reconciliação integral.

- timestamp: 2026-08-18T22:10:00-03:00
  checked: Verificação focada final
  found: ESLint focado e git diff --check passaram; 2 arquivos de teste, 10 testes, todos verdes. Regressão comprova outubro tardio=baseline 100, dezembro=revisionado 200 e ENTIRE_SERIES=300 para existentes e nova materialização.
  implication: Fix está autocontido e verificado localmente; confirmação humana depende de migration aplicada em ambiente autorizado e uso real da UI.

- timestamp: 2026-08-18T22:16:00-03:00
  checked: Achados obrigatórios da revisão de diff
  found: THIS_MONTH protegido lança erro de domínio antes de writes e rota retorna 409 com reason; transação usa isolamento Serializable e traduz P2034 para stale. Editor legado oculto foi removido; escopo aparece antes do valor e botão/payload mudam nos três escopos.
  implication: Não há sucesso enganoso em ocorrência exata protegida, stale-write safety é atômica no nível transacional e UI amount-only representa fielmente o contrato.

- timestamp: 2026-08-18T22:17:00-03:00
  checked: Verificação final após revisão
  found: ESLint focado passou; 3 arquivos Vitest, 17 testes, todos verdes; schemas Prisma PostgreSQL/SQLite válidos; git diff --check passou.
  implication: Todos os sete achados de revisão possuem implementação e regressão automatizada; nenhuma migration foi aplicada nesta continuação.

- timestamp: 2026-08-19T10:10:00-03:00
  checked: Regressões RED para configuração separada e data UTC
  found: 4 testes falharam como previsto: PATCH não exportado, botão de configuração ausente e 01/09/2026 não renderizado para ISO meia-noite UTC.
  implication: Testes reproduzem diretamente as duas regressões antes da correção e preservam PUT scoped como contrato independente.

- timestamp: 2026-08-19T10:12:00-03:00
  checked: Regressões GREEN após PATCH separado, editor explícito e helper UTC
  found: 2 arquivos Vitest, 10 testes, todos verdes; inclui três escopos PUT, PATCH sem amount e data 01/09/2026.
  implication: Correção aborda diretamente as duas regressões sem reabrir update global de valor.

- timestamp: 2026-08-19T10:16:00-03:00
  checked: Armazenamento de vencimento gerado no dia 1
  found: Geração usa meia-noite local de São Paulo, persistida como 03:00Z; o dia ISO continua 01. O risco 31/08 ocorre ao formatar localmente um valor de calendário recebido como 00:00Z.
  implication: Persistência gerada não recua o dia; helper de exibição UTC normaliza ambos os formatos e teste de geração deve validar identidade do dia, não hora absoluta.

## Eliminated

- hypothesis: O update de novembro altera fisicamente amounts de ocorrências PAID ou em FinancialMonth CLOSED.
  evidence: updateMany filtra status=PENDING e financialMonth.status=OPEN; esses amounts são preservados. Metadados continuam mudando retroativamente por join vivo.
  timestamp: 2026-08-17T00:20:00-03:00

- hypothesis: O limite de propagação é o mês selecionado na UI.
  evidence: Payload não envia mês e serviço calcula currentMonth com new Date() no servidor; em 2026-08-17 o limite é 2026-08 mesmo quando edição parte de 2026-11.
  timestamp: 2026-08-17T00:20:00-03:00

## Resolution

- root_cause: A UI apresenta uma ocorrência mensal mas edita a única definição FixedCost. API não recebe occurrenceId, mês nem scope. Serviço atualiza a definição global e propaga amount por um updateMany baseado no mês corrente do servidor, enquanto schema não guarda snapshots de nome/tipo/categoria/fonte/regra na ocorrência. Assim não existe fronteira representável entre esta ocorrência, futuro e série inteira; guardas protegem apenas amount PAID/CLOSED e integrações continuam usando metadados atuais.
- fix: Edição mensal limitada a amount com escopo explícito; PATCH separado e estrito restaura configurações da série sem aceitar amount/defaultAmount; editor distingue os dois fluxos com aviso de alcance global; datas de calendário são exibidas em UTC.
- verification: Vitest focado 21/21 verde em serviço, rota e componente; teste adicional de geração dia 1 verde; ESLint focado e git diff --check verdes. tsc global segue bloqueado por erros preexistentes; o único erro novo de fixture foi corrigido. Nenhuma migration aplicada e nenhum commit criado.
- files_changed: [src/features/fixed-costs/fixed-costs.schema.ts, src/app/api/fixed-costs/[id]/route.ts, src/app/api/fixed-costs/[id]/route.test.ts, src/app/(dashboard)/fixed-costs/page.tsx, src/app/(dashboard)/fixed-costs/__tests__/page.test.tsx, src/features/fixed-costs/__tests__/fixed-costs.service.test.ts]
