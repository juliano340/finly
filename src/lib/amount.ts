export function sanitizeAmount(raw: string) {
  return raw.replace(/[^\d,]/g, "")
}

export function normalizeAmount(raw: string): string | null {
  if (!raw) return null
  const value = parseFloat(raw.replace(",", "."))
  if (!Number.isFinite(value)) return null
  return value.toFixed(2).replace(".", ",")
}

export function parseAmount(raw: string): number {
  const value = parseFloat(raw.replace(",", "."))
  return Number.isFinite(value) ? value : 0
}
