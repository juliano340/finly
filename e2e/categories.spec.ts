import { test, expect } from "@playwright/test"

test.describe("Categorias", () => {
  const seedEmail = `cat-e2e-${Date.now()}@finly.app`

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto("/register")
    await page.fill('input[id="firstName"]', "Cat")
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

  test("criar e editar categoria pela UI", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[id="email"]', seedEmail)
    await page.fill('input[id="password"]', "Finly123")
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)
    await expect(page).toHaveURL("/dashboard")

    await page.goto("/categories")
    await expect(page.locator("h1")).toContainText("Categorias")

    await page.click('button:has-text("Nova categoria")')
    await page.fill('input[id="cat-name"]', "Lazer E2E")
    await page.click('button:has-text("Salvar")')

    await expect(page.locator("text=Lazer E2E")).toBeVisible({ timeout: 10000 })

    await page.locator("text=Lazer E2E").locator("..").locator("..").locator("..").locator("button").first().click()

    await page.fill('input[id="cat-name"]', "Lazer Editado")
    await page.click('button:has-text("Salvar")')

    await expect(page.locator("text=Lazer Editado")).toBeVisible({ timeout: 10000 })
  })
})
