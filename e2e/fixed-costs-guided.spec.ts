import { test, expect } from "@playwright/test"

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

function parseCurrency(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "")
  if (normalized.includes(",")) return Number(normalized.replace(".", "").replace(",", "."))
  return Number(normalized)
}

function uniqueName(prefix = "E2E Demo") {
  return `${prefix} ${Date.now()}`
}

async function guidedStep(page, step, total, titulo, descricao, action?) {
  await page.evaluate(
    ({ step, total, titulo, descricao }) => {
      const existing = document.getElementById("guided-overlay")
      if (existing) existing.remove()

      const overlay = document.createElement("div")
      overlay.id = "guided-overlay"
      overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(0,0,0,0.5); display: flex;
        align-items: center; justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
      `
      overlay.innerHTML = `
        <div style="
          background: white; border-radius: 16px; padding: 40px;
          max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          text-align: center; position: relative;
        ">
          <div style="
            position: absolute; top: -12px; right: -12px;
            background: #6366f1; color: white; font-size: 12px;
            font-weight: 700; padding: 4px 14px; border-radius: 20px;
          ">${step}/${total}</div>
          <h2 style="margin: 0 0 8px; font-size: 22px; color: #1e293b;">${titulo}</h2>
          <p style="margin: 0 0 24px; font-size: 15px; color: #64748b; line-height: 1.5;">${descricao}</p>
          <button id="guided-continue" style="
            background: #6366f1; color: white; border: none;
            padding: 12px 36px; border-radius: 10px; font-size: 16px;
            font-weight: 600; cursor: pointer;
          ">Continuar</button>
        </div>
      `
      document.body.appendChild(overlay)
    },
    { step, total, titulo, descricao }
  )

  await page.locator("#guided-continue").click()
  await page.evaluate(() => {
    const el = document.getElementById("guided-overlay")
    if (el) el.remove()
  })

  if (action) await action()
}

test.describe.configure({ mode: "serial" })

test("Demonstração guiada: Lançamentos Fixos", async ({ page }) => {
  if (!email || !password) {
    throw new Error("Informe E2E_EMAIL e E2E_PASSWORD para rodar.")
  }

  const name = uniqueName()
  let createdId

  // ── PROCESS 2: LOGIN ──
  await guidedStep(page, 1, 10,
    "Boas-vindas!",
    "Este teste vai demonstrar o módulo de Lançamentos Fixos do Finly.<br><br>Primeiro, vamos fazer login na sua conta.",
    () => page.goto("/login")
  )

  await guidedStep(page, 2, 10,
    "Preenchendo credenciais",
    `Email: <strong>${email}</strong><br><br>As credenciais são carregadas das variáveis de ambiente E2E_EMAIL e E2E_PASSWORD.`,
    async () => {
      await page.fill('input[id="email"]', email)
      await page.fill('input[id="password"]', password)
    }
  )

  await guidedStep(page, 3, 10,
    "Entrando no sistema",
    "Agora vamos clicar em Entrar e aguardar o dashboard carregar.",
    async () => {
      await page.click('button[type="submit"]')
      await page.waitForURL("**/dashboard**", { timeout: 20000 })
    }
  )

  // ── PROCESS 3: NAVEGAR ──
  await guidedStep(page, 4, 10,
    "Acessando Lançamentos Fixos",
    "Vamos navegar até a tela de Lançamentos Fixos para ver os custos recorrentes.",
    async () => {
      await page.goto("/fixed-costs")
      await expect(page.locator("h1")).toContainText("Lançamentos Fixos", { timeout: 10000 })
    }
  )

  await guidedStep(page, 5, 10,
    "Visão geral da tabela",
    "Esta tabela mostra todos os custos fixos do mês:<br><br>• Nome do lançamento<br>• Categoria<br>• Origem (cartão ou fora)<br>• Vencimento<br>• <strong>Valor do mês</strong><br>• Status (Pendente / Pago)<br>• Ações (Editar / Excluir)",
  )

  // ── PROCESS 4: CLARO NET ──
  await guidedStep(page, 6, 10,
    "Localizando Claro Net",
    "Vamos encontrar o registro <strong>Claro Net</strong> na tabela para conferir os valores.",
    async () => {
      const row = page.locator("tbody tr", { hasText: "Claro Net" }).first()
      await expect(row).toBeVisible({ timeout: 10000 })
      const val = (await row.locator("td").nth(4).innerText()).trim()
      console.log(`Claro Net tabela: ${val}`)
    }
  )

  await guidedStep(page, 7, 10,
    "Conferindo valor na tabela vs. cadastro",
    "Vamos clicar em <strong>Editar</strong> no Claro Net para abrir o formulário<br>e comparar o valor exibido na tabela com o valor padrão do cadastro.",
    async () => {
      const row = page.locator("tbody tr", { hasText: "Claro Net" }).first()
      const tableValueText = (await row.locator("td").nth(4).innerText()).trim()
      const tableValue = parseCurrency(tableValueText)
      expect(tableValue).toBeGreaterThan(0)

      await row.getByRole("button", { name: "Editar custo fixo" }).click()
      await expect(page.getByText("Valor padrão do cadastro").first()).toBeVisible({ timeout: 10000 })

      const input = page.locator('input[name="defaultAmount"]').first()
      await expect(input).toBeVisible({ timeout: 5000 })
      const inputValueText = await input.inputValue()
      const inputValue = parseCurrency(inputValueText)

      console.log(`Claro Net input: ${inputValueText}`)
      expect(inputValue).toBe(tableValue)
    }
  )

  // Fechar sheet
  await page.keyboard.press("Escape")
  await page.waitForTimeout(500)

  // ── PROCESS 5: CRUD ──
  await guidedStep(page, 8, 10,
    "Criando um custo fixo temporário",
    `Vamos criar o registro <strong>${name}</strong> com valor R$ 123,45 via API.<br><br>Depois vamos conferir se ele aparece corretamente na tabela.`,
    async () => {
      createdId = await page.evaluate(async (itemName) => {
        const catRes = await fetch("/api/categories")
        const cats = await catRes.json()
        const expenseCat = cats.find((c) => c.type === "EXPENSE")
        if (!expenseCat) throw new Error("Nenhuma categoria de despesa")

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
        if (!res.ok) throw new Error("Erro ao criar")
        const data = await res.json()
        return data.id
      }, name)

      await page.goto("/fixed-costs")
      const row = page.locator("tbody tr", { hasText: name }).first()
      await expect(row).toBeVisible({ timeout: 10000 })
      const val = (await row.locator("td").nth(4).innerText()).trim()
      console.log(`Criado: ${name} — valor: ${val}`)
      expect(parseCurrency(val)).toBeCloseTo(123.45, 2)
    }
  )

  await guidedStep(page, 9, 10,
    "Editando o valor",
    "Vamos alterar o valor para <strong>R$ 234,56</strong> via API<br>e recarregar a tela para confirmar que a tabela foi atualizada.",
    async () => {
      await page.evaluate(async (fixedCostId) => {
        const res = await fetch(`/api/fixed-costs/${fixedCostId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ defaultAmount: "234.56" }),
        })
        if (!res.ok) throw new Error("Erro ao atualizar")
      }, createdId)

      await page.goto("/fixed-costs")
      const row = page.locator("tbody tr", { hasText: name }).first()
      await expect(row.locator("td").nth(4)).toContainText("234,56", { timeout: 10000 })
      const val = (await row.locator("td").nth(4).innerText()).trim()
      console.log(`Atualizado: ${name} — valor: ${val}`)
      expect(parseCurrency(val)).toBeCloseTo(234.56, 2)

      await row.getByRole("button", { name: "Editar custo fixo" }).click()
      await expect(page.getByText("Valor padrão do cadastro").first()).toBeVisible({ timeout: 5000 })
      const input = page.locator('input[name="defaultAmount"]').first()
      await expect(input).toBeVisible({ timeout: 5000 })
      const inputVal = await input.inputValue()
      console.log(`Input edição: ${inputVal}`)
      expect(parseCurrency(inputVal)).toBeCloseTo(234.56, 2)
    }
  )

  await page.keyboard.press("Escape")
  await page.waitForTimeout(500)

  await guidedStep(page, 10, 10,
    "Excluindo o registro temporário",
    "Por fim, vamos excluir o registro via API e confirmar que ele sumiu da tabela.",
    async () => {
      await page.evaluate(async (fixedCostId) => {
        const res = await fetch(`/api/fixed-costs/${fixedCostId}`, { method: "DELETE" })
        if (!res.ok) throw new Error("Erro ao excluir")
      }, createdId)

      await page.goto("/fixed-costs")
      const removedRow = page.locator("tbody tr", { hasText: name }).first()
      await expect(removedRow).not.toBeVisible({ timeout: 10000 })
      console.log(`Excluído: ${name}`)
    }
  )

  await guidedStep(page, 10, 10,
    "✅ Demonstração concluída!",
    "Todos os passos foram executados com sucesso:<br><br>✓ Login automático<br>✓ Navegação até Lançamentos Fixos<br>✓ Visualização da tabela<br>✓ Validação de Claro Net (tabela vs. cadastro)<br>✓ Criação, edição e exclusão de registro<br><br>O navegador será fechado automaticamente.",
  )

  try {
    await page.evaluate(() => {
      const el = document.getElementById("guided-overlay")
      if (el) el.remove()
    })
  } catch {
  }
})
