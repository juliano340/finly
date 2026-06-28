import { parseCurrency } from "../../formatters/currency"
import { parsePortugueseDate } from "../../formatters/date"
import type { BankParser, ParsedInvoice, ParsedTransaction } from "../types"

function extractTotal(lines: string[]): number | null {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Total da sua fatura")) {
      const valueLine = findValueAfter(lines, i)
      if (valueLine) {
        return parseCurrency(valueLine)
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Fatura atual")) {
      const valueLine = findValueAfter(lines, i)
      if (valueLine) {
        return parseCurrency(valueLine)
      }
    }
  }

  return null
}

function extractDueDate(lines: string[]): Date | null {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Data de Vencimento")) {
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const dateMatch = lines[j].match(/(\d{2})\/(\d{2})\/(\d{4})/)
        if (dateMatch) {
          const [, day, month, year] = dateMatch
          return new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day)
          )
        }
      }
    }
  }
  return null
}

function findValueAfter(lines: string[], startIndex: number): string | null {
  for (let j = startIndex + 1; j < Math.min(startIndex + 5, lines.length); j++) {
    const valueMatch = lines[j].match(/R\$\s*[\d.,]+/)
    if (valueMatch) {
      return valueMatch[0]
    }
  }
  return null
}

function shouldSkipLine(line: string): boolean {
  if (!line) return true

  const skipPatterns = [
    /Data\s*Movimenta[cç][aã]o\s*Benefic/i,
    /DataMovimenta/i,
    /^Despesas\s*da\s*fatura$/i,
    /^Total\s*CART[AÃ]O/i,
    /Limite\s+de\s+cr[eé]dito/i,
    /Pagamento\s+m[ií]nimo/i,
    /Encargos/i,
    /Parcelamento/i,
    /Boleto/i,
    /Pix/i,
    /Juros/i,
    /Multa/i,
    /Fale com a gente/i,
    /Capitais e regi/i,
    /Demais localidades/i,
    /Ouvidoria/i,
    /SAC:/i,
    /Super App/i,
    /www\.bancointer/i,
    /ATENTICA/i,
    /MEC[AÂ]NICA/i,
    /FICHA DE COMPENSA/i,
    /VALOR DO DOCUMENTO/i,
    /VENCIMENTO/i,
    /NOSSO N[UÚ]MERO/i,
    /N[ºo]\s*DOCUMENTO/i,
    /ESP[EÉ]CIE/i,
    /AG[EÊ]NCIA/i,
    /CEDENTE/i,
    /LOCAL DE PAGAMENTO/i,
    /DATA DOCUMENTO/i,
    /DATA PROCESSAMENTO/i,
    /USO DO BANCO/i,
    /CARTEIRA/i,
    /QUANTIDADE DE/i,
    /MOEDA/i,
    /VALOR DE MOEDA/i,
    /DESCONTO/i,
    /ABATIMENTO/i,
    /OUTRAS DEDU/i,
    /ACR[EÉ]SCIMOS/i,
    /PAGADOR/i,
    /INSTRU[IÇ]/i,
    /BENEFIC/i,
    /CNPJ/i,
    /LIBERADO/i,
    /AT[EÉ]\s+24h/i,
    /AT[EÉ]\s+3\s+dias/i,
    /07790\./i,
    /NOSSO\s+N/i,
    /VALOR COBRADO/i,
    /MORA\s*/i,
    /01389715019/i,
    /01001\.305299/i,
    /88476\.433599/i,
    /^\d{3}-\d\s+\d{5}\.\d{3}\.\d{3}\.\d{3}\.\d\s+\d+$/i,
    /Pagamento via/i,
    /Caso o pagamento/i,
    /Escaneie/i,
    /QR Code/i,
    /Libera/i,
    /Reconhecimento/i,
    /fatura mensal/i,
    /pr[oó]xima fatura/i,
    /fechamento/i,
    /momento de fechamento/i,
    /valor total do plano/i,
    /impactar seu limite/i,
    /medida que as parcelas/i,
    /quitadas/i,
    /liberado para/i,
    /D[eé]bito Autom[aá]tico/i,
    /Agendamento/i,
    /Cart[oõ]es/i,
    /Configura[cç][oõ]es/i,
    /Desativar/i,
    /Desativando/i,
    /Cancelando/i,
    /deslize para/i,
    /pontos no Inter Loop/i,
    /inadimplente/i,
    /bloqueado/i,
    /normaliza[cç][aã]o/i,
    /carregado para/i,
    /multa de atraso/i,
    /mora/i,
    /capitalizados/i,
    /Resolu[cç][aã]o/i,
    /Banco Central/i,
    /rotativo por mais/i,
    /compuls[oó]rio/i,
    /15 parcelas/i,
    /quitacao/i,
    /antecipa[cç][aã]o/i,
    /Rotativos/i,
    /M[aá]ximo/i,
    /Per[ií]odo/i,
    /Parcelamento de Fatura/i,
    /Atraso/i,
    /Financiamento/i,
    /^IOF\s+Internacional\s+\d/i,
    /Aten[cç][aã]o/i,
    /menor que/i,
    /Fa[cç]a um Pix/i,
    /Use esse QR/i,
    /liberado em/i,
    /Saque/i,
    /Utilizado/i,
    /Dispon[ií]vel/i,
    /Pr[oó]xima fatura/i,
    /Data de corte/i,
    /compras parceladas/i,
    /fechamento da fatura/i,
    /far[aã]o parte/i,
    /Saldo total/i,
    /Saldo demais/i,
    /Saldo em aberto/i,
    /3003/i,
    /0800/i,
    /chat/i,
    /libras/i,
    /defici[iê]ncia/i,
    /audio/i,
    /fala/i,
  ]

  return skipPatterns.some((pattern) => pattern.test(line))
}

function tryParseTransaction(
  line: string,
  allLines: string[],
  currentIndex: number,
  currentCard: string | null
): ParsedTransaction | null {
  const transactionRegex =
    /(\d{1,2}\s+de\s+\w{3}\.?\s+\d{4})\s*(.+?)\s*([-+]?\s*R\$\s*[\d.,]+)\s*$/

  const match = line.match(transactionRegex)
  if (match) {
    const [, dateStr, description, amountStr] = match
    const date = parsePortugueseDate(dateStr)
    const amount = parseCurrency(amountStr)

    let type: "purchase" | "credit" | "payment" = "purchase"
    if (amountStr.includes("+")) {
      type = "credit"
    } else if (amount < 0) {
      type = "purchase"
    }

    return {
      cardIdentifier: currentCard,
      date,
      description: description.trim(),
      amount,
      type,
      rawLine: line,
    }
  }

  const intlDateRegex = /(\d{1,2}\s+de\s+\w{3}\.?\s+\d{4})\s*(.+)/
  const intlMatch = line.match(intlDateRegex)

  if (intlMatch) {
    let bestValue: { match: string; index: number } | null = null
    for (let j = currentIndex + 1; j < Math.min(currentIndex + 8, allLines.length); j++) {
      const nextLine = allLines[j].trim()
      const signedMatch = nextLine.match(/[-+]\s*R\$\s*[\d.,]+/)
      if (signedMatch) {
        bestValue = { match: signedMatch[0], index: j }
        break
      }
    }
    if (bestValue) {
      const [, dateStr, description] = intlMatch
      const date = parsePortugueseDate(dateStr)
      const amount = parseCurrency(bestValue.match)

      let type: "purchase" | "credit" | "payment" = "purchase"
      if (bestValue.match.includes("+")) {
        type = "credit"
      }

      const rawLines = [line]
      for (let k = currentIndex + 1; k <= bestValue.index; k++) {
        rawLines.push(allLines[k])
      }

      return {
        cardIdentifier: currentCard,
        date,
        description: description.trim(),
        amount,
        type,
        rawLine: rawLines.join(" | "),
      }
    }
  }

  return null
}

function skipInternationalLines(lines: string[], currentIndex: number): number {
  let i = currentIndex + 1
  while (i < lines.length) {
    const line = lines[i].trim()
    if (
      line.match(/^\d{1,2}\s+de\s+\w{3}/) ||
      line.match(/Total\s+CART[AÃ]O/i) ||
      line.match(/CART[AÃ]O\s+\d{4}/)
    ) {
      return i - 1
    }
    i++
  }
  return i - 1
}

export const interParser: BankParser = {
  name: "Banco Inter",

  detect(text: string): boolean {
    return text.includes("Banco Inter") || text.includes("bancointer")
  },

  parse(rawText: string): ParsedInvoice {
    const lines = rawText.split("\n")
    const transactions: ParsedTransaction[] = []

    const invoiceTotal = extractTotal(lines)
    const dueDate = extractDueDate(lines)

    let currentCard: string | null = null
    let inExpensesSection = false
    let i = 0

    while (i < lines.length) {
      const line = lines[i].trim()

      if (line.includes("Despesas da fatura")) {
        inExpensesSection = true
        i++
        continue
      }

      const cardMatch = line.match(/CART[AÃ]O\s+(\d{4}\*{4}\d{4})/i)
      if (cardMatch) {
        currentCard = cardMatch[1]
        i++
        continue
      }

      if (line.match(/Total\s+CART[AÃ]O/i)) {
        inExpensesSection = false
        i++
        continue
      }

      if (shouldSkipLine(line)) {
        i++
        continue
      }

      if (inExpensesSection) {
        const transaction = tryParseTransaction(line, lines, i, currentCard)
        if (transaction) {
          transactions.push(transaction)
          if (transaction.rawLine.includes("Valor e s")) {
            i = skipInternationalLines(lines, i)
          } else {
            i++
          }
          continue
        }
      }

      i++
    }

    return {
      bank: "Banco Inter",
      invoiceTotal,
      dueDate,
      transactions,
    }
  },
}
