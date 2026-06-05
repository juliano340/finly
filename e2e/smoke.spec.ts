import { test, expect } from "@playwright/test"

test("página inicial carrega sem erro", async ({ page }) => {
  const response = await page.goto("/")
  expect(response?.status()).toBe(200)
})

test("título e CTAs renderizam na home", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("h1")).toContainText("Finly")
  await expect(page.locator("text=Entrar")).toBeVisible()
  await expect(page.locator("text=Criar conta")).toBeVisible()
})
