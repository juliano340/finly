# Changelog

## 2026-08-10

### Adicionado

- **Plano do Mês**: configuração mensal por usuário com receita sugerida ou ajustada, meta de economia, margem de segurança, limite diário e estados de acompanhamento; página responsiva e resumo integrado ao dashboard.
- **Contrato contábil (D-16)**: o plano soma compromissos e somente `Transaction` de despesa avulsa. Pagamentos internos de fatura e lançamento fixo usam `BankAccountMovement`; itens importados já pertencem à fatura. Uma transação manual semanticamente duplicada continua avulsa porque não há deduplicação fuzzy; proveniência explícita fica fora deste escopo.
- **Janela mensal (D-17)**: consultas e alterações aceitam meses do início do ano anterior ao fim do próximo ano, com limites calculados em `America/Sao_Paulo`; meses externos são rejeitados antes da materialização de recorrências.
- **Validação PostgreSQL**: teste com banco efêmero aplica as migrations e verifica tabela, chave estrangeira, unicidade, ownership e separação entre DML do runtime e DDL do migrator.

### Corrigido

- **Rollout de produção**: build Vercel agora segue migration-before-deploy e falha fechado sem a credencial de migração ou quando migration/smoke estrutural falha, antes de compilar a aplicação.

## 2026-08-09

### Corrigido

- **Configuração local**: `.env.example` e README agora distinguem claramente SQLite local e PostgreSQL de produção.
- **Acessibilidade**: tabelas ordenáveis de contas bancárias e lançamentos fixos agora comunicam coluna e direção via `aria-sort` e rótulos acessíveis.
- **Autenticação**: tentativas inválidas agora têm limite persistente por conta e IP, resposta uniforme e bloqueio temporário sem armazenar identificadores em texto puro.
- **Dependências**: Next.js, Auth.js e Prisma atualizados para versões compatíveis com correções de segurança disponíveis.

### Adicionado

- **Qualidade**: cobertura automatizada com limites mínimos de 60% para linhas, funções e statements e 50% para branches.
- **Segurança no CI**: audit de dependências críticas, Semgrep SAST, detecção de segredos e atualizações semanais pelo Dependabot.
- **Documentação**: README operacional com produto, arquitetura, ambiente, scripts, testes, migrações e regras de segurança.

## 2026-08-05

### Corrigido

- **Lançamentos Fixos**: tabela agora atualiza ao salvar edição de um lançamento (antes era necessário F5 pra ver alterações de nome, categoria, etc.)
- **Transferência entre contas**: dropdown de seleção de conta agora aparece posicionado corretamente abaixo do select (antes aparecia desacoplado no canto inferior da tela)
- **Teste monthly-closing**: corrigido teste "sincroniza custos fixos inclusos no cartão" que falhava porque `startDate` não era definido, impedindo a geração de ocorrências para o mês de referência

### Adicionado

- **Cartões e Faturas**: cards de totalizador (Total do mês, Pago, A pagar) acima da tabela de faturas, seguindo o padrão da tela de Lançamentos Fixos
- **Cartões e Faturas**: linha de totais no rodapé da tabela com valor total e contagem de pagos/pendentes
- **Cartões e Faturas**: ordenação nas colunas da tabela (Cartão, Vencimento, Valor, Status) com clique no header para alternar asc/desc
