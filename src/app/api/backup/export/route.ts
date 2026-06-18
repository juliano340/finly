import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { exportData } from "@/features/backup/backup.service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const backup = await exportData(session.user.id)
  const date = new Date().toISOString().slice(0, 10)

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="finly-backup-${date}.json"`,
    },
  })
}
