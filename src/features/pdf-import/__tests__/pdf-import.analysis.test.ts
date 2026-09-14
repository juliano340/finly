// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("pdf-parse", () => ({ default: vi.fn() }))

import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import { getInvoiceAnalysis, updateTransactionCategory } from "../pdf-import.service"

const prisma = getTestClient()

describe("análise reflete categorias manuais", () => {
  let userId = ""

  beforeAll(async () => {
    const result = await registerUser(
      { name: "Analysis User", email: `analysis-${Date.now()}@test.com`, password: "Senha123" },
      prisma
    )
    userId = ("user" in result ? result.user : null)?.id ?? ""
  })

  afterAll(async () => {
    await prisma.descriptionMapping.deleteMany({ where: { userId } })
    await prisma.importedTransaction.deleteMany({ where: { userId } })
    await prisma.importSession.deleteMany({ where: { userId } })
    await prisma.category.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
  })

  async function createCategory(name: string) {
    return prisma.category.create({
      data: { name: `${name} ${Date.now()}`, userId, type: "EXPENSE" },
    })
  }

  async function createSessionWithTransactions(descriptions: string[]) {
    const session = await prisma.importSession.create({
      data: { fileName: "fatura.pdf", rawText: "", userId },
    })
    const txs = []
    for (const description of descriptions) {
      txs.push(
        await prisma.importedTransaction.create({
          data: {
            importSessionId: session.id,
            description,
            amount: 10,
            rawLine: description,
            userId,
          },
        })
      )
    }
    return { session, txs }
  }

  it("categoria manual entra no ranking e no chart após recarregar a análise", async () => {
    const category = await createCategory("Categoria QA")
    const { session, txs } = await createSessionWithTransactions([
      "PADARIA ALFA",
      "FARMACIA BETA",
      "OFICINA GAMA",
    ])

    const before = await getInvoiceAnalysis(session.id, userId, prisma)
    expect(before?.ranking.every((item) => item.categoryId === null)).toBe(true)

    await updateTransactionCategory(txs[0].id, category.id, userId, prisma)

    const mapping = await prisma.descriptionMapping.findFirst({
      where: { userId, categoryId: category.id },
    })
    expect(mapping?.importSessionId).toBe(session.id)

    const after = await getInvoiceAnalysis(session.id, userId, prisma)
    const rankingItem = after?.ranking.find((item) => item.originals.includes("PADARIA ALFA"))
    expect(rankingItem?.categoryId).toBe(category.id)

    const chartItem = after?.chartData.find((item) => item.name === category.name)
    expect(chartItem?.total).toBe(10)
    expect(chartItem?.count).toBe(1)
  })

  it("mapping global sem sessão (legado) alimenta o ranking", async () => {
    const category = await createCategory("Categoria Legado")
    const { session, txs } = await createSessionWithTransactions(["PAPELARIA LEGADO"])

    await updateTransactionCategory(txs[0].id, category.id, userId, prisma)
    await prisma.descriptionMapping.updateMany({ where: { userId }, data: { importSessionId: null } })

    const analysis = await getInvoiceAnalysis(session.id, userId, prisma)
    const rankingItem = analysis?.ranking.find((item) => item.originals.includes("PAPELARIA LEGADO"))
    expect(rankingItem?.categoryId).toBe(category.id)
  })

  it("categoria gravada direto na transação (sem mapping) alimenta o ranking", async () => {
    const category = await createCategory("Categoria Direta")
    const { session, txs } = await createSessionWithTransactions(["ELETRICA DIRETA"])

    await prisma.importedTransaction.update({
      where: { id: txs[0].id },
      data: { categoryId: category.id },
    })

    const analysis = await getInvoiceAnalysis(session.id, userId, prisma)
    const rankingItem = analysis?.ranking.find((item) => item.originals.includes("ELETRICA DIRETA"))
    expect(rankingItem?.categoryId).toBe(category.id)
  })
})
