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

export const CURRENT_VERSION = "0.2.0"

export const releases = [
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
