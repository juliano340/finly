# Finly

Aplicação web de finanças pessoais para acompanhar receitas, despesas, contas bancárias, cartões, faturas, orçamentos, lançamentos recorrentes e fechamento mensal.

## Stack

- Next.js 16, React 19 e TypeScript
- Prisma ORM
- SQLite no desenvolvimento e testes
- PostgreSQL em produção
- Vitest e Testing Library
- Playwright para testes ponta a ponta
- GitHub Actions para integração contínua

## Pré-requisitos

- Node.js 22+
- npm

## Desenvolvimento local

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run db:push:sqlite
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`.

O fluxo local usa `DATABASE_URL="file:./dev.db"` e o schema [prisma/schema.sqlite.prisma](prisma/schema.sqlite.prisma). Não execute `prisma migrate deploy` contra o SQLite.

## Bancos e migrações

O projeto mantém dois schemas equivalentes:

- `prisma/schema.sqlite.prisma`: desenvolvimento local e testes.
- `prisma/schema.prisma`: PostgreSQL de produção e migrations versionadas.

Depois de alterar modelos, mantenha ambos os schemas alinhados e gere os dois clients:

```bash
npm run prisma:generate
npm run db:push:sqlite
```

Migrações PostgreSQL devem ser criadas em `prisma/migrations` e aplicadas em produção pelo usuário exclusivo de migração:

```bash
npm run db:migrate:prod
```

Consulte [docs/MIGRATIONS.md](docs/MIGRATIONS.md) para recuperação de falhas e [docs/deployment-vercel-vps-postgres.md](docs/deployment-vercel-vps-postgres.md) para o ambiente de produção.

## Variáveis de ambiente

Parta de `.env.example`. Valores sensíveis nunca devem ser commitados.

| Variável | Uso |
|---|---|
| `DATABASE_URL` | SQLite local ou conexão PostgreSQL da aplicação |
| `AUTH_SECRET` | Assinatura de sessões do Auth.js |
| `AUTH_URL` | URL pública da aplicação |
| `SMTP_*` e `EMAIL_FROM` | Recuperação de senha por e-mail |
| `MIGRATE_DATABASE_URL` | Conexão privilegiada usada somente em migrations de produção |

## Scripts principais

```bash
npm run dev                 # servidor local
npm run lint                # análise estática
npm test                    # testes Vitest
npm run test:coverage       # testes com cobertura
npm run test:e2e            # testes Playwright
npm run build               # build de produção
npm run prisma:generate     # clients PostgreSQL e SQLite
npm run db:push:sqlite      # sincroniza banco SQLite local
npm run db:migrate:prod     # aplica migrations PostgreSQL via túnel SSH
```

## Organização

- `src/app`: páginas e rotas HTTP.
- `src/features`: regras de negócio por domínio.
- `src/lib`: infraestrutura e utilitários compartilhados.
- `prisma`: schemas, migrations e seed.
- `e2e`: cenários ponta a ponta.
- `docs`: operação, deploy e decisões técnicas.

Toda consulta financeira deve ser isolada por `userId`. Valores monetários são persistidos como `Decimal(19,2)` no PostgreSQL e convertidos para números somente nas fronteiras da aplicação. Pagamentos e estornos devem manter vínculo único com seus movimentos bancários.

## Qualidade

Antes de publicar uma alteração:

```bash
npm run lint
npm test
npm run build
```

O CI repete essas verificações, mede cobertura, audita dependências de produção e executa os testes E2E.

## Segurança operacional

- `finly_app` é o usuário restrito de runtime.
- `finly_migrator` é usado apenas para alterações de schema.
- A conta de demonstração bloqueia operações mutáveis.
- Credenciais, URLs com senha e arquivos `.env` não devem aparecer em commits, logs ou documentação.
