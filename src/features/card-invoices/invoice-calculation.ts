import { sumMoney, type MoneyValue } from "@/lib/money"

export type InvoiceCalculationInput = {
  calculationMode: "CALCULATED" | "ENTERED_TOTAL"
  amount: MoneyValue
  enteredTotal?: MoneyValue | null
  items?: {
    amount: MoneyValue
    postingStatus: "PROJECTED" | "POSTED"
    fixedCostOccurrenceId?: string | null
  }[]
  fixedOccurrences?: { id: string; amount: MoneyValue }[]
}

export function calculateInvoiceTotals(input: InvoiceCalculationInput) {
  const items = input.items ?? []
  const linkedFixedCosts = new Set(
    items.flatMap((item) => item.fixedCostOccurrenceId ? [item.fixedCostOccurrenceId] : []),
  )
  const unlinkedFixedTotal = sumMoney(
    (input.fixedOccurrences ?? [])
      .filter((occurrence) => !linkedFixedCosts.has(occurrence.id))
      .map((occurrence) => occurrence.amount),
  )
  const itemsTotal = sumMoney(items.map((item) => item.amount))
  const postedItemsTotal = sumMoney(
    items.filter((item) => item.postingStatus === "POSTED").map((item) => item.amount),
  )
  const calculatedTotal = sumMoney([itemsTotal, unlinkedFixedTotal])
  const enteredTotal = input.enteredTotal ?? input.amount

  return {
    effectiveTotal: input.calculationMode === "ENTERED_TOTAL"
      ? sumMoney([enteredTotal])
      : calculatedTotal,
    enteredTotal: sumMoney([enteredTotal]),
    calculatedTotal,
    itemsTotal,
    postedItemsTotal,
    projectedFixedTotal: unlinkedFixedTotal,
    difference: sumMoney([enteredTotal, -calculatedTotal]),
  }
}
