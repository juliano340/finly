export function parseCurrency(value: string): number {
  const cleaned = value
    .replace(/R\$\s*/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")

  return parseFloat(cleaned)
}
