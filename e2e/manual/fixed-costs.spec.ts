import { test, expect } from "@playwright/test"

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

test.describe.configure({ mode: "serial" })

function parseCurrency(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "")
  if (normalized.includes(",")) return Number(normalized.replace(".", "").replace(",", "."))
  return Number(normalized)
}

function uniqueName(prefix = "E2E Fixo") {
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

// ---- CLARO NET TESTS ----

test("Claro Net: mostra valor > 0 na tabela", async ({ page }) => {
  await page.goto("/fixed-costs")
  const row = page.locator("tbody tr", { hasText: "Claro Net" }).first()
  await expect(row).toBeVisible({ timeout: 10000 })

  const displayedValue = (await row.locator("td").nth(4).innerText()).trim()
  const numericValue = parseCurrency(displayedValue)

  console.log(`Claro Net exibido na tabela: ${displayedValue}`)
  expect(numericValue).toBeGreaterThan(0)
})

test("Claro Net: mostra valor padrão > 0 ao editar", async ({ page }) => {
  await page.goto("/fixed-costs")
  const row = page.locator("tbody tr", { hasText: "Claro Net" }).first()
  await expect(row).toBeVisible({ timeout: 10000 })
  await row.getByRole("button", { name: "Editar custo fixo" }).click()

  await expect(page.getByText("Valor padrão do cadastro").first()).toBeVisible({ timeout: 10000 })
  const defaultAmountInput = page.locator('input[name="defaultAmount"]').first()
  await expect(defaultAmountInput).toBeVisible({ timeout: 10000 })

  const displayedValue = await defaultAmountInput.inputValue()
  const numericValue = parseCurrency(displayedValue)

  console.log(`Claro Net no input Valor padrão do cadastro: ${displayedValue}`)
  expect(numericValue).toBeGreaterThan(0)
})

test("Claro Net: mesmo valor na tabela e no input", async ({ page }) => {
  await page.goto("/fixed-costs")
  const row = page.locator("tbody tr", { hasText: "Claro Net" }).first()
  await expect(row).toBeVisible({ timeout: 10000 })

  const tableValueText = (await row.locator("td").nth(4).innerText()).trim()
  const tableValue = parseCurrency(tableValueText)

  await row.getByRole("button", { name: "Editar custo fixo" }).click()
  const defaultAmountInput = page.locator('input[name="defaultAmount"]').first()
  await expect(defaultAmountInput).toBeVisible({ timeout: 10000 })

  const inputValueText = await defaultAmountInput.inputValue()
  const inputValue = parseCurrency(inputValueText)

  console.log(`Claro Net tabela: ${tableValueText}`)
  console.log(`Claro Net input Valor padrão do cadastro: ${inputValueText}`)
  expect(inputValue).toBe(tableValue)
})

// ---- CRUD CYCLE TEST ----

test("ciclo completo: criar → editar → validar → excluir despesa fixa", async ({ page }) => {
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
        defaultAmount: "123.45",
        categoryId: expenseCat.id,
        paymentMethod: "PIX",
        dueDay: 10,
        paidInsideCard: false,
        cardId: null,
        bankAccountId: null,
        active: true,
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
  const row = page.locator("tbody tr", { hasText: name }).first()
  await expect(row).toBeVisible({ timeout: 10000 })

  const createdValueText = (await row.locator("td").nth(4).innerText()).trim()
  const createdValue = parseCurrency(createdValueText)
  console.log(`Criado ${name} com valor na tabela: ${createdValueText}`)
  expect(createdValue).toBeCloseTo(123.45, 2)

  await row.getByRole("button", { name: "Editar custo fixo" }).click()
  await expect(page.getByText("Valor padrão do cadastro").first()).toBeVisible({ timeout: 5000 })

  const editInput = page.locator('input[name="defaultAmount"]').first()
  await expect(editInput).toBeVisible({ timeout: 5000 })
  const inputBeforeEdit = await editInput.inputValue()
  console.log(`Input antes de editar: ${inputBeforeEdit}`)
  expect(parseCurrency(inputBeforeEdit)).toBeCloseTo(123.45, 2)

  await page.evaluate(
    async ({ fixedCostId, amount }) => {
      const res = await fetch(`/api/fixed-costs/${fixedCostId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultAmount: amount }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(`Erro ao atualizar: ${err.error ?? "desconhecido"}`)
      }
    },
    { fixedCostId: created.id, amount: "234.56" }
  )

  await page.goto("/fixed-costs")
  const updatedRow = page.locator("tbody tr", { hasText: name }).first()
  await expect(updatedRow.locator("td").nth(4)).toContainText("234,56", { timeout: 10000 })
  const updatedValueText = (await updatedRow.locator("td").nth(4).innerText()).trim()
  const updatedValue = parseCurrency(updatedValueText)
  console.log(`Após editar, tabela mostra: ${updatedValueText}`)
  expect(updatedValue).toBeCloseTo(234.56, 2)

  await updatedRow.getByRole("button", { name: "Editar custo fixo" }).click()
  await expect(page.getByText("Valor padrão do cadastro").first()).toBeVisible({ timeout: 5000 })

  const inputAfterEdit = page.locator('input[name="defaultAmount"]').first()
  await expect(inputAfterEdit).toBeVisible({ timeout: 5000 })
  const inputValueAfterEdit = await inputAfterEdit.inputValue()
  console.log(`Input ao reabrir edição: ${inputValueAfterEdit}`)
  expect(parseCurrency(inputValueAfterEdit)).toBeCloseTo(234.56, 2)

  await page.evaluate(async (fixedCostId) => {
    const res = await fetch(`/api/fixed-costs/${fixedCostId}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(`Erro ao excluir: ${err.error ?? "desconhecido"}`)
    }
  }, created.id)

  await page.goto("/fixed-costs")
  const removedRow = page.locator("tbody tr", { hasText: name }).first()
  await expect(removedRow).not.toBeVisible({ timeout: 10000 })
  console.log(`${name} excluído com sucesso.`)
})
