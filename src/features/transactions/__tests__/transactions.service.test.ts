// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import { createCategory } from "@/features/categories/categories.service"
import { createBankAccount } from "@/features/bank-accounts/bank-accounts.service"
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/features/transactions/transactions.service"

const testPrisma = getTestClient()

describe("Transactions Service", () => {
  let userAId: string
  let userBId: string
  let catExpenseId: string
  let catIncomeId: string
  let bankAccountId: string

  beforeAll(async () => {
    const rA = await registerUser(
      { name: "User A", email: "tx-api-a@test.com", password: "Senha123" },
      testPrisma
    )
    const rB = await registerUser(
      { name: "User B", email: "tx-api-b@test.com", password: "Senha123" },
      testPrisma
    )
    userAId = ("user" in rA ? rA.user : null)?.id ?? ""
    userBId = ("user" in rB ? rB.user : null)?.id ?? ""

    const catExp = await createCategory(
      userAId,
      { name: "Alimentação", type: "EXPENSE" },
      testPrisma
    )
    const catInc = await createCategory(
      userAId,
      { name: "Salário", type: "INCOME" },
      testPrisma
    )
    catExpenseId = catExp.id
    catIncomeId = catInc.id

    const bankAccount = await createBankAccount(
      userAId,
      {
        name: "Conta Teste",
        institution: "Banco Teste",
        type: "CHECKING",
        color: "#22C55E",
        initialBalance: 1000,
        overdraftLimit: 0,
        active: true,
      },
      testPrisma
    )
    bankAccountId = bankAccount.id
  })

  afterAll(async () => {
    await testPrisma.bankAccountMovement.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    })
    await testPrisma.transaction.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    })
    await testPrisma.bankAccount.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    })
    await testPrisma.category.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    })
    await testPrisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    })
  })

  it("retorna array vazio para usuário sem transações", async () => {
    const result = await getTransactions(userBId, {}, testPrisma)
    expect(result.transactions).toEqual([])
    expect(result.total).toBe(0)
  })

  it("cria transação de despesa com sucesso", async () => {
    const tx = await createTransaction(
      userAId,
      {
        amount: 150.5,
        type: "EXPENSE",
        description: "Supermercado",
        categoryId: catExpenseId,
        date: new Date("2026-06-04T12:00:00"),
      },
      testPrisma
    )
    expect(tx.amount).toBe(150.5)
    expect(tx.type).toBe("EXPENSE")
    expect(tx.category.name).toBe("Alimentação")
  })

  it("retorna transações com paginação", async () => {
    for (let i = 0; i < 5; i++) {
      await createTransaction(
        userAId,
        {
          amount: 30 + i,
          type: "EXPENSE",
          categoryId: catExpenseId,
          date: new Date("2026-06-04T12:00:00"),
        },
        testPrisma
      )
    }
    const result = await getTransactions(
      userAId,
      { page: 1, limit: 3 },
      testPrisma
    )
    expect(result.transactions.length).toBe(3)
    expect(result.total).toBeGreaterThanOrEqual(6)
  })

  it("filtra por tipo (só receitas)", async () => {
    await createTransaction(
      userAId,
      {
        amount: 5000,
        type: "INCOME",
        categoryId: catIncomeId,
        date: new Date("2026-06-04T12:00:00"),
      },
      testPrisma
    )
    const result = await getTransactions(
      userAId,
      { type: "INCOME" },
      testPrisma
    )
    expect(result.transactions.every((t) => t.type === "INCOME")).toBe(true)
  })

  it("atualiza transação pelo id", async () => {
    const txs = await getTransactions(userAId, {}, testPrisma)
    const first = txs.transactions[0]
    const updated = await updateTransaction(
      first.id,
      userAId,
      { amount: 999.99, description: "Atualizado" },
      testPrisma
    )
    expect(updated?.amount).toBe(999.99)
    expect(updated?.description).toBe("Atualizado")
  })

  it("deleta transação com sucesso", async () => {
    const tx = await createTransaction(
      userAId,
      {
        amount: 10,
        type: "EXPENSE",
        categoryId: catExpenseId,
        date: new Date(),
      },
      testPrisma
    )
    const deleted = await deleteTransaction(tx.id, userAId, testPrisma)
    expect(deleted).toBe(true)

    const exists = await testPrisma.transaction.findUnique({
      where: { id: tx.id },
    })
    expect(exists).toBeNull()
  })

  it("tenant isolation — User B não vê transações do User A", async () => {
    const result = await getTransactions(userBId, {}, testPrisma)
    expect(result.transactions).toEqual([])
  })

  it("atualização de outro user retorna null", async () => {
    const txs = await getTransactions(userAId, {}, testPrisma)
    const result = await updateTransaction(
      txs.transactions[0].id,
      userBId,
      { amount: 1 },
      testPrisma
    )
    expect(result).toBeNull()
  })

  describe("Deep Link (filtro por ID)", () => {
    it("filtra transação por id específico", async () => {
      const tx = await createTransaction(
        userAId,
        {
          amount: 42,
          type: "EXPENSE",
          description: "Deep link test",
          categoryId: catExpenseId,
          date: new Date("2026-06-15T12:00:00"),
        },
        testPrisma
      )

      const result = await getTransactions(
        userAId,
        { id: tx.id },
        testPrisma
      )
      expect(result.transactions.length).toBe(1)
      expect(result.transactions[0].id).toBe(tx.id)
      expect(result.transactions[0].amount).toBe(42)
    })

    it("retorna vazio quando id não existe", async () => {
      const result = await getTransactions(
        userAId,
        { id: "nonexistent_id_123" },
        testPrisma
      )
      expect(result.transactions.length).toBe(0)
    })
  })

  describe("Bank Account Integration", () => {
    it("cria despesa vinculada a conta bancária e cria movimento", async () => {
      const tx = await createTransaction(
        userAId,
        {
          amount: 200,
          type: "EXPENSE",
          description: "Compra no mercado",
          categoryId: catExpenseId,
          date: new Date("2026-06-10T12:00:00"),
          bankAccountId,
        },
        testPrisma
      )

      expect(tx.bankAccountId).toBe(bankAccountId)
      expect(tx.bankAccount).toBeTruthy()
      expect(tx.bankAccount?.name).toBe("Conta Teste")

      const movement = await testPrisma.bankAccountMovement.findFirst({
        where: {
          bankAccountId,
          userId: userAId,
          amount: 200,
          type: "EXPENSE",
          description: { contains: "TRANSAÇÃO:" },
        },
      })
      expect(movement).toBeTruthy()
    })

    it("cria receita vinculada a conta bancária e cria movimento", async () => {
      const tx = await createTransaction(
        userAId,
        {
          amount: 3000,
          type: "INCOME",
          description: "Salário",
          categoryId: catIncomeId,
          date: new Date("2026-06-10T12:00:00"),
          bankAccountId,
        },
        testPrisma
      )

      expect(tx.bankAccountId).toBe(bankAccountId)

      const movement = await testPrisma.bankAccountMovement.findFirst({
        where: {
          bankAccountId,
          userId: userAId,
          amount: 3000,
          type: "INCOME",
          description: { contains: "TRANSAÇÃO:" },
        },
      })
      expect(movement).toBeTruthy()
    })

    it("exclui transação vinculada e remove movimento da conta", async () => {
      const tx = await createTransaction(
        userAId,
        {
          amount: 50,
          type: "EXPENSE",
          description: "Teste exclusão",
          categoryId: catExpenseId,
          date: new Date("2026-06-10T12:00:00"),
          bankAccountId,
        },
        testPrisma
      )

      const movementBefore = await testPrisma.bankAccountMovement.findFirst({
        where: {
          bankAccountId,
          userId: userAId,
          amount: 50,
          type: "EXPENSE",
          description: { contains: "TRANSAÇÃO:" },
        },
      })
      expect(movementBefore).toBeTruthy()

      const deleted = await deleteTransaction(tx.id, userAId, testPrisma)
      expect(deleted).toBe(true)

      const movementAfter = await testPrisma.bankAccountMovement.findFirst({
        where: {
          bankAccountId,
          userId: userAId,
          amount: 50,
          type: "EXPENSE",
          description: { contains: "TRANSAÇÃO:" },
        },
      })
      expect(movementAfter).toBeNull()
    })

    it("edita transação e troca de conta bancária", async () => {
      const otherBankAccount = await createBankAccount(
        userAId,
        {
          name: "Conta Outra",
          institution: "Banco Outro",
          type: "SAVINGS",
          color: "#3B82F6",
          initialBalance: 500,
          overdraftLimit: 0,
          active: true,
        },
        testPrisma
      )

      const tx = await createTransaction(
        userAId,
        {
          amount: 100,
          type: "EXPENSE",
          description: "Teste troca conta",
          categoryId: catExpenseId,
          date: new Date("2026-06-10T12:00:00"),
          bankAccountId,
        },
        testPrisma
      )

      const updated = await updateTransaction(
        tx.id,
        userAId,
        { bankAccountId: otherBankAccount.id },
        testPrisma
      )

      expect(updated?.bankAccountId).toBe(otherBankAccount.id)

      const oldMovement = await testPrisma.bankAccountMovement.findFirst({
        where: {
          bankAccountId,
          userId: userAId,
          amount: 100,
          description: { contains: "TRANSAÇÃO:" },
        },
      })
      expect(oldMovement).toBeNull()

      const newMovement = await testPrisma.bankAccountMovement.findFirst({
        where: {
          bankAccountId: otherBankAccount.id,
          userId: userAId,
          amount: 100,
          description: { contains: "TRANSAÇÃO:" },
        },
      })
      expect(newMovement).toBeTruthy()
    })

    it("movimento criado de transação tem transactionId preenchido", async () => {
      const tx = await createTransaction(
        userAId,
        {
          amount: 77,
          type: "EXPENSE",
          description: "Teste transactionId",
          categoryId: catExpenseId,
          date: new Date("2026-06-15T12:00:00"),
          bankAccountId,
        },
        testPrisma
      )

      const movement = await testPrisma.bankAccountMovement.findFirst({
        where: {
          bankAccountId,
          userId: userAId,
          transactionId: tx.id,
        },
      })
      expect(movement).toBeTruthy()
      expect(movement?.transactionId).toBe(tx.id)
    })

    it("retorna bankAccount no include ao buscar transações", async () => {
      const tx = await createTransaction(
        userAId,
        {
          amount: 88,
          type: "INCOME",
          description: "Teste include",
          categoryId: catIncomeId,
          date: new Date("2026-06-15T12:00:00"),
          bankAccountId,
        },
        testPrisma
      )

      const result = await getTransactions(
        userAId,
        { id: tx.id },
        testPrisma
      )
      expect(result.transactions[0].bankAccount).toBeTruthy()
      expect(result.transactions[0].bankAccount?.id).toBe(bankAccountId)
      expect(result.transactions[0].bankAccount?.name).toBe("Conta Teste")
    })

    it("rejeita despesa que excede saldo da conta sem cheque especial", async () => {
      const limitedAccount = await createBankAccount(
        userAId,
        {
          name: "Conta Limitada",
          institution: "Banco Teste",
          type: "CHECKING",
          color: "#EF4444",
          initialBalance: 50,
          overdraftLimit: 0,
          active: true,
        },
        testPrisma
      )

      await expect(
        createTransaction(
          userAId,
          {
            amount: 100,
            type: "EXPENSE",
            description: "Excede saldo",
            categoryId: catExpenseId,
            date: new Date("2026-06-15T12:00:00"),
            bankAccountId: limitedAccount.id,
          },
          testPrisma
        )
      ).rejects.toThrow()
    })

    it("remove bankAccountId da transação e remove movimento", async () => {
      const tx = await createTransaction(
        userAId,
        {
          amount: 33,
          type: "EXPENSE",
          description: "Teste remover conta",
          categoryId: catExpenseId,
          date: new Date("2026-06-15T12:00:00"),
          bankAccountId,
        },
        testPrisma
      )

      const updated = await updateTransaction(
        tx.id,
        userAId,
        { bankAccountId: "" },
        testPrisma
      )

      expect(updated?.bankAccountId).toBeNull()

      const movement = await testPrisma.bankAccountMovement.findFirst({
        where: { transactionId: tx.id },
      })
      expect(movement).toBeNull()
    })

    it("atualiza valor da transação e movimento é atualizado", async () => {
      const tx = await createTransaction(
        userAId,
        {
          amount: 100,
          type: "EXPENSE",
          description: "Teste atualizar valor",
          categoryId: catExpenseId,
          date: new Date("2026-06-15T12:00:00"),
          bankAccountId,
        },
        testPrisma
      )

      const updated = await updateTransaction(
        tx.id,
        userAId,
        { amount: 250 },
        testPrisma
      )
      expect(updated?.amount).toBe(250)

      const oldMovement = await testPrisma.bankAccountMovement.findFirst({
        where: { transactionId: tx.id, amount: 100 },
      })
      expect(oldMovement).toBeNull()

      const newMovement = await testPrisma.bankAccountMovement.findFirst({
        where: { transactionId: tx.id, amount: 250 },
      })
      expect(newMovement).toBeTruthy()
    })
  })
})
