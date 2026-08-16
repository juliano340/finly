import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { importPdfStandalone } from "@/features/pdf-import/pdf-import.service"
import { validatePdfUpload } from "@/lib/upload-validation"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const cardId = formData.get("cardId") as string | null

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }
    if (!cardId) {
      return NextResponse.json({ error: "Selecione um cartão" }, { status: 400 })
    }
    const uploadError = await validatePdfUpload(file)
    if (uploadError) {
      return NextResponse.json({ error: uploadError }, { status: 400 })
    }

    const result = await importPdfStandalone(file, cardId, session.user.id)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Erro ao importar PDF:", error)
    const message = error instanceof Error ? error.message : "Erro ao processar o PDF"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
