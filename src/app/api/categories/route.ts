import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getCategories, createCategory } from "@/features/categories/categories.service"
import { categorySchema } from "@/features/categories/categories.schema"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const categories = await getCategories(session.user.id)
  return NextResponse.json(categories)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = categorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const category = await createCategory(session.user.id, parsed.data)
  return NextResponse.json(category, { status: 201 })
}
