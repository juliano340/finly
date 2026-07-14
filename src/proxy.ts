import { getToken } from "next-auth/jwt"
import { NextResponse, type NextRequest } from "next/server"
import { AUTH_SECRET } from "@/lib/auth-secret"

const DEMO_USER_ID = process.env.DEMO_USER_ID ?? "user_demo_01"
const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL ?? "demo@finly.com"
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

export async function proxy(request: NextRequest) {
  if (!MUTATING_METHODS.has(request.method)) return NextResponse.next()

  const { pathname } = request.nextUrl
  if (pathname.startsWith("/api/auth/")) return NextResponse.next()

  if (!AUTH_SECRET) {
    return NextResponse.json(
      { error: "AUTH_SECRET não configurado." },
      { status: 500 }
    )
  }

  const token = await getToken({ req: request, secret: AUTH_SECRET })
  const isDemoUser = token?.id === DEMO_USER_ID || token?.email === DEMO_USER_EMAIL

  if (!isDemoUser) return NextResponse.next()

  return NextResponse.json(
    { error: "A conta demo é somente leitura. Crie sua conta para salvar alterações." },
    { status: 403 }
  )
}

export const config = {
  matcher: "/api/:path*",
}
