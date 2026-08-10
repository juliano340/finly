# Como atualizar o banco de produção depois de mudar o schema

## Pra que serve esse documento?

Sempre que você alterar o schema do Prisma (`prisma/schema.prisma`), precisa refletir essa mudança no banco PostgreSQL da VPS. Esse documento mostra o passo a passo completo, com explicações do que cada comando faz.

---

## O esquema geral

```
Você mexe no schema local
       ↓
Gera uma migration (Prisma cria o SQL)
       ↓
Testa localmente com SQLite
       ↓
Commita e sobe pro GitHub
       ↓
Puxa o código na VPS
       ↓
Roda a migration no PostgreSQL da VPS
       ↓
Valida schema e permissões
       ↓
Só então compila e publica a aplicação
```

Em produção, migration-before-deploy é obrigatória. O rollout seguro segue esta ordem:

1. Confirmar backup recuperável e consultar o status das migrations.
2. Aplicar migrations pendentes.
3. Executar o smoke estrutural e de permissões.
4. Compilar e publicar.
5. Fazer smoke funcional autenticado no ambiente publicado.

Se qualquer etapa falhar, interrompa o rollout. Não tente compensar removendo a tabela nem edite uma migration que já tenha sido aplicada.

---

## Passo 1 — Alterar o schema local

Edite o arquivo `prisma/schema.prisma`.

**Importante:** o projeto usa **dois** schemas:

| Arquivo | Usado para |
|---------|-----------|
| `prisma/schema.prisma` | PostgreSQL (produção) |
| `prisma/schema.sqlite.prisma` | SQLite (desenvolvimento local) |

Se você adicionou uma tabela, campo ou enum no schema principal, **repita a mudança** no `schema.sqlite.prisma` também. Senão o prisma:generate vai dar erro.

---

## Passo 2 — Gerar a migration

```bash
npx prisma migrate dev --name descricao_da_mudanca
```

**O que esse comando faz:**

1. Compara o schema atual com o que está no banco SQLite local
2. Gera uma pasta nova dentro de `prisma/migrations/` com o SQL necessário
3. Aplica essa migration no banco SQLite local
4. Cria/atualiza o Prisma Client

Troque `descricao_da_mudanca` por algo curto em inglês, tipo `add_user_avatar` ou `create_budgets_table`.

---

## Passo 3 — Gerar client e testar local

```bash
npm run prisma:generate
```

**O que faz:** gera os clients Prisma tanto para PostgreSQL quanto para SQLite.

```bash
npm run db:push:sqlite
```

**O que faz:** sincroniza o schema SQLite local com as mudanças (garante que o banco local está atualizado).

```bash
npm run build
```

**O que faz:** compila o Next.js e verifica se não quebrou nada.

Teste a funcionalidade nova no `localhost` antes de subir.

---

## Passo 4 — Commitar e subir pro GitHub

```bash
git add prisma/
git commit -m "feat: descricao da mudanca"
git push
```

Só o que está dentro de `prisma/` precisa subir — as migrations e o schema.

---

## Passo 5 — Atualizar o banco na VPS

Conecte na VPS:

```bash
ssh root@api.juliano340.com
```

Ative o Node 22 e entre no projeto:

```bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
cd ~/projetos/finly
```

> **Por que esse `export` + `source`?** O nvm foi instalado manualmente no servidor. Esses comandos carregam ele na sessão atual para usar o Node 22 (versão que o projeto exige).

Puxe as alterações do GitHub:

```bash
git pull
```

Agora você vai rodar a migration no PostgreSQL. A senha do `finly_migrator` não pode ficar visível, então use esse esquema:

```bash
read -s PW
```

> **O que o `read -s PW` faz?** Ele lê o que você digitar e guarda na variável `PW`. A flag `-s` (silent) faz com que **nada apareça na tela** enquanto você digita — nem os caracteres, nem asteriscos. É seguro.

Depois de digitar a senha e apertar Enter, rode:

```bash
DATABASE_URL="postgresql://finly_migrator:${PW}@127.0.0.1:5432/finly_production?schema=public" npx prisma migrate deploy
```

**Explicação desse comando:**

- `DATABASE_URL="..."` — cria uma variável de ambiente **só para esse comando**, apontando para o PostgreSQL local da VPS
- `finly_migrator:${PW}` — usuário de migration + senha que você digitou
- `127.0.0.1:5432` — conexão local (não passa pelo firewall, mais seguro)
- `npx prisma migrate deploy` — aplica **só as migrations pendentes** no banco

Quando terminar, apague a senha da memória:

```bash
unset PW
```

> **Por que `unset PW`?** Para garantir que a senha não fique na variável de ambiente da sessão.

---

## Se der erro

Se o `prisma migrate deploy` falhar, geralmente o Prisma trava e não deixa rodar de novo até resolver.

Primeiro, identifique o nome da migration que falhou. Ele aparece no erro como `Migration name: 202606xxxxx_nome_da_migration`.

Depois, marque como "rolled back" (revertida) e tente de novo:

```bash
DATABASE_URL="postgresql://finly_migrator:${PW}@127.0.0.1:5432/finly_production?schema=public" npx prisma migrate resolve --rolled-back 202606xxxxx_nome_da_migration
```

```bash
DATABASE_URL="postgresql://finly_migrator:${PW}@127.0.0.1:5432/finly_production?schema=public" npx prisma migrate deploy
```

> **O que `migrate resolve --rolled-back` faz?** Ele marca no banco que aquela migration foi revertida, mesmo sem ter desfeito as alterações. Isso destrava o Prisma para tentar de novo. Se o erro for no meio do SQL, pode ser que parte dela já foi aplicada — mas o Prisma tenta de novo e o `IF NOT EXISTS` / `EXCEPTION WHEN duplicate_object` impede duplicação.

---

## Tabela de usuários do banco

| Role | Faz login? | Usada para | Pode criar tabelas? |
|------|-----------|------------|-------------------|
| `finly_app` | Sim | Runtime da aplicação (Vercel) | ❌ Não |
| `finly_runtime` | Sim | Runtime alternativo | ❌ Não |
| `finly_migrator` | Sim | **Apenas deploy/migration** | ✅ Sim (herda finly_owner) |
| `finly_owner` | **Não** | Dono dos objetos do schema | ✅ Sim (sem login) |

### Por que essa separação?

- Os roles runtime `finly_app` e `finly_runtime` **não podem** criar tabelas ou alterar schema. Eles recebem somente `USAGE` no schema e DML (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) nas tabelas necessárias.
- O `finly_migrator` só é usado no momento do deploy e tem poder de alterar schema. A senha dele fica guardada na Vercel como variável sensível.
- O `finly_owner` é o dono real dos objetos, mas não tem login — ninguém conecta como ele. O migrator só herda os privilégios dele.

---

## Dicas finais

- **Sempre teste local** antes de subir para produção
- Se a migration for muito grande (várias tabelas), faça uma migration de cada vez
- Depois de rodar na VPS, o próximo deploy da Vercel vai passar sem tentar aplicar nada (porque não tem migration pendente)
- Se quiser que a Vercel aplique automaticamente, mantenha a env `MIGRATE_DATABASE_URL` configurada no painel da Vercel

---

## Plano do Mês: migration, teste e rollout

A migration `20260809180000_add_monthly_plan` cria `MonthlyPlan`, a chave estrangeira para `User` com exclusão em cascata e a unicidade `(month, userId)`. Ela também mantém ownership separado dos roles runtime e concede a estes somente DML.

O teste PostgreSQL efêmero executa a cadeia real de migrations em um container temporário e valida estrutura e permissões:

```bash
npm test -- src/__tests__/monthly-plan.postgres.test.ts
```

Esse teste requer Docker disponível; sem Docker, a suíte é ignorada. Antes de publicar, trate execução efetiva do teste como gate operacional, não como validação opcional.

### Deploy automático na Vercel

O comando de build configurado é:

```bash
npm run vercel-build
```

Em produção, `MIGRATE_DATABASE_URL` é obrigatória. O script usa essa URL apenas no subprocesso de migration/smoke, executa `npm run db:migrate:deploy`, valida `MonthlyPlan` e as permissões, e somente depois chama o build do Next.js. `DATABASE_URL` continua sendo a credencial runtime restrita.

Não escreva nenhuma das URLs em documentação, commits ou logs. Configure-as como variáveis protegidas do ambiente de deploy. O smoke verifica que `finly_app` e `finly_runtime` têm DML, mas não `CREATE`, ownership da tabela nem associação ao role proprietário.

### Deploy manual pela estação

Para aplicar migrations pela conexão SSH encapsulada do projeto, use o script existente:

```bash
npm run db:migrate:prod
```

O script solicita a senha, abre o túnel e limita `DATABASE_URL` ao subprocesso Prisma. Depois da migration, o rollout ainda precisa cumprir o smoke estrutural, build/deploy e smoke funcional.

### Smoke funcional do Plano do Mês

Após publicar, abra uma sessão autenticada e confirme:

- a página **Plano do Mês** carrega o mês sem erro 500;
- salvar meta, margem ou receita ajustada persiste e recalcula os derivados;
- o card do dashboard abre o mesmo mês;
- meses fora da janela D-17 não são consultados.

Pela decisão D-16, `Transaction` representa somente receita/despesa avulsa. Pagamentos internos usam `BankAccountMovement`, e `ImportedTransaction` já compõe a fatura. Não existe deduplicação fuzzy: uma `Transaction` manual que reproduza semanticamente uma compra de cartão permanece avulsa. Uma futura ligação por proveniência está fora do escopo desta migration.
