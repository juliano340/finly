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
