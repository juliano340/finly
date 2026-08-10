# Requisitos — Finly

## Plano do Mês

### Objetivo

Permitir que o usuário defina quanto deseja economizar e acompanhe um limite diário seguro, recalculado conforme receitas, compromissos, gastos realizados e dias restantes do mês.

### Requisitos funcionais

- **PMES-001 — Plano mensal:** o usuário deve poder criar e editar um plano específico para cada mês.
- **PMES-002 — Receita prevista:** o Finly deve sugerir a receita prevista usando receitas recorrentes já cadastradas e permitir ajuste manual para o mês.
- **PMES-003 — Gastos comprometidos:** o Finly deve calcular automaticamente faturas e lançamentos fixos previstos para o mês, sem contabilizar duas vezes valores fixos incluídos em cartão.
- **PMES-004 — Meta de economia:** o usuário deve informar o valor mínimo que deseja guardar no mês.
- **PMES-005 — Margem de segurança:** o usuário deve poder reservar opcionalmente um valor adicional para imprevistos.
- **PMES-006 — Valor disponível:** o Finly deve mostrar quanto ainda pode ser gasto sem comprometer a meta e a margem configuradas.
- **PMES-007 — Limite diário seguro:** o Finly deve dividir o valor disponível pelos dias restantes do mês e recalcular o resultado após novos gastos ou ajustes no plano.
- **PMES-008 — Comportamento adaptativo:** valores não gastos não devem aparecer como saldo acumulado integral no dia seguinte; o limite deve ser redistribuído entre todos os dias restantes. Gastos acima do ritmo devem reduzir os limites seguintes.
- **PMES-009 — Sinalização:** a página deve indicar claramente quando o usuário está dentro da meta, em atenção ou com a meta ameaçada.
- **PMES-010 — Dashboard:** o dashboard deve exibir um resumo do limite diário seguro, economia projetada e situação do plano, com acesso à página completa.
- **PMES-011 — Isolamento:** planos e cálculos devem respeitar usuário e mês, sem exposição de dados entre contas.

### Regras de cálculo iniciais

```text
saldo_planejado = receita_prevista - gastos_comprometidos
disponivel_variavel = saldo_planejado - meta_economia - margem_seguranca - gastos_variaveis_realizados
limite_diario_seguro = max(0, disponivel_variavel) / dias_restantes
```

- O dia atual participa da divisão enquanto ainda não tiver terminado.
- A receita sugerida pode ser substituída apenas naquele mês.
- A margem de segurança não substitui a meta de economia.
- Valores negativos devem ser apresentados como risco, não como limite negativo para gasto.
- O cálculo deve reutilizar as regras financeiras existentes para evitar duplicidade entre fatura, lançamento fixo e transação.

### Critérios de aceitação

- Com receita de R$ 1.500, compromissos de R$ 835 e meta de R$ 300, o sistema apresenta R$ 365 disponíveis antes de margem e gastos variáveis.
- Com R$ 365 disponíveis e 20 dias restantes, o limite diário apresentado é R$ 18,25.
- Se nenhum gasto ocorrer e restarem 19 dias, o limite é recalculado para aproximadamente R$ 19,21, sem mostrar R$ 36,50 acumulados para o dia.
- Se forem gastos R$ 30 e restarem 19 dias, o limite é recalculado usando R$ 335 disponíveis, aproximadamente R$ 17,63 por dia.
- Alterar receita, meta ou margem atualiza imediatamente projeção e limite.
- Lançamentos fixos incluídos em uma fatura não são somados novamente como compromisso separado.
- Trocar o mês exibe o plano e os números daquele mês.
- Usuários diferentes não conseguem consultar ou alterar planos alheios.

### Fora do primeiro escopo

- Integração bancária automática.
- Recomendações geradas por inteligência artificial.
- Metas compartilhadas entre usuários.
- Notificações push, SMS ou WhatsApp.
- Planejamento anual ou simulações de investimento.
