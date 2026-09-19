// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import { adjustBankAccountBalance, createBankAccount, createBankAccountMovement, deleteBankAccountMovement, getBankAccounts, getBankAccountsTotal, importBenefitStatement, rechargeBenefitAccount, transferBetweenBankAccounts } from "../bank-accounts.service"
import { computeBenefitTotals } from "../benefit"
import { createTransaction } from "@/features/transactions/transactions.service"

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
      { name: `Mercado Pago ${Date.now()}`, institution: "Mercado Pago", type: "DIGITAL", color: "#22C55E", initialBalance: 1000, active: true, overdraftLimit: 0 },
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
      { name: `Ajuste ${Date.now()}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 1000, active: true, overdraftLimit: 0 },
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
      { name: `Origem ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 1000, active: true, overdraftLimit: 0 },
      prisma
    )
    const to = await createBankAccount(
      userId,
      { name: `Destino ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 200, active: true, overdraftLimit: 0 },
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
      { name: `Mesma ${Date.now()}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 100, active: true, overdraftLimit: 0 },
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
      { name: `Origem outro ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 1000, active: true, overdraftLimit: 0 },
      prisma
    )
    const to = await createBankAccount(
      otherUserId,
      { name: `Destino outro ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 200, active: true, overdraftLimit: 0 },
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
      { name: `Cobertura ${Date.now()}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 500, active: true, overdraftLimit: 0 },
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
      { name: `TransfDestinoCheque ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 50, active: true, overdraftLimit: 0 },
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
      { name: `TransfDestinoEst ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 50, active: true, overdraftLimit: 0 },
      prisma
    )

    const result = await transferBetweenBankAccounts(
      userId,
      { fromAccountId: from.id, toAccountId: to.id, amount: 301, method: "PIX", description: "estourando", date: new Date() },
      prisma
    )
    expect(result).toHaveProperty("error")
  })

  it("estorna movimentação manual e recalcula o saldo", async () => {
    const suffix = Date.now()
    const account = await createBankAccount(
      userId,
      { name: `Estorno ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 500, active: true, overdraftLimit: 0 },
      prisma
    )
    const movement = await createBankAccountMovement(
      account.id,
      userId,
      { amount: 100, type: "EXPENSE", description: "Compra estornável", date: new Date("2026-06-05T12:00:00") },
      prisma
    )

    await expect(deleteBankAccountMovement(movement!.id, userId, prisma)).resolves.toMatchObject({ id: movement!.id })

    const accounts = await getBankAccounts(userId, prisma)
    expect(accounts.find((item) => item.id === account.id)?.balance).toBe(500)
  })

  it("bloqueia estorno de movimentação vinculada a lançamento", async () => {
    const suffix = Date.now()
    const account = await createBankAccount(
      userId,
      { name: `Estorno vinculado ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 500, active: true, overdraftLimit: 0 },
      prisma
    )
    const movement = await createBankAccountMovement(
      account.id,
      userId,
      { amount: 100, type: "EXPENSE", description: "Vinculada", date: new Date("2026-06-06T12:00:00") },
      prisma
    )
    const category = await prisma.category.create({
      data: { name: `Estorno cat ${suffix}`, userId, type: "EXPENSE" },
    })
    const transaction = await prisma.transaction.create({
      data: {
        amount: 100,
        type: "EXPENSE",
        categoryId: category.id,
        bankAccountId: account.id,
        userId,
        date: new Date("2026-06-06T12:00:00"),
      },
    })
    await prisma.bankAccountMovement.update({
      where: { id: movement!.id },
      data: { transactionId: transaction.id },
    })

    const result = await deleteBankAccountMovement(movement!.id, userId, prisma)
    expect(result).toHaveProperty("error")
    await expect(prisma.bankAccountMovement.findUnique({ where: { id: movement!.id } })).resolves.not.toBeNull()
  })

  it("bloqueia estorno de movimentação de outro usuário", async () => {
    const suffix = Date.now()
    const account = await createBankAccount(
      userId,
      { name: `Estorno dono ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 500, active: true, overdraftLimit: 0 },
      prisma
    )
    const movement = await createBankAccountMovement(
      account.id,
      userId,
      { amount: 100, type: "EXPENSE", description: "De outro dono", date: new Date("2026-06-07T12:00:00") },
      prisma
    )

    const result = await deleteBankAccountMovement(movement!.id, "usuario-inexistente", prisma)
    expect(result).toBeNull()
    await expect(prisma.bankAccountMovement.findUnique({ where: { id: movement!.id } })).resolves.not.toBeNull()
  })

  it("estorna o par de transferência e restaura os saldos", async () => {
    const suffix = Date.now()
    const from = await createBankAccount(
      userId,
      { name: `Transf estorno origem ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 500, active: true, overdraftLimit: 0 },
      prisma
    )
    const to = await createBankAccount(
      userId,
      { name: `Transf estorno destino ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 100, active: true, overdraftLimit: 0 },
      prisma
    )
    const transfer = await transferBetweenBankAccounts(
      userId,
      { fromAccountId: from.id, toAccountId: to.id, amount: 50, method: "PIX", date: new Date("2026-06-08T12:00:00") },
      prisma
    )
    if (!transfer || "error" in transfer) throw new Error("transferência de teste não criada")

    const result = await deleteBankAccountMovement(transfer.outgoing.id, userId, prisma)
    if (!result || !("reversedTransfer" in result)) throw new Error("estorno conjunto não retornou o objeto esperado")
    expect(result.movements).toHaveLength(2)
    expect(result.reversedTransfer).toEqual(expect.any(String))

    await expect(prisma.bankAccountMovement.findUnique({ where: { id: transfer.outgoing.id } })).resolves.toBeNull()
    await expect(prisma.bankAccountMovement.findUnique({ where: { id: transfer.incoming.id } })).resolves.toBeNull()

    const accounts = await getBankAccounts(userId, prisma)
    expect(accounts.find((item) => item.id === from.id)?.balance).toBe(500)
    expect(accounts.find((item) => item.id === to.id)?.balance).toBe(100)
  })

  it("bloqueia estorno de par de transferência inconsistente", async () => {
    const suffix = Date.now()
    const from = await createBankAccount(
      userId,
      { name: `Transf inconsistente origem ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 500, active: true, overdraftLimit: 0 },
      prisma
    )
    const to = await createBankAccount(
      userId,
      { name: `Transf inconsistente destino ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 100, active: true, overdraftLimit: 0 },
      prisma
    )
    const transfer = await transferBetweenBankAccounts(
      userId,
      { fromAccountId: from.id, toAccountId: to.id, amount: 50, method: "PIX", date: new Date("2026-06-12T12:00:00") },
      prisma
    )
    if (!transfer || "error" in transfer) throw new Error("transferência de teste não criada")

    await prisma.bankAccountMovement.delete({ where: { id: transfer.incoming.id } })

    const result = await deleteBankAccountMovement(transfer.outgoing.id, userId, prisma)
    expect(result).toEqual({ error: "Par de transferência inconsistente — nenhum movimento estornado." })
    await expect(prisma.bankAccountMovement.findUnique({ where: { id: transfer.outgoing.id } })).resolves.not.toBeNull()
  })

  it("bloqueia estorno de par que deixaria a conta destino abaixo do cheque especial", async () => {
    const suffix = Date.now()
    const from = await createBankAccount(
      userId,
      { name: `Transf invariante origem ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 500, active: true, overdraftLimit: 0 },
      prisma
    )
    const to = await createBankAccount(
      userId,
      { name: `Transf invariante destino ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 0, active: true, overdraftLimit: 0 },
      prisma
    )
    const transfer = await transferBetweenBankAccounts(
      userId,
      { fromAccountId: from.id, toAccountId: to.id, amount: 400, method: "PIX", date: new Date("2026-06-13T12:00:00") },
      prisma
    )
    if (!transfer || "error" in transfer) throw new Error("transferência de teste não criada")

    await createBankAccountMovement(
      to.id,
      userId,
      { amount: 400, type: "EXPENSE", description: "Gasto do destino", date: new Date("2026-06-14T12:00:00") },
      prisma
    )

    const result = await deleteBankAccountMovement(transfer.outgoing.id, userId, prisma)
    expect(result).toHaveProperty("error")
    await expect(prisma.bankAccountMovement.findUnique({ where: { id: transfer.outgoing.id } })).resolves.not.toBeNull()
    await expect(prisma.bankAccountMovement.findUnique({ where: { id: transfer.incoming.id } })).resolves.not.toBeNull()
  })

  it("bloqueia remoção que deixaria a conta abaixo do cheque especial", async () => {
    const suffix = Date.now()
    const account = await createBankAccount(
      userId,
      { name: `Invariante saldo ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 0, active: true, overdraftLimit: 100 },
      prisma
    )
    const income = await createBankAccountMovement(
      account.id,
      userId,
      { amount: 500, type: "INCOME", description: "Entrada", date: new Date("2026-06-09T12:00:00") },
      prisma
    )
    await createBankAccountMovement(
      account.id,
      userId,
      { amount: 550, type: "EXPENSE", description: "Saída", date: new Date("2026-06-10T12:00:00") },
      prisma
    )

    const result = await deleteBankAccountMovement(income!.id, userId, prisma)
    expect(result).toHaveProperty("error")
    await expect(prisma.bankAccountMovement.findUnique({ where: { id: income!.id } })).resolves.not.toBeNull()
  })

  it("ajuste manual com prefixo AJUSTE_MANUAL: é bloqueado no estorno", async () => {
    const suffix = Date.now()
    const account = await createBankAccount(
      userId,
      { name: `Estorno ajuste ${suffix}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 500, active: true, overdraftLimit: 0 },
      prisma
    )
    const adjustment = await adjustBankAccountBalance(
      account.id,
      userId,
      { targetBalance: 300, description: "CONFERENCIA", date: new Date("2026-06-11T12:00:00") },
      prisma
    )
    expect(adjustment?.description?.startsWith("AJUSTE_MANUAL:")).toBe(true)

    const result = await deleteBankAccountMovement(adjustment!.id, userId, prisma)
    expect(result).toEqual({ error: "Ajustes de saldo não são estornáveis — faça um novo ajuste para corrigir o saldo." })
    await expect(prisma.bankAccountMovement.findUnique({ where: { id: adjustment!.id } })).resolves.not.toBeNull()
  })

  it("importa extrato de benefício e ignora duplicados na reimportação", async () => {
    const benefit = await createBankAccount(
      userId,
      {
        name: `Benefício extrato ${Date.now()}`,
        institution: "FLASH",
        type: "BENEFIT",
        color: "#16A34A",
        initialBalance: 0,
        overdraftLimit: 0,
        benefitDailyRate: null,
        active: true,
      },
      prisma,
    )

    const csv = [
      "Data,Hora,Movimentação,Valor,Meio de Pagamento,Saldo",
      '29/08/2026,00:31,"Depósito transferido","R$ 466,20",Depósito,"R$ 466,71"',
      '14/09/2026,11:31,"JOAO RENATO ROSSETI PORTO ALEGRE BRA","-R$ 18,50",Cartão,"R$ 447,70"',
    ].join("\n")

    await expect(importBenefitStatement(benefit.id, userId, csv, {}, prisma)).resolves.toEqual({
      imported: 2,
      duplicates: 0,
      errors: [],
      manualReplaced: 0,
      balanceAdjusted: 0,
      finalBalance: 447.7,
      totalIn: 466.2,
      totalOut: 18.5,
    })

    const movements = await prisma.bankAccountMovement.findMany({
      where: { bankAccountId: benefit.id },
      orderBy: { date: "asc" },
    })
    expect(movements).toHaveLength(2)
    expect(movements[0].type).toBe("INCOME")
    expect(Number(movements[0].amount)).toBe(466.2)
    expect(movements[1].type).toBe("EXPENSE")
    expect(Number(movements[1].amount)).toBe(18.5)

    const totals = computeBenefitTotals(
      [{ benefitDailyRate: null, movements: movements.map((movement) => ({ amount: Number(movement.amount), type: movement.type })) }],
      "2026-09",
    )
    expect(totals).toEqual({ credited: 466.2, spent: 18.5, estimated: false })

    await expect(importBenefitStatement(benefit.id, userId, csv, {}, prisma)).resolves.toEqual({
      imported: 0,
      duplicates: 2,
      errors: [],
      manualReplaced: 0,
      balanceAdjusted: 0,
      finalBalance: 447.7,
      totalIn: 466.2,
      totalOut: 18.5,
    })
    await expect(prisma.bankAccountMovement.count({ where: { bankAccountId: benefit.id } })).resolves.toBe(2)
  })

  it("rejeita importação de extrato em conta que não é benefício", async () => {
    const account = await createBankAccount(
      userId,
      { name: `Sem benefício ${Date.now()}`, institution: "Teste", type: "DIGITAL", color: "#22C55E", initialBalance: 0, active: true, overdraftLimit: 0 },
      prisma,
    )
    const csv = [
      "Data,Movimentação,Valor",
      '29/08/2026,"Depósito transferido","R$ 10,00"',
    ].join("\n")

    await expect(importBenefitStatement(account.id, userId, csv, {}, prisma)).resolves.toBeNull()
  })

  it("reconcilia o saldo da conta com o saldo final do extrato", async () => {
    const benefit = await createBankAccount(
      userId,
      { name: `Benefício reconcile ${Date.now()}`, institution: "FLASH", type: "BENEFIT", color: "#16A34A", initialBalance: 118, overdraftLimit: 0, benefitDailyRate: null, active: true },
      prisma,
    )
    const csv = [
      "Data,Hora,Movimentação,Valor,Meio de Pagamento,Saldo",
      '14/09/2026,11:31,"JOAO RENATO","-R$ 18,50",Cartão,"R$ 448,21"',
      '29/08/2026,00:31,"Depósito transferido","R$ 466,20",Depósito,"R$ 466,71"',
    ].join("\n")

    const result = await importBenefitStatement(benefit.id, userId, csv, {}, prisma)

    expect(result).toEqual({
      imported: 2,
      duplicates: 0,
      errors: [],
      manualReplaced: 0,
      balanceAdjusted: -117.49,
      finalBalance: 448.21,
      totalIn: 466.2,
      totalOut: 18.5,
    })

    const movements = await prisma.bankAccountMovement.findMany({ where: { bankAccountId: benefit.id } })
    const balance = movements.reduce(
      (total, movement) => total + (movement.type === "INCOME" ? Number(movement.amount) : -Number(movement.amount)),
      118,
    )
    expect(balance).toBeCloseTo(448.21, 2)

    const adjustment = movements.find((movement) => movement.description === "AJUSTE IMPORTACAO EXTRATO")
    expect(adjustment).toBeDefined()
    expect(adjustment?.type).toBe("EXPENSE")
    expect(Number(adjustment?.amount)).toBeCloseTo(117.49, 2)
    expect(adjustment?.date.toISOString().slice(0, 10)).toBe("2026-09-14")

    const totals = computeBenefitTotals(
      [{ benefitDailyRate: null, movements: movements.map((movement) => ({ amount: Number(movement.amount), type: movement.type, description: movement.description })) }],
      "2026-09",
    )
    expect(totals).toEqual({ credited: 466.2, spent: 18.5, estimated: false })
  })

  it("não cria ajuste duplicado ao reimportar extrato reconciliado", async () => {
    const benefit = await createBankAccount(
      userId,
      { name: `Benefício reconcile reimport ${Date.now()}`, institution: "FLASH", type: "BENEFIT", color: "#16A34A", initialBalance: 118, overdraftLimit: 0, benefitDailyRate: null, active: true },
      prisma,
    )
    const csv = [
      "Data,Hora,Movimentação,Valor,Meio de Pagamento,Saldo",
      '14/09/2026,11:31,"JOAO RENATO","-R$ 18,50",Cartão,"R$ 448,21"',
      '29/08/2026,00:31,"Depósito transferido","R$ 466,20",Depósito,"R$ 466,71"',
    ].join("\n")

    await importBenefitStatement(benefit.id, userId, csv, {}, prisma)
    const second = await importBenefitStatement(benefit.id, userId, csv, {}, prisma)

    expect(second?.imported).toBe(0)
    expect(second?.duplicates).toBe(2)
    expect(second?.balanceAdjusted).toBe(0)
    await expect(
      prisma.bankAccountMovement.count({ where: { bankAccountId: benefit.id, description: "AJUSTE IMPORTACAO EXTRATO" } }),
    ).resolves.toBe(1)
  })

  it("não cria ajuste quando o saldo já confere com o extrato", async () => {
    const benefit = await createBankAccount(
      userId,
      { name: `Benefício já confere ${Date.now()}`, institution: "FLASH", type: "BENEFIT", color: "#16A34A", initialBalance: 0.51, overdraftLimit: 0, benefitDailyRate: null, active: true },
      prisma,
    )
    const csv = [
      "Data,Hora,Movimentação,Valor,Meio de Pagamento,Saldo",
      '14/09/2026,11:31,"JOAO RENATO","-R$ 18,50",Cartão,"R$ 448,21"',
      '29/08/2026,00:31,"Depósito transferido","R$ 466,20",Depósito,"R$ 466,71"',
    ].join("\n")

    const result = await importBenefitStatement(benefit.id, userId, csv, {}, prisma)

    expect(result?.balanceAdjusted).toBe(0)
    expect(result?.finalBalance).toBe(448.21)
    await expect(
      prisma.bankAccountMovement.count({ where: { bankAccountId: benefit.id, description: "AJUSTE IMPORTACAO EXTRATO" } }),
    ).resolves.toBe(0)
  })

  it("substitui registros manuais dentro da janela do extrato quando replaceManual=true", async () => {
    const suffix = Date.now()
    const benefit = await createBankAccount(
      userId,
      { name: `Benefício manuais ${suffix}`, institution: "FLASH", type: "BENEFIT", color: "#16A34A", initialBalance: 1000, overdraftLimit: 0, benefitDailyRate: null, active: true },
      prisma,
    )
    const category = await prisma.category.create({ data: { name: `Cat manuais ${suffix}`, userId, type: "INCOME" } })

    await adjustBankAccountBalance(benefit.id, userId, { targetBalance: 900, description: "AJUSTE NA JANELA", date: new Date(2026, 8, 1, 12) }, prisma)
    await adjustBankAccountBalance(benefit.id, userId, { targetBalance: 950, description: "AJUSTE FORA", date: new Date(2026, 7, 15, 12) }, prisma)
    const transaction = await createTransaction(
      userId,
      { amount: 50, type: "INCOME", description: "RECEITA MANUAL", date: new Date(2026, 8, 2, 12), categoryId: category.id, bankAccountId: benefit.id },
      prisma,
    )

    const csv = [
      "Data,Movimentação,Valor",
      '01/09/2026,"Compra na janela","-R$ 10,00"',
      '14/09/2026,"Crédito na janela","R$ 5,00"',
    ].join("\n")

    const result = await importBenefitStatement(benefit.id, userId, csv, { replaceManual: true }, prisma)

    expect(result?.imported).toBe(2)
    expect(result?.manualReplaced).toBe(2)
    expect(result?.finalBalance).toBeNull()

    const movements = await prisma.bankAccountMovement.findMany({ where: { bankAccountId: benefit.id } })
    expect(movements.some((movement) => movement.description?.startsWith("AJUSTE_MANUAL") && movement.date.toISOString().slice(0, 10) === "2026-08-15")).toBe(true)
    expect(movements.some((movement) => movement.description?.startsWith("AJUSTE_MANUAL") && movement.date.toISOString().slice(0, 10) === "2026-09-01")).toBe(false)
    expect(movements.some((movement) => movement.description?.startsWith("TRANSAÇÃO"))).toBe(false)
    expect(movements.filter((movement) => movement.description === "Compra na janela" || movement.description === "Crédito na janela")).toHaveLength(2)

    const reversed = await prisma.transaction.findUnique({ where: { id: transaction.id } })
    expect(reversed?.status).toBe("REVERSED")
  })

  it("mantém registros manuais quando replaceManual não é enviado", async () => {
    const suffix = Date.now()
    const benefit = await createBankAccount(
      userId,
      { name: `Benefício manuais preservados ${suffix}`, institution: "FLASH", type: "BENEFIT", color: "#16A34A", initialBalance: 1000, overdraftLimit: 0, benefitDailyRate: null, active: true },
      prisma,
    )

    await adjustBankAccountBalance(benefit.id, userId, { targetBalance: 900, description: "AJUSTE PRESERVADO", date: new Date(2026, 8, 1, 12) }, prisma)

    const csv = [
      "Data,Movimentação,Valor",
      '01/09/2026,"Compra na janela","-R$ 10,00"',
      '14/09/2026,"Crédito na janela","R$ 5,00"',
    ].join("\n")

    const result = await importBenefitStatement(benefit.id, userId, csv, {}, prisma)

    expect(result?.manualReplaced).toBe(0)
    const movements = await prisma.bankAccountMovement.findMany({ where: { bankAccountId: benefit.id } })
    expect(movements.some((movement) => movement.description?.startsWith("AJUSTE_MANUAL"))).toBe(true)
  })

  it("atualiza o ajuste existente em vez de acumular ao reconciliar de novo", async () => {
    const benefit = await createBankAccount(
      userId,
      { name: `Benefício ajuste único ${Date.now()}`, institution: "FLASH", type: "BENEFIT", color: "#16A34A", initialBalance: 118, overdraftLimit: 0, benefitDailyRate: null, active: true },
      prisma,
    )
    const csv = [
      "Data,Hora,Movimentação,Valor,Meio de Pagamento,Saldo",
      '14/09/2026,11:31,"JOAO RENATO","-R$ 18,50",Cartão,"R$ 448,21"',
      '29/08/2026,00:31,"Depósito transferido","R$ 466,20",Depósito,"R$ 466,71"',
    ].join("\n")

    await importBenefitStatement(benefit.id, userId, csv, {}, prisma)
    await createBankAccountMovement(benefit.id, userId, { amount: 50, type: "INCOME", description: "ENTRADA EXTRA", date: new Date(2026, 8, 20, 12) }, prisma)

    const result = await importBenefitStatement(benefit.id, userId, csv, {}, prisma)

    expect(result?.balanceAdjusted).toBe(-50)
    const adjustments = await prisma.bankAccountMovement.findMany({ where: { bankAccountId: benefit.id, description: "AJUSTE IMPORTACAO EXTRATO" } })
    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].type).toBe("EXPENSE")
    expect(Number(adjustments[0].amount)).toBeCloseTo(167.49, 2)

    const movements = await prisma.bankAccountMovement.findMany({ where: { bankAccountId: benefit.id } })
    const balance = movements.reduce((total, movement) => total + (movement.type === "INCOME" ? Number(movement.amount) : -Number(movement.amount)), 118)
    expect(balance).toBeCloseTo(448.21, 2)
  })

  it("deleta o ajuste quando o diff zera o valor existente", async () => {
    const benefit = await createBankAccount(
      userId,
      { name: `Benefício ajuste zera ${Date.now()}`, institution: "FLASH", type: "BENEFIT", color: "#16A34A", initialBalance: 118, overdraftLimit: 0, benefitDailyRate: null, active: true },
      prisma,
    )
    const csv = [
      "Data,Hora,Movimentação,Valor,Meio de Pagamento,Saldo",
      '14/09/2026,11:31,"JOAO RENATO","-R$ 18,50",Cartão,"R$ 448,21"',
      '29/08/2026,00:31,"Depósito transferido","R$ 466,20",Depósito,"R$ 466,71"',
    ].join("\n")

    await importBenefitStatement(benefit.id, userId, csv, {}, prisma)
    await createBankAccountMovement(benefit.id, userId, { amount: 117.49, type: "EXPENSE", description: "GASTO EXTRA", date: new Date(2026, 8, 20, 12) }, prisma)

    const result = await importBenefitStatement(benefit.id, userId, csv, {}, prisma)

    expect(result?.balanceAdjusted).toBe(117.49)
    await expect(prisma.bankAccountMovement.count({ where: { bankAccountId: benefit.id, description: "AJUSTE IMPORTACAO EXTRATO" } })).resolves.toBe(0)

    const movements = await prisma.bankAccountMovement.findMany({ where: { bankAccountId: benefit.id } })
    const balance = movements.reduce((total, movement) => total + (movement.type === "INCOME" ? Number(movement.amount) : -Number(movement.amount)), 118)
    expect(balance).toBeCloseTo(448.21, 2)
  })

  it("consolida dois ajustes antigos em um único ao reconciliar", async () => {
    const benefit = await createBankAccount(
      userId,
      { name: `Benefício ajustes antigos ${Date.now()}`, institution: "FLASH", type: "BENEFIT", color: "#16A34A", initialBalance: 118, overdraftLimit: 0, benefitDailyRate: null, active: true },
      prisma,
    )
    const csv = [
      "Data,Hora,Movimentação,Valor,Meio de Pagamento,Saldo",
      '14/09/2026,11:31,"JOAO RENATO","-R$ 18,50",Cartão,"R$ 448,21"',
      '29/08/2026,00:31,"Depósito transferido","R$ 466,20",Depósito,"R$ 466,71"',
    ].join("\n")

    await importBenefitStatement(benefit.id, userId, csv, {}, prisma)
    await prisma.bankAccountMovement.create({
      data: { bankAccountId: benefit.id, amount: 10, type: "EXPENSE", description: "AJUSTE IMPORTACAO EXTRATO", date: new Date(2026, 8, 21, 12), userId },
    })
    await createBankAccountMovement(benefit.id, userId, { amount: 10, type: "INCOME", description: "ENTRADA EXTRA", date: new Date(2026, 8, 22, 12) }, prisma)

    const result = await importBenefitStatement(benefit.id, userId, csv, {}, prisma)

    expect(result?.balanceAdjusted).toBe(0)
    const adjustments = await prisma.bankAccountMovement.findMany({ where: { bankAccountId: benefit.id, description: "AJUSTE IMPORTACAO EXTRATO" } })
    expect(adjustments).toHaveLength(1)
    expect(Number(adjustments[0].amount)).toBeCloseTo(127.49, 2)

    const movements = await prisma.bankAccountMovement.findMany({ where: { bankAccountId: benefit.id } })
    const balance = movements.reduce((total, movement) => total + (movement.type === "INCOME" ? Number(movement.amount) : -Number(movement.amount)), 118)
    expect(balance).toBeCloseTo(448.21, 2)
  })
})
