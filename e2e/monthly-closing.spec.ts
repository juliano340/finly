import { test, expect } from "@playwright/test"
import { markEmailVerified } from "./utils/db"

test.describe("Fechamento Mensal", () => {
  const seedEmail = `closing-e2e-${Date.now()}@finly.app`

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto("/register")
    await page.fill('input[id="firstName"]', "Closing")
    await page.fill('input[id="lastName"]', "Tester")
    await page.fill('input[id="email"]', seedEmail)
    await page.click('button:has-text("Continuar")')
    await page.waitForSelector('input[id="password"]')
    await page.fill('input[id="password"]', "Finly123")
    await page.fill('input[id="confirmPassword"]', "Finly123")
    await page.click('button:has-text("Continuar")')
    await page.waitForSelector('input[type="checkbox"]')
    await page.click('input[type="checkbox"]')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Criar minha conta")')
    await page.waitForURL("**/verify-email**", { timeout: 20000 })
    await markEmailVerified(seedEmail)
    await page.close()
  })

  test("calcula fatura, custos fixos e avulsas sem duplicar cartão", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[id="email"]', seedEmail)
    await page.fill('input[id="password"]', "Finly123")
    await page.click('button[type="submit"]')
    await page.waitForURL("**/dashboard**", { timeout: 20000 })

    await page.goto("/categories")
    await page.click('button:has-text("Nova categoria")')
    await page.fill('input[id="cat-name"]', "Fechamento E2E")
    await page.click('button:has-text("Salvar")')
    await expect(page.getByRole("cell", { name: /Fechamento E2E/ })).toBeVisible({ timeout: 10000 })

    await page.goto("/cards")
    await page.getByRole("button", { name: /Novo cartão/ }).click()
    await page.fill('input[name="name"]', "Cartão E2E")
    await page.fill('input[name="brand"]', "Visa")
    await page.click('button:has-text("Salvar")')
    await expect(page.getByRole("button", { name: "Cartão E2E" })).toBeVisible({ timeout: 10000 })

    await page.goto("/fixed-costs")
    await page.getByRole("button", { name: /Novo custo fixo/ }).click()
    await page.fill('input[name="name"]', "Internet E2E")
    await page.fill('input[name="defaultAmount"]', "120")
    await page.selectOption('select[name="categoryId"]', { label: "Fechamento E2E" })
    await page.click('button:has-text("Salvar")')
    await expect(page.getByRole("button", { name: "Internet E2E" })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole("heading", { name: /Novo custo fixo/ })).not.toBeVisible({ timeout: 10000 })

    await page.getByRole("button", { name: /Novo custo fixo/ }).click()
    await expect(page.getByRole("heading", { name: /Novo custo fixo/ })).toBeVisible({ timeout: 10000 })
    await page.fill('input[name="name"]', "Streaming E2E")
    await page.fill('input[name="defaultAmount"]', "50")
    await page.selectOption('select[name="categoryId"]', { label: "Fechamento E2E" })
    await page.locator('label', { hasText: "Dentro do cartão" }).locator('input[name="paidInsideCard"]').check()
    await page.selectOption('select[name="cardId"]', { label: "Cartão E2E" })
    await page.click('button:has-text("Salvar")')
    await expect(page.getByRole("button", { name: "Streaming E2E" })).toBeVisible({ timeout: 10000 })

    const now = new Date()
    const invoiceDueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-10`

    await page.goto("/invoices")
    await page.getByRole("button", { name: "Nova fatura" }).click()
    await page.selectOption('select[name="cardId"]', { label: "Cartão E2E" })
    await page.fill('input[name="dueDate"]', invoiceDueDate)
    await page.fill('input[name="amount"]', "300")
    await page.click('button:has-text("Salvar")')
    await expect(page.locator('main :visible:text("R$ 300,00")').first()).toBeVisible({ timeout: 10000 })

    await page.goto("/monthly-closing")
    await expect(page.locator('main :visible:text("R$ 420,00")').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Fatura Cartão E2E", { exact: true }).filter({ visible: true }).first()).toBeVisible()
  })
})
