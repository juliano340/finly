import { expect, test, type Page } from "@playwright/test"
import { mkdirSync } from "node:fs"
import { markEmailVerified } from "./utils/db"

const PASSWORD = "Finly123"
const VIEWPORT = { width: 393, height: 873 }
const DESKTOP_VIEWPORT = { width: 1280, height: 900 }
const NAV_LABEL = "Navegação entre meses"
const PAGES = ["/dashboard", "/transactions", "/monthly-closing", "/fixed-costs", "/monthly-plan"] as const
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const accounts = {
  mobile: `month-nav-mobile-${runId}@finly.app`,
}

test.describe("MonthNavigator em viewport mobile (Redmi Note 13 - 393px)", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await register(page, accounts.mobile, "Nav Mobile")
    await page.close()
  })

  test("transactions: pill de distância não estoura a largura", async ({ page }) => {
    await page.setViewportSize(VIEWPORT)
    await login(page, accounts.mobile)
    const current = businessMonth(new Date())

    await page.goto(`/transactions?month=${current}`)
    await expect(page.getByLabel(NAV_LABEL)).toBeVisible()
    await assertNavigatorFits(page, "transactions · mês atual (sem pill)")

    await page.getByRole("button", { name: "Próximo mês" }).click()
    await expect(page.getByRole("button", { name: "Hoje" })).toBeEnabled()
    await assertNavigatorFits(page, "transactions · mês seguinte (com pill de distância)")
  })

  test("as 5 páginas com MonthNavigator não têm overflow horizontal em 393x873", async ({ page }) => {
    await page.setViewportSize(VIEWPORT)
    await login(page, accounts.mobile)
    const previous = shiftMonth(businessMonth(new Date()), -1)

    for (const path of PAGES) {
      await page.goto(`${path}?month=${previous}`)
      await expect(page.getByLabel(NAV_LABEL)).toBeVisible()
      await expect(page.getByRole("button", { name: "Hoje" })).toBeEnabled()
      await assertNavigatorFits(page, `${path} · mês anterior (com pill)`)
      await maybeSnapshot(page, path, "mobile")
    }
  })

  test("desktop 1280x900 preservado: navegador em uma linha e sem overflow", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT)
    await login(page, accounts.mobile)
    const previous = shiftMonth(businessMonth(new Date()), -1)

    for (const path of PAGES) {
      await page.goto(`${path}?month=${previous}`)
      await expect(page.getByLabel(NAV_LABEL)).toBeVisible()
      await expect(page.getByRole("button", { name: "Hoje" })).toBeEnabled()
      const metrics = await collectNavigatorMetrics(page)
      console.log(`[month-navigator-desktop] ${path} :: ${JSON.stringify(metrics)}`)
      expect(metrics.documentScrollWidth, `${path}: documento não deve rolar horizontalmente`).toBeLessThanOrEqual(metrics.viewportWidth)
      expect(metrics.container.height, `${path}: desktop deve manter o navegador em uma única linha`).toBeLessThanOrEqual(48)
      await maybeSnapshot(page, path, "desktop")
    }
  })
})

async function assertNavigatorFits(page: Page, label: string) {
  const metrics = await collectNavigatorMetrics(page)
  console.log(`[month-navigator-mobile] ${label} :: ${JSON.stringify(metrics)}`)

  expect.soft(metrics.documentScrollWidth, `${label}: documento não deve rolar horizontalmente`).toBeLessThanOrEqual(metrics.viewportWidth)
  expect.soft(metrics.container.x, `${label}: container do navegador começa fora da viewport`).toBeGreaterThanOrEqual(0)
  expect.soft(metrics.container.right, `${label}: container do navegador termina fora da viewport`).toBeLessThanOrEqual(metrics.viewportWidth)
  expect.soft(metrics.container.scrollWidth, `${label}: conteúdo do navegador estourou o container`).toBeLessThanOrEqual(metrics.container.clientWidth)
  if (metrics.main) {
    expect.soft(metrics.main.scrollWidth, `${label}: main não deve rolar horizontalmente`).toBeLessThanOrEqual(metrics.main.clientWidth)
  }
  for (const child of metrics.children) {
    expect.soft(child.x, `${label}: filho "${child.text}" começa fora da viewport`).toBeGreaterThanOrEqual(0)
    expect.soft(child.right, `${label}: filho "${child.text}" termina fora da viewport`).toBeLessThanOrEqual(metrics.viewportWidth)
  }
}

async function collectNavigatorMetrics(page: Page) {
  return page.evaluate((navLabel) => {
    const round = (value: number) => Math.round(value * 100) / 100
    const container = document.querySelector<HTMLElement>(`[aria-label="${navLabel}"]`)
    if (!container) throw new Error(`container não encontrado: ${navLabel}`)
    const rect = container.getBoundingClientRect()
    const main = document.querySelector<HTMLElement>("main")
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
      main: main ? { clientWidth: main.clientWidth, scrollWidth: main.scrollWidth } : null,
      container: {
        x: round(rect.x),
        width: round(rect.width),
        right: round(rect.right),
        height: round(rect.height),
        clientWidth: container.clientWidth,
        scrollWidth: container.scrollWidth,
      },
      children: Array.from(container.children).map((child) => {
        const childRect = child.getBoundingClientRect()
        return {
          tag: child.tagName.toLowerCase(),
          text: (child.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 24),
          x: round(childRect.x),
          width: round(childRect.width),
          right: round(childRect.right),
        }
      }),
    }
  }, NAV_LABEL)
}

async function maybeSnapshot(page: Page, path: string, suffix: string) {
  const dir = process.env.NAV_SNAPSHOT_DIR
  if (!dir) return
  mkdirSync(dir, { recursive: true })
  const name = path.replace(/^\//, "").replace(/\W+/g, "-")
  await page.getByLabel(NAV_LABEL).screenshot({ path: `${dir}/${name}-${suffix}.png` })
}

async function register(page: Page, email: string, name: string) {
  const [firstName, lastName] = name.split(" ")
  await page.goto("/register")
  await page.getByLabel("Nome", { exact: true }).fill(firstName)
  await page.getByLabel("Sobrenome").fill(lastName)
  await page.getByLabel("E-mail").fill(email)
  await page.getByRole("button", { name: "Continuar" }).click()
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible()
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD)
  await page.getByLabel("Confirmar senha").fill(PASSWORD)
  await page.getByRole("button", { name: "Continuar" }).click()
  await expect(page.getByRole("checkbox")).toBeVisible()
  await page.getByRole("checkbox").check()
  await page.getByRole("button", { name: "Criar minha conta" }).click()
  await page.waitForURL("**/verify-email**")
  await markEmailVerified(email)
}

async function login(page: Page, email: string) {
  await page.goto("/login")
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha").fill(PASSWORD)
  await page.getByRole("button", { name: "Entrar" }).click()
  await page.waitForURL("**/dashboard")
}

function businessMonth(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date)
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  return `${year}-${month}`
}

function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}
