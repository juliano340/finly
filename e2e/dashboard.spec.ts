import { test, expect } from "@playwright/test"

test.describe("Dashboard", () => {
  const seedEmail = `dash-e2e-${Date.now()}@finly.app`

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto("/register")
    await page.fill('input[id="firstName"]', "Dash")
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

  test("dashboard carrega com cards de resumo e seletor de mês", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[id="email"]', seedEmail)
    await page.fill('input[id="password"]', "Finly123")
    await page.click('button[type="submit"]')
    await page.waitForURL("**/dashboard**", { timeout: 20000 })

    await expect(page.locator("h1")).toContainText("Dashboard")

    await expect(page.locator("text=Saldo atual")).toBeVisible()
    await expect(page.locator("text=Receitas do mês")).toBeVisible()
    await expect(page.locator("text=Despesas do mês")).toBeVisible()

    const now = new Date()
    const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    await expect(page.locator(`text=${monthName}`)).toBeVisible()

    await expect(page.locator("text=Receitas vs Despesas")).toBeVisible()
    await expect(page.locator("text=Gastos por Categoria")).toBeVisible()
    await expect(page.locator("text=Evolução Diária")).toBeVisible()
    await expect(page.locator("text=Transações Recentes")).toBeVisible()
  })
})
