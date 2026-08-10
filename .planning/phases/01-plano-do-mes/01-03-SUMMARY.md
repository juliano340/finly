# Plano 01-03 — Resumo

## Entregue

- Composição Decimal compartilhada para receita recorrente, faturas, custos fixos fora do cartão e despesas avulsas.
- Janela de transações baseada em `America/Sao_Paulo`, com início local inclusivo e próximo início local exclusivo.
- Serviço mensal com leitura, upsert por `userId+month`, override zero e recálculo de todos os derivados.
- Validação da janela temporal antes de criar mês financeiro ou ocorrências.
- Fechamento mensal reutiliza a mesma fronteira contra dupla contagem.

## Validação

- Testes de integração SQLite cobrem receita sugerida, fatura + fixo externo, exclusão de fixo no cartão, `ImportedTransaction`, `BankAccountMovement` e `Transaction INCOME`.
- Testes cobrem cortes UTC correspondentes à meia-noite de São Paulo, dia atual inclusivo, recálculo sem persistir derivados e isolamento entre usuários/meses.
- Regressão confirma que pagamento de custo fixo cria movimento bancário sem criar `Transaction` adicional.
