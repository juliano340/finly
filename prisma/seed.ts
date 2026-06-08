import { PrismaClient } from "@/generated/prisma"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: "file:./dev.db" }),
})

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@finly.app" },
    update: {},
    create: {
      id: "user_demo_01",
      email: "demo@finly.app",
      name: "Usuário Demo",
      passwordHash: "demo_hash_placeholder",
    },
  })

  const categories = await Promise.all([
    prisma.category.create({
      data: { name: "Alimentação", icon: "utensils", color: "#E85D5D", type: "EXPENSE", userId: user.id },
    }),
    prisma.category.create({
      data: { name: "Transporte", icon: "car", color: "#F59E0B", type: "EXPENSE", userId: user.id },
    }),
    prisma.category.create({
      data: { name: "Moradia", icon: "home", color: "#3B82F6", type: "EXPENSE", userId: user.id },
    }),
    prisma.category.create({
      data: { name: "Lazer", icon: "gamepad", color: "#8B5CF6", type: "EXPENSE", userId: user.id },
    }),
    prisma.category.create({
      data: { name: "Saúde", icon: "heart", color: "#EC4899", type: "EXPENSE", userId: user.id },
    }),
    prisma.category.create({
      data: { name: "Educação", icon: "book", color: "#14B8A6", type: "EXPENSE", userId: user.id },
    }),
    prisma.category.create({
      data: { name: "Assinaturas", icon: "repeat", color: "#6366F1", type: "EXPENSE", userId: user.id },
    }),
    prisma.category.create({
      data: { name: "Compras", icon: "shopping-bag", color: "#F97316", type: "EXPENSE", userId: user.id },
    }),
    prisma.category.create({
      data: { name: "Salário", icon: "briefcase", color: "#0EA882", type: "INCOME", userId: user.id },
    }),
    prisma.category.create({
      data: { name: "Freelance", icon: "laptop", color: "#22C55E", type: "INCOME", userId: user.id },
    }),
  ])

  const transactions: {
    amount: number
    type: "INCOME" | "EXPENSE"
    description: string
    date: Date
    categoryId: string
    userId: string
  }[] = []

  const expenseCategories = categories.filter((c) => c.type === "EXPENSE")
  const incomeCategories = categories.filter((c) => c.type === "INCOME")

  for (let i = 0; i < 45; i++) {
    const cat = expenseCategories[i % expenseCategories.length]
    const day = 1 + (i % 28)
    transactions.push({
      amount: Number((Math.random() * 500 + 20).toFixed(2)),
      type: "EXPENSE",
      description: `Gasto ${cat.name} #${i + 1}`,
      date: new Date(2026, 5, day, 12, 0, 0),
      categoryId: cat.id,
      userId: user.id,
    })
  }

  for (let i = 0; i < 5; i++) {
    const cat = incomeCategories[i % incomeCategories.length]
    const day = 1 + (i * 6)
    transactions.push({
      amount: Number((Math.random() * 3000 + 5000).toFixed(2)),
      type: "INCOME",
      description: `Receita ${cat.name} #${i + 1}`,
      date: new Date(2026, 5, day, 12, 0, 0),
      categoryId: cat.id,
      userId: user.id,
    })
  }

  await prisma.transaction.createMany({ data: transactions })

  console.log(`Seed concluído: ${transactions.length} transações, ${categories.length} categorias, 1 usuário`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
