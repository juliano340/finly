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

  const entrarLink = page.locator("a[href='/login']")
  await expect(entrarLink).toBeVisible()

  const criarContaLink = page.locator("a[href='/register']")
  await expect(criarContaLink).toBeVisible()
})
