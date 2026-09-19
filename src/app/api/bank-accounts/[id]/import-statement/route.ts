import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { importBenefitStatement } from "@/features/bank-accounts/bank-accounts.service"
import { validateCsvUpload } from "@/lib/upload-validation"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "Arquivo não fornecido" }, { status: 400 })

  const uploadError = validateCsvUpload(file)
  if (uploadError) return NextResponse.json({ error: uploadError }, { status: 400 })

  const content = await file.text()
  const replaceManual = formData.get("replaceManual") === "true"
  const { id } = await params
  const result = await importBenefitStatement(id, session.user.id, content, { replaceManual })
  if (!result) return NextResponse.json({ error: "Conta de benefício inválida" }, { status: 400 })

  if (result.imported === 0 && result.duplicates === 0) {
    return NextResponse.json(
      { error: "Nenhuma movimentação válida encontrada no extrato", issues: result.errors },
      { status: 400 },
    )
  }

  return NextResponse.json(result)
}
