# ADR-003: JWT com Invalidacao por `passwordChangedAt`

## Status

Accepted

## Context

Sessoes baseadas em banco de dados adicionam latencia e complexidade deconexao. JWT permite autenticacao stateless, mas invalidacao de tokens e desafiadora.

## Decision

- NextAuth v5 com estrategia JWT (nao database sessions).
- Token assinado com `AUTH_SECRET`.
- Callback JWT verifica `dbUser.passwordChangedAt` vs `token.loginAt`.
- Se password foi alterado apos emissao do token, sessao e invalidada (`return {}`).
- Falha de login usa hash bcrypt dummy para evitar timing attacks.

## Consequences

**Positivo:**
- Zero queries ao banco para validar sessao.
- Invalidacao simples via `passwordChangedAt` (logout global ao trocar senha).
- Compativel com Vercel (stateless, sem cache compartilhado).

**Negativo:**
- Nao e possivel revogar token individualmente (so via troca de senha).
- Token expira em 30 dias (configuracao do NextAuth).
- Logout so funciona client-side (limpa cookie).
