# Changelog

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
