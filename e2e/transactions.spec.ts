import { test, expect } from "@playwright/test"
import { markEmailVerified } from "./utils/db"

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
    await page.waitForURL("**/verify-email**", { timeout: 20000 })
    await markEmailVerified(seedEmail)
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
    await page.getByLabel(/Nome/).fill("E2E Cat")
    await page.click('button:has-text("Salvar")')
    await expect(page.getByRole("cell", { name: /E2E Cat/ })).toBeVisible({ timeout: 10000 })

    await page.goto("/transactions")
    await expect(page.locator("h1")).toContainText("Transações")

    await page.click('button:has-text("Novo lançamento avulso")')
    await page.getByRole("heading", { name: "Nova transação" }).waitFor({ timeout: 10000 })
    await page.getByPlaceholder("0,00").fill("99,90")
    await page.click('text=Selecione...')
    await page.getByText("E2E Cat", { exact: true }).click()
    await page.click('button:has-text("Salvar")')
    await expect(page.getByRole("row", { name: /E2E Cat.*99,90/ })).toBeVisible({ timeout: 10000 })
  })

  test("criar lançamento em outro mês redireciona automaticamente", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[id="email"]', seedEmail)
    await page.fill('input[id="password"]', "Finly123")
    await page.click('button[type="submit"]')
    await page.waitForURL("**/dashboard**", { timeout: 20000 })

    await page.goto("/categories")
    await page.click('button:has-text("Nova categoria")')
    await page.getByLabel(/Nome/).fill("E2E Outro Mês")
    await page.click('button:has-text("Salvar")')
    await expect(page.getByRole("cell", { name: /E2E Outro Mês/ })).toBeVisible({ timeout: 10000 })

    const now = new Date()
    const target = new Date(now.getFullYear(), now.getMonth() - 1, 15)
    const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    const targetMonthStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`
    const targetDateStr = `${targetMonthStr}-15`
    const monthLabel = `${MONTH_ABBR[target.getMonth()]} ${target.getFullYear()}`

    await page.goto("/transactions")
    await expect(page.locator("h1")).toContainText("Transações")

    await page.click('button:has-text("Novo lançamento avulso")')
    await page.getByRole("heading", { name: "Nova transação" }).waitFor({ timeout: 10000 })
    await page.getByPlaceholder("0,00").fill("15,50")
    await page.getByLabel(/Data/).fill(targetDateStr)
    await page.click('text=Selecione...')
    await page.getByText("E2E Outro Mês", { exact: true }).click()
    await page.click('button:has-text("Salvar")')

    await expect(page.getByText(new RegExp(`lista ajustada para ${monthLabel}`))).toBeVisible({ timeout: 10000 })
    await expect(page.locator('div[aria-label="Navegação entre meses"]')).toContainText(monthLabel, { timeout: 10000 })
    await expect(page.getByRole("row", { name: /E2E Outro Mês.*15,50/ })).toBeVisible({ timeout: 10000 })
  })
})
