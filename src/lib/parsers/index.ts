import type { BankParser } from "./types"
import { interParser } from "./inter/parse-inter-invoice"

const parsers: BankParser[] = [interParser]

export function getParser(text: string): BankParser | null {
  return parsers.find((p) => p.detect(text)) ?? null
}

export function registerParser(parser: BankParser): void {
  parsers.push(parser)
}

export type { BankParser, ParsedInvoice, ParsedTransaction } from "./types"
