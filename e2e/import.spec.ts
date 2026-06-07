import { test, expect } from "@playwright/test"

test.describe("Importação", () => {
  const seedEmail = `import-e2e-${Date.now()}@finly.app`

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto("/register")
    await page.fill('input[id="firstName"]', "Import")
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

  test("página de importação carrega com formato documentado", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[id="email"]', seedEmail)
    await page.fill('input[id="password"]', "Finly123")
    await page.click('button[type="submit"]')
    await page.waitForURL("**/dashboard**", { timeout: 20000 })

    await page.goto("/import")
    await expect(page.locator("h1")).toContainText("Importar Transações")
    await expect(page.getByText("Formato esperado")).toBeVisible()
    await expect(page.getByText("DD/MM/AAAA")).toBeVisible()
  })
})
