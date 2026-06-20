import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDueSoonNotifications } from "@/features/notifications/notifications.service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const notifications = await getDueSoonNotifications(session.user.id)
    return NextResponse.json(notifications)
  } catch {
    return NextResponse.json([])
  }
}
