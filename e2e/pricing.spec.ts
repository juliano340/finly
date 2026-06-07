import { test, expect } from "@playwright/test"

test.describe("Planos", () => {
  test("página de pricing carrega com planos", async ({ page }) => {
    await page.goto("/pricing")
    await expect(page.locator("h1")).toContainText("Planos")
    await expect(page.locator("text=Escolha o plano ideal")).toBeVisible()

    await expect(page.locator("text=Gratuito")).toBeVisible()
    await expect(page.locator("text=R$ 0")).toBeVisible()
    await expect(page.locator("text=Começar grátis")).toBeVisible()

    await expect(page.getByText("Pro", { exact: true }).first()).toBeVisible()
    await expect(page.locator("text=R$ 29,90")).toBeVisible()
    await expect(page.getByRole("button", { name: "Assinar Pro" })).toBeVisible()
  })
})
