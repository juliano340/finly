import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma/client"

export type DueNotificationStatus = "OVERDUE" | "DUE_TODAY" | "DUE_SOON"

export interface DueNotification {
  id: string
  type: "INVOICE" | "FIXED_COST"
  title: string
  amount: number
  dueDate: string
  daysUntilDue: number
  status: DueNotificationStatus
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
  const endDate = addDays(today, daysAhead)
  const months = monthsBetween(today, endDate)

  const [invoices, occurrences] = await Promise.all([
    db.cardInvoice.findMany({
      where: {
        userId,
        status: "PENDING",
        month: { in: months },
        dueDate: { lte: endOfDay(endDate) },
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

  const invoiceNotifications = invoices.map((invoice) => {
    const dueDate = normalizeDate(invoice.dueDate)
    const daysUntilDue = clampDays(differenceInDays(today, dueDate))
    return {
      id: invoice.id,
      type: "INVOICE" as const,
      title: `Fatura ${invoice.card.name}`,
      amount: invoice.amount,
      dueDate: dueDate.toISOString(),
      daysUntilDue,
      status: notificationStatus(daysUntilDue),
      href: "/invoices",
    }
  })

  const fixedCostNotifications = occurrences.flatMap((occurrence) => {
    if (!isValidMonth(occurrence.month) || !occurrence.fixedCost.dueDay) return []
    const dueDate = fixedCostDueDate(occurrence.month, occurrence.fixedCost.dueDay)
    if (dueDate.getTime() > endOfDay(endDate).getTime()) return []
    const daysUntilDue = clampDays(differenceInDays(today, dueDate))
    return [{
      id: occurrence.id,
      type: "FIXED_COST" as const,
      title: occurrence.fixedCost.name,
      amount: occurrence.amount,
      dueDate: dueDate.toISOString(),
      daysUntilDue,
      status: notificationStatus(daysUntilDue),
      href: `/fixed-costs?month=${occurrence.month}`,
    }]
  })

  return [...invoiceNotifications, ...fixedCostNotifications]
    .sort((a, b) => statusPriority(a.status) - statusPriority(b.status) || a.daysUntilDue - b.daysUntilDue)
}

function fixedCostDueDate(month: string, dueDay: number) {
  const [year, monthIndex] = month.split("-").map(Number)
  const lastDay = new Date(year, monthIndex, 0).getDate()
  return normalizeDate(new Date(year, monthIndex - 1, Math.min(dueDay, lastDay)))
}

function notificationStatus(daysUntilDue: number): DueNotificationStatus {
  if (daysUntilDue < 0) return "OVERDUE"
  if (daysUntilDue === 0) return "DUE_TODAY"
  return "DUE_SOON"
}

function statusPriority(status: DueNotificationStatus) {
  if (status === "OVERDUE") return 0
  if (status === "DUE_TODAY") return 1
  return 2
}

function normalizeDate(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

function endOfDay(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999))
}

function addDays(date: Date, days: number) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + days))
}

function differenceInDays(today: Date, target: Date) {
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
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

function clampDays(days: number) {
  if (!Number.isFinite(days)) return 0
  if (days < -3650) return -3650
  if (days > 3650) return 3650
  return days
}
