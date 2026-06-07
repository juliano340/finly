import { test, expect } from "@playwright/test"

test.describe("Transações", () => {
  const seedEmail = `tx-e2e-${Date.now()}@finly.app`

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto("/register")
    await page.fill('input[id="firstName"]', "Tx")
    await page.fill('input[id="lastName"]', "Tester")
    await page.fill('input[id="email"]', seedEmail)
    await page.click('button:has-text("Continuar")')
    await page.waitForSelector('input[id="password"]', { timeout: 5000 })
    await page.fill('input[id="password"]', "Finly123")
    await page.fill('input[id="confirmPassword"]', "Finly123")
    await page.click('button:has-text("Continuar")')
    await page.waitForSelector('input[type="checkbox"]', { timeout: 5000 })
    await page.click('input[type="checkbox"]')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Criar minha conta")')
    await page.waitForURL("**/login**", { timeout: 20000 })
    await page.close()
  })

  test("criar e editar transação pela UI", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[id="email"]', seedEmail)
    await page.fill('input[id="password"]', "Finly123")
    await page.click('button[type="submit"]')
    await page.waitForURL("**/dashboard**", { timeout: 20000 })

    await page.goto("/categories")
    await page.click('button:has-text("Nova categoria")')
    await page.fill('input[id="cat-name"]', "E2E Cat")
    await page.click('button:has-text("Salvar")')
    await expect(page.locator("text=E2E Cat")).toBeVisible({ timeout: 10000 })

    await page.goto("/transactions")
    await expect(page.locator("h1")).toContainText("Transações")

    await page.click('button:has-text("Nova transação")')
    await page.waitForSelector('input[type="number"]')
    await page.fill('input[type="number"]', "99.90")
    await page.click('text=Selecione...')
    await page.click('text=E2E Cat')
    await page.click('button:has-text("Salvar")')
    await expect(page.locator("text=99,90")).toBeVisible({ timeout: 10000 })
  })
})
