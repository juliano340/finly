import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const mappings = await prisma.descriptionMapping.findMany({
    where: { userId: session.user.id },
    include: {
      category: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(mappings)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  let normalizedDesc: unknown, categoryId: unknown
  try {
    ({ normalizedDesc, categoryId } = await request.json())
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  if (typeof normalizedDesc !== "string" || typeof categoryId !== "string" || !normalizedDesc || !categoryId) {
    return NextResponse.json(
      { error: "normalizedDesc e categoryId são obrigatórios" },
      { status: 400 }
    )
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId: session.user.id },
    select: { id: true },
  })
  if (!category) {
    return NextResponse.json({ error: "Categoria inválida" }, { status: 400 })
  }

  const mapping = await prisma.descriptionMapping.upsert({
    where: {
      normalizedDesc_userId: {
        normalizedDesc,
        userId: session.user.id,
      },
    },
    update: { categoryId },
    create: {
      normalizedDesc,
      categoryId,
      userId: session.user.id,
    },
    include: {
      category: { select: { id: true, name: true, color: true } },
    },
  })

  return NextResponse.json(mapping)
}
