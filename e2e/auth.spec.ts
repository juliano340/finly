import { test, expect } from "@playwright/test"
import { markEmailVerified } from "./utils/db"

test.describe("Autenticação", () => {
  const testEmail = `test-${Date.now()}@finly.app`
  const testPassword = "Finly123"

  test("registro → login → dashboard → logout", async ({ page }) => {
    await page.goto("/register")

    // Step 1: Nome e email
    await page.fill('input[id="firstName"]', "Maria")
    await page.fill('input[id="lastName"]', "E2E")
    await page.fill('input[id="email"]', testEmail)
    await page.click('button:has-text("Continuar")')

    // Step 2: Senha
    await page.waitForSelector('input[id="password"]', { timeout: 5000 })
    await page.fill('input[id="password"]', testPassword)
    await page.fill('input[id="confirmPassword"]', testPassword)
    await page.click('button:has-text("Continuar")')

    // Step 3: Termos
    await page.waitForSelector('input[type="checkbox"]', { timeout: 5000 })
    await page.click('input[type="checkbox"]')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Criar minha conta")')

    await page.waitForURL("**/verify-email**", { timeout: 20000 })
    await markEmailVerified(testEmail)

    await page.goto("/login")
    await page.fill('input[id="email"]', testEmail)
    await page.fill('input[id="password"]', testPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL("**/dashboard**", { timeout: 20000 })
    await expect(page.locator("h1")).toContainText("Dashboard")

    await page.getByRole("button", { name: "Sair" }).click()
    await expect(page.getByRole("heading", { name: "Sair da conta" })).toBeVisible()
    await page.getByRole("button", { name: "Sair" }).last().click()
    await page.waitForURL("**/login**", { timeout: 20000 })
    await expect(page).toHaveURL(/login/)
  })

  test("cadastro sem confirmação → login leva para verificação de e-mail", async ({ page }) => {
    const unverifiedEmail = `test-unverified-${Date.now()}@finly.app`

    await page.goto("/register")
    await page.fill('input[id="firstName"]', "Não")
    await page.fill('input[id="lastName"]', "Verificado")
    await page.fill('input[id="email"]', unverifiedEmail)
    await page.click('button:has-text("Continuar")')
    await page.waitForSelector('input[id="password"]', { timeout: 5000 })
    await page.fill('input[id="password"]', testPassword)
    await page.fill('input[id="confirmPassword"]', testPassword)
    await page.click('button:has-text("Continuar")')
    await page.waitForSelector('input[type="checkbox"]', { timeout: 5000 })
    await page.click('input[type="checkbox"]')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Criar minha conta")')
    await page.waitForURL("**/verify-email**", { timeout: 20000 })

    await page.goto("/login")
    await page.fill('input[id="email"]', unverifiedEmail)
    await page.fill('input[id="password"]', testPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL("**/verify-email**", { timeout: 20000 })
    await expect(page.getByText(unverifiedEmail)).toBeVisible()
  })

  test("visitante acessa /dashboard → redirecionado para login", async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto("/dashboard")
    await page.waitForURL("**/login**", { timeout: 20000 })
    await expect(page).toHaveURL(/login/)
    await context.close()
  })
})
