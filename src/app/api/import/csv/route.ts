import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { parseCSV } from "@/features/import/import.service"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  const userId = session.user.id

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const categoryId = formData.get("categoryId") as string | null

  if (!file) {
    return NextResponse.json({ error: "Arquivo não fornecido" }, { status: 400 })
  }

  if (!categoryId) {
    return NextResponse.json({ error: "Categoria não fornecida" }, { status: 400 })
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!category || category.userId !== userId) {
    return NextResponse.json({ error: "Categoria inválida" }, { status: 400 })
  }

  const content = await file.text()
  const { transactions, errors } = parseCSV(content)

  if (transactions.length === 0) {
    return NextResponse.json(
      { error: "Nenhuma transação válida encontrada", issues: errors },
      { status: 400 }
    )
  }

  const created = await prisma.transaction.createMany({
    data: transactions.map((tx) => ({
      amount: tx.amount,
      type: tx.type,
      description: tx.description || null,
      date: tx.date,
      categoryId,
      userId,
    })),
  })

  return NextResponse.json({
    imported: created.count,
    errors: errors.length > 0 ? errors : undefined,
  })
}
