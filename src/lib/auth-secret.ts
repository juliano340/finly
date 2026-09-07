function loadSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (secret) return secret

  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    // Fail-closed: sem segredo, os JWTs seriam assinados de forma previsível.
    // Preferimos derrubar o runtime a servir sessões forjáveis. Durante o
    // build (NEXT_PHASE=phase-production-build) o secret não é usado de
    // verdade — CI e previews precisam conseguir construir sem ele.
    throw new Error("AUTH_SECRET é obrigatório em produção")
  }

  // Fallback apenas para desenvolvimento/e2e local.
  return "finly-development-auth-secret"
}

export const AUTH_SECRET = loadSecret()
