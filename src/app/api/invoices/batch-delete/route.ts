import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const batchSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = batchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Lista de IDs inválida (máximo de 500 por operação)." },
      { status: 400 }
    )
  }

  const result = await prisma.cardInvoice.deleteMany({
    where: { id: { in: parsed.data.ids }, userId: session.user.id },
  })

  return NextResponse.json({ deleted: result.count })
}
