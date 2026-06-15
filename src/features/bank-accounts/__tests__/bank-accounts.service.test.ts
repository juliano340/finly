// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import { adjustBankAccountBalance, createBankAccount, createBankAccountMovement, getBankAccounts, transferBetweenBankAccounts } from "../bank-accounts.service"

const prisma = getTestClient()

describe("bank-accounts.service", () => {
  let userId = ""

  beforeAll(async () => {
    const result = await registerUser(
      { name: "Bank User", email: `bank-${Date.now()}@test.com`, password: "Senha123" },
      prisma
    )
    userId = ("user" in result ? result.user : null)?.id ?? ""
  })

  afterAll(async () => {
    await prisma.bankAccountMovement.deleteMany({ where: { userId } })
    await prisma.bankAccount.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
  })

  it("calcula saldo por saldo inicial mais movimentos", async () => {
    const account = await createBankAccount(
      userId,
      { name: `Mercado Pago ${Date.now()}`, institution: "Mercado Pago", type: "DIGITAL", color: "#22C55E", initialBalance: 1000, active: true },
      prisma
    )

    await createBankAccountMovement(account.id, userId, { amount: 250, type: "INCOME", description: "Recebimento", date: new Date("2026-06-01T12:00:00") }, prisma)
    await createBankAccountMovement(account.id, userId, { amount: 100, type: "EXPENSE", description: "Saída", date: new Date("2026-06-02T12:00:00") }, prisma)

    const accounts = await getBankAccounts(userId, prisma)
    expect(accounts.find((item) => item.id === account.id)?.balance).toBe(1150)
  })

  it("cria movimento de ajuste para atingir saldo informado", async () => {
    const account = await createBankAccount(
      userId,
      { name: `Ajuste ${Date.now()}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 1000, active: true },
      prisma
    )

    await adjustBankAccountBalance(
      account.id,
      userId,
      { targetBalance: 850, description: "CONFERÊNCIA", date: new Date("2026-06-03T12:00:00") },
      prisma
    )

    const accounts = await getBankAccounts(userId, prisma)
    expect(accounts.find((item) => item.id === account.id)?.balance).toBe(850)
  })

  it("transfere valor entre duas contas do usuário", async () => {
    const suffix = Date.now()
    const from = await createBankAccount(
      userId,
      { name: `Origem ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 1000, active: true },
      prisma
    )
    const to = await createBankAccount(
      userId,
      { name: `Destino ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 200, active: true },
      prisma
    )

    const transfer = await transferBetweenBankAccounts(
      userId,
      { fromAccountId: from.id, toAccountId: to.id, amount: 150, method: "PIX", description: "RESERVA", date: new Date("2026-06-04T12:00:00") },
      prisma
    )

    expect(transfer).not.toBeNull()
    const accounts = await getBankAccounts(userId, prisma)
    expect(accounts.find((item) => item.id === from.id)?.balance).toBe(850)
    expect(accounts.find((item) => item.id === to.id)?.balance).toBe(350)
  })

  it("bloqueia transferência para a mesma conta", async () => {
    const account = await createBankAccount(
      userId,
      { name: `Mesma ${Date.now()}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 100, active: true },
      prisma
    )

    const transfer = await transferBetweenBankAccounts(
      userId,
      { fromAccountId: account.id, toAccountId: account.id, amount: 50, method: "PIX", description: null, date: new Date("2026-06-05T12:00:00") },
      prisma
    )

    expect(transfer).toBeNull()
  })

  it("bloqueia conta de outro usuário", async () => {
    const suffix = Date.now()
    const otherResult = await registerUser(
      { name: "Other Bank User", email: `other-bank-${suffix}@test.com`, password: "Senha123" },
      prisma
    )
    const otherUserId = ("user" in otherResult ? otherResult.user : null)?.id ?? ""
    const from = await createBankAccount(
      userId,
      { name: `Origem outro ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 1000, active: true },
      prisma
    )
    const to = await createBankAccount(
      otherUserId,
      { name: `Destino outro ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 200, active: true },
      prisma
    )

    const transfer = await transferBetweenBankAccounts(
      userId,
      { fromAccountId: from.id, toAccountId: to.id, amount: 150, method: "PIX", description: null, date: new Date("2026-06-06T12:00:00") },
      prisma
    )

    expect(transfer).toBeNull()
    await prisma.bankAccount.deleteMany({ where: { userId: otherUserId } })
    await prisma.user.delete({ where: { id: otherUserId } })
  })
})
