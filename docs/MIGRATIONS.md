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
```

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
| `finly_runtime` | Sim | Runtime alternativo | ✅ Sim |
| `finly_migrator` | Sim | **Apenas deploy/migration** | ✅ Sim (herda finly_owner) |
| `finly_owner` | **Não** | Dono dos objetos do schema | ✅ Sim (sem login) |

### Por que essa separação?

- O `finly_app` (usado no dia a dia pela aplicação) **não pode** criar tabelas ou alterar schema. Segurança: se a aplicação for comprometida, não consegue destruir a estrutura do banco.
- O `finly_migrator` só é usado no momento do deploy e tem poder de alterar schema. A senha dele fica guardada na Vercel como variável sensível.
- O `finly_owner` é o dono real dos objetos, mas não tem login — ninguém conecta como ele. O migrator só herda os privilégios dele.

---

## Dicas finais

- **Sempre teste local** antes de subir para produção
- Se a migration for muito grande (várias tabelas), faça uma migration de cada vez
- Depois de rodar na VPS, o próximo deploy da Vercel vai passar sem tentar aplicar nada (porque não tem migration pendente)
- Se quiser que a Vercel aplique automaticamente, mantenha a env `MIGRATE_DATABASE_URL` configurada no painel da Vercel
