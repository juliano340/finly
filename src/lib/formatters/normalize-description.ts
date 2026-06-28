export function normalizeDescription(raw: string): string {
  const trimmed = raw.trim()

  const sepMatch = trimmed.match(/^(.+?)[\*\-]\s*(.+)$/)
  if (sepMatch) {
    const [, prefix, suffix] = sepMatch
    if (isDynamicSuffix(suffix)) {
      return prefix.trim() + "*"
    }
    return trimmed
  }

  const words = trimmed.split(/\s+/)
  if (words.length >= 2) {
    const lastWord = words[words.length - 1]
    if (isDynamicSuffix(lastWord)) {
      return words.slice(0, -1).join(" ")
    }
  }

  return trimmed
}

function isDynamicSuffix(s: string): boolean {
  if (s.length < 5) return false

  const letters = s.replace(/[^a-zA-Z]/g, "")
  const digits = s.replace(/[^0-9]/g, "")

  if (letters.length === 0 || digits.length === 0) return false

  const digitRatio = digits.length / s.length
  return digitRatio >= 0.1
}
