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
  finalBalance: number | null
  totalIn: number
  totalOut: number
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

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function parseBenefitStatementCsv(content: string): BenefitStatementParseResult {
  const normalizedContent = content.replace(/^\uFEFF/, "")
  if (!normalizedContent.trim()) {
    return { movements: [], errors: ["Arquivo CSV vazio ou sem cabeçalho"], finalBalance: null, totalIn: 0, totalOut: 0 }
  }

  const parsed = Papa.parse<string[]>(normalizedContent, { delimiter: ",", skipEmptyLines: false })
  const rows = parsed.data
  if (rows.length === 0) {
    return { movements: [], errors: ["Arquivo CSV vazio ou sem cabeçalho"], finalBalance: null, totalIn: 0, totalOut: 0 }
  }

  const header = rows[0].map((cell) => normalizeHeader(String(cell ?? "")))
  const dateIndex = header.indexOf("data")
  const amountIndex = header.indexOf("valor")
  const descriptionIndex = header.findIndex((cell) => DESCRIPTION_HEADERS.includes(cell))
  const balanceIndex = header.indexOf("saldo")
  if (dateIndex === -1 || amountIndex === -1 || descriptionIndex === -1) {
    return {
      movements: [],
      errors: ["Cabeçalho inválido: são necessárias as colunas Data, Valor e Movimentação"],
      finalBalance: null,
      totalIn: 0,
      totalOut: 0,
    }
  }

  const movements: BenefitStatementMovement[] = []
  const errors: string[] = []
  const balances: { date: Date; value: number }[] = []

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

    if (balanceIndex !== -1) {
      const balance = parseStatementAmount(String(row[balanceIndex] ?? ""))
      if (balance !== null) balances.push({ date, value: balance })
    }
  }

  let finalBalance: number | null = null
  let finalBalanceDate: Date | null = null
  for (const entry of balances) {
    if (finalBalanceDate === null || entry.date > finalBalanceDate) {
      finalBalance = entry.value
      finalBalanceDate = entry.date
    }
  }

  const totalIn = roundMoney(movements.filter((movement) => movement.type === "INCOME").reduce((total, movement) => total + movement.amount, 0))
  const totalOut = roundMoney(movements.filter((movement) => movement.type === "EXPENSE").reduce((total, movement) => total + movement.amount, 0))

  return { movements, errors, finalBalance, totalIn, totalOut }
}
