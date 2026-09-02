export type ChangeType = "feat" | "fix" | "security" | "docs" | "chore" | "refactor"

export interface ReleaseChange {
  type: ChangeType
  description: string
}

export interface Release {
  version: string
  date: string
  changes: readonly ReleaseChange[]
}

export const CURRENT_VERSION = "0.2.9"

export const releases = [
  {
    version: "0.2.9",
    date: "2026-09-01",
    changes: [
      { type: "fix", description: "Cadastro volta a funcionar sem SMTP configurado fora de produção: o envio é ignorado com aviso em vez de apagar a conta criada." },
      { type: "chore", description: "Testes end-to-end seguem a tela de confirmação de e-mail e confirmam a conta antes de entrar." },
    ],
  },
  {
    version: "0.2.8",
    date: "2026-08-31",
    changes: [
      { type: "chore", description: "Testes de lançamentos fixos calculam o mês atual no fuso local, eliminando falha no fim do mês em fusos negativos." },
      { type: "chore", description: "Suíte de testes limpa usuários órfãos antes de rodar, evitando falhas após execuções interrompidas." },
    ],
  },
  {
    version: "0.2.7",
    date: "2026-08-31",
    changes: [
      { type: "feat", description: "Cadastro agora exige confirmação por link enviado ao e-mail, com token de uso único, expiração e reenvio limitado." },
      { type: "feat", description: "Configurações ganhou exclusão permanente de conta, protegida pela senha atual e com encerramento da sessão." },
      { type: "feat", description: "Tela de transações permite excluir vários lançamentos selecionados de uma vez." },
      { type: "fix", description: "Notificações de custos fixos priorizam o vencimento ajustado quando há uma ocorrência automática duplicada no mesmo mês." },
    ],
  },
  {
    version: "0.2.6",
    date: "2026-08-26",
    changes: [
      { type: "fix", description: "Lembrete de vencimento de custos fixos agora exibe a data editada da ocorrência (dueDate) em vez de recalcular a partir do dia padrão do série (dueDay), evitando datas desatualizadas no sino de notificações." },
      { type: "fix", description: "Janela de dias do lembrete corrigida — usava getters locais em datas UTC-midnight, deslocando a janela em 1 dia em fusos como UTC-3." },
    ],
  },
  {
    version: "0.2.5",
    date: "2026-08-25",
    changes: [
      { type: "feat", description: "Imagem de compartilhamento social (Open Graph) gerada como PNG 1200x630 e ligada ao metadata do site." },
      { type: "feat", description: "Script de geração de OG image e script de screenshots adicionados aos atalhos do package.json." },
    ],
  },
  {
    version: "0.2.4",
    date: "2026-08-25",
    changes: [
      { type: "docs", description: "6 ADRs documentando decisões de arquitetura: dual schema, auth por rota, JWT, precisão monetária, changelog-as-code, rate limiting." },
      { type: "docs", description: "ARCHITECTURE.md com visão geral de camadas, pirâmide de testes e convenções feature-based." },
      { type: "docs", description: "README premium com badges, lista de funcionalidades, diagrama Mermaid e referências aos ADRs." },
      { type: "feat", description: "Script Playwright para screenshots automatizadas (light/dark) em docs/screenshots/." },
    ],
  },
  {
    version: "0.2.3",
    date: "2026-08-24",
    changes: [
      { type: "fix", description: "Verificação de tipos do projeto totalmente limpa, com script dedicado e verificação obrigatória no pipeline de integração contínua." },
      { type: "security", description: "Cobertura de testes elevada para as bibliotecas de recorrência, categorização de importação de PDF e limitador de tentativas por IP." },
      { type: "chore", description: "Limites mínimos de cobertura subiram de 60% para até 75%, com portas de segurança no CI." },
      { type: "chore", description: "Avisos residuais de lint eliminados e hooks de seleção de tabelas com dependências corretas." },
    ],
  },
  {
    version: "0.2.2",
    date: "2026-08-24",
    changes: [
      { type: "refactor", description: "Botões de criação das telas de transações, categorias, orçamentos, cartões, contas e lançamentos fixos unificados em um único componente padronizado." },
    ],
  },
  {
    version: "0.2.1",
    date: "2026-08-23",
    changes: [
      { type: "security", description: "Auditoria completa das rotas de API confirma proteção por sessão em todos os endpoints privados." },
      { type: "security", description: "Cadastro e redefinição de senha com limite de tentativas por IP e resposta 429 ao exceder." },
      { type: "security", description: "Edição de categorias valida o corpo da requisição com schema, bloqueando alteração de campos protegidos." },
      { type: "security", description: "Cópia de faturas valida formato dos meses e limita a quantidade de faturas por requisição." },
      { type: "security", description: "Restauração de backup limita o tamanho de cada coleção de dados aceita." },
      { type: "security", description: "Listagem de transações limita a paginação a 100 itens por página." },
      { type: "chore", description: "Rota interna de debug removida da árvore de produção." },
      { type: "chore", description: "Limites de cadastro e redefinição de senha ativos apenas em produção, mantendo os testes automatizados estáveis." },
      { type: "chore", description: "Teste automatizado garante que todas as rotas de API retornam 401 sem sessão." },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-08-22",
    changes: [
      { type: "feat", description: "Plano do Mês com receita, meta de economia, margem de segurança, limite diário e acompanhamento mensal." },
      { type: "feat", description: "Planejamento de faturas e suporte a contas de benefício pré-pago." },
      { type: "feat", description: "Edição pontual do valor de ocorrências e atualização da configuração completa de séries de lançamentos fixos." },
      { type: "feat", description: "Detalhamento da composição das despesas no Fechamento Mensal." },
      { type: "feat", description: "Mês selecionado compartilhado e restaurado entre as principais telas financeiras." },
      { type: "feat", description: "Estado das abas de cartões e faturas preservado durante a navegação." },
      { type: "feat", description: "Barra de seleção compartilhada nas tabelas e seleção de lançamentos fixos preservada por mês e aba." },
      { type: "feat", description: "Skeletons de carregamento para tabelas e cards de resumo." },
      { type: "feat", description: "Página personalizada para rotas não encontradas." },
      { type: "feat", description: "Validação de uploads PDF e CSV com mensagens de erro mais claras." },
      { type: "fix", description: "Menu responsivo do dashboard estabilizado em mudanças de viewport e navegação mobile." },
      { type: "fix", description: "Usuários autenticados agora são redirecionados para fora da tela de login." },
      { type: "fix", description: "Cópia seletiva de faturas preserva faturas pertencentes aos demais cartões." },
      { type: "fix", description: "Navegação rápida entre meses não exibe dados antigos de lançamentos fixos ou dashboard." },
      { type: "fix", description: "Restauração de backup não recria ocorrências previamente excluídas." },
      { type: "fix", description: "Ajustes de saldo bancário bloqueiam atualizações concorrentes e exibem o estado de carregamento correto." },
      { type: "fix", description: "Navegação mensal e composição de despesas preservam o parâmetro de mês." },
      { type: "fix", description: "Testes de fechamento mensal reconhecem corretamente o texto das faturas." },
      { type: "security", description: "Janela mensal limitada do início do ano anterior ao fim do próximo ano no fuso America/Sao_Paulo." },
      { type: "security", description: "Build de produção executa migration e smoke de schema antes da compilação e falha fechado sem credencial privilegiada." },
      { type: "chore", description: "Teste PostgreSQL efêmero valida migrations, relacionamentos, unicidade, ownership e separação de privilégios." },
      { type: "refactor", description: "Componentes financeiros reorganizados e total de fatura isolado em componente reutilizável." },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-08-09",
    changes: [
      { type: "feat", description: "Fundação do Finly com Next.js, Tailwind CSS e componentes de interface." },
      { type: "feat", description: "Autenticação, isolamento por usuário e proteção da conta de demonstração contra escritas." },
      { type: "feat", description: "Dashboard financeiro com gráficos, resumo mensal e métricas detalhadas." },
      { type: "feat", description: "CRUD de categorias, transações, orçamentos, contas bancárias, cartões e lançamentos fixos." },
      { type: "feat", description: "Fechamento mensal responsivo com receitas, despesas, faturas e lançamentos recorrentes." },
      { type: "feat", description: "Importação de transações por CSV e importação de faturas por PDF com categorização." },
      { type: "feat", description: "Backup e restauração de dados com exportação e importação." },
      { type: "feat", description: "Pagamento e estorno de faturas e lançamentos fixos com movimentação bancária vinculada." },
      { type: "feat", description: "Transferências entre contas, limite de cheque especial e exclusão lógica." },
      { type: "feat", description: "Notificações de vencimento com dias restantes e status calculado." },
      { type: "feat", description: "Recuperação de senha por link seguro enviado por e-mail." },
      { type: "feat", description: "Totalizadores e ordenação na tela de cartões e faturas." },
      { type: "feat", description: "Landing page, onboarding e temas claro e escuro." },
      { type: "feat", description: "Migração do banco de desenvolvimento SQLite para PostgreSQL em produção." },
      { type: "fix", description: "Valores monetários armazenados com precisão decimal no PostgreSQL e SQLite." },
      { type: "fix", description: "Recorrências diárias e semanais identificadas por data, sem perdas ou duplicidades." },
      { type: "fix", description: "Pagamento de lançamentos fixos idempotente contra requisições concorrentes." },
      { type: "fix", description: "Estorno de lançamento fixo remove somente o movimento bancário vinculado." },
      { type: "fix", description: "Tabela de lançamentos fixos atualiza imediatamente após uma edição." },
      { type: "fix", description: "Seleção de conta em transferências permanece posicionada junto ao campo." },
      { type: "fix", description: "Navegação por âncoras da página inicial funciona após retornar de outra rota." },
      { type: "fix", description: "Datas de notificações respeitam o fuso local sem deslocamento de um dia." },
      { type: "fix", description: "Formulários de edição carregam corretamente os valores existentes." },
      { type: "fix", description: "Tabelas ordenáveis comunicam coluna e direção para tecnologias assistivas." },
      { type: "security", description: "Tentativas inválidas de login têm limite persistente por conta e IP, resposta uniforme e bloqueio temporário." },
      { type: "security", description: "Dependências principais atualizadas e CI protegido por auditoria, SAST, detecção de segredos e Dependabot." },
      { type: "docs", description: "Guias operacionais de ambiente, migrations, deploy, testes e segurança." },
      { type: "chore", description: "Cobertura automatizada com limites mínimos e pipeline de integração contínua." },
    ],
  },
] as const satisfies readonly Release[]
