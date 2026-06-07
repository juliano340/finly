import { test, expect } from "@playwright/test"

test("a página tem layout responsivo", async ({ page }) => {
  await page.goto("/")

  const html = page.locator("html")
  await expect(html).toHaveAttribute("lang", "pt-BR")

  const body = page.locator("body")
  await expect(body).toBeVisible()
})

test("links de navegação existem", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByRole("link", { name: "Entrar" }).first()).toBeVisible()
  await expect(page.getByRole("link", { name: "Criar conta grátis" }).first()).toBeVisible()
})
