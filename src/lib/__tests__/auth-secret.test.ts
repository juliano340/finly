import { afterEach, describe, expect, it, vi } from "vitest"

describe("auth-secret", () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  async function importAuthSecret() {
    vi.resetModules()
    return await import("../auth-secret")
  }

  it("produção sem secret derruba o módulo (fail-closed)", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("AUTH_SECRET", "")
    vi.stubEnv("NEXTAUTH_SECRET", "")
    vi.stubEnv("NEXT_PHASE", "")

    await expect(importAuthSecret()).rejects.toThrow("AUTH_SECRET é obrigatório")
  })

  it("produção DURANTE o build não derruba (CI/preview precisam construir)", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("AUTH_SECRET", "")
    vi.stubEnv("NEXTAUTH_SECRET", "")
    vi.stubEnv("NEXT_PHASE", "phase-production-build")

    const mod = await importAuthSecret()
    expect(mod.AUTH_SECRET).toBe("finly-development-auth-secret")
  })

  it("produção com secret configurado usa o secret", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("AUTH_SECRET", "secret-real-de-producao")

    const mod = await importAuthSecret()
    expect(mod.AUTH_SECRET).toBe("secret-real-de-producao")
  })

  it("desenvolvimento sem secret usa o fallback", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("AUTH_SECRET", "")
    vi.stubEnv("NEXTAUTH_SECRET", "")

    const mod = await importAuthSecret()
    expect(mod.AUTH_SECRET).toBe("finly-development-auth-secret")
  })
})
