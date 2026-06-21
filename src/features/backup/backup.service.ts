import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma/client"
import type { BackupData, ImportMode } from "./backup.schema"

export interface ImportResult {
  imported: {
    categories: number
    financialMonths: number
    bankAccounts: number
    cards: number
    transactions: number
    budgets: number
    bankAccountMovements: number
    fixedCosts: number
    cardInvoices: number
    fixedCostOccurrences: number
  }
}

export async function exportData(userId: string, client: PrismaClient = defaultPrisma): Promise<BackupData> {
  const categories = await client.category.findMany({ where: { userId }, select: { id: true, name: true, icon: true, color: true, type: true } })
  const financialMonths = await client.financialMonth.findMany({ where: { userId }, select: { id: true, month: true, status: true } })
  const bankAccounts = await client.bankAccount.findMany({ where: { userId }, select: { id: true, name: true, institution: true, type: true, color: true, initialBalance: true, active: true } })
  const cards = await client.card.findMany({ where: { userId }, select: { id: true, name: true, brand: true, color: true, closingDay: true, dueDay: true, bankAccountId: true } })
  const transactions = await client.transaction.findMany({ where: { userId }, select: { id: true, amount: true, type: true, description: true, date: true, categoryId: true } })
  const budgets = await client.budget.findMany({ where: { userId }, select: { id: true, amount: true, month: true, categoryId: true } })
  const bankAccountMovements = await client.bankAccountMovement.findMany({ where: { userId }, select: { id: true, bankAccountId: true, amount: true, type: true, description: true, date: true } })
  const fixedCosts = await client.fixedCost.findMany({ where: { userId }, select: { id: true, name: true, type: true, defaultAmount: true, categoryId: true, paymentMethod: true, dueDay: true, paidInsideCard: true, cardId: true, bankAccountId: true, active: true, startDate: true, frequency: true, customInterval: true, customUnit: true, endType: true, endDate: true, endAfterCount: true } })
  const cardInvoices = await client.cardInvoice.findMany({ where: { userId }, select: { id: true, cardId: true, financialMonthId: true, month: true, dueDate: true, amount: true, status: true, paidAt: true, paymentMethod: true, paymentBankAccountId: true, bankAccountMovementId: true } })
  const fixedCostOccurrences = await client.fixedCostOccurrence.findMany({ where: { userId }, select: { id: true, fixedCostId: true, financialMonthId: true, month: true, dueDate: true, amount: true, status: true, paidAt: true } })

  return {
    version: 1,
    exportedAt: new Date(),
    data: {
      categories,
      financialMonths,
      bankAccounts,
      cards,
      transactions,
      budgets,
      bankAccountMovements,
      fixedCosts,
      cardInvoices,
      fixedCostOccurrences,
    },
  }
}

export async function importData(
  userId: string,
  data: BackupData,
  mode: ImportMode,
  client: PrismaClient = defaultPrisma
): Promise<ImportResult> {
  return client.$transaction(
    async (tx) => {
      const db = tx as unknown as PrismaClient
      if (mode === "replace") {
        await deleteAllUserData(userId, db)
      }
      return insertAll(userId, data, mode, db)
    },
    { maxWait: 10_000, timeout: 120_000 }
  )
}

async function deleteAllUserData(userId: string, db: PrismaClient) {
  await db.fixedCostOccurrence.deleteMany({ where: { userId } })
  await db.cardInvoice.deleteMany({ where: { userId } })
  await db.fixedCost.deleteMany({ where: { userId } })
  await db.bankAccountMovement.deleteMany({ where: { userId } })
  await db.budget.deleteMany({ where: { userId } })
  await db.transaction.deleteMany({ where: { userId } })
  await db.card.deleteMany({ where: { userId } })
  await db.bankAccount.deleteMany({ where: { userId } })
  await db.financialMonth.deleteMany({ where: { userId } })
  await db.category.deleteMany({ where: { userId } })
}

async function insertAll(
  userId: string,
  data: BackupData,
  mode: ImportMode,
  db: PrismaClient
): Promise<ImportResult> {
  const idMaps = {
    category: new Map<string, string>(),
    financialMonth: new Map<string, string>(),
    bankAccount: new Map<string, string>(),
    card: new Map<string, string>(),
    fixedCost: new Map<string, string>(),
    bankAccountMovement: new Map<string, string>(),
  }
  const counts = {
    categories: 0, financialMonths: 0, bankAccounts: 0, cards: 0,
    transactions: 0, budgets: 0, bankAccountMovements: 0, fixedCosts: 0,
    cardInvoices: 0, fixedCostOccurrences: 0,
  }

  // L0: Category, FinancialMonth, BankAccount
  for (const item of data.data.categories) {
    if (mode === "merge") {
      const existing = await db.category.findUnique({ where: { name_userId: { name: item.name, userId } } })
      if (existing) { idMaps.category.set(item.id, existing.id); continue }
    }
    const created = await db.category.create({
      data: { name: item.name, icon: item.icon, color: item.color, type: item.type, userId },
    })
    idMaps.category.set(item.id, created.id)
    counts.categories++
  }

  for (const item of data.data.financialMonths) {
    if (mode === "merge") {
      const existing = await db.financialMonth.findUnique({ where: { month_userId: { month: item.month, userId } } })
      if (existing) { idMaps.financialMonth.set(item.id, existing.id); continue }
    }
    const created = await db.financialMonth.create({
      data: { month: item.month, status: item.status, userId },
    })
    idMaps.financialMonth.set(item.id, created.id)
    counts.financialMonths++
  }

  for (const item of data.data.bankAccounts) {
    if (mode === "merge") {
      const existing = await db.bankAccount.findUnique({ where: { name_userId: { name: item.name, userId } } })
      if (existing) { idMaps.bankAccount.set(item.id, existing.id); continue }
    }
    const created = await db.bankAccount.create({
      data: { name: item.name, institution: item.institution, type: item.type, color: item.color, initialBalance: item.initialBalance, active: item.active, userId },
    })
    idMaps.bankAccount.set(item.id, created.id)
    counts.bankAccounts++
  }

  // L1: Card, Transaction, Budget, BankAccountMovement
  for (const item of data.data.cards) {
    if (mode === "merge") {
      const existing = await db.card.findUnique({ where: { name_userId: { name: item.name, userId } } })
      if (existing) { idMaps.card.set(item.id, existing.id); continue }
    }
    const bankAccountId = item.bankAccountId ? idMaps.bankAccount.get(item.bankAccountId) ?? null : null
    const created = await db.card.create({
      data: { name: item.name, brand: item.brand, color: item.color, closingDay: item.closingDay, dueDay: item.dueDay, bankAccountId, userId },
    })
    idMaps.card.set(item.id, created.id)
    counts.cards++
  }

  for (const item of data.data.transactions) {
    const categoryId = idMaps.category.get(item.categoryId)
    if (!categoryId) continue
    await db.transaction.create({
      data: { amount: item.amount, type: item.type, description: item.description, date: item.date, categoryId, userId },
    })
    counts.transactions++
  }

  for (const item of data.data.budgets) {
    const categoryId = idMaps.category.get(item.categoryId)
    if (!categoryId) continue
    if (mode === "merge") {
      const existing = await db.budget.findUnique({ where: { categoryId_month_userId: { categoryId, month: item.month, userId } } })
      if (existing) continue
    }
    await db.budget.create({
      data: { amount: item.amount, month: item.month, categoryId, userId },
    })
    counts.budgets++
  }

  for (const item of data.data.bankAccountMovements) {
    const bankAccountId = idMaps.bankAccount.get(item.bankAccountId)
    if (!bankAccountId) continue
    const created = await db.bankAccountMovement.create({
      data: { bankAccountId, amount: item.amount, type: item.type, description: item.description, date: item.date, userId },
    })
    idMaps.bankAccountMovement.set(item.id, created.id)
    counts.bankAccountMovements++
  }

  // L2: FixedCost, CardInvoice
  for (const item of data.data.fixedCosts) {
    if (mode === "merge") {
      const existing = await db.fixedCost.findUnique({ where: { name_userId: { name: item.name, userId } } })
      if (existing) { idMaps.fixedCost.set(item.id, existing.id); continue }
    }
    const categoryId = idMaps.category.get(item.categoryId)
    if (!categoryId) continue
    const cardId = item.cardId ? idMaps.card.get(item.cardId) ?? null : null
    const bankAccountId = item.bankAccountId ? idMaps.bankAccount.get(item.bankAccountId) ?? null : null
    const created = await db.fixedCost.create({
      data: { name: item.name, type: item.type, defaultAmount: item.defaultAmount, categoryId, paymentMethod: item.paymentMethod, dueDay: item.dueDay, paidInsideCard: item.paidInsideCard, cardId, bankAccountId, active: item.active, userId },
    })
    idMaps.fixedCost.set(item.id, created.id)
    counts.fixedCosts++
  }

  const cardInvoiceMap = new Map<string, string>()
  for (const item of data.data.cardInvoices) {
    const cardId = idMaps.card.get(item.cardId)
    if (!cardId) continue
    const financialMonthId = idMaps.financialMonth.get(item.financialMonthId)
    if (!financialMonthId) continue
    if (mode === "merge") {
      const existing = await db.cardInvoice.findUnique({ where: { cardId_month_userId: { cardId, month: item.month, userId } } })
      if (existing) { cardInvoiceMap.set(item.id, existing.id); continue }
    }
    const created = await db.cardInvoice.create({
      data: { cardId, financialMonthId, month: item.month, dueDate: item.dueDate, amount: item.amount, status: item.status, paidAt: item.paidAt, paymentMethod: item.paymentMethod, userId },
    })
    cardInvoiceMap.set(item.id, created.id)
    counts.cardInvoices++
  }

  // Patch CardInvoice soft refs (paymentBankAccountId, bankAccountMovementId)
  for (const item of data.data.cardInvoices) {
    const newInvoiceId = cardInvoiceMap.get(item.id)
    if (!newInvoiceId) continue
    const paymentBankAccountId = item.paymentBankAccountId ? idMaps.bankAccount.get(item.paymentBankAccountId) ?? null : null
    const bankAccountMovementId = item.bankAccountMovementId ? idMaps.bankAccountMovement.get(item.bankAccountMovementId) ?? null : null
    if (paymentBankAccountId || bankAccountMovementId) {
      await db.cardInvoice.update({
        where: { id: newInvoiceId },
        data: { paymentBankAccountId, bankAccountMovementId },
      })
    }
  }

  // L3: FixedCostOccurrence
  for (const item of data.data.fixedCostOccurrences) {
    const fixedCostId = idMaps.fixedCost.get(item.fixedCostId)
    if (!fixedCostId) continue
    const financialMonthId = idMaps.financialMonth.get(item.financialMonthId)
    if (!financialMonthId) continue
    if (mode === "merge") {
      const existing = await db.fixedCostOccurrence.findFirst({ where: { fixedCostId, month: item.month, userId } })
      if (existing) continue
    }
    await db.fixedCostOccurrence.create({
      data: { fixedCostId, financialMonthId, month: item.month, dueDate: item.dueDate, amount: item.amount, status: item.status, paidAt: item.paidAt, userId },
    })
    counts.fixedCostOccurrences++
  }

  return { imported: counts }
}
