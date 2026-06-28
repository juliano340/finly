import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params

  const mapping = await prisma.descriptionMapping.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!mapping) {
    return NextResponse.json({ error: "Mapeamento não encontrado" }, { status: 404 })
  }

  await prisma.descriptionMapping.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
