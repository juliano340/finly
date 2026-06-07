import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { updateCategory, deleteCategory } from "@/features/categories/categories.service"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const updated = await updateCategory(id, session.user.id, body)

  if (!updated) {
    return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params
  const result = await deleteCategory(id, session.user.id)

  if (!result) {
    return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 })
  }

  if (result.blocked) {
    return NextResponse.json(
      { error: `Esta categoria tem ${result.count} transações. Remova-as primeiro.` },
      { status: 409 }
    )
  }

  return NextResponse.json({ success: true })
}
