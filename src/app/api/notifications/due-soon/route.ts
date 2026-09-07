import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getDueSoonNotifications } from "@/features/notifications/notifications.service"

const DEFAULT_DAYS_AHEAD = 7

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { notificationDaysAhead: true },
    })
    const daysAhead = user?.notificationDaysAhead ?? DEFAULT_DAYS_AHEAD
    const notifications = await getDueSoonNotifications(session.user.id, daysAhead)
    return NextResponse.json({ daysAhead, notifications })
  } catch (error) {
    console.error("[GET /api/notifications/due-soon]", error)
    return NextResponse.json({ daysAhead: DEFAULT_DAYS_AHEAD, notifications: [] })
  }
}
