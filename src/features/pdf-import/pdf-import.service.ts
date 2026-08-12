import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@/generated/prisma/client"
import { moneyToNumber } from "@/lib/money"
import { extractTextFromPdf } from "@/lib/pdf/extract-text"
import { getParser } from "@/lib/parsers"
import { normalizeDescription } from "@/lib/formatters/normalize-description"
import { stringSimilarity } from "@/lib/formatters/string-similarity"
import type { ImportSessionData } from "./pdf-import.types"

export type PdfImportResult = {
  sessionId: string
  transactionCount: number
  invoiceId: string | null
}

export async function uploadAndParsePdf(
  file: File,
  userId: string,
  cardInvoiceId?: string,
  client?: PrismaClient
): Promise<PdfImportResult> {
  const db = client ?? defaultPrisma

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const rawText = await extractTextFromPdf(buffer)

  const parser = getParser(rawText)
  if (!parser) {
    throw new Error("Não foi possível detectar o banco desta fatura. Formato não suportado.")
  }

  const parsed = parser.parse(rawText)

  const session = await db.importSession.create({
    data: {
      fileName: file.name,
      bank: parsed.bank,
      invoiceTotal: parsed.invoiceTotal,
      dueDate: parsed.dueDate,
      rawText,
      userId,
      transactions: {
        create: parsed.transactions.map((t) => ({
          cardIdentifier: t.cardIdentifier,
          date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.type,
          rawLine: t.rawLine,
          userId,
        })),
      },
    },
  })

  if (cardInvoiceId) {
    await db.cardInvoice.update({
      where: { id: cardInvoiceId },
      data: {
        importSessionId: session.id,
        calculationMode: "ENTERED_TOTAL",
        ...(parsed.invoiceTotal !== null && { amount: parsed.invoiceTotal, enteredTotal: parsed.invoiceTotal }),
        ...(parsed.dueDate !== null && { dueDate: parsed.dueDate }),
      },
    })
  }

  return {
    sessionId: session.id,
    transactionCount: parsed.transactions.length,
    invoiceId: cardInvoiceId ?? null,
  }
}

export async function importPdfStandalone(
  file: File,
  cardId: string,
  userId: string,
  client?: PrismaClient
): Promise<PdfImportResult> {
  const db = client ?? defaultPrisma

  const card = await db.card.findFirst({
    where: { id: cardId, userId },
  })
  if (!card) throw new Error("Cartão não encontrado")

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const rawText = await extractTextFromPdf(buffer)
  const parser = getParser(rawText)
  if (!parser) throw new Error("Formato de fatura não suportado")
  const parsed = parser.parse(rawText)

  if (!parsed.dueDate) throw new Error("Não foi possível identificar a data de vencimento no PDF")
  if (parsed.invoiceTotal === null) throw new Error("Não foi possível identificar o valor total no PDF")

  const month = `${parsed.dueDate.getFullYear()}-${String(parsed.dueDate.getMonth() + 1).padStart(2, "0")}`

  const { ensureFinancialMonth } = await import("@/features/financial-months/financial-months.service")
  const financialMonth = await ensureFinancialMonth(userId, month, db)

  let invoice = await db.cardInvoice.findFirst({
    where: { cardId: card.id, month, userId },
  })

  if (invoice) {
    if (invoice.importSessionId) {
      await db.importedTransaction.deleteMany({
        where: { importSessionId: invoice.importSessionId },
      })
      await db.descriptionMapping.deleteMany({
        where: { importSessionId: invoice.importSessionId },
      })
      await db.importSession.delete({
        where: { id: invoice.importSessionId },
      })
    }

    invoice = await db.cardInvoice.update({
      where: { id: invoice.id },
      data: {
        dueDate: parsed.dueDate,
        amount: parsed.invoiceTotal,
        enteredTotal: parsed.invoiceTotal,
        calculationMode: "ENTERED_TOTAL",
        importSessionId: null,
      },
    })
  } else {
    invoice = await db.cardInvoice.create({
      data: {
        cardId: card.id,
        financialMonthId: financialMonth.id,
        month,
        dueDate: parsed.dueDate,
        amount: parsed.invoiceTotal,
        enteredTotal: parsed.invoiceTotal,
        calculationMode: "ENTERED_TOTAL",
        status: "PENDING",
        userId,
      },
    })
  }

  const session = await db.importSession.create({
    data: {
      fileName: file.name,
      bank: parsed.bank,
      invoiceTotal: parsed.invoiceTotal,
      dueDate: parsed.dueDate,
      rawText,
      userId,
      cardInvoice: { connect: { id: invoice.id } },
      transactions: {
        create: parsed.transactions.map((t) => ({
          cardIdentifier: t.cardIdentifier,
          date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.type,
          rawLine: t.rawLine,
          userId,
        })),
      },
    },
  })

  return {
    sessionId: session.id,
    transactionCount: parsed.transactions.length,
    invoiceId: invoice.id,
  }
}

export async function getImportSession(
  sessionId: string,
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma

  return db.importSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      transactions: { orderBy: { date: "asc" } },
      cardInvoice: {
        include: {
          card: { select: { id: true, name: true, color: true } },
        },
      },
    },
  })
}

export async function listImportSessions(
  userId: string,
  client?: PrismaClient
): Promise<ImportSessionData[]> {
  const db = client ?? defaultPrisma

  const sessions = await db.importSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      bank: true,
      invoiceTotal: true,
      dueDate: true,
      createdAt: true,
      _count: { select: { transactions: true } },
    },
  })
  return sessions.map((session) => ({
    ...session,
    invoiceTotal: session.invoiceTotal === null ? null : moneyToNumber(session.invoiceTotal),
  }))
}

export async function updateTransactionCategory(
  transactionId: string,
  categoryId: string | null,
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma

  const transaction = await db.importedTransaction.findFirst({
    where: { id: transactionId, userId },
  })

  if (!transaction) {
    throw new Error("Transação não encontrada")
  }

  await db.importedTransaction.update({
    where: { id: transactionId },
    data: { categoryId },
  })

  const normalizedDesc = normalizeDescription(transaction.description)

  if (categoryId) {
    await db.descriptionMapping.upsert({
      where: {
        normalizedDesc_userId: { normalizedDesc, userId },
      },
      update: { categoryId },
      create: {
        normalizedDesc,
        categoryId,
        userId,
      },
    })
  } else {
    await db.descriptionMapping.deleteMany({
      where: { normalizedDesc, userId },
    })
  }
}

interface AutoCategoryRule {
  keywords: string[]
  categoryName: string
  color: string
}

const autoCategoryRules: AutoCategoryRule[] = [
  { keywords: ["mercado", "supermercado", "supermercad", "mercearia", "acougue", "açougue", "polese", "almeida", "beneduzi", "sao pedro", "são pedro", "sao paulo", "carrefour", "pao de acucar", "pão de açucar", "ata", "carinho", "conveniencia", "bom paladar", "guri"], categoryName: "Alimentação", color: "#E85D5D" },
  { keywords: ["restaurante", "ifood", "lanche", "pizza", "hamburguer", "hamburguer", "bar", "cerveja", "breja", "boteco", "padaria", "confeitaria", "sorvete", "bebida", "bom paladar", "lanches", "milonga", "guerreiro"], categoryName: "Alimentação", color: "#E85D5D" },
  { keywords: ["uber", "taxi", "99pop", "99 pop", "combustivel", "combustível", "gasolina", "posto", "estacionamento", "pedagio", "pedágio", "ubersch"], categoryName: "Transporte", color: "#F59E0B" },
  { keywords: ["netflix", "spotify", "amazon prime", "prime video", "disney", "hbo", "paramount", "apple tv", "deezer", "youtube premium", "uber one", "openai", "chatgpt", "github", "anomaly", "openrouter", "locaweb"], categoryName: "Assinaturas", color: "#6366F1" },
  { keywords: ["farmacia", "farmácia", "drogasil", "droga raia", "drogaria", "pague menos", "medicamento", "remedio", "remédio", "hospital", "consulta", "plano de saude", "plano de saúde"], categoryName: "Saúde", color: "#EC4899" },
  { keywords: ["amazon", "shopee", "magalu", "mercadolivre", "mercado livre", "americanas", "casas bahia", "perfumaria", "lauderbazar"], categoryName: "Compras", color: "#F97316" },
  { keywords: ["gift card", "giftcard", "presente"], categoryName: "Lazer", color: "#8B5CF6" },
  { keywords: ["prestador", "prestadorde", "prestadora", "diarista", "faxina", "manutencao", "manutenção", "eletricista", "encanador", "pedreiro"], categoryName: "Serviços", color: "#0EA882" },
  { keywords: ["recarga", "celular", "vivo", "tim", "claro", "oi fibra"], categoryName: "Assinaturas", color: "#6366F1" },
  { keywords: ["cinema", "ingresso", "teatro", "show", "balada", "pub", "patrimonio", "milonga", "zig"], categoryName: "Lazer", color: "#8B5CF6" },
]

function matchAutoCategory(
  description: string
): { categoryName: string; color: string } | null {
  const lower = description.toLowerCase()
  let best: { categoryName: string; color: string } | null = null
  let bestScore = 0

  for (const rule of autoCategoryRules) {
    const score = rule.keywords.filter((kw) => lower.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      best = { categoryName: rule.categoryName, color: rule.color }
    }
  }

  return best
}

export async function autoCategorizeTransactions(
  sessionId: string,
  userId: string,
  client?: PrismaClient
): Promise<{ categorized: number; created: number }> {
  const db = client ?? defaultPrisma

  const session = await db.importSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      transactions: {
        where: { categoryId: null },
      },
    },
  })

  if (!session) throw new Error("Importação não encontrada")

  const allMappings = await db.descriptionMapping.findMany({
    where: { userId },
  })
  const mappingByDesc = new Map(
    allMappings.map((m) => [m.normalizedDesc, m.categoryId])
  )

  const existingCategories = await db.category.findMany({
    where: { userId, type: "EXPENSE" },
  })

  const categoryByName = new Map(existingCategories.map((c) => [c.name, c]))
  let created = 0
  let categorized = 0

  for (const transaction of session.transactions) {
    const normalized = normalizeDescription(transaction.description)

    const existingCategoryId = mappingByDesc.get(normalized)
    if (existingCategoryId) {
      await db.importedTransaction.update({
        where: { id: transaction.id },
        data: { categoryId: existingCategoryId },
      })
      categorized++
      continue
    }

    const match = matchAutoCategory(transaction.description)
    if (!match) continue

    let category = categoryByName.get(match.categoryName)
    if (!category) {
      category = await db.category.create({
        data: {
          name: match.categoryName,
          color: match.color,
          icon: "tag",
          type: "EXPENSE",
          userId,
        },
      })
      categoryByName.set(match.categoryName, category)
      created++
    }

    await db.importedTransaction.update({
      where: { id: transaction.id },
      data: { categoryId: category.id },
    })

    await db.descriptionMapping.upsert({
      where: {
        normalizedDesc_userId: { normalizedDesc: normalized, userId },
      },
      update: { categoryId: category.id },
      create: {
        normalizedDesc: normalized,
        categoryId: category.id,
        importSessionId: session.id,
        userId,
      },
    })

    categorized++
  }

  return { categorized, created }
}

function suggestCategoryId(
  description: string,
  allMappings: { normalizedDesc: string; categoryId: string }[]
): string | null {
  const words = description
    .toLowerCase()
    .split(/[\s/\\\-_.,;:()]+/)
    .filter((w) => w.length > 2)

  const scores = new Map<string, number>()

  for (const mapping of allMappings) {
    const mappingWords = mapping.normalizedDesc
      .toLowerCase()
      .split(/[\s/\\\-_.,;:()]+/)
      .filter((w) => w.length > 2)

    const matchCount = words.filter((w) => mappingWords.includes(w)).length
    if (matchCount > 0) {
      const current = scores.get(mapping.categoryId) ?? 0
      scores.set(mapping.categoryId, current + matchCount)
    }
  }

  if (scores.size === 0) return null

  let best: string | null = null
  let bestScore = 0
  for (const [catId, score] of scores) {
    if (score > bestScore) {
      bestScore = score
      best = catId
    }
  }
  return best
}

export async function getInvoiceAnalysis(
  sessionId: string,
  userId: string,
  client?: PrismaClient
) {
  const db = client ?? defaultPrisma

  const session = await db.importSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      transactions: { orderBy: { date: "asc" } },
      descriptionMappings: true,
    },
  })

  if (!session) {
    return null
  }

  const categories = await db.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  })

  const mappingByDesc = new Map(
    session.descriptionMappings.map((m) => [m.normalizedDesc, m.categoryId])
  )

  const purchases = session.transactions
    .filter((t) => t.type !== "credit")
    .map((transaction) => ({
      ...transaction,
      amount: moneyToNumber(transaction.amount),
    }))
  const invoiceTotal = session.invoiceTotal === null ? null : moneyToNumber(session.invoiceTotal)
  const totalTransactions = purchases.reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const diffFromInvoice = invoiceTotal
    ? totalTransactions - invoiceTotal
    : null

  const rankingMap = new Map<
    string,
    {
      count: number
      total: number
      originals: Set<string>
      txs: { date: Date | null; amount: number; description: string }[]
    }
  >()

  for (const t of purchases) {
    const key = normalizeDescription(t.description)
    const entry = rankingMap.get(key) ?? {
      count: 0,
      total: 0,
      originals: new Set(),
      txs: [],
    }
    entry.count++
    entry.total += Math.abs(t.amount)
    entry.originals.add(t.description)
    entry.txs.push({
      date: t.date,
      amount: t.amount,
      description: t.description,
    })
    rankingMap.set(key, entry)
  }

  const rankingRaw = Array.from(rankingMap.entries())
    .map(([description, { count, total, originals, txs }]) => {
      const directCategoryId = mappingByDesc.get(description) ?? null
      return {
        description,
        count,
        total,
        originals: Array.from(originals),
        txs,
        categoryId: directCategoryId,
        suggestedCategoryId: directCategoryId
          ? null
          : suggestCategoryId(description, session.descriptionMappings),
      }
    })
    .sort((a, b) => b.total - a.total)

  const SIMILARITY_THRESHOLD = 0.7
  const groups: { items: typeof rankingRaw; merged: (typeof rankingRaw)[number] }[] = []
  const used = new Set<number>()

  for (let i = 0; i < rankingRaw.length; i++) {
    if (used.has(i)) continue
    const group: (typeof rankingRaw)[number][] = [rankingRaw[i]]
    used.add(i)

    for (let j = i + 1; j < rankingRaw.length; j++) {
      if (used.has(j)) continue
      const sim = stringSimilarity(
        rankingRaw[i].description,
        rankingRaw[j].description
      )
      if (sim >= SIMILARITY_THRESHOLD) {
        group.push(rankingRaw[j])
        used.add(j)
      }
    }

    if (group.length > 1) {
      const best = group.reduce(
        (best, g) => (g.total > (best?.total ?? 0) ? g : best),
        group[0]
      )
      const merged = {
        description: group.map((g) => g.description).join(" ≈ "),
        count: group.reduce((s, g) => s + g.count, 0),
        total: group.reduce((s, g) => s + g.total, 0),
        originals: group.flatMap((g) => g.originals),
        txs: group.flatMap((g) => g.txs),
        categoryId: best.categoryId,
        suggestedCategoryId: best.suggestedCategoryId,
      }
      groups.push({ items: group, merged })
    } else {
      groups.push({ items: group, merged: rankingRaw[i] })
    }
  }

  const ranking = groups
    .map((g) => g.merged)
    .sort((a, b) => b.total - a.total)

  const chartMap = new Map<
    string,
    { name: string; color: string; total: number; count: number }
  >()
  for (const r of ranking) {
    const cat = r.categoryId
      ? categories.find((c) => c.id === r.categoryId)
      : null
    const key = cat?.name ?? "Sem categoria"
    const entry = chartMap.get(key) ?? {
      name: key,
      color: cat?.color ?? "#FF9800",
      total: 0,
      count: 0,
    }
    entry.total += r.total
    entry.count += r.count
    chartMap.set(key, entry)
  }
  const chartData = Array.from(chartMap.values()).sort(
    (a, b) => b.total - a.total
  )

  const similarGroups = groups.filter((g) => g.items.length > 1).length

  return {
    session: {
      id: session.id,
      fileName: session.fileName,
      bank: session.bank,
      invoiceTotal,
      dueDate: session.dueDate,
      rawText: session.rawText,
      createdAt: session.createdAt,
    },
    summary: {
      totalTransactions: purchases.length,
      totalAmount: totalTransactions,
      diffFromInvoice,
      rankingCount: ranking.length,
      similarGroups,
    },
    transactions: purchases.map((t) => {
      const normalized = normalizeDescription(t.description)
      const directMapping = mappingByDesc.get(normalized)
      return {
        id: t.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        categoryId: t.categoryId,
        suggestedCategoryId: t.categoryId
          ? null
          : directMapping ?? suggestCategoryId(normalized, session.descriptionMappings),
      }
    }),
    ranking,
    chartData,
    categories,
  }
}
