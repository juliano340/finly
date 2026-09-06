# Changelog

Todas as mudanças relevantes do Finly são registradas neste arquivo.

## [0.2.21] - 2026-09-06

### Adicionado

- Contas criadas com Google podem definir uma senha depois, em Configurações > Conta, e passam a acessar também por e-mail e senha com recuperação de senha.

### Corrigido

- Nome e foto do menu do usuário passam a refletir o perfil salvo imediatamente após a edição, sem depender de novo login.
- Lembretes de vencimento aparecem em ordem do mais próximo ao mais distante, sem misturar faturas e custos fixos.
- Política de segurança passa a permitir a foto do perfil vinda do Google.

## [0.2.20] - 2026-09-06

### Adicionado

- Login com Google: entrar ou criar conta pelo Google em /login e /register, com vinculação automática de conta existente por e-mail verificado.
- Foto do perfil do Google aparece no menu do usuário e nas configurações, com iniciais como alternativa.
- Usuário autenticado não acessa mais /register: redireciona para o dashboard, como já ocorre em /login.

### Corrigido

- Contas criadas pelo Google não pedem senha para excluir a conta e não exibem o card de alterar senha.

### Manutenção

- EMAILS_DISABLED impede envio real de e-mails durante testes end-to-end com SMTP configurado.

## [0.2.19] - 2026-09-05

### Manutenção

- Changelog fixa a data da versão no momento do release, eliminando divergência de datas entre local e CI.

## [0.2.18] - 2026-09-05

### Corrigido

- Fechamento mensal não lista mais receitas fixas (ex.: salário) no card de custos fixos do mês.

## [0.2.17] - 2026-09-05

### Corrigido

- Custos fixos exibem a mensagem real da API ao falhar pagamento ou estorno, como saldo insuficiente, em vez de erro genérico.

## [0.2.16] - 2026-09-05

### Corrigido

- Pagamento de custo fixo sem saldo explica o motivo: a recusa por cheque especial agora informa saldo e limite disponível em vez de 'Erro ao pagar'.

## [0.2.15] - 2026-09-05

### Adicionado

- Configurações reorganizada: aba Conta em duas colunas com perfil e segurança lado a lado, troca de senha em diálogo com regras visíveis e excluir conta movida para a aba Conta.
- Edição do perfil agora é explícita: nome fica somente leitura até ativar Editar, e salvar só habilita quando houver mudança.

### Alterado

- Medidor de força de senha extraído para biblioteca compartilhada entre cadastro e troca de senha.

## [0.2.14] - 2026-09-05

### Adicionado

- Configurações ganhou troca de senha: confirma a senha atual, aplica a nova e encerra as demais sessões ativas.

### Manutenção

- Changelog passa a resolver automaticamente a data da versão em desenvolvimento, evitando datas atrasadas.

## [0.2.13] - 2026-09-05

### Corrigido

- Login com senha correta e conta não confirmada leva direto para a tela de confirmação de e-mail; o link de reenvio saiu da página de login.
- Tela de confirmação passa a mostrar o e-mail como texto e o botão de reenvio com contador regressivo, no mesmo padrão da recuperação de senha.

## [0.2.12] - 2026-09-04

### Corrigido

- Link de confirmação de e-mail passa a expirar em 1 hora em vez de 24 horas.

## [0.2.11] - 2026-09-04

### Corrigido

- Tela de confirmação de e-mail exibe o endereço somente leitura e avisa quando a conta já foi confirmada, oferecendo o acesso direto.
- Reenvio de link de confirmação informa o tempo restante de espera em minutos em vez de mensagem vaga.
- E-mails de confirmação e redefinição de senha passam a mostrar o prazo em horas (ex.: 24 horas) em vez de 1440 minutos.

## [0.2.10] - 2026-09-01

### Corrigido

- Cadastro volta a funcionar sem SMTP configurado fora da produção: o envio é ignorado com aviso em vez de apagar a conta criada.
- Previews da Vercel sem SMTP configurado deixam de bloquear o cadastro; somente o ambiente de produção exige credencial.

### Manutenção

- Testes end-to-end seguem a tela de confirmação de e-mail e confirmam a conta antes de entrar.

## [0.2.8] - 2026-08-31

### Manutenção

- Testes de lançamentos fixos calculam o mês atual no fuso local, eliminando falha no fim do mês em fusos negativos.
- Suíte de testes limpa usuários órfãos antes de rodar, evitando falhas após execuções interrompidas.

## [0.2.7] - 2026-08-31

### Adicionado

- Cadastro agora exige confirmação por link enviado ao e-mail, com token de uso único, expiração e reenvio limitado.
- Configurações ganhou exclusão permanente de conta, protegida pela senha atual e com encerramento da sessão.
- Tela de transações permite excluir vários lançamentos selecionados de uma vez.

### Corrigido

- Notificações de custos fixos priorizam o vencimento ajustado quando há uma ocorrência automática duplicada no mesmo mês.

## [0.2.6] - 2026-08-26

### Corrigido

- Lembrete de vencimento de custos fixos agora exibe a data editada da ocorrência (dueDate) em vez de recalcular a partir do dia padrão do série (dueDay), evitando datas desatualizadas no sino de notificações.
- Janela de dias do lembrete corrigida — usava getters locais em datas UTC-midnight, deslocando a janela em 1 dia em fusos como UTC-3.

## [0.2.5] - 2026-08-25

### Adicionado

- Imagem de compartilhamento social (Open Graph) gerada como PNG 1200x630 e ligada ao metadata do site.
- Script de geração de OG image e script de screenshots adicionados aos atalhos do package.json.

## [0.2.4] - 2026-08-25

### Adicionado

- Script Playwright para screenshots automatizadas (light/dark) em docs/screenshots/.

### Documentação

- 6 ADRs documentando decisões de arquitetura: dual schema, auth por rota, JWT, precisão monetária, changelog-as-code, rate limiting.
- ARCHITECTURE.md com visão geral de camadas, pirâmide de testes e convenções feature-based.
- README premium com badges, lista de funcionalidades, diagrama Mermaid e referências aos ADRs.

## [0.2.3] - 2026-08-24

### Corrigido

- Verificação de tipos do projeto totalmente limpa, com script dedicado e verificação obrigatória no pipeline de integração contínua.

### Segurança

- Cobertura de testes elevada para as bibliotecas de recorrência, categorização de importação de PDF e limitador de tentativas por IP.

### Manutenção

- Limites mínimos de cobertura subiram de 60% para até 75%, com portas de segurança no CI.
- Avisos residuais de lint eliminados e hooks de seleção de tabelas com dependências corretas.

## [0.2.2] - 2026-08-24

### Alterado

- Botões de criação das telas de transações, categorias, orçamentos, cartões, contas e lançamentos fixos unificados em um único componente padronizado.

## [0.2.1] - 2026-08-23

### Segurança

- Auditoria completa das rotas de API confirma proteção por sessão em todos os endpoints privados.
- Cadastro e redefinição de senha com limite de tentativas por IP e resposta 429 ao exceder.
- Edição de categorias valida o corpo da requisição com schema, bloqueando alteração de campos protegidos.
- Cópia de faturas valida formato dos meses e limita a quantidade de faturas por requisição.
- Restauração de backup limita o tamanho de cada coleção de dados aceita.
- Listagem de transações limita a paginação a 100 itens por página.

### Manutenção

- Rota interna de debug removida da árvore de produção.
- Limites de cadastro e redefinição de senha ativos apenas em produção, mantendo os testes automatizados estáveis.
- Teste automatizado garante que todas as rotas de API retornam 401 sem sessão.

## [0.2.0] - 2026-08-22

### Adicionado

- Plano do Mês com receita, meta de economia, margem de segurança, limite diário e acompanhamento mensal.
- Planejamento de faturas e suporte a contas de benefício pré-pago.
- Edição pontual do valor de ocorrências e atualização da configuração completa de séries de lançamentos fixos.
- Detalhamento da composição das despesas no Fechamento Mensal.
- Mês selecionado compartilhado e restaurado entre as principais telas financeiras.
- Estado das abas de cartões e faturas preservado durante a navegação.
- Barra de seleção compartilhada nas tabelas e seleção de lançamentos fixos preservada por mês e aba.
- Skeletons de carregamento para tabelas e cards de resumo.
- Página personalizada para rotas não encontradas.
- Validação de uploads PDF e CSV com mensagens de erro mais claras.

### Corrigido

- Menu responsivo do dashboard estabilizado em mudanças de viewport e navegação mobile.
- Usuários autenticados agora são redirecionados para fora da tela de login.
- Cópia seletiva de faturas preserva faturas pertencentes aos demais cartões.
- Navegação rápida entre meses não exibe dados antigos de lançamentos fixos ou dashboard.
- Restauração de backup não recria ocorrências previamente excluídas.
- Ajustes de saldo bancário bloqueiam atualizações concorrentes e exibem o estado de carregamento correto.
- Navegação mensal e composição de despesas preservam o parâmetro de mês.
- Testes de fechamento mensal reconhecem corretamente o texto das faturas.

### Segurança

- Janela mensal limitada do início do ano anterior ao fim do próximo ano no fuso America/Sao_Paulo.
- Build de produção executa migration e smoke de schema antes da compilação e falha fechado sem credencial privilegiada.

### Alterado

- Componentes financeiros reorganizados e total de fatura isolado em componente reutilizável.

### Manutenção

- Teste PostgreSQL efêmero valida migrations, relacionamentos, unicidade, ownership e separação de privilégios.

## [0.1.0] - 2026-08-09

### Adicionado

- Fundação do Finly com Next.js, Tailwind CSS e componentes de interface.
- Autenticação, isolamento por usuário e proteção da conta de demonstração contra escritas.
- Dashboard financeiro com gráficos, resumo mensal e métricas detalhadas.
- CRUD de categorias, transações, orçamentos, contas bancárias, cartões e lançamentos fixos.
- Fechamento mensal responsivo com receitas, despesas, faturas e lançamentos recorrentes.
- Importação de transações por CSV e importação de faturas por PDF com categorização.
- Backup e restauração de dados com exportação e importação.
- Pagamento e estorno de faturas e lançamentos fixos com movimentação bancária vinculada.
- Transferências entre contas, limite de cheque especial e exclusão lógica.
- Notificações de vencimento com dias restantes e status calculado.
- Recuperação de senha por link seguro enviado por e-mail.
- Totalizadores e ordenação na tela de cartões e faturas.
- Landing page, onboarding e temas claro e escuro.
- Migração do banco de desenvolvimento SQLite para PostgreSQL em produção.

### Corrigido

- Valores monetários armazenados com precisão decimal no PostgreSQL e SQLite.
- Recorrências diárias e semanais identificadas por data, sem perdas ou duplicidades.
- Pagamento de lançamentos fixos idempotente contra requisições concorrentes.
- Estorno de lançamento fixo remove somente o movimento bancário vinculado.
- Tabela de lançamentos fixos atualiza imediatamente após uma edição.
- Seleção de conta em transferências permanece posicionada junto ao campo.
- Navegação por âncoras da página inicial funciona após retornar de outra rota.
- Datas de notificações respeitam o fuso local sem deslocamento de um dia.
- Formulários de edição carregam corretamente os valores existentes.
- Tabelas ordenáveis comunicam coluna e direção para tecnologias assistivas.

### Segurança

- Tentativas inválidas de login têm limite persistente por conta e IP, resposta uniforme e bloqueio temporário.
- Dependências principais atualizadas e CI protegido por auditoria, SAST, detecção de segredos e Dependabot.

### Documentação

- Guias operacionais de ambiente, migrations, deploy, testes e segurança.

### Manutenção

- Cobertura automatizada com limites mínimos e pipeline de integração contínua.
