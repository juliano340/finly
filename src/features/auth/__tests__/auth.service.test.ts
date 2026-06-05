// @vitest-environment node
import { describe, it, expect, afterAll } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { registerUser } from "@/features/auth/auth.service"
import { compare } from "bcryptjs"

const testPrisma = getTestClient()

describe("registerUser", () => {
  afterAll(async () => {
    await testPrisma.user.deleteMany({ where: { email: { contains: "@test-auth." } } })
  })

  it("cria usuário com sucesso", async () => {
    const result = await registerUser(
      {
        name: "Maria Teste",
        email: "maria@test-auth.com",
        password: "Senha123",
      },
      testPrisma
    )

    expect("user" in result).toBe(true)
    if ("user" in result) {
      expect(result.user.email).toBe("maria@test-auth.com")
      expect(result.user.name).toBe("Maria Teste")
    }
  })

  it("hash da senha é salvo (não texto puro)", async () => {
    const result = await registerUser(
      {
        name: "João Teste",
        email: "joao@test-auth.com",
        password: "MinhaSenha456",
      },
      testPrisma
    )

    expect("user" in result).toBe(true)
    if ("user" in result) {
      const dbUser = await testPrisma.user.findUnique({
        where: { id: result.user.id },
      })
      expect(dbUser?.passwordHash).not.toBe("MinhaSenha456")
      const valid = await compare("MinhaSenha456", dbUser!.passwordHash!)
      expect(valid).toBe(true)
    }
  })

  it("rejeita email duplicado", async () => {
    const result = await registerUser(
      {
        name: "Duplicado",
        email: "maria@test-auth.com",
        password: "Senha123",
      },
      testPrisma
    )

    expect("error" in result).toBe(true)
  })

  it("rejeita email inválido", async () => {
    const result = await registerUser(
      {
        name: "Invalido",
        email: "nao-e-um-email",
        password: "Senha123",
      },
      testPrisma
    )

    expect("error" in result).toBe(true)
  })

  it("rejeita senha menor que 6 caracteres", async () => {
    const result = await registerUser(
      {
        name: "Curta",
        email: "curta@test-auth.com",
        password: "12345",
      },
      testPrisma
    )

    expect("error" in result).toBe(true)
  })
})
