import { test, expect } from "@playwright/test"

test("página inicial carrega sem erro", async ({ page }) => {
  const response = await page.goto("/")
  expect(response?.status()).toBe(200)
})

test("hero e CTAs renderizam na home", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("h1")).toContainText("Suas finanças")
  await expect(page.getByRole("link", { name: "Entrar" }).first()).toBeVisible()
  await expect(page.getByRole("link", { name: "Criar conta grátis" })).toBeVisible()
})
