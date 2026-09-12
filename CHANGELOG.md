# Changelog

Todas as mudanças relevantes do Finly são registradas neste arquivo.

## [0.2.33] - 2026-09-12

### Adicionado

- Ao criar uma fatura, o vencimento já vem preenchido com o dia de vencimento cadastrado no cartão (ajustado para o último dia em meses curtos); trocar o cartão atualiza a data e o campo continua editável.

### Corrigido

- Abrir um seletor dentro de um painel lateral não encolhe mais a largura do painel durante a escolha.

### Alterado

- O cálculo do dia de vencimento em meses curtos passou a usar uma única regra em todo o sistema, evitando diferenças entre telas.

## [0.2.32] - 2026-09-12

### Adicionado

- Cada ocorrência de lançamento fixo pode ter forma de pagamento, cartão e conta próprios, sem alterar a série — pagar uma parcela com outro cartão ou conta não muda os demais meses.
- Ocorrências que fogem do padrão da série ganham a marcação "personalizado" na lista de lançamentos fixos.

## [0.2.31] - 2026-09-12

### Manutenção

- Testes end-to-end de orçamentos, categorias, fechamento mensal e transações voltaram a passar após a refatoração dos formulários: agora usam locators acessíveis em vez de seletores legados.

## [0.2.30] - 2026-09-12

### Manutenção

- Helper de banco dos testes end-to-end passa a usar o banco de desenvolvimento (dev.db) do servidor local por padrão, sem exigir variável de ambiente extra.

## [0.2.29] - 2026-09-12

### Corrigido

- O botão de entrar com o Google no login e no cadastro agora mostra "Redirecionando..." com indicador de carregamento e fica desabilitado durante a conexão, evitando cliques repetidos.
- Se a conexão com o Google falhar antes do redirecionamento, o botão volta ao normal e um aviso explica a falha.

## [0.2.28] - 2026-09-12

### Adicionado

- Lançamentos fixos ganharam um formulário novo, organizado em Lançamento, Pagamento e Recorrência, com valor em R$ e um resumo da recorrência (valor, dia, frequência e término) antes de salvar.
- A opção "Dentro do cartão" virou "Cartão de crédito" na Forma de pagamento: escolhendo cartão, o seletor de cartão aparece e a conta prevista some; nas demais formas, vale a conta prevista.
- Recorrências mensais (mensal, bimestral, trimestral, semestral e anual) agora usam Mês de início; diária, semanal e quinzenal continuam com data completa.

### Corrigido

- O vencimento nunca cai antes do início: se o dia escolhido já passou no mês de início, a primeira ocorrência vai para o mês seguinte.
- Criar lançamento fixo por mês grava o dia 1 e não adia mais a primeira ocorrência sem motivo.
- Correção no banco de dados que causava erro ao abrir a tela de faturas após a atualização do estorno de transações.
- O valor inicial do formulário de edição da ocorrência aparece formatado (ex.: 99,90) em vez de 99.9.

### Alterado

- Formulários de transações, categorias, orçamentos, cartões e lançamentos fixos seguem um único padrão: campos agrupados por assunto, Cancelar e Salvar no rodapé, mensagens de erro embaixo de cada campo e melhor navegação por teclado e leitor de tela.

## [0.2.27] - 2026-09-08

### Adicionado

- Excluir transação virou estorno: o lançamento some da lista e tem saldo e fatura ajustados, mas fica registrado como estornado para auditoria.
- Lançar despesa no cartão cria a fatura do mês sozinha quando ela não existe; se a fatura do mês já fechou, o valor cai na próxima fatura aberta.

### Corrigido

- Navegação entre meses mostra formato curto ("Set 2026") no lugar de "Setembro De 2026".

## [0.2.26] - 2026-09-07

### Adicionado

- Antecedência dos lembretes agora é configurável: em Configurações > Notificações, escolha com quantos dias de folga quer ser avisado dos vencimentos (de 1 a 30 dias; padrão 7).
- Formulário de lançamento de transações reorganizado: valor em destaque com R$, campos agrupados em "Detalhes" e "Quando", e escolha de despesa/receita em botões coloridos (vermelho/verde).

### Corrigido

- Menus de seleção dentro de painéis laterais (nova fatura, novo custo fixo, editar cartão) abriam vazios ou cortados; agora abrem sempre como lista suspensa normal.
- Salvar a edição de uma série de custo fixo não perde mais a categoria, o método de pagamento, o cartão ou a conta prevista.
- Nova fatura, simular pagamento, copiar faturas e importar PDF deixaram de usar o seletor nativo do navegador em favor do menu padronizado do app.

### Alterado

- Todos os menus de seleção do aplicativo seguem agora um único padrão visual: mesma aparência, mesmos cantos e abertura consistente em faturas, custos fixos, cartões, contas, transações, transferências, dashboard, configurações e cadastro.
- Menus de seleção com opção já escolhida mostram o nome dela em português (ex.: "Aberta", "Mensal", "Recebimento"), em vez de códigos internos como OPEN, MONTHLY ou INCOME.

## [0.2.25] - 2026-09-07

### Segurança

- Proteção contra força bruta: limites de tentativas em todas as rotas de acesso (login, cadastro, recuperação de senha e confirmação de e-mail), com identificação confiável do IP do visitante.
- Excluir a conta criada com Google agora exige sessão recente e a confirmação digitando o próprio e-mail, protegendo os dados financeiros contra sequestro de sessão.
- Limites de tamanho em backups, exclusões em lote e importações de planilha, impedindo que envios gigantes derrubem o sistema.
- Importação de CSV protege descrições contra execução de fórmulas ao abrir em Excel/Sheets e rejeita arquivos acima de 10 mil linhas.
- Login pelo Google só vincula automaticamente contas com e-mail já verificado, bloqueando a tomada de conta via e-mail pendente.
- Chave de sessão passa a ser obrigatória em produção e pacotes com vulnerabilidades conhecidas foram atualizados.

## [0.2.24] - 2026-09-06

### Adicionado

- Vencimentos agora dizem 'Vence hoje', 'Vence em' ou 'Venceu em' conforme a data, nos cards de lançamentos fixos, faturas e fechamento mensal.

### Corrigido

- Pendências com vencimento passado ganham destaque vermelho no badge de vencimento dos cards de lançamentos fixos.

### Alterado

- Cards de lançamentos fixos no celular ficam mais compactos, sem o círculo com a inicial do lançamento.

## [0.2.23] - 2026-09-06

### Adicionado

- Contas do mês vira tabela profissional no computador: colunas ordenáveis por clique, caixas de seleção com soma dos itens marcados e total alinhado.
- Alterar o dia de vencimento do cartão atualiza automaticamente as faturas abertas ou estimadas do mês em diante; faturas fechadas e pagas mantêm a data histórica.

### Corrigido

- Editar fatura fechada ou paga mostra aviso claro para reabri-la, em vez de erro genérico de fatura não encontrada.
- Salvar fatura com campos travados não falha mais com 'Dados inválidos': valores preservados e confirm de modo de cálculo só aparece quando ele muda de verdade.

## [0.2.22] - 2026-09-06

### Adicionado

- Fechamento mensal ganha a lista 'Contas do mês': faturas e custos fixos juntos, ordenados por vencimento, com filtros de pendentes/pagas e badges de atraso.

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
