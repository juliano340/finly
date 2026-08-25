# ADR-002: Auth Guard por Rota (sem Middleware)

## Status

Accepted

## Context

Next.js oferece middleware para protecao global. Porem, o projeto tem rotas publicas (auth, landing, changelog) misturadas com rotas protegidas, e cada rota tem regras diferentes (ex: register/forgot-password sao publicas).

## Decision

Nao usamos `middleware.ts`. Cada route handler chama `auth()` individualmente e retorna 401 se nao autenticado:

```typescript
const session = await auth()
if (!session?.user?.id) {
  return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
}
```

Um teste automatizado (`src/__tests__/api-auth-guard.test.ts`) usa `import.meta.glob` para descobrir TODAS as rotas e garante que cada uma retorna 401 sem sessao.

## Consequences

**Positivo:**
- Rotas publicas nao precisam bypass.
- Protecao e explicita e auditavel por rota.
- Teste automatizado impede regressoes (nova rota sem auth = CI vermelho).

**Negativo:**
- Boilerplate repetido em cada handler.
- Sem protecao centralizada (se alguem criar rota fora do padrao, so o teste pega).
