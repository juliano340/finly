import { test, expect } from "@playwright/test"

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

test.describe.configure({ mode: "serial" })

function uniqueName(prefix = "E2E Criação") {
  return `${prefix} ${Date.now()}`
}

test.beforeEach(async ({ page }) => {
  if (!email || !password) {
    throw new Error("Informe E2E_EMAIL e E2E_PASSWORD para rodar este teste com seu usuário.")
  }
  await page.goto("/login")
  await page.fill('input[id="email"]', email)
  await page.fill('input[id="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL("**/dashboard**", { timeout: 20000 })
})

test("criar custo fixo → exibir na listagem", async ({ page }) => {
  const name = uniqueName()

  const created = await page.evaluate(async (itemName) => {
    const catRes = await fetch("/api/categories")
    const cats = await catRes.json()
    const expenseCat = cats.find((c: { type: string }) => c.type === "EXPENSE")
    if (!expenseCat) throw new Error("Nenhuma categoria de despesa encontrada")

    const res = await fetch("/api/fixed-costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: itemName,
        type: "EXPENSE",
        defaultAmount: "456.78",
        categoryId: expenseCat.id,
        paymentMethod: "PIX",
        dueDay: 15,
        paidInsideCard: false,
        cardId: null,
        bankAccountId: null,
        active: true,
        startDate: new Date().toISOString().split("T")[0],
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(`Erro ao criar: ${err.error ?? "desconhecido"}`)
    }
    return res.json()
  }, name)

  console.log(`Criado ID: ${created.id}`)
  expect(created.id).toBeTruthy()

  await page.goto("/fixed-costs")
  await expect(page.getByRole("button", { name, exact: true })).toBeVisible({ timeout: 10000 })
  console.log(`${name} visível na listagem após criação.`)
})
