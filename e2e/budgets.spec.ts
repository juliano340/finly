import { test, expect } from "@playwright/test"

test.describe("Orçamentos", () => {
  const seedEmail = `budget-e2e-${Date.now()}@finly.app`

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto("/register")
    await page.fill('input[id="firstName"]', "Budget")
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

  test("criar categoria de despesa e orçamento", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[id="email"]', seedEmail)
    await page.fill('input[id="password"]', "Finly123")
    await page.click('button[type="submit"]')
    await page.waitForURL("**/dashboard**", { timeout: 20000 })

    await page.goto("/categories")
    await page.click('button:has-text("Nova categoria")')
    await page.fill('input[id="cat-name"]', "Alimentação E2E")
    await page.click('button:has-text("Salvar")')
    await expect(page.locator("text=Alimentação E2E")).toBeVisible({ timeout: 10000 })

    await page.goto("/budgets")
    await expect(page.locator("h1")).toContainText("Orçamentos")

    await expect(page.locator("text=Nenhum orçamento definido")).toBeVisible()

    await page.click('button:has-text("Novo Orçamento")')
    await page.waitForSelector('input[id="amount"]', { timeout: 5000 })
    await page.fill('input[id="amount"]', "500")
    await page.click('button:has-text("Selecione...")')
    await page.click('text=Alimentação E2E')
    await page.click('button:has-text("Criar")')
    await expect(page.locator("text=Orçamento criado")).toBeVisible({ timeout: 10000 })

    await expect(page.locator("text=Alimentação E2E")).toBeVisible()
  })
})
