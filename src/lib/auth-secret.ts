function loadSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (secret) return secret

  if (process.env.NODE_ENV === "production") {
    // Fail-closed: sem segredo, os JWTs seriam assinados de forma previsível.
    // Preferimos derrubar o boot a servir sessões forjáveis.
    throw new Error("AUTH_SECRET é obrigatório em produção")
  }

  return "finly-development-auth-secret"
}

export const AUTH_SECRET = loadSecret()
