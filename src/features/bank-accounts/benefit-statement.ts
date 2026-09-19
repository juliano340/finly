import Papa from "papaparse"

export interface BenefitStatementMovement {
  date: Date
  description: string
  amount: number
  type: "INCOME" | "EXPENSE"
}

export interface BenefitStatementParseResult {
  movements: BenefitStatementMovement[]
  errors: string[]
}

const DESCRIPTION_HEADERS = ["movimentacao", "descricao"]

function sanitizeCell(value: string): string {
  return /^[=+@\t\r]/.test(value) ? `'${value}` : value
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function parseStatementDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(year, month - 1, day, 12, 0, 0)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

function parseStatementAmount(value: string): number | null {
  const cleaned = value.replace(/[R$\s.]/g, "").replace(",", ".")
  if (!/^[-+]?\d+(\.\d+)?$/.test(cleaned)) return null

  const amount = Number(cleaned)
  return Number.isFinite(amount) ? amount : null
}

export function parseBenefitStatementCsv(content: string): BenefitStatementParseResult {
  const normalizedContent = content.replace(/^\uFEFF/, "")
  if (!normalizedContent.trim()) {
    return { movements: [], errors: ["Arquivo CSV vazio ou sem cabeçalho"] }
  }

  const parsed = Papa.parse<string[]>(normalizedContent, { delimiter: ",", skipEmptyLines: false })
  const rows = parsed.data
  if (rows.length === 0) {
    return { movements: [], errors: ["Arquivo CSV vazio ou sem cabeçalho"] }
  }

  const header = rows[0].map((cell) => normalizeHeader(String(cell ?? "")))
  const dateIndex = header.indexOf("data")
  const amountIndex = header.indexOf("valor")
  const descriptionIndex = header.findIndex((cell) => DESCRIPTION_HEADERS.includes(cell))
  if (dateIndex === -1 || amountIndex === -1 || descriptionIndex === -1) {
    return {
      movements: [],
      errors: ["Cabeçalho inválido: são necessárias as colunas Data, Valor e Movimentação"],
    }
  }

  const movements: BenefitStatementMovement[] = []
  const errors: string[] = []

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i]
    if (row.every((cell) => String(cell ?? "").trim() === "")) continue

    const lineNumber = i + 1
    const rawDate = String(row[dateIndex] ?? "")
    const date = parseStatementDate(rawDate)
    if (!date) {
      errors.push(`Linha ${lineNumber}: Data inválida '${rawDate.trim()}'`)
      continue
    }

    const rawAmount = String(row[amountIndex] ?? "")
    const amount = parseStatementAmount(rawAmount)
    if (amount === null) {
      errors.push(`Linha ${lineNumber}: Valor inválido '${rawAmount.trim()}'`)
      continue
    }

    movements.push({
      date,
      description: sanitizeCell(String(row[descriptionIndex] ?? "").trim()),
      amount: Math.abs(amount),
      type: amount < 0 ? "EXPENSE" : "INCOME",
    })
  }

  return { movements, errors }
}
