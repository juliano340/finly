// @vitest-environment node
/// <reference types="vite/client" />
import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => null),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}))

vi.mock("pdf-parse", () => ({ default: vi.fn() }))

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const

const routeModules = import.meta.glob<Record<string, unknown>>(
  "../app/api/**/route.ts",
  { eager: true },
)

const protectedRoutes = Object.entries(routeModules).filter(
  ([path]) => !path.includes("/api/auth/")
)

if (protectedRoutes.length === 0) {
  throw new Error("Nenhuma rota de API encontrada pelo glob — verifique o padrão import.meta.glob")
}

describe("guarda de autenticação das rotas de API", () => {
  it.each(protectedRoutes.map(([path]) => [path]))(
    "%s retorna 401 sem sessão",
    async (path) => {
      const mod = routeModules[path]
      const methods = HTTP_METHODS.filter((m) => typeof mod[m] === "function")
      expect(methods.length, `${path} não exporta nenhum handler HTTP`).toBeGreaterThan(0)

      for (const method of methods) {
        const handler = mod[method] as (
          request: Request,
          ctx?: unknown
        ) => Promise<Response>

        const response = await handler(
          new Request(`http://localhost${path.replace("../app", "").replace("/route.ts", "")}`, {
            method,
          }),
          { params: Promise.resolve({ id: "test-id" }) }
        )

        expect(response.status, `${method} ${path} deveria retornar 401`).toBe(401)
      }
    }
  )
})
