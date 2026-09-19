import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma/client"
import { randomUUID } from "node:crypto"
import { moneyToNumber, subtractMoney, sumMoney } from "@/lib/money"
import type { BankAccountAdjustmentInput, BankAccountInput, BankAccountMovementInput, BankAccountTransferInput, BenefitRechargeInput } from "./bank-accounts.schema"
import { parseBenefitStatementCsv, type BenefitStatementMovement } from "./benefit-statement"

export async function getBankAccounts(userId: string, client?: PrismaClient) {
  const db = client ?? defaultPrisma
  const accounts = await db.bankAccount.findMany({
    where: { userId },
    include: {
      cards: { select: { id: true, name: true, brand: true } },
      movements: { orderBy: { date: "desc" }, take: 50 },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  })

  const sums = await db.bankAccountMovement.groupBy({
    by: ["bankAccountId", "type"],
    where: { userId },
    _sum: { amount: true },
  })

  return accounts.map((account) => {
    const income = sums.find((sum) => sum.bankAccountId === account.id && sum.type === "INCOME")?._sum.amount ?? 0
    const expense = sums.find((sum) => sum.bankAccountId === account.id && sum.type === "EXPENSE")?._sum.amount ?? 0
    return {
      ...account,
      initialBalance: moneyToNumber(account.initialBalance),
      overdraftLimit: moneyToNumber(account.overdraftLimit),
      benefitDailyRate: account.benefitDailyRate === null ? null : moneyToNumber(account.benefitDailyRate),
      movements: account.movements.map((movement) => ({
        ...movement,
        amount: moneyToNumber(movement.amount),
      })),
      balance: subtractMoney(sumMoney([account.initialBalance, income]), expense),
    }
  })
}

export async function getBankAccountsTotal(userId: string, client?: PrismaClient) {
  const db = client ?? defaultPrisma
  const [accounts, sums] = await Promise.all([
    db.bankAccount.findMany({ where: { userId, type: { not: "BENEFIT" } }, select: { initialBalance: true } }),
    db.bankAccountMovement.groupBy({
      by: ["type"],
      where: { userId, bankAccount: { type: { not: "BENEFIT" } } },
      _sum: { amount: true },
    }),
  ])

  const initialBalance = sumMoney(accounts.map((account) => account.initialBalance))
  const income = sums.find((sum) => sum.type === "INCOME")?._sum.amount ?? 0
  const expense = sums.find((sum) => sum.type === "EXPENSE")?._sum.amount ?? 0
  return subtractMoney(sumMoney([initialBalance, income]), expense)
}

export async function getBankAccountOptions(userId: string, client?: PrismaClient) {
  const db = client ?? defaultPrisma
  return db.bankAccount.findMany({
    where: { userId, active: true },
    select: { id: true, name: true, institution: true, type: true },
    orderBy: { name: "asc" },
  })
}

export async function getBankAccountBalance(
  bankAccountId: string,
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const account = await db.bankAccount.findUnique({ where: { id: bankAccountId } })
  if (!account || account.userId !== userId) return null

  const sums = await db.bankAccountMovement.groupBy({
    by: ["type"],
    where: { bankAccountId, userId },
    _sum: { amount: true },
  })
  const income = sums.find((sum) => sum.type === "INCOME")?._sum.amount ?? 0
  const expense = sums.find((sum) => sum.type === "EXPENSE")?._sum.amount ?? 0
  return subtractMoney(sumMoney([account.initialBalance, income]), expense)
}

export async function createBankAccount(
  userId: string,
  input: BankAccountInput,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  return db.bankAccount.create({
    data: {
      name: input.name,
      institution: input.institution ?? null,
      type: input.type,
      color: input.color,
      initialBalance: input.initialBalance,
      overdraftLimit: input.type === "BENEFIT" ? 0 : input.overdraftLimit,
      benefitDailyRate: input.type === "BENEFIT" ? input.benefitDailyRate ?? null : null,
      active: input.active,
      userId,
    },
  })
}

export async function updateBankAccount(
  id: string,
  userId: string,
  input: Partial<BankAccountInput>,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const account = await db.bankAccount.findUnique({ where: { id } })
  if (!account || account.userId !== userId) return null
  const finalType = input.type ?? account.type

  return db.bankAccount.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.institution !== undefined && { institution: input.institution }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.initialBalance !== undefined && { initialBalance: input.initialBalance }),
      overdraftLimit: finalType === "BENEFIT" ? 0 : input.overdraftLimit ?? account.overdraftLimit,
      benefitDailyRate: finalType === "BENEFIT"
        ? input.benefitDailyRate !== undefined ? input.benefitDailyRate : account.benefitDailyRate
        : null,
      ...(input.active !== undefined && { active: input.active }),
    },
  })
}

export async function deleteBankAccount(
  id: string,
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const account = await db.bankAccount.findUnique({ where: { id } })
  if (!account || account.userId !== userId) return false

  await db.bankAccount.delete({ where: { id } })
  return true
}

export async function validateExpenseLimit(
  bankAccountId: string,
  userId: string,
  amount: number,
  client?: PrismaClient
): Promise<{ allowed: false; reason: string } | { allowed: true; balance: number; overdraftLimit: number }> {
  const db = client ?? defaultPrisma
  const account = await db.bankAccount.findUnique({ where: { id: bankAccountId } })
  if (!account || account.userId !== userId) {
    return { allowed: false, reason: "Conta não encontrada" }
  }

  const balance = await getBankAccountBalance(bankAccountId, userId, db)
  if (balance === null) {
    return { allowed: false, reason: "Conta não encontrada" }
  }

  const overdraftLimit = moneyToNumber(account.overdraftLimit)
  const minBalance = -overdraftLimit
  const balanceAfter = subtractMoney(balance, amount)

  if (balanceAfter < minBalance) {
    const totalAvailable = sumMoney([balance, overdraftLimit])
    return {
      allowed: false,
      reason: `Saldo insuficiente. Transferência de R$ ${amount.toFixed(2)} excede o limite disponível de R$ ${totalAvailable.toFixed(2)} (saldo: R$ ${balance.toFixed(2)} + cheque especial: R$ ${overdraftLimit.toFixed(2)}).`,
    }
  }

  return { allowed: true, balance, overdraftLimit }
}

export async function createBankAccountMovement(
  bankAccountId: string,
  userId: string,
  input: BankAccountMovementInput,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const account = await db.bankAccount.findUnique({ where: { id: bankAccountId } })
  if (!account || account.userId !== userId) return null

  if (input.type === "EXPENSE") {
    const check = await validateExpenseLimit(bankAccountId, userId, input.amount, db)
    if (!check.allowed) return null
  }

  return db.bankAccountMovement.create({
    data: {
      bankAccountId,
      amount: input.amount,
      type: input.type,
      description: input.description ?? null,
      date: input.date,
      userId,
    },
  })
}

export async function deleteBankAccountMovement(
  movementId: string,
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const movement = await db.bankAccountMovement.findFirst({
    where: { id: movementId, userId },
    include: { fixedCostOccurrence: true },
  })
  if (!movement) return null

  const linkedOccurrence =
    movement.fixedCostOccurrence ??
    (await db.fixedCostOccurrence.findFirst({ where: { bankAccountMovementId: movementId } }))
  if (movement.transactionId || linkedOccurrence) {
    return { error: "Esta movimentação é gerada por outro lançamento. Estorne pela origem (transação / custo fixo / fatura)." }
  }

  const isTransfer =
    movement.description?.startsWith("TRANSFERENCIA_SAIDA:") ||
    movement.description?.startsWith("TRANSFERENCIA_ENTRADA:")
  if (isTransfer) {
    const transferId = movement.description?.split(":")[1]
    if (!transferId) {
      return { error: "Par de transferência inconsistente — nenhum movimento estornado." }
    }

    const candidates = await db.bankAccountMovement.findMany({
      where: {
        userId,
        OR: [
          { description: { startsWith: "TRANSFERENCIA_SAIDA:" } },
          { description: { startsWith: "TRANSFERENCIA_ENTRADA:" } },
        ],
      },
    })
    const transferMovements = candidates.filter((item) => item.description?.includes(`:${transferId}:`))
    if (transferMovements.length !== 2) {
      return { error: "Par de transferência inconsistente — nenhum movimento estornado." }
    }

    const pairAccountIds = [...new Set(transferMovements.map((item) => item.bankAccountId))]
    for (const accountId of pairAccountIds) {
      const pairBalance = await getBankAccountBalance(accountId, userId, db)
      const pairAccount = await db.bankAccount.findUnique({
        where: { id: accountId },
        select: { overdraftLimit: true },
      })
      if (pairBalance === null || !pairAccount) {
        return { error: "Par de transferência inconsistente — nenhum movimento estornado." }
      }

      const balanceAfterRemoval = transferMovements
        .filter((item) => item.bankAccountId === accountId)
        .reduce(
          (balance, item) => item.type === "INCOME" ? balance - moneyToNumber(item.amount) : balance + moneyToNumber(item.amount),
          pairBalance
        )
      if (balanceAfterRemoval < -moneyToNumber(pairAccount.overdraftLimit)) {
        return { error: `Esta remoção deixaria a conta em R$ ${balanceAfterRemoval.toFixed(2)} (saldo atual R$ ${pairBalance.toFixed(2)}), abaixo do limite permitido. Estorne em ordem cronológica inversa.` }
      }
    }

    await db.bankAccountMovement.deleteMany({
      where: { id: { in: transferMovements.map((item) => item.id) }, userId },
    })
    return { reversedTransfer: transferId, movements: transferMovements }
  }

  const description = movement.description ?? ""
  if (description.startsWith("AJUSTE_MANUAL:") || description === "AJUSTE MANUAL DE SALDO") {
    return { error: "Ajustes de saldo não são estornáveis — faça um novo ajuste para corrigir o saldo." }
  }

  const currentBalance = await getBankAccountBalance(movement.bankAccountId, userId, db)
  const account = await db.bankAccount.findUnique({
    where: { id: movement.bankAccountId },
    select: { overdraftLimit: true },
  })
  if (currentBalance === null || !account) return null

  const amount = moneyToNumber(movement.amount)
  const balanceAfterRemoval = movement.type === "INCOME" ? currentBalance - amount : currentBalance + amount
  const overdraftLimit = moneyToNumber(account.overdraftLimit)
  if (balanceAfterRemoval < -overdraftLimit) {
    return { error: `Esta remoção deixaria a conta em R$ ${balanceAfterRemoval.toFixed(2)} (saldo atual R$ ${currentBalance.toFixed(2)}), abaixo do limite permitido. Estorne em ordem cronológica inversa.` }
  }

  await db.bankAccountMovement.delete({ where: { id: movementId } })
  return movement
}

export async function adjustBankAccountBalance(
  bankAccountId: string,
  userId: string,
  input: BankAccountAdjustmentInput,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  const currentBalance = await getBankAccountBalance(bankAccountId, userId, db)
  if (currentBalance === null) return null

  const diff = Number((input.targetBalance - currentBalance).toFixed(2))
  if (diff === 0) return null
  if (diff < 0) {
    const check = await validateExpenseLimit(bankAccountId, userId, Math.abs(diff), db)
    if (!check.allowed) return null
  }

  return db.bankAccountMovement.create({
    data: {
      bankAccountId,
      amount: Math.abs(diff),
      type: diff > 0 ? "INCOME" : "EXPENSE",
      description: `AJUSTE_MANUAL:${input.description ?? "CORRECAO DE SALDO"}`,
      date: input.date,
      userId,
    },
  })
}

export async function rechargeBenefitAccount(
  bankAccountId: string,
  userId: string,
  input: BenefitRechargeInput,
  client?: PrismaClient,
) {
  const db = client ?? defaultPrisma
  const account = await db.bankAccount.findFirst({
    where: { id: bankAccountId, userId, type: "BENEFIT", active: true },
    select: { id: true },
  })
  if (!account) return null

  return db.bankAccountMovement.create({
    data: {
      bankAccountId,
      amount: input.amount,
      type: "INCOME",
      description: `RECARGA BENEFÍCIO: ${input.description?.trim() || "EMPRESA"}`,
      date: input.date,
      userId,
    },
  })
}

export interface BenefitStatementImportResult {
  imported: number
  duplicates: number
  errors: string[]
}

function movementDedupeKey(movement: { date: Date; type: string; amount: number; description: string | null }): string {
  return `${movement.date.toISOString().slice(0, 10)}|${movement.type}|${movement.amount.toFixed(2)}|${movement.description ?? ""}`
}

export async function importBenefitStatement(
  bankAccountId: string,
  userId: string,
  csvContent: string,
  client?: PrismaClient,
): Promise<BenefitStatementImportResult | null> {
  const db = client ?? defaultPrisma
  const account = await db.bankAccount.findFirst({
    where: { id: bankAccountId, userId, type: "BENEFIT", active: true },
    select: { id: true },
  })
  if (!account) return null

  const { movements, errors } = parseBenefitStatementCsv(csvContent)

  const existingMovements = await db.bankAccountMovement.findMany({
    where: { bankAccountId, userId },
    select: { date: true, type: true, amount: true, description: true },
  })
  const seen = new Set(
    existingMovements.map((movement) =>
      movementDedupeKey({
        date: movement.date,
        type: movement.type,
        amount: moneyToNumber(movement.amount),
        description: movement.description,
      })
    )
  )

  const toCreate: BenefitStatementMovement[] = []
  let duplicates = 0
  for (const movement of movements) {
    const key = movementDedupeKey(movement)
    if (seen.has(key)) {
      duplicates += 1
      continue
    }
    seen.add(key)
    toCreate.push(movement)
  }

  let imported = 0
  if (toCreate.length > 0) {
    const created = await db.bankAccountMovement.createMany({
      data: toCreate.map((movement) => ({
        bankAccountId,
        amount: movement.amount,
        type: movement.type,
        description: movement.description || null,
        date: movement.date,
        userId,
      })),
    })
    imported = created.count
  }

  return { imported, duplicates, errors }
}

export async function transferBetweenBankAccounts(
  userId: string,
  input: BankAccountTransferInput,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma
  if (input.fromAccountId === input.toAccountId) return { error: "Conta de origem e destino devem ser diferentes" }
  const transferAccounts = await db.bankAccount.findMany({
    where: { userId, id: { in: [input.fromAccountId, input.toAccountId] } },
    select: { id: true, type: true },
  })
  if (transferAccounts.length !== 2) return { error: "Conta de origem ou destino não encontrada" }
  if (transferAccounts.some((account) => account.type === "BENEFIT")) {
    return { error: "Contas de benefício não permitem transferências" }
  }

  const check = await validateExpenseLimit(input.fromAccountId, userId, input.amount, db)
  if (!check.allowed) return { error: check.reason }

  const result = await db.$transaction(async (tx) => {
    const accounts = await tx.bankAccount.findMany({
      where: { userId, id: { in: [input.fromAccountId, input.toAccountId] } },
      select: { id: true, name: true },
    })
    const from = accounts.find((account) => account.id === input.fromAccountId)
    const to = accounts.find((account) => account.id === input.toAccountId)
    if (!from || !to) return null

    const transferId = randomUUID()
    const description = input.description?.trim()
    const baseDescription = description ? `${input.method} - ${description}` : input.method

    const outgoing = await tx.bankAccountMovement.create({
      data: {
        bankAccountId: from.id,
        amount: input.amount,
        type: "EXPENSE",
        description: `TRANSFERENCIA_SAIDA:${transferId}:${to.name}:${baseDescription}`,
        date: input.date,
        userId,
      },
    })
    const incoming = await tx.bankAccountMovement.create({
      data: {
        bankAccountId: to.id,
        amount: input.amount,
        type: "INCOME",
        description: `TRANSFERENCIA_ENTRADA:${transferId}:${from.name}:${baseDescription}`,
        date: input.date,
        userId,
      },
    })

    return { outgoing, incoming }
  })

  if (!result) return { error: "Conta de origem ou destino não encontrada" }
  return result
}
