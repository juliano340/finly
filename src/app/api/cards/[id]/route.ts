import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { cardSchema } from "@/features/cards/cards.schema"
import { deleteCard, updateCard } from "@/features/cards/cards.service"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const parsed = cardSchema.partial().safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const { id } = await params
  const card = await updateCard(id, session.user.id, parsed.data)
  if (!card) {
    return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 })
  }

  return NextResponse.json(card)
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
  const deleted = await deleteCard(id, session.user.id)
  if (!deleted) {
    return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
