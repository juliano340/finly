const months: Record<string, number> = {
  jan: 0,
  fev: 1,
  mar: 2,
  abr: 3,
  mai: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  set: 8,
  out: 9,
  nov: 10,
  dez: 11,
}

export function parsePortugueseDate(dateStr: string): Date | null {
  const match = dateStr.match(/(\d{1,2})\s+de\s+(\w{3})\.?\s+(\d{4})/)
  if (!match) return null

  const day = parseInt(match[1], 10)
  const monthKey = match[2].toLowerCase().replace(".", "")
  const year = parseInt(match[3], 10)

  const month = months[monthKey]
  if (month === undefined) return null

  return new Date(year, month, day)
}
