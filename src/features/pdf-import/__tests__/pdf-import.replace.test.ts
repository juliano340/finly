// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/lib/pdf/extract-text", () => ({
  extractTextFromPdf: vi.fn(async () => "RAW TEXT"),
}))

vi.mock("@/lib/parsers", () => ({
  getParser: vi.fn(() => ({
    parse: () => ({
      bank: "Inter",
      invoiceTotal: 999,
      dueDate: new Date("2026-09-10T12:00:00"),
      transactions: [
        { cardIdentifier: null, date: new Date("2026-08-15T12:00:00"), description: "NOVA COMPRA ALFA", amount: 100, type: "debit", rawLine: "linha alfa" },
        { cardIdentifier: null, date: new Date("2026-08-16T12:00:00"), description: "NOVA COMPRA BETA", amount: 200, type: "debit", rawLine: "linha beta" },
      ],
    }),
  })),
}))

import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import { createCardInvoice } from "@/features/card-invoices/card-invoices.service"
import { uploadAndParsePdf } from "../pdf-import.service"

const prisma = getTestClient()

function fakePdf(name: string) {
  return { name, arrayBuffer: async () => new ArrayBuffer(8) } as unknown as File
}

describe("uploadAndParsePdf replace", () => {
  let userId = ""

  beforeAll(async () => {
    const result = await registerUser(
      { name: "Replace User", email: `replace-${Date.now()}@test.com`, password: "Senha123" },
      prisma
    )
    userId = ("user" in result ? result.user : null)?.id ?? ""
  })

  afterAll(async () => {
    await prisma.cardInvoiceItem.deleteMany({ where: { userId } })
    await prisma.descriptionMapping.deleteMany({ where: { userId } })
    await prisma.importedTransaction.deleteMany({ where: { userId } })
    await prisma.importSession.deleteMany({ where: { userId } })
    await prisma.cardInvoice.deleteMany({ where: { userId } })
    await prisma.financialMonth.deleteMany({ where: { userId } })
    await prisma.card.deleteMany({ where: { userId } })
    await prisma.category.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })
  })

  async function setupInvoiceWithPreviousImport() {
    const suffix = Date.now()
    const card = await prisma.card.create({ data: { name: `Cartão ${suffix}`, userId } })
    const invoice = await createCardInvoice(
      userId,
      { cardId: card.id, month: "2026-08", dueDate: new Date("2026-09-10T12:00:00"), amount: 500, lifecycleStatus: "OPEN" },
      prisma
    )
    if (!invoice) throw new Error("fatura de teste não criada")

    const oldSession = await prisma.importSession.create({
      data: {
        fileName: "antiga.pdf",
        rawText: "",
        userId,
        transactions: {
          create: [{ description: "COMPRA ANTIGA", amount: 50, rawLine: "antiga", userId }],
        },
      },
      include: { transactions: true },
    })

    const category = await prisma.category.create({
      data: { name: `Cat ${suffix}`, userId, type: "EXPENSE" },
    })
    const oldMapping = await prisma.descriptionMapping.create({
      data: { normalizedDesc: `compra antiga ${suffix}`, categoryId: category.id, importSessionId: oldSession.id, userId },
    })
    const globalMapping = await prisma.descriptionMapping.create({
      data: { normalizedDesc: `global ${suffix}`, categoryId: category.id, userId },
    })

    const importedItem = await prisma.cardInvoiceItem.create({
      data: {
        invoiceId: invoice.id,
        kind: "IMPORTED",
        description: "COMPRA ANTIGA",
        amount: 50,
        importedTransactionId: oldSession.transactions[0].id,
        userId,
      },
    })
    const manualItem = await prisma.cardInvoiceItem.create({
      data: { invoiceId: invoice.id, kind: "MANUAL", description: "ITEM MANUAL", amount: 30, userId },
    })

    await prisma.cardInvoice.update({
      where: { id: invoice.id },
      data: { importSessionId: oldSession.id },
    })

    return { invoice, oldSession, oldMapping, globalMapping, importedItem, manualItem }
  }

  it("replace remove sessão/itens anteriores e cria a nova", async () => {
    const { invoice, oldSession, oldMapping, globalMapping, importedItem, manualItem } =
      await setupInvoiceWithPreviousImport()

    const result = await uploadAndParsePdf(fakePdf("nova.pdf"), userId, invoice.id, prisma, { replace: true })

    expect(result.transactionCount).toBe(2)
    expect(result.invoiceId).toBe(invoice.id)

    expect(await prisma.importSession.findUnique({ where: { id: oldSession.id } })).toBeNull()
    expect(await prisma.importedTransaction.findUnique({ where: { id: oldSession.transactions[0].id } })).toBeNull()
    expect(await prisma.descriptionMapping.findUnique({ where: { id: oldMapping.id } })).toBeNull()
    expect(await prisma.descriptionMapping.findUnique({ where: { id: globalMapping.id } })).not.toBeNull()
    expect(await prisma.cardInvoiceItem.findUnique({ where: { id: importedItem.id } })).toBeNull()
    expect(await prisma.cardInvoiceItem.findUnique({ where: { id: manualItem.id } })).not.toBeNull()

    const updated = await prisma.cardInvoice.findUnique({ where: { id: invoice.id } })
    expect(updated?.importSessionId).toBe(result.sessionId)
    expect(updated?.calculationMode).toBe("ENTERED_TOTAL")
    expect(Number(updated?.amount)).toBe(999)
    expect(Number(updated?.enteredTotal)).toBe(999)

    const newSession = await prisma.importSession.findUnique({
      where: { id: result.sessionId },
      include: { transactions: true },
    })
    expect(newSession?.transactions).toHaveLength(2)
  })

  it("import normal (sem replace) mantém a sessão anterior", async () => {
    const { invoice, oldSession, importedItem, manualItem } = await setupInvoiceWithPreviousImport()

    const result = await uploadAndParsePdf(fakePdf("outra.pdf"), userId, invoice.id, prisma)

    expect(await prisma.importSession.findUnique({ where: { id: oldSession.id } })).not.toBeNull()
    expect(await prisma.cardInvoiceItem.findUnique({ where: { id: importedItem.id } })).not.toBeNull()
    expect(await prisma.cardInvoiceItem.findUnique({ where: { id: manualItem.id } })).not.toBeNull()

    const updated = await prisma.cardInvoice.findUnique({ where: { id: invoice.id } })
    expect(updated?.importSessionId).toBe(result.sessionId)
  })
})
