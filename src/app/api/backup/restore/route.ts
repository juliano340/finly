import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { backupSchema, type ImportMode } from "@/features/backup/backup.schema"
import { importData } from "@/features/backup/backup.service"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = backupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Arquivo de backup inválido", details: parsed.error.issues[0]?.message },
      { status: 400 }
    )
  }

  const mode = (new URL(request.url).searchParams.get("mode") ?? "replace") as ImportMode
  if (mode !== "replace" && mode !== "merge") {
    return NextResponse.json({ error: "Modo inválido. Use 'replace' ou 'merge'." }, { status: 400 })
  }

  try {
    const result = await importData(session.user.id, parsed.data, mode)
    return NextResponse.json(result)
  } catch (err) {
    console.error("[backup/restore]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao importar backup" },
      { status: 500 }
    )
  }
}
