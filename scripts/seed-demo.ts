import { prisma as defaultPrisma } from "../src/lib/prisma"
import type { PrismaClient } from "@/generated/prisma"
import { hash } from "bcryptjs"
import { createBankAccount } from "../src/features/bank-accounts/bank-accounts.service"
import { createCard } from "../src/features/cards/cards.service"
import { createFixedCost } from "../src/features/fixed-costs/fixed-costs.service"
import { createCardInvoice } from "../src/features/card-invoices/card-invoices.service"
import { ensureFinancialMonth } from "../src/features/financial-months/financial-months.service"

const DEMO_USER_ID = "user_demo_01"
const DEMO_EMAIL = "demo@finly.com"
const DEMO_PASSWORD = "demo1234"
const DEMO_NAME = "Marina Castro"

const RESET = process.argv.includes("--reset")

const ACCOUNTS = [
  { name: "Nubank", institution: "Nu Pagamentos", color: "#820AD1", type: "CHECKING" as const, initialBalance: 3200 },
  { name: "Mercado Pago", institution: "Mercado Pago", color: "#00B1EA", type: "DIGITAL" as const, initialBalance: 480 },
  { name: "Banco Inter", institution: "Banco Inter", color: "#FF7A00", type: "CHECKING" as const, initialBalance: 4300 },
  { name: "Sicredi", institution: "Sicredi", color: "#1F9D55", type: "CHECKING" as const, initialBalance: 1250 },
  { name: "Itaú", institution: "Itaú Unibanco", color: "#EC7000", type: "CHECKING" as const, initialBalance: 850 },
  { name: "C6 Bank", institution: "Banco C6", color: "#1A1A1A", type: "CHECKING" as const, initialBalance: 1900 },
  { name: "Sofisa Direto", institution: "Banco Sofisa", color: "#2E5BFF", type: "DIGITAL" as const, initialBalance: 500 },
]

const CARDS = [
  { name: "Nubank", brand: "Mastercard", color: "#820AD1", bankAccountName: "Nubank", closingDay: 28, dueDay: 6 },
  { name: "Inter", brand: "Mastercard", color: "#FF7A00", bankAccountName: "Banco Inter", closingDay: 25, dueDay: 3 },
  { name: "C6", brand: "Visa", color: "#1A1A1A", bankAccountName: "C6 Bank", closingDay: 25, dueDay: 5 },
]

const CATEGORIES = [
  { name: "Alimentação", icon: "utensils", color: "#E85D5D", type: "EXPENSE" as const },
  { name: "Mercado", icon: "shopping-cart", color: "#F97316", type: "EXPENSE" as const },
  { name: "Transporte", icon: "car", color: "#F59E0B", type: "EXPENSE" as const },
  { name: "Combustível", icon: "fuel", color: "#FB923C", type: "EXPENSE" as const },
  { name: "Moradia", icon: "home", color: "#3B82F6", type: "EXPENSE" as const },
  { name: "Contas", icon: "file-text", color: "#0EA5E9", type: "EXPENSE" as const },
  { name: "Lazer", icon: "gamepad", color: "#8B5CF6", type: "EXPENSE" as const },
  { name: "Assinaturas", icon: "repeat", color: "#6366F1", type: "EXPENSE" as const },
  { name: "Saúde", icon: "heart", color: "#EC4899", type: "EXPENSE" as const },
  { name: "Educação", icon: "book", color: "#14B8A6", type: "EXPENSE" as const },
  { name: "Compras", icon: "shopping-bag", color: "#F97316", type: "EXPENSE" as const },
  { name: "Viagem", icon: "plane", color: "#06B6D4", type: "EXPENSE" as const },
  { name: "Salário", icon: "briefcase", color: "#0EA882", type: "INCOME" as const },
  { name: "Freelance", icon: "laptop", color: "#22C55E", type: "INCOME" as const },
  { name: "Dividendos", icon: "trending-up", color: "#16A34A", type: "INCOME" as const },
]

const FIXED_COSTS: {
  name: string
  amount: number
  categoryName: string
  paymentMethod: "PIX" | "BANK_SLIP" | "DEBIT" | "CREDIT_CARD" | "CASH"
  dueDay: number
  bankAccountName?: string
  cardName?: string
  type: "INCOME" | "EXPENSE"
}[] = [
  { name: "Aluguel", amount: 1800, categoryName: "Moradia", paymentMethod: "DEBIT", dueDay: 5, bankAccountName: "Nubank", type: "EXPENSE" },
  { name: "Condomínio", amount: 450, categoryName: "Moradia", paymentMethod: "DEBIT", dueDay: 10, bankAccountName: "Nubank", type: "EXPENSE" },
  { name: "Energia elétrica", amount: 180, categoryName: "Contas", paymentMethod: "DEBIT", dueDay: 15, bankAccountName: "Itaú", type: "EXPENSE" },
  { name: "Internet (fibra)", amount: 99.9, categoryName: "Contas", paymentMethod: "CREDIT_CARD", dueDay: 12, cardName: "Inter", type: "EXPENSE" },
  { name: "Plano de saúde", amount: 520, categoryName: "Saúde", paymentMethod: "DEBIT", dueDay: 20, bankAccountName: "C6 Bank", type: "EXPENSE" },
  { name: "Academia", amount: 109.9, categoryName: "Saúde", paymentMethod: "CREDIT_CARD", dueDay: 1, cardName: "C6", type: "EXPENSE" },
  { name: "Spotify", amount: 21.9, categoryName: "Assinaturas", paymentMethod: "CREDIT_CARD", dueDay: 7, cardName: "Nubank", type: "EXPENSE" },
  { name: "Netflix", amount: 55.9, categoryName: "Assinaturas", paymentMethod: "CREDIT_CARD", dueDay: 12, cardName: "Nubank", type: "EXPENSE" },
  { name: "Claro", amount: 26, categoryName: "Alimentação", paymentMethod: "DEBIT", dueDay: 2, bankAccountName: "Sicredi", type: "EXPENSE" },
  { name: "Claro Net", amount: 76, categoryName: "Alimentação", paymentMethod: "CREDIT_CARD", dueDay: 10, cardName: "Inter", type: "EXPENSE" },
  { name: "Mycon", amount: 368, categoryName: "Moradia", paymentMethod: "PIX", dueDay: 8, type: "EXPENSE" },
  { name: "Salário (receita)", amount: 6800, categoryName: "Salário", paymentMethod: "DEBIT", dueDay: 5, bankAccountName: "Itaú", type: "INCOME" },
]

const BUDGETS: { categoryName: string; amount: number }[] = [
  { categoryName: "Alimentação", amount: 800 },
  { categoryName: "Mercado", amount: 600 },
  { categoryName: "Transporte", amount: 300 },
  { categoryName: "Lazer", amount: 400 },
  { categoryName: "Assinaturas", amount: 200 },
]

// ---------- Helpers ----------

function getMonthsToSeed(count = 6): string[] {
  const now = new Date()
  const months: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }
  return months
}

function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number)
  return new Date(y, m, 0).getDate()
}

function dateInMonth(month: string, day: number): Date {
  const [y, m] = month.split("-").map(Number)
  const d = Math.min(day, daysInMonth(month))
  return new Date(y, m - 1, d, 12, 0, 0)
}

// Mulberry32 — seedable PRNG para dados reprodutíveis
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ---------- Main ----------

async function main() {
  const db = defaultPrisma

  if (RESET) {
    const existing = await db.user.findUnique({ where: { id: DEMO_USER_ID } })
    if (existing) {
      await db.user.delete({ where: { id: DEMO_USER_ID } })
      console.log(`🗑  Usuário demo removido (cascade apaga todos os dados).`)
    } else {
      console.log(`🗑  --reset: usuário não existia, nada a remover.`)
    }
  }

  // 1. Usuário
  const existingUser = await db.user.findUnique({ where: { id: DEMO_USER_ID } })
  if (existingUser) {
    console.log(`⏭  Usuário demo já existe (${DEMO_EMAIL}).`)
  } else {
    const passwordHash = await hash(DEMO_PASSWORD, 12)
    await db.user.create({
      data: {
        id: DEMO_USER_ID,
        name: DEMO_NAME,
        email: DEMO_EMAIL,
        passwordHash,
        plan: "PRO",
      },
    })
    console.log(`✓ Usuário criado: ${DEMO_EMAIL} / ${DEMO_PASSWORD} (PRO)`)
  }

  const userId = DEMO_USER_ID
  const months = getMonthsToSeed(6)
  const currentMonth = months[months.length - 1]
  const pastMonths = months.slice(0, -1)
  const rand = mulberry32(20260618)

  // 2. Categorias
  console.log("\n--- Categorias ---")
  const categoryByName = new Map<string, string>()
  for (const cat of CATEGORIES) {
    const existing = await db.category.findUnique({ where: { name_userId: { name: cat.name, userId } } })
    if (existing) { categoryByName.set(cat.name, existing.id); continue }
    const created = await db.category.create({ data: { ...cat, userId } })
    categoryByName.set(cat.name, created.id)
  }
  console.log(`✓ ${CATEGORIES.length} categorias prontas`)

  // 3. Contas bancárias
  console.log("\n--- Contas bancárias ---")
  const accountByName = new Map<string, string>()
  for (const acc of ACCOUNTS) {
    const existing = await db.bankAccount.findUnique({ where: { name_userId: { name: acc.name, userId } } })
    if (existing) { accountByName.set(acc.name, existing.id); continue }
    const created = await createBankAccount(userId, {
      name: acc.name,
      institution: acc.institution,
      type: acc.type,
      color: acc.color,
      initialBalance: acc.initialBalance,
      active: true,
    })
    if (created) accountByName.set(acc.name, created.id)
  }
  console.log(`✓ ${ACCOUNTS.length} contas prontas`)

  // 4. Cartões
  console.log("\n--- Cartões de crédito ---")
  const cardByName = new Map<string, { id: string; dueDay: number; bankAccountId: string | null }>()
  for (const card of CARDS) {
    const existing = await db.card.findUnique({ where: { name_userId: { name: card.name, userId } } })
    if (existing) {
      cardByName.set(card.name, { id: existing.id, dueDay: existing.dueDay ?? card.dueDay, bankAccountId: existing.bankAccountId })
      continue
    }
    const created = await createCard(userId, {
      name: card.name,
      brand: card.brand,
      color: card.color,
      bankAccountId: accountByName.get(card.bankAccountName) ?? null,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
    })
    if (created) cardByName.set(card.name, { id: created.id, dueDay: created.dueDay ?? card.dueDay, bankAccountId: created.bankAccountId })
  }
  console.log(`✓ ${CARDS.length} cartões prontos`)

  // 5. Custos fixos
  console.log("\n--- Custos fixos ---")
  const fixedCostByName = new Map<string, string>()
  for (const fc of FIXED_COSTS) {
    const existing = await db.fixedCost.findUnique({ where: { name_userId: { name: fc.name, userId } } })
    if (existing) { fixedCostByName.set(fc.name, existing.id); continue }
    const paidInsideCard = fc.paymentMethod === "CREDIT_CARD"
    const created = await createFixedCost(userId, {
      name: fc.name,
      type: fc.type,
      defaultAmount: fc.amount,
      categoryId: categoryByName.get(fc.categoryName)!,
      paymentMethod: fc.paymentMethod,
      dueDay: fc.dueDay,
      paidInsideCard,
      cardId: paidInsideCard && fc.cardName ? cardByName.get(fc.cardName)?.id ?? null : null,
      bankAccountId: !paidInsideCard && fc.bankAccountName ? accountByName.get(fc.bankAccountName) ?? null : null,
      active: true,
    })
    if (created) fixedCostByName.set(fc.name, created.id)
  }
  console.log(`✓ ${FIXED_COSTS.length} custos fixos prontos`)

  // 6. Transações nos 6 meses
  console.log("\n--- Transações (6 meses) ---")
  let txCount = 0
  for (const month of months) {
    const days = daysInMonth(month)
    const isCurrent = month === currentMonth
    // Até o "hoje" no mês atual; até o último dia nos meses passados
    const maxDay = isCurrent ? Math.max(1, new Date().getDate()) : days

    // 1 salário no dia 5
    await db.transaction.create({
      data: {
        amount: 6800,
        type: "INCOME",
        description: "Salário mensal",
        date: dateInMonth(month, 5),
        categoryId: categoryByName.get("Salário")!,
        userId,
      },
    })
    txCount++

    // 1–2 freelance por mês (em dias aleatórios)
    const freelanceCount = rand() > 0.5 ? 2 : 1
    for (let i = 0; i < freelanceCount; i++) {
      const day = Math.floor(rand() * maxDay) + 1
      await db.transaction.create({
        data: {
          amount: round2(1500 + rand() * 3000),
          type: "INCOME",
          description: ["Manutenção de site", "Consultoria React", "Landing page", "Integração API", "Freela design"][Math.floor(rand() * 5)],
          date: dateInMonth(month, day),
          categoryId: categoryByName.get("Freelance")!,
          userId,
        },
      })
      txCount++
    }

    // 2–4 mercados
    const mercadoCount = 2 + Math.floor(rand() * 3)
    for (let i = 0; i < mercadoCount; i++) {
      const day = Math.floor(rand() * maxDay) + 1
      await db.transaction.create({
        data: {
          amount: round2(180 + rand() * 220),
          type: "EXPENSE",
          description: ["Supermercado", "Mercado", "Hortifruti"][Math.floor(rand() * 3)],
          date: dateInMonth(month, day),
          categoryId: categoryByName.get("Mercado")!,
          userId,
        },
      })
      txCount++
    }

    // 3–6 iFood/delivery
    const ifoodCount = 3 + Math.floor(rand() * 4)
    for (let i = 0; i < ifoodCount; i++) {
      const day = Math.floor(rand() * maxDay) + 1
      await db.transaction.create({
        data: {
          amount: round2(28 + rand() * 52),
          type: "EXPENSE",
          description: ["iFood", "Rappi", "Restaurante"][Math.floor(rand() * 3)],
          date: dateInMonth(month, day),
          categoryId: categoryByName.get("Alimentação")!,
          userId,
        },
      })
      txCount++
    }

    // 2–5 Uber/99
    const uberCount = 2 + Math.floor(rand() * 4)
    for (let i = 0; i < uberCount; i++) {
      const day = Math.floor(rand() * maxDay) + 1
      await db.transaction.create({
        data: {
          amount: round2(15 + rand() * 35),
          type: "EXPENSE",
          description: ["Uber", "99", "Uber Black"][Math.floor(rand() * 3)],
          date: dateInMonth(month, day),
          categoryId: categoryByName.get("Transporte")!,
          userId,
        },
      })
      txCount++
    }

    // 1–3 lazer
    const lazerCount = 1 + Math.floor(rand() * 3)
    for (let i = 0; i < lazerCount; i++) {
      const day = Math.floor(rand() * maxDay) + 1
      await db.transaction.create({
        data: {
          amount: round2(50 + rand() * 180),
          type: "EXPENSE",
          description: ["Cinema", "Bar com amigos", "Show", "Parque"][Math.floor(rand() * 4)],
          date: dateInMonth(month, day),
          categoryId: categoryByName.get("Lazer")!,
          userId,
        },
      })
      txCount++
    }

    // 0–2 compras
    const comprasCount = Math.floor(rand() * 3)
    for (let i = 0; i < comprasCount; i++) {
      const day = Math.floor(rand() * maxDay) + 1
      await db.transaction.create({
        data: {
          amount: round2(80 + rand() * 320),
          type: "EXPENSE",
          description: ["Amazon", "Shopee", "Magazine"][Math.floor(rand() * 3)],
          date: dateInMonth(month, day),
          categoryId: categoryByName.get("Compras")!,
          userId,
        },
      })
      txCount++
    }

    // 0–1 combustível (não todo mês)
    if (rand() > 0.5) {
      const day = Math.floor(rand() * maxDay) + 1
      await db.transaction.create({
        data: {
          amount: round2(180 + rand() * 120),
          type: "EXPENSE",
          description: "Posto de gasolina",
          date: dateInMonth(month, day),
          categoryId: categoryByName.get("Combustível")!,
          userId,
        },
      })
      txCount++
    }
  }
  console.log(`✓ ${txCount} transações em ${months.length} meses`)

  // 7. Orçamentos (mês atual)
  console.log("\n--- Orçamentos (mês atual) ---")
  let budgetCount = 0
  for (const b of BUDGETS) {
    const categoryId = categoryByName.get(b.categoryName)
    if (!categoryId) continue
    const existing = await db.budget.findUnique({
      where: { categoryId_month_userId: { categoryId, month: currentMonth, userId } },
    })
    if (existing) continue
    await db.budget.create({ data: { amount: b.amount, month: currentMonth, categoryId, userId } })
    budgetCount++
  }
  console.log(`✓ ${budgetCount} orçamentos criados`)

  // 8. Faturas de cartão (3 últimos meses, antigas pagas)
  console.log("\n--- Faturas de cartão (3 meses) ---")
  const invoiceMonths = [...pastMonths.slice(-2), currentMonth]
  let invoiceCount = 0
  let movementCount = 0
  for (const card of CARDS) {
    const cardData = cardByName.get(card.name)
    if (!cardData) continue
    for (let i = 0; i < invoiceMonths.length; i++) {
      const month = invoiceMonths[i]
      const isCurrent = month === currentMonth
      const existing = await db.cardInvoice.findUnique({
        where: { cardId_month_userId: { cardId: cardData.id, month, userId } },
      })
      if (existing) continue
      // Valor: soma dos fixos dentro do cartão + um pouco de gasto variável
      const fixedInCard = FIXED_COSTS
        .filter((fc) => fc.cardName === card.name && fc.type === "EXPENSE")
        .reduce((sum, fc) => sum + fc.amount, 0)
      const amount = round2(fixedInCard + 200 + rand() * 800)
      const dueDate = dateInMonth(month, cardData.dueDay)
      const created = await createCardInvoice(userId, {
        cardId: cardData.id,
        month,
        dueDate,
        amount,
        status: isCurrent ? "PENDING" : "PAID",
      }, db)
      if (created && !isCurrent) {
        // Marca como paga com BankAccountMovement
        const bankAccountId = cardData.bankAccountId
        if (bankAccountId) {
          await db.bankAccountMovement.create({
            data: {
              bankAccountId,
              amount,
              type: "EXPENSE",
              description: `PAGAMENTO FATURA ${card.name}`,
              date: dueDate,
              userId,
            },
          })
          movementCount++
          await db.cardInvoice.update({
            where: { id: created.id },
            data: { status: "PAID", paidAt: dueDate, paymentMethod: "DEBIT" },
          })
        }
      }
      invoiceCount++
    }
  }
  console.log(`✓ ${invoiceCount} faturas, ${movementCount} pagamentos criados`)

  // 9. Ocorrências de custo fixo pagas (meses passados)
  console.log("\n--- Ocorrências de custo fixo (meses passados pagos) ---")
  let occCount = 0
  for (const month of pastMonths) {
    for (const fc of FIXED_COSTS) {
      const fixedCostId = fixedCostByName.get(fc.name)
      if (!fixedCostId) continue
      const financialMonth = await ensureFinancialMonth(userId, month, db)
      const existing = await db.fixedCostOccurrence.findUnique({
        where: { fixedCostId_month_userId: { fixedCostId, month, userId } },
      })
      if (existing) continue
      const dueDate = dateInMonth(month, fc.dueDay)
      const created = await db.fixedCostOccurrence.create({
        data: {
          fixedCostId,
          financialMonthId: financialMonth.id,
          month,
          amount: fc.amount,
          status: "PAID",
          paidAt: dueDate,
          userId,
        },
      })
      // Cria BankAccountMovement correspondente
      if (fc.type === "EXPENSE") {
        const paidInsideCard = fc.paymentMethod === "CREDIT_CARD"
        if (!paidInsideCard && fc.bankAccountName) {
          const bankAccountId = accountByName.get(fc.bankAccountName)
          if (bankAccountId) {
            await db.bankAccountMovement.create({
              data: {
                bankAccountId,
                amount: fc.amount,
                type: "EXPENSE",
                description: `PAGAMENTO ${fc.name}`,
                date: dueDate,
                userId,
              },
            })
            movementCount++
          }
        }
      } else if (fc.type === "INCOME" && fc.bankAccountName) {
        const bankAccountId = accountByName.get(fc.bankAccountName)
        if (bankAccountId) {
          await db.bankAccountMovement.create({
            data: {
              bankAccountId,
              amount: fc.amount,
              type: "INCOME",
              description: `RECEBIMENTO ${fc.name}`,
              date: dueDate,
              userId,
            },
          })
          movementCount++
        }
      }
      void created
      occCount++
    }
  }
  console.log(`✓ ${occCount} ocorrências pagas, ${movementCount} movimentações totais`)

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("✅ Demo pronta!")
  console.log(`   URL:      http://localhost:3000/login`)
  console.log(`   Email:    ${DEMO_EMAIL}`)
  console.log(`   Senha:    ${DEMO_PASSWORD}`)
  console.log(`   Plano:    PRO`)
  console.log(`   Período:  ${months[0]} a ${months[months.length - 1]}`)
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await defaultPrisma.$disconnect()
  })
