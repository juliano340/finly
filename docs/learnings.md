# Aprendizados — Finly

Lições capturadas durante desenvolvimento para evitar repetir erros. Cada entrada é um problema real que aconteceu, sua causa e como prevenir.

---

## CI Pipeline (GitHub Actions)

### 1. AUTH_SECRET é obrigatório no CI
- `next start` quebra sem `AUTH_SECRET` — NextAuth exige.
- **Solução:** gerar no CI com `openssl rand -hex 32 >> .env` antes de buildar.
- CI job de e2e também precisa, mesmo não tendo `next dev` explicitamente (playwright inicia servidor).

### 2. SQLite `test.db` precisa ser recriada após schema changes
- `prisma db push --schema prisma/schema.sqlite.prisma` é necessário quando campos novos são adicionados.
- **Solução:** rodar `db:push:sqlite` nos jobs de CI que rodam testes.

### 3. `createMany` + `skipDuplicates` não funciona com SQLite no Prisma 7.8
- Prisma+SQLite não aceita `skipDuplicates`; lança erro em runtime.
- **Solução:** usar `upsert` em loop ou verificar existência manualmente.

### 4. Preferir `getByRole` em vez de `text=` nos E2E
- Locators `page.getByText("Nome")` são ambíguos quando o mesmo texto aparece em múltiplos lugares.
- **Solução:** usar `getByRole("button", { name: "exato", exact: true })` ou `.first()`.
- Para elementos sem role, usar `getByTestId` ou localizador mais específico.

### 5. `signOut({ redirect: false })` + `window.location` é frágil
- Pode causar redirect incompleto ou erro de navegação.
- **Solução:** usar `signOut({ redirect: true, callbackUrl: "/login" })` — NextAuth gerencia todo o fluxo.

---

## Produção (Vercel + VPS Postgres)

### 6. Schema drift: migrations precisam ser idempotentes
- Produção pode estar em estado intermediário (algumas migrations aplicadas, outras não).
- **Solução:** usar `IF NOT EXISTS` em `ALTER TABLE`, `DO $$` blocks para `CREATE TYPE`, checagens antes de add column.
- Exemplo:
  ```sql
  ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "overdraftLimit" DOUBLE PRECISION NOT NULL DEFAULT 0;
  ```

### 7. Vercel: cada projeto tem suas próprias env vars
- Domínios diferentes (`finly.juliano340.com` vs `finly-olive.vercel.app`) podem apontar para projetos Vercel diferentes.
- `DATABASE_URL` pode estar vazia em um projeto mas configurada em outro.
- **Solução:** verificar `npx vercel env ls` no projeto correto e garantir que todas as envs necessárias existem.

### 8. Alias da Vercel nem sempre aponta para o último deploy
- Após `vercel deploy --prod`, o DNS pode continuar apontando para deploy antigo.
- **Solução:** verificar e forçar alias manualmente com `npx vercel alias set <url> <dominio>`.

---

## React / Next.js

### 9. `setState` dentro de `useEffect` para estado derivado é lint error
- Se um estado pode ser calculado diretamente de props ou outros estados, use `useState(valorInicial)` ou `useMemo`.
- **Exemplo:** data inicial de formulário → `useState(new Date())` em vez de `useEffect` + `setDate`.
- Isso evita render extra e o lint rule `set-state-in-effect`.

### 10. Campos novos em schemas Prisma precisam de default no service
- Quando um campo é adicionado ao schema, callers antigos não passam o valor.
- **Solução:** adicionar default no service layer (ex: `overdraftLimit: 0` em `createFixedCost()`), não confiar só no schema default.

---

## Debugging

### 11. Dump de árvore de acessibilidade é artifact temporário
- Ferramentas como Playwright Inspector geram arquivos de dump da árvore DOM acessível.
- **Não commitar.** São específicos do ambiente local e poluem o repositório.

### 12. Sempre verificar `git status` antes de commitar
- Arquivos acidentais (dumps, logs, node_modules) podem aparecer.
- **Solução:** revisar diff antes de commitar; manter `.gitignore` atualizado.
