import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { uploadAndParsePdf } from "@/features/pdf-import/pdf-import.service"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id: invoiceId } = await params

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Arquivo não é um PDF" }, { status: 400 })
    }

    const result = await uploadAndParsePdf(
      file,
      session.user.id,
      invoiceId
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("Erro ao importar PDF:", error)
    const message = error instanceof Error ? error.message : "Erro ao processar o PDF"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
