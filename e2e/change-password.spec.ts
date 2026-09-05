import { test, expect } from "@playwright/test"
import { markEmailVerified } from "./utils/db"

test.describe("Troca de senha", () => {
  const seedEmail = `pwchange-e2e-${Date.now()}@finly.app`
  const password = "Finly123"
  const newPassword = "Finly45678"

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto("/register")
    await page.fill('input[id="firstName"]', "Pw")
    await page.fill('input[id="lastName"]', "Change")
    await page.fill('input[id="email"]', seedEmail)
    await page.click('button:has-text("Continuar")')
    await page.waitForSelector('input[id="password"]', { timeout: 5000 })
    await page.fill('input[id="password"]', password)
    await page.fill('input[id="confirmPassword"]', password)
    await page.click('button:has-text("Continuar")')
    await page.waitForSelector('input[type="checkbox"]', { timeout: 5000 })
    await page.click('input[type="checkbox"]')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Criar minha conta")')
    await page.waitForURL("**/verify-email**", { timeout: 20000 })
    await markEmailVerified(seedEmail)
    await page.close()
  })

  test("altera senha pela UI, invalida a antiga e reautentica", async ({ page, context }) => {
    await page.goto("/login")
    await page.fill('input[id="email"]', seedEmail)
    await page.fill('input[id="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL("**/dashboard**", { timeout: 20000 })

    await page.goto("/settings")
    await page.fill('input[id="current-password"]', password)
    await page.fill('input[id="new-password"]', newPassword)
    await page.fill('input[id="confirm-password"]', newPassword)
    await page.click('button:has-text("Alterar senha")')
    await expect(page.getByText("Senha alterada com sucesso.")).toBeVisible({ timeout: 15000 })

    await context.clearCookies()

    await page.goto("/login")
    await page.fill('input[id="email"]', seedEmail)
    await page.fill('input[id="password"]', password)
    await page.click('button[type="submit"]')
    await expect(page.getByText("Email ou senha inválidos")).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(/login/)

    await page.fill('input[id="password"]', newPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL("**/dashboard**", { timeout: 20000 })
  })
})
