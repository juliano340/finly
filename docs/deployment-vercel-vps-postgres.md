# Deploy Vercel com Postgres em VPS

Este documento registra o trabalho feito para colocar o Finly em producao na Vercel usando Postgres hospedado em uma VPS. Ele foi escrito para orientar futuros agentes LLM ou humanos sem expor segredos.

Nao commitar senhas, tokens, `AUTH_SECRET`, `.env*`, dumps de banco, arquivos SQLite ou logs com dados pessoais.

## Estado Atual

Aplicacao:

- Framework: Next.js 16, App Router.
- ORM: Prisma 7 com driver adapters.
- Banco local legado: SQLite via `better-sqlite3` em desenvolvimento/testes.
- Banco de producao: Postgres na VPS.
- Deploy: Vercel, projeto `finly-olive`.
- Dominio final usado: `https://finly-olive.vercel.app`.

Infra de banco:

- Host publico do Postgres: `api.juliano340.com`.
- Porta: `5432`.
- Database: `finly_production`.
- Usuario de aplicacao: `finly_app`.
- Senha: nao documentada aqui. Obter do cofre, Vercel env ou gerar/rotacionar na VPS.
- SSL: habilitado no Postgres da VPS.
- Connection string em producao usa `sslmode=no-verify` por causa de certificado autoassinado.

Variaveis de ambiente na Vercel, ambiente Production:

```env
DATABASE_URL=postgresql://finly_app:<DB_PASSWORD>@api.juliano340.com:5432/finly_production?schema=public&sslmode=no-verify
DATABASE_POOL_MAX=3
AUTH_SECRET=<AUTH_SECRET>
AUTH_TRUST_HOST=true
AUTH_URL=https://finly-olive.vercel.app
```

## Arquivos Importantes

- `src/lib/prisma.ts`: cria Prisma Client e escolhe adapter Postgres ou SQLite conforme `DATABASE_URL`.
- `prisma/schema.prisma`: schema Prisma atual, provider `postgresql`.
- `prisma/schema.sqlite.prisma`: schema espelho para desenvolvimento local SQLite, provider `sqlite`.
- `prisma/migrations/`: migrations usadas em producao.
- `.vercelignore`: evita subir `.env`, bancos SQLite locais, logs, reports, testes e arquivos de design para deploy.
- `.gitignore`: ignora `.env*`, `.vercel`, SQLite local, logs e Prisma Client gerado.

## O Que Foi Feito

### 1. Preparacao do Postgres na VPS

Foi verificado que a VPS aceitava SSH como `root@api.juliano340.com` e que o Postgres estava instalado e ativo.

Foi criado o banco e o usuario de aplicacao:

```sql
CREATE ROLE finly_app LOGIN PASSWORD '<DB_PASSWORD>';
CREATE DATABASE finly_production OWNER finly_app;
GRANT ALL PRIVILEGES ON DATABASE finly_production TO finly_app;
GRANT CREATE, USAGE ON SCHEMA public TO finly_app;
ALTER SCHEMA public OWNER TO finly_app;
```

Foi habilitado acesso externo com SSL:

```sql
ALTER SYSTEM SET listen_addresses = '*';
ALTER SYSTEM SET ssl = 'on';
ALTER SYSTEM SET ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem';
ALTER SYSTEM SET ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key';
```

Foi adicionada regra no `pg_hba.conf` para `finly_app` acessar somente `finly_production` via SSL:

```conf
# finly vercel access
hostssl finly_production finly_app 0.0.0.0/0 scram-sha-256
hostssl finly_production finly_app ::/0 scram-sha-256
```

Depois disso o Postgres foi reiniciado:

```bash
systemctl restart postgresql
```

### 2. Migracao Prisma para producao Postgres

O schema ja estava configurado como Postgres, mas havia historico de migrations SQLite misturado.

Correcoes feitas:

- `prisma/migrations/20260101000000_init_postgres/migration.sql`: removido texto nao-SQL acidental no topo.
- `prisma/migrations/20260618161307_add_fixed_cost_type/migration.sql`: transformada em no-op para Postgres, porque continha um full-schema SQLite duplicado e quebraria `migrate deploy`.
- `package.json`: adicionado script `db:migrate:deploy`.

Aplicacao das migrations no banco remoto:

```bash
DATABASE_URL='postgresql://finly_app:<DB_PASSWORD>@api.juliano340.com:5432/finly_production?schema=public&sslmode=no-verify' npx prisma migrate deploy
```

Migrations aplicadas no banco remoto:

- `20260101000000_init_postgres`
- `20260618161307_add_fixed_cost_type`
- `20260619195000_add_dashboard_indexes`
- `20260619210500_add_dashboard_summary_indexes`

### 3. Configuracao Vercel

Foi feito login na Vercel CLI e link/criacao do projeto `finly-olive`.

Comandos usados, sem segredos:

```bash
npx vercel login
npx vercel link --yes --project finly-olive
```

As variaveis foram adicionadas com `vercel env add`. Nunca passar segredos em texto no historico quando houver alternativa; preferir stdin, painel da Vercel ou cofre.

Exemplo:

```bash
'postgresql://finly_app:<DB_PASSWORD>@api.juliano340.com:5432/finly_production?schema=public&sslmode=no-verify' | npx vercel env add DATABASE_URL production
'3' | npx vercel env add DATABASE_POOL_MAX production
'<AUTH_SECRET>' | npx vercel env add AUTH_SECRET production
'true' | npx vercel env add AUTH_TRUST_HOST production
'https://finly-olive.vercel.app' | npx vercel env add AUTH_URL production
```

Deploy:

```bash
npx vercel deploy --prod --yes
```

O alias automatico da Vercel nem sempre apontou `finly-olive.vercel.app` para o deploy mais novo. Sempre que necessario, foi usado:

```bash
npx vercel alias set https://<DEPLOYMENT_URL> finly-olive.vercel.app
```

## Ajustes de Conexao

## Compatibilidade Local SQLite e Producao Postgres

Prisma gera clients atrelados ao provider do schema. Um client gerado com `provider = "postgresql"` nao aceita adapter SQLite, e um client gerado com `provider = "sqlite"` nao deve ser usado em producao Postgres.

Para manter local SQLite e producao Postgres, o projeto usa dois schemas e dois clients gerados:

- `prisma/schema.prisma` gera `src/generated/prisma` para Postgres.
- `prisma/schema.sqlite.prisma` gera `src/generated/prisma-sqlite` para SQLite local.
- `src/lib/prisma.ts` escolhe o client pelo prefixo de `DATABASE_URL`.

Scripts relevantes:

```bash
npm run prisma:generate
npm run db:push:sqlite
```

Quando mudar o schema principal, espelhar a mudanca em `schema.sqlite.prisma` se o modelo tambem precisa existir localmente. Depois rodar:

```bash
npm run prisma:generate
npm run db:push:sqlite
npm run build
```

Producao continua usando migrations Postgres:

```bash
DATABASE_URL='postgresql://finly_app:<DB_PASSWORD>@api.juliano340.com:5432/finly_production?schema=public&sslmode=no-verify' npx prisma migrate deploy
```

## Migrations Automaticas pela Vercel

O deploy da Vercel usa `npm run vercel-build`, configurado em `vercel.json`.

Em producao, o script exige `MIGRATE_DATABASE_URL` e executa `prisma migrate deploy` antes do `next build`. A aplicacao continua usando `DATABASE_URL` com o usuario restrito.

Separacao recomendada:

- `DATABASE_URL`: usuario runtime da aplicacao, por exemplo `finly_app`, sem permissao de criar objetos no schema.
- `MIGRATE_DATABASE_URL`: usuario de migracao, por exemplo `finly_migrator`, com permissao para alterar schema. Usado apenas no build.

Criar usuario de migracao na VPS, conectado como `postgres` ou outro superuser. O schema continua pertencendo ao role sem login `finly_owner`; o usuario de migracao apenas herda esse role.

```sql
CREATE USER finly_migrator WITH PASSWORD '<SENHA_FORTE>';
GRANT CONNECT ON DATABASE finly_production TO finly_migrator;
GRANT finly_owner TO finly_migrator;
```

Garantir que o usuario runtime continua sem permissao de criar objetos:

```sql
REVOKE CREATE ON SCHEMA public FROM finly_app;
GRANT USAGE ON SCHEMA public TO finly_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO finly_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO finly_app;

ALTER DEFAULT PRIVILEGES FOR ROLE finly_migrator IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO finly_app;

ALTER DEFAULT PRIVILEGES FOR ROLE finly_migrator IN SCHEMA public
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO finly_app;

ALTER DEFAULT PRIVILEGES FOR ROLE finly_migrator IN SCHEMA public
GRANT USAGE ON TYPES TO finly_app;
```

Adicionar a URL privilegiada na Vercel somente como variavel de ambiente, sem commitar em arquivo:

```bash
npx vercel env add MIGRATE_DATABASE_URL production
```

Valor esperado:

```txt
postgresql://finly_migrator:<SENHA_FORTE>@api.juliano340.com:5432/finly_production?schema=public&sslmode=no-verify
```

Se uma migration falhar no meio, como `20260620120000_add_recurrence_fields`, resolver o estado antes de redeployar:

```bash
DATABASE_URL='postgresql://finly_migrator:<SENHA_FORTE>@api.juliano340.com:5432/finly_production?schema=public&sslmode=no-verify' npx prisma migrate resolve --rolled-back 20260620120000_add_recurrence_fields
DATABASE_URL='postgresql://finly_migrator:<SENHA_FORTE>@api.juliano340.com:5432/finly_production?schema=public&sslmode=no-verify' npx prisma migrate deploy
```

### Problema Encontrado

Ao importar backup, ocorreu:

```txt
Too many database connections opened: remaining connection slots are reserved for non-replication superuser connections
```

Causa:

- Vercel e serverless.
- Cada instancia cria seu proprio pool Postgres.
- O `pg` por padrao pode abrir ate 10 conexoes por pool.
- A VPS estava com `max_connections = 10`, baixo demais.
- Algumas instancias antigas ficaram com conexoes `idle`.

### Correcoes

Em `src/lib/prisma.ts`, o pool Postgres passou a ser limitado por env:

```ts
new PrismaPg({
  connectionString: url,
  max: Number(process.env.DATABASE_POOL_MAX ?? 1),
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
})
```

Na Vercel, o valor atual e:

```env
DATABASE_POOL_MAX=3
```

Na VPS, `max_connections` foi ajustado para 50:

```sql
ALTER SYSTEM SET max_connections = '50';
```

Timeouts para limpar conexoes paradas do usuario da aplicacao:

```sql
ALTER ROLE finly_app SET idle_session_timeout = '60s';
ALTER ROLE finly_app SET idle_in_transaction_session_timeout = '60s';
```

Para limpar conexoes `idle` antigas:

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE usename = 'finly_app'
  AND pid <> pg_backend_pid()
  AND state <> 'active';
```

Checar conexoes atuais:

```bash
ssh root@api.juliano340.com "sudo -u postgres psql -d finly_production -tAc \"select count(*), usename, state from pg_stat_activity group by usename, state order by usename, state nulls first;\""
```

## Ajustes de Backup/Importacao

Em `src/features/backup/backup.service.ts`, a transacao de importacao ganhou timeout maior:

```ts
{ maxWait: 10_000, timeout: 120_000 }
```

Motivo:

- Backup pode inserir muitos registros.
- O banco fica na VPS e a funcao roda na Vercel, entao ha latencia de rede.
- Timeout padrao pode ser curto para importacao maior.

## Ajustes de Performance do Dashboard

### Problema Inicial

Endpoints do dashboard levavam entre 2s e 11s. O pior caso era:

```txt
/api/dashboard/monthly-evolution?month=2026-06&months=6
```

Motivos principais:

- Muitas chamadas HTTP paralelas na tela do dashboard.
- Varios endpoints repetiam auth, criavam/esperavam conexao e faziam varias queries.
- `monthly-evolution` fazia trabalho mutavel por mes: `ensureFinancialMonth` e `ensureFixedCostOccurrences` dentro de loop.
- Faltavam indices para filtros reais por `userId`, `month`, `type`, `date` e `status`.

### Mudancas Feitas

`getMonthlyEvolution` em `src/features/dashboard/dashboard.service.ts` foi otimizado para:

- Garantir meses e ocorrencias fixas em lote.
- Agregar faturas por `groupBy` em todos os meses.
- Buscar ocorrencias em uma consulta para todos os meses.
- Buscar transacoes do intervalo completo e agrupar em memoria.
- Limitar `months` entre 1 e 24 no endpoint.

`getDueSoonNotifications` em `src/features/notifications/notifications.service.ts` passou a usar `ensureFixedCostOccurrencesForMonths`, evitando upserts em loop por mes.

`getMonthlyClosingSummary` foi criado em `src/features/monthly-closing/monthly-closing.service.ts` para retornar somente o resumo usado no dashboard, sem payload pesado de faturas/ocorrencias completas.

`getBankAccountsTotal` foi criado em `src/features/bank-accounts/bank-accounts.service.ts` para calcular apenas o saldo total usado no dashboard.

Novos endpoints:

- `GET /api/dashboard/summary?month=YYYY-MM&months=6`
- `GET /api/bank-accounts/total`
- `GET /api/monthly-closing?month=YYYY-MM&summary=1`

O dashboard em `src/app/(dashboard)/dashboard/page.tsx` passou a usar o endpoint agregado:

```txt
/api/dashboard/summary?month=<month>&months=6
```

### Indices Adicionados

Migration `20260619195000_add_dashboard_indexes`:

```sql
CREATE INDEX "Transaction_userId_type_date_idx" ON "Transaction"("userId", "type", "date");
CREATE INDEX "CardInvoice_userId_month_idx" ON "CardInvoice"("userId", "month");
CREATE INDEX "FixedCost_userId_active_idx" ON "FixedCost"("userId", "active");
CREATE INDEX "FixedCostOccurrence_userId_month_idx" ON "FixedCostOccurrence"("userId", "month");
```

Migration `20260619210500_add_dashboard_summary_indexes`:

```sql
CREATE INDEX "BankAccountMovement_userId_type_idx" ON "BankAccountMovement"("userId", "type");
CREATE INDEX "BankAccountMovement_bankAccountId_userId_date_idx" ON "BankAccountMovement"("bankAccountId", "userId", "date");
CREATE INDEX "CardInvoice_userId_status_dueDate_idx" ON "CardInvoice"("userId", "status", "dueDate");
CREATE INDEX "FixedCostOccurrence_userId_status_month_idx" ON "FixedCostOccurrence"("userId", "status", "month");
```

### Medicoes Observadas

Valores variam por cold start, regiao e latencia Vercel-VPS.

Antes:

- `monthly-evolution`: aproximadamente 11.5s.
- Outros endpoints do dashboard: 1.3s a 3.5s.
- `due-soon`: aproximadamente 2.8s a 4s em algumas medicoes.

Depois:

- `monthly-evolution` direto em producao autenticada: aproximadamente 960ms warm em uma medicao anterior.
- `dashboard/summary`: aproximadamente 1.7s a 2.1s warm, cold start pode passar de 3s.
- `due-soon`: aproximadamente 1.2s a 1.5s warm.

Observacao: consolidar tudo em um endpoint unico reduz overhead de varias lambdas/HTTP, mas concentra trabalho em uma chamada. O ganho real depende de pool, cold start e latencia ate a VPS.

## Operacao e Troubleshooting

### Testar conexao Postgres localmente via Node

Nao use senha real em docs ou commits.

```bash
node -e "const {Client}=require('pg'); const c=new Client({connectionString:'postgresql://finly_app:<DB_PASSWORD>@api.juliano340.com:5432/finly_production?schema=public&sslmode=no-verify'}); c.connect().then(()=>c.query('select current_database() db, current_user usr')).then(r=>{console.log(r.rows[0]); return c.end();}).catch(e=>{console.error(e.message); process.exit(1);});"
```

### Verificar migrations

```bash
DATABASE_URL='postgresql://finly_app:<DB_PASSWORD>@api.juliano340.com:5432/finly_production?schema=public&sslmode=no-verify' npx prisma migrate status
```

Aplicar migrations:

```bash
DATABASE_URL='postgresql://finly_app:<DB_PASSWORD>@api.juliano340.com:5432/finly_production?schema=public&sslmode=no-verify' npx prisma migrate deploy
```

### Verificar envs da Vercel

```bash
npx vercel env ls
```

Nao imprime valores sensiveis, apenas nomes e ambientes.

### Deploy manual

```bash
npm run build
npx vercel deploy --prod --yes
npx vercel alias set https://<DEPLOYMENT_URL> finly-olive.vercel.app
```

### Logs da Vercel

Use quando endpoint retornar erro generico.

```bash
npx vercel logs <deployment-url>
```

### Erro de cadastro 500

Sintoma visto:

```json
{"error":"Erro interno do servidor"}
```

Causas provaveis:

- `DATABASE_URL` ausente/incorreta na Vercel.
- `sslmode=require` recusando certificado autoassinado.
- Dominio `finly-olive.vercel.app` apontando para deploy antigo.
- Migrations nao aplicadas.

Correcao aplicada:

- `DATABASE_URL` com `sslmode=no-verify`.
- Alias manual para deploy correto.
- Migrations aplicadas.

### Erro de conexoes demais

Sintoma:

```txt
Too many database connections opened: remaining connection slots are reserved for non-replication superuser connections
```

Checklist:

- Conferir `DATABASE_POOL_MAX` na Vercel. Valor atual recomendado para este projeto: `3`.
- Conferir `max_connections` no Postgres. Valor atual: `50`.
- Conferir conexoes paradas em `pg_stat_activity`.
- Encerrar conexoes `idle` antigas se necessario.

### Endpoint lento no dashboard

Checklist:

- Medir no browser autenticado, nao com curl sem sessao.
- Separar cold start de warm request. Primeiro request depois de deploy pode ser bem mais lento.
- Conferir se o dashboard esta chamando `/api/dashboard/summary` e nao os cinco endpoints antigos.
- Conferir migrations dos indices aplicadas.
- Conferir se `DATABASE_POOL_MAX` esta em `3`.
- Conferir latencia entre Vercel e VPS. VPS fora da regiao da Vercel pode limitar ganhos.

## Seguranca e Melhorias Futuras

O estado atual funciona, mas ha pontos a melhorar:

- Substituir certificado autoassinado do Postgres por certificado valido e trocar `sslmode=no-verify` por verificacao real.
- Considerar PgBouncer na VPS se houver mais usuarios/concorrencia.
- Considerar mover banco para provedor gerenciado perto da regiao da Vercel se performance for critica.
- Restringir `pg_hba.conf` por IP nao e simples com Vercel porque os IPs de saida podem variar no plano atual.
- Rotacionar `AUTH_SECRET` e senha do Postgres se qualquer segredo tiver sido exposto em conversa, terminal, logs ou screenshots.

## Principios Para Futuros Agentes

- Nao commitar `.env*`, `.vercel/`, dumps SQLite, logs, screenshots com dados ou tokens.
- Nao imprimir segredos no output final.
- Antes de alterar banco, rodar `prisma migrate status`.
- Antes de deployar, rodar `npm run build`.
- Depois de deployar, garantir alias `finly-olive.vercel.app` apontando para o deployment novo.
- Se mexer em performance, medir cold e warm separadamente.
- Se mexer em conexoes, lembrar que Vercel multiplica pools por instancia.
- Preferir mudancas pequenas e reversiveis.
