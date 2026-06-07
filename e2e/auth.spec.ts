import { test, expect } from "@playwright/test"

test.describe("Autenticação", () => {
  const testEmail = `test-${Date.now()}@finly.app`
  const testPassword = "Finly123"

  test("registro → login → dashboard → logout", async ({ page }) => {
    await page.goto("/register")

    await page.fill('input[id="name"]', "Maria E2E")
    await page.fill('input[id="email"]', testEmail)
    await page.fill('input[id="password"]', testPassword)
    await page.click('button[type="submit"]')

    await page.waitForURL("**/login**", { timeout: 15000 })

    await page.fill('input[id="email"]', testEmail)
    await page.fill('input[id="password"]', testPassword)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL("/dashboard")
    await expect(page.locator("h1")).toContainText("Dashboard")

    await page.click('button:has-text("Sair")')
    await expect(page).toHaveURL("/login")
  })

  test("visitante acessa /dashboard → redirecionado para login", async ({
    page,
  }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL("/login")
  })
})
