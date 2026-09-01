import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma/client"
import { moneyToNumber } from "@/lib/money"

export interface DueNotification {
  id: string
  type: "INVOICE" | "FIXED_COST"
  title: string
  amount: number
  dueDate: string
  href: string
}

export async function getDueSoonNotifications(
  userId: string,
  daysAhead = 7,
  client?: PrismaClient,
  now: Date = new Date()
) {
  const db = client ?? defaultPrisma
  const today = normalizeDate(now)
  const startDate = addDays(today, -30)
  const endDate = addDays(today, daysAhead)
  const months = monthsBetween(startDate, endDate)

  const [invoices, occurrences] = await Promise.all([
    db.cardInvoice.findMany({
      where: {
        userId,
        status: "PENDING",
        month: { in: months },
        dueDate: { gte: startOfDay(startDate), lte: endOfDay(endDate) },
      },
      include: { card: true },
    }),
    db.fixedCostOccurrence.findMany({
      where: {
        userId,
        month: { in: months },
        status: "PENDING",
        deletedAt: null,
        fixedCost: { dueDay: { not: null }, type: "EXPENSE" },
      },
      include: { fixedCost: true },
    }),
  ])

  const invoiceNotifications = invoices.map((invoice) => ({
    id: invoice.id,
    type: "INVOICE" as const,
    title: `Fatura ${invoice.card.name}`,
    amount: moneyToNumber(invoice.amount),
    dueDate: invoice.dueDate.toISOString(),
    href: "/invoices",
  }))

  const fixedCostNotifications = deduplicateMonthlyOccurrences(occurrences).flatMap((occurrence) => {
    if (!isValidMonth(occurrence.month) || !occurrence.fixedCost.dueDay) return []
    const dueDate = occurrence.dueDate
      ? normalizeDate(occurrence.dueDate)
      : fixedCostDueDate(occurrence.month, occurrence.fixedCost.dueDay)
    if (dueDate.getTime() > endOfDay(endDate).getTime()) return []
    if (dueDate.getTime() < startOfDay(startDate).getTime()) return []
    return [{
      id: occurrence.id,
      type: "FIXED_COST" as const,
      title: occurrence.fixedCost.name,
      amount: moneyToNumber(occurrence.amount),
      dueDate: dueDate.toISOString(),
      href: `/fixed-costs?month=${occurrence.month}`,
    }]
  })

  return [...invoiceNotifications, ...fixedCostNotifications]
}

function deduplicateMonthlyOccurrences<T extends {
  fixedCostId: string
  month: string
  scheduledDate: Date | null
  fixedCost: { frequency: string; customUnit: string | null }
}>(occurrences: T[]): T[] {
  const grouped = new Map<string, T[]>()

  for (const occurrence of occurrences) {
    if (!hasAtMostOneOccurrencePerMonth(occurrence.fixedCost)) continue
    const key = `${occurrence.fixedCostId}:${occurrence.month}`
    const group = grouped.get(key) ?? []
    group.push(occurrence)
    grouped.set(key, group)
  }

  const preferredIds = new Set<T>()
  for (const group of grouped.values()) {
    preferredIds.add(group.find((occurrence) => !occurrence.scheduledDate) ?? group[0])
  }

  return occurrences.filter((occurrence) =>
    !hasAtMostOneOccurrencePerMonth(occurrence.fixedCost) || preferredIds.has(occurrence)
  )
}

function hasAtMostOneOccurrencePerMonth(fixedCost: { frequency: string; customUnit: string | null }) {
  return fixedCost.frequency !== "DAILY" &&
    fixedCost.frequency !== "WEEKLY" &&
    fixedCost.frequency !== "BIWEEKLY" &&
    !(fixedCost.frequency === "CUSTOM" && ["DAYS", "WEEKS"].includes(fixedCost.customUnit ?? ""))
}

function fixedCostDueDate(month: string, dueDay: number) {
  const [year, monthIndex] = month.split("-").map(Number)
  const lastDay = new Date(year, monthIndex, 0).getDate()
  return normalizeDate(new Date(year, monthIndex - 1, Math.min(dueDay, lastDay)))
}

function normalizeDate(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))
}

function endOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
}

function addDays(date: Date, days: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days))
}

function monthsBetween(start: Date, end: Date) {
  const months: string[] = []
  const cursor = new Date(Date.UTC(start.getFullYear(), start.getMonth(), 1))
  const last = new Date(Date.UTC(end.getFullYear(), end.getMonth(), 1))
  while (cursor.getTime() <= last.getTime()) {
    months.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`)
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return months
}

function isValidMonth(month: string) {
  return /^\d{4}-\d{2}$/.test(month) && month.startsWith("20")
}
