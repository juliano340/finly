export interface ParsedTransaction {
  cardIdentifier: string | null
  date: Date | null
  description: string
  amount: number
  type: "purchase" | "credit" | "payment"
  rawLine: string
}

export interface ParsedInvoice {
  bank: string
  invoiceTotal: number | null
  dueDate: Date | null
  transactions: ParsedTransaction[]
}

export interface BankParser {
  name: string
  detect(text: string): boolean
  parse(rawText: string): ParsedInvoice
}

export interface ImportSessionData {
  id: string
  fileName: string
  bank: string | null
  invoiceTotal: number | null
  dueDate: Date | null
  createdAt: Date
  _count: { transactions: number }
}

export interface ImportedTransactionData {
  id: string
  cardIdentifier: string | null
  date: Date | null
  description: string
  amount: number
  type: string | null
  rawLine: string
  categoryId: string | null
}

export interface RankingItem {
  description: string
  count: number
  total: number
  originals: string[]
  txs: { date: Date | null; amount: number; description: string }[]
  categoryId: string | null
}

export interface ChartDataItem {
  name: string
  color: string
  total: number
  count: number
}
