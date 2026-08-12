// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import { adjustBankAccountBalance, createBankAccount, createBankAccountMovement, getBankAccounts, getBankAccountsTotal, rechargeBenefitAccount, transferBetweenBankAccounts } from "../bank-accounts.service"

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

  it("mantém benefício separado do saldo bancário e registra recarga", async () => {
    const bankTotalBefore = await getBankAccountsTotal(userId, prisma)
    const transactionsBefore = await prisma.transaction.count({ where: { userId } })
    const benefit = await createBankAccount(
      userId,
      {
        name: `Vale alimentação ${Date.now()}`,
        institution: "Empresa",
        type: "BENEFIT",
        color: "#16A34A",
        initialBalance: 50,
        overdraftLimit: 500,
        benefitDailyRate: 22,
        active: true,
      },
      prisma,
    )

    expect(Number(benefit.overdraftLimit)).toBe(0)
    expect(Number(benefit.benefitDailyRate)).toBe(22)
    await expect(rechargeBenefitAccount(
      benefit.id,
      userId,
      { amount: 484, description: "Agosto", date: new Date("2026-08-01T12:00:00") },
      prisma,
    )).resolves.toMatchObject({ type: "INCOME" })

    const accounts = await getBankAccounts(userId, prisma)
    expect(accounts.find((account) => account.id === benefit.id)?.balance).toBe(534)
    await expect(getBankAccountsTotal(userId, prisma)).resolves.toBe(bankTotalBefore)
    await expect(prisma.transaction.count({ where: { userId } })).resolves.toBe(transactionsBefore)

    const regularAccount = accounts.find((account) => account.type !== "BENEFIT")!
    await expect(transferBetweenBankAccounts(userId, {
      fromAccountId: regularAccount.id,
      toAccountId: benefit.id,
      amount: 10,
      method: "PIX",
      date: new Date("2026-08-02T12:00:00"),
    }, prisma)).resolves.toEqual({ error: "Contas de benefício não permitem transferências" })
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

    expect(transfer).toEqual({ error: "Conta de origem e destino devem ser diferentes" })
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

    expect(transfer).toEqual({ error: "Conta de origem ou destino não encontrada" })
    await prisma.bankAccount.deleteMany({ where: { userId: otherUserId } })
    await prisma.user.delete({ where: { id: otherUserId } })
  })

  // ─── Overdraft / Cheque Especial ──────────────────────────────

  it("permite despesa quando saldo cobre (sem overdraft)", async () => {
    const account = await createBankAccount(
      userId,
      { name: `Cobertura ${Date.now()}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 500, active: true },
      prisma
    )
    const movement = await createBankAccountMovement(account.id, userId, { amount: 200, type: "EXPENSE", description: "teste", date: new Date() }, prisma)
    expect(movement).not.toBeNull()
  })

  it("permite despesa dentro do cheque especial", async () => {
    const account = await createBankAccount(
      userId,
      { name: `Cheque ${Date.now()}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 100, overdraftLimit: 200, active: true },
      prisma
    )
    const movement = await createBankAccountMovement(account.id, userId, { amount: 250, type: "EXPENSE", description: "usando cheque", date: new Date() }, prisma)
    expect(movement).not.toBeNull()
  })

  it("bloqueia despesa que excede cheque especial", async () => {
    const account = await createBankAccount(
      userId,
      { name: `Estoura ${Date.now()}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 100, overdraftLimit: 200, active: true },
      prisma
    )
    const movement = await createBankAccountMovement(account.id, userId, { amount: 301, type: "EXPENSE", description: "estourando", date: new Date() }, prisma)
    expect(movement).toBeNull()
  })

  it("permite ajuste para baixo usando parte do cheque especial", async () => {
    const account = await createBankAccount(
      userId,
      { name: `AjusteCheque ${Date.now()}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 300, overdraftLimit: 200, active: true },
      prisma
    )
    const result = await adjustBankAccountBalance(account.id, userId, { targetBalance: -100, description: "AJUSTE", date: new Date() }, prisma)
    expect(result).not.toBeNull()

    const accounts = await getBankAccounts(userId, prisma)
    expect(accounts.find((a) => a.id === account.id)?.balance).toBe(-100)
  })

  it("bloqueia ajuste para baixo que excede cheque especial", async () => {
    const account = await createBankAccount(
      userId,
      { name: `AjusteEstoura ${Date.now()}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 300, overdraftLimit: 200, active: true },
      prisma
    )
    const result = await adjustBankAccountBalance(account.id, userId, { targetBalance: -500, description: "AJUSTE", date: new Date() }, prisma)
    expect(result).toBeNull()
  })

  it("permite transferência que deixa saldo negativo dentro do limite", async () => {
    const suffix = Date.now()
    const from = await createBankAccount(
      userId,
      { name: `TransfOrigemCheque ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 100, overdraftLimit: 200, active: true },
      prisma
    )
    const to = await createBankAccount(
      userId,
      { name: `TransfDestinoCheque ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 50, active: true },
      prisma
    )

    const result = await transferBetweenBankAccounts(
      userId,
      { fromAccountId: from.id, toAccountId: to.id, amount: 250, method: "PIX", description: "usando cheque", date: new Date() },
      prisma
    )
    expect(result).not.toBeNull()

    const accounts = await getBankAccounts(userId, prisma)
    expect(accounts.find((a) => a.id === from.id)?.balance).toBe(-150)
    expect(accounts.find((a) => a.id === to.id)?.balance).toBe(300)
  })

  it("bloqueia transferência que excede cheque especial", async () => {
    const suffix = Date.now()
    const from = await createBankAccount(
      userId,
      { name: `TransfEstoura ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 100, overdraftLimit: 200, active: true },
      prisma
    )
    const to = await createBankAccount(
      userId,
      { name: `TransfDestinoEst ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 50, active: true },
      prisma
    )

    const result = await transferBetweenBankAccounts(
      userId,
      { fromAccountId: from.id, toAccountId: to.id, amount: 301, method: "PIX", description: "estourando", date: new Date() },
      prisma
    )
    expect(result).toHaveProperty("error")
  })
})
