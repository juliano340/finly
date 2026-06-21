import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfDay,
  isAfter,
  parseISO,
  format,
} from "date-fns"

export type Frequency = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL" | "CUSTOM"
export type IntervalUnit = "DAYS" | "WEEKS" | "MONTHS" | "YEARS"
export type EndType = "NONE" | "DATE" | "COUNT"

export interface RecurrenceConfig {
  startDate: string
  frequency: Frequency
  customInterval: number | null
  customUnit: IntervalUnit | null
  endType: EndType
  endDate: string | null
  endAfterCount: number | null
}

function addInterval(date: Date, frequency: Frequency, customInterval: number | null, customUnit: IntervalUnit | null): Date {
  switch (frequency) {
    case "DAILY": return addDays(date, 1)
    case "WEEKLY": return addWeeks(date, 1)
    case "BIWEEKLY": return addWeeks(date, 2)
    case "MONTHLY": return addMonths(date, 1)
    case "BIMONTHLY": return addMonths(date, 2)
    case "QUARTERLY": return addMonths(date, 3)
    case "SEMIANNUAL": return addMonths(date, 6)
    case "ANNUAL": return addYears(date, 1)
    case "CUSTOM": {
      const interval = customInterval ?? 1
      switch (customUnit) {
        case "DAYS": return addDays(date, interval)
        case "WEEKS": return addWeeks(date, interval)
        case "MONTHS": return addMonths(date, interval)
        case "YEARS": return addYears(date, interval)
        default: return addMonths(date, 1)
      }
    }
    default: return addMonths(date, 1)
  }
}

export function computeRecurrenceDates(config: RecurrenceConfig, maxDate: Date): Date[] {
  const dates: Date[] = []
  const start = startOfDay(parseISO(config.startDate))
  const endDate = config.endType === "DATE" && config.endDate
    ? startOfDay(parseISO(config.endDate))
    : null
  const maxOccurrences = config.endType === "COUNT" ? (config.endAfterCount ?? Infinity) : Infinity

  let current = start
  let count = 0

  while (current <= maxDate) {
    if (endDate && isAfter(current, endDate)) break
    if (count >= maxOccurrences) break

    dates.push(new Date(current))
    count++

    current = addInterval(current, config.frequency, config.customInterval, config.customUnit)
  }

  return dates
}

export function occurrenceDueDate(
  occurrenceDate: Date,
  dueDay: number | null
): Date {
  if (dueDay == null) return occurrenceDate
  const year = occurrenceDate.getFullYear()
  const month = occurrenceDate.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  const day = Math.min(dueDay, lastDay)
  return new Date(year, month, day)
}

export function monthKey(date: Date): string {
  return format(date, "yyyy-MM")
}

export function fixCostOccurrenceDueDate(dueDay: number | null, month: string): Date {
  const [year, m] = month.split("-").map(Number)
  const lastDay = new Date(year, m, 0).getDate()
  const day = dueDay ? Math.min(dueDay, lastDay) : 1
  return new Date(year, m - 1, day)
}
