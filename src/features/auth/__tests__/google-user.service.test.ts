// @vitest-environment node
import { afterAll, describe, expect, it } from "vitest"
import { getTestClient } from "@/__tests__/prisma"
import { findOrCreateGoogleUser } from "../auth.service"

const prisma = getTestClient()

describe("findOrCreateGoogleUser", () => {
  const suffix = Date.now()
  const googleEmail = `google-${suffix}@test.com`
  const credentialsEmail = `cred-google-${suffix}@test.com`

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [googleEmail, credentialsEmail] } } })
  })

  it("recusa e-mail não verificado pelo provedor", async () => {
    const result = await findOrCreateGoogleUser(
      { email: googleEmail, emailVerified: false },
      prisma
    )
    expect(result).toBeNull()
    await expect(prisma.user.findUnique({ where: { email: googleEmail } })).resolves.toBeNull()
  })

  it("recusa e-mail ausente", async () => {
    const result = await findOrCreateGoogleUser({ email: "", emailVerified: true }, prisma)
    expect(result).toBeNull()
  })

  it("cria usuário com e-mail verificado e sem senha", async () => {
    const created = await findOrCreateGoogleUser(
      { email: googleEmail, name: "Usuário Google", image: "https://example.com/a.png", emailVerified: true },
      prisma
    )
    expect(created).not.toBeNull()
    expect(created!.email).toBe(googleEmail)
    expect(created!.emailVerified).not.toBeNull()
    expect(created!.passwordHash).toBeNull()

    const duplicate = await findOrCreateGoogleUser(
      { email: `  ${googleEmail.toUpperCase()}  `, emailVerified: true },
      prisma
    )
    expect(duplicate!.id).toBe(created!.id)
    await expect(prisma.user.findMany({ where: { email: googleEmail } })).resolves.toHaveLength(1)
  })

  it("vincula conta existente criada por credenciais", async () => {
    const registered = await prisma.user.create({
      data: { email: credentialsEmail, passwordHash: "$2b$12$abc" },
    })

    const linked = await findOrCreateGoogleUser(
      { email: credentialsEmail, name: "Nome Google", emailVerified: true },
      prisma
    )

    expect(linked!.id).toBe(registered.id)
    const users = await prisma.user.findMany({ where: { email: credentialsEmail } })
    expect(users).toHaveLength(1)
    expect(users[0].passwordHash).toBe("$2b$12$abc")
  })

  it("sincroniza a foto do Google em usuário existente e preserva o nome", async () => {
    const email = `photo-${suffix}@test.com`
    const created = await prisma.user.create({
      data: { email, name: "Nome Editado", passwordHash: "$2b$12$abc" },
    })

    const linked = await findOrCreateGoogleUser(
      { email, name: "Nome do Google", image: "https://example.com/photo.png", emailVerified: true },
      prisma
    )

    expect(linked!.image).toBe("https://example.com/photo.png")
    expect(linked!.name).toBe("Nome Editado")

    const relogin = await findOrCreateGoogleUser(
      { email, name: "Nome do Google", image: "https://example.com/photo.png", emailVerified: true },
      prisma
    )
    expect(relogin!.id).toBe(created.id)

    const after = await prisma.user.findUnique({ where: { email } })
    expect(after!.image).toBe("https://example.com/photo.png")
    expect(after!.name).toBe("Nome Editado")
    await prisma.user.delete({ where: { email } })
  })
})
