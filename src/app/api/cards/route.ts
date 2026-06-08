import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { cardSchema } from "@/features/cards/cards.schema"
import { createCard, getCards } from "@/features/cards/cards.service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const cards = await getCards(session.user.id)
  return NextResponse.json(cards)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const parsed = cardSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const card = await createCard(session.user.id, parsed.data)
  return NextResponse.json(card, { status: 201 })
}
