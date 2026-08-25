import { test, expect, type Page } from "@playwright/test"

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

async function showGuide(
  page: Page,
  step: number,
  total: number,
  titulo: string,
  descricao: string
) {
  // injeta overlay e aguarda usuário clicar "Continuar"
  await page.evaluate(
    ({ step, total, titulo, descricao }) => {
      const existing = document.getElementById("g-overlay")
      if (existing) existing.remove()

      const o = document.createElement("div")
      o.id = "g-overlay"
      o.style.cssText = "position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;"
      o.innerHTML = `
        <div style="background:white;border-radius:16px;padding:36px;max-width:460px;width:92%;box-shadow:0 20px 60px rgba(0,0,0,0.35);text-align:center;position:relative">
          <div style="position:absolute;top:-12px;right:-12px;background:#6366f1;color:#fff;font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px">${step}/${total}</div>
          <div style="margin:0 0 8px;font-size:22px;color:#1e293b;font-weight:700">${titulo}</div>
          <div style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6">${descricao}</div>
          <button id="g-go" style="background:#6366f1;color:#fff;border:none;padding:12px 36px;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer">Continuar</button>
        </div>`
      ;
      (o.querySelector("#g-go") as HTMLElement).onclick = () => o.remove()
      document.body.appendChild(o)
    },
    { step, total, titulo, descricao }
  )

  // espera o overlay sumir (usuário clicou "Continuar")
  await page.waitForSelector("#g-overlay", { state: "detached", timeout: 0 })
}

test.describe.configure({ mode: "serial" })

test.setTimeout(600000)

test("Mini guia: login → validação Claro Net", async ({ page }) => {
  if (!email || !password) throw new Error("Defina E2E_EMAIL e E2E_PASSWORD")

  await showGuide(page, 1, 3,
    "🧪 Vamos fazer login",
    "Este teste vai abrir o Finly, fazer login<br>com suas credenciais e depois validar<br>o lançamento <strong>Claro Net</strong>."
  )

  await page.goto("/login")
  await page.fill('input[id="email"]', email)
  await page.fill('input[id="password"]', password)

  await showGuide(page, 2, 3,
    "🔐 Entrando no sistema",
    "Credenciais preenchidas.<br>Agora vamos clicar em <strong>Entrar</strong><br>e aguardar o dashboard."
  )

  await page.click('button[type="submit"]')
  await page.waitForURL("**/dashboard**", { timeout: 20000 })

  await showGuide(page, 3, 3,
    "📋 Validando Claro Net",
    "Vamos abrir <strong>Lançamentos Fixos</strong><br>e verificar se a linha <strong>Claro Net</strong><br>aparece com valor maior que zero."
  )

  await page.goto("/fixed-costs")
  const row = page.locator("tbody tr", { hasText: "Claro Net" }).first()
  await expect(row).toBeVisible({ timeout: 10000 })

  const val = (await row.locator("td").nth(4).innerText()).trim()
  expect(parseCurrency(val)).toBeGreaterThan(0)

  await showGuide(page, 3, 3,
    "✅ Teste concluído",
    `Claro Net encontrado na tabela.<br><br>📍 Valor: <strong>${val}</strong><br><br>Navegador será fechado automaticamente.`
  )
})

function parseCurrency(value: string) {
  const n = value.replace(/[^\d,.-]/g, "")
  if (n.includes(",")) return Number(n.replace(".", "").replace(",", "."))
  return Number(n)
}
