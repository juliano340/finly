export function getPasswordStrength(password: string): number {
  let score = 0
  if (password.length >= 8) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  return score
}

export const PASSWORD_STRENGTH_LABELS = ["", "Fraca", "Razoável", "Boa", "Forte"]

export const PASSWORD_STRENGTH_COLORS = ["bg-border", "bg-destructive", "bg-warning", "bg-primary", "bg-primary"]
