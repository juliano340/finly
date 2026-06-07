export interface ParsedTransaction {
  date: Date
  amount: number
  description: string
  type: "INCOME" | "EXPENSE"
}

export interface ImportResult {
  transactions: ParsedTransaction[]
  errors: string[]
}

export function parseCSV(content: string): ImportResult {
  const lines = content.split("\n").filter((l) => l.trim())
  const errors: string[] = []
  const transactions: ParsedTransaction[] = []

  if (lines.length < 2) {
    return { transactions: [], errors: ["Arquivo CSV vazio ou sem cabeçalho"] }
  }

  const header = lines[0].toLowerCase()
  const hasDate = header.includes("data") || header.includes("date")
  const hasAmount = header.includes("valor") || header.includes("amount")
  const hasDescription = header.includes("descrição") || header.includes("description") || header.includes("histórico")

  if (!hasDate || !hasAmount) {
    return {
      transactions: [],
      errors: ["Cabeçalho deve conter colunas 'data' e 'valor'"],
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
    const dateStr = cols[0]
    const amountStr = cols[1]
    const description = hasDescription ? cols[2] ?? "" : cols[2] ?? ""

    const date = parseDate(dateStr)
    if (!date) {
      errors.push(`Linha ${i + 1}: Data inválida '${dateStr}'`)
      continue
    }

    const amount = parseAmount(amountStr)
    if (amount === null) {
      errors.push(`Linha ${i + 1}: Valor inválido '${amountStr}'`)
      continue
    }

    transactions.push({
      date,
      amount: Math.abs(amount),
      description,
      type: amount < 0 ? "EXPENSE" : "INCOME",
    })
  }

  return { transactions, errors }
}

function parseDate(str: string): Date | null {
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{4})-(\d{2})-(\d{2})$/,
  ]

  for (const fmt of formats) {
    const match = str.match(fmt)
    if (match) {
      if (fmt === formats[0]) {
        const [, day, month, year] = match
        return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0)
      } else {
        const [, year, month, day] = match
        return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0)
      }
    }
  }
  return null
}

function parseAmount(str: string): number | null {
  const cleaned = str.replace(/[R$\s.]/g, "").replace(",", ".")
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}
