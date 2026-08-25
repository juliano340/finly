# ADR-006: Rate Limiting Restrito a Producao

## Status

Accepted

## Context

Rate limiting e essencial em producao para prevenir brute-force e abuso. Em desenvolvimento/teste, atrapalha o fluxo de trabalho (CIs, testes automatizados).

## Decision

Dois rate limiters:

1. **Login** (`login-rate-limit.service.ts`): Ativo em TODOS os ambientes. 5 falhas/email + 25/IP, janela de 15min.
2. **Request** (`request-rate-limit.service.ts`): Producao apenas (`NODE_ENV !== "production"` retorna false). Aplicado em `/api/auth/register` e `/api/auth/forgot-password`.

Ambos usam a tabela `LoginAttempt` com chaves SHA-256 e prefixo de escopo.

## Consequences

**Positivo:**
- Producao protegida contra brute-force e abuso.
- Testes e CI nao sao afetados por rate limits.
- Login rate limit sempre ativo (protege contra ataques reais em qualquer ambiente).

**Negativo:**
- Rate limit de request nao e testado em CI (mitigado por `request-rate-limit.service.test.ts` usando mock).
- Comportamento pode divergir entre dev e producao.
