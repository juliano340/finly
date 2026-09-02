import { expect, test, type Browser, type Page } from "@playwright/test"
import { markEmailVerified } from "./utils/db"

const PASSWORD = "Finly123"
const FIXTURE_MONTH = "2026-08"
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const accounts = {
  desktop: `monthly-plan-desktop-${runId}@finly.app`,
  mobile: `monthly-plan-mobile-${runId}@finly.app`,
  dashboard: `monthly-plan-dashboard-${runId}@finly.app`,
  userA: `monthly-plan-a-${runId}@finly.app`,
  userB: `monthly-plan-b-${runId}@finly.app`,
}

const basePlan = {
  month: FIXTURE_MONTH,
  incomeOverride: null,
  suggestedIncome: 1500,
  incomeSource: "SUGGESTED",
  plannedIncome: 1500,
  committedExpenses: 835,
  savingsGoal: 300,
  safetyMargin: 0,
  variableSpent: 0,
  plannedBalance: 665,
  projectedSavings: 665,
  variableAvailable: 365,
  dailySafeLimit: 18.25,
  daysRemaining: 20,
  status: {
    code: "NORMAL",
    label: "Dentro da meta",
    reason: "Meta preservada.",
  },
} as const

test.describe("Plano do Mês", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await register(page, accounts.desktop, "Plano Desktop")
    for (const [index, email] of Object.values(accounts).slice(1).entries()) {
      await registerApi(page, email, `Plano ${index + 2}`)
    }
    await page.close()
  })

  test("edita, recalcula, troca o mês e explica as fontes no desktop", async ({ page }) => {
    await login(page, accounts.desktop)
    const requestedMonths: string[] = []

    await page.route("**/api/monthly-plan**", async (route) => {
      const request = route.request()
      if (request.method() === "PUT") {
        expect(request.postDataJSON()).toEqual({
          month: FIXTURE_MONTH,
          incomeOverride: null,
          savingsGoal: 900,
          safetyMargin: 100,
        })
        await route.fulfill({
          json: {
            ...basePlan,
            savingsGoal: 900,
            safetyMargin: 100,
            variableAvailable: -335,
            dailySafeLimit: 0,
            projectedSavings: 665,
            status: {
              code: "RISK",
              label: "Meta ameaçada",
              reason: "A meta de economia não cabe no valor disponível.",
            },
          },
        })
        return
      }

      const month = new URL(request.url()).searchParams.get("month") ?? ""
      requestedMonths.push(month)
      await route.fulfill({
        json: month === "2026-09"
          ? {
              ...basePlan,
              month,
              variableSpent: 30,
              variableAvailable: 335,
              dailySafeLimit: 17.63,
              daysRemaining: 19,
              status: {
                code: "ATTENTION",
                label: "Atenção",
                reason: "Gastos acima do ritmo reduziram o limite diário.",
              },
            }
          : basePlan,
      })
    })

    await page.goto(`/monthly-plan?month=${FIXTURE_MONTH}`)
    await expect(page.getByRole("heading", { level: 1, name: "Plano do Mês" })).toBeVisible()
    await expect(page.getByText(/R\$\s*18,25/).first()).toBeVisible()
    await expect(page.getByText(/R\$\s*365,00/).first()).toBeVisible()
    await expect(page.getByRole("status")).toContainText("Dentro da meta")
    await expect(page.getByText(/“Transações” são despesas avulsas/)).toBeVisible()
    await expect(page.getByText(/não é identificada automaticamente/)).toBeVisible()

    await page.getByRole("spinbutton", { name: /meta mínima de economia/i }).fill("900")
    await page.getByRole("spinbutton", { name: /margem de segurança/i }).fill("100")
    await page.getByRole("button", { name: "Salvar plano" }).click()

    await expect(page.getByText("Plano do mês atualizado!")).toBeVisible()
    await expect(page.getByRole("status")).toContainText("Meta ameaçada")
    await expect(page.getByText(/R\$\s*0,00/).first()).toBeVisible()

    await page.getByRole("button", { name: "Próximo mês" }).click()
    await expect(page.getByLabel("Mês do plano")).toHaveValue("2026-09")
    await expect(page.getByText(/R\$\s*17,63/).first()).toBeVisible()
    await expect(page.getByRole("status")).toContainText("Atenção")
    expect(new Set(requestedMonths)).toEqual(new Set([FIXTURE_MONTH, "2026-09"]))
  })

  test("mantém a jornada legível e operável em viewport mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await login(page, accounts.mobile)
    await page.route("**/api/monthly-plan**", (route) => route.fulfill({ json: basePlan }))

    await page.goto(`/monthly-plan?month=${FIXTURE_MONTH}`)

    await expect(page.getByRole("heading", { level: 1, name: "Plano do Mês" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Limite diário seguro" })).toBeVisible()
    await expect(page.getByRole("spinbutton", { name: /receita prevista/i })).toBeVisible()
    await expect(page.getByRole("spinbutton", { name: /meta mínima de economia/i })).toBeEditable()
    await expect(page.getByRole("button", { name: "Salvar plano" })).toBeVisible()
    await expect(page.getByRole("status")).toContainText("Dentro da meta")
  })

  test("dashboard reutiliza um único summary fetch e abre o mês no plano", async ({ page }) => {
    await login(page, accounts.dashboard)
    const summaryRequests: string[] = []
    const standalonePlanRequests: string[] = []
    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname
      if (pathname === "/api/dashboard/summary") {
        summaryRequests.push(request.url())
      } else if (pathname === "/api/monthly-plan") {
        standalonePlanRequests.push(request.url())
      }
    })
    await page.route("**/api/dashboard/summary?**", (route) => route.fulfill({
      json: {
        stats: {
          balance: 0,
          income: 0,
          expense: 0,
          byCategory: [],
          dailyTrend: [],
          recentTransactions: [],
        },
        bankTotal: 0,
        closing: { summary: { totalToPay: 0, totalSpent: 0 } },
        evolution: {
          months: [],
          currentTotal: 0,
          previousTotal: 0,
          changePercent: null,
          average: 0,
          highestMonth: null,
        },
        cardEvolution: { cards: [], months: [] },
        monthlyPlan: basePlan,
      },
    }))

    await page.goto("/dashboard")
    await expect(page.getByRole("heading", { name: "Limite diário seguro" })).toBeVisible()
    await expect(page.getByText("Economia projetada").first()).toBeVisible()
    await expect(page.getByRole("status", { name: /Situação do plano:/ })).toBeVisible()
    await expect(page.getByRole("link", { name: "Ver Plano do Mês" })).toBeVisible()
    expect(new Set(summaryRequests).size).toBe(1)
    expect(standalonePlanRequests).toHaveLength(0)

    const href = await page.getByRole("link", { name: "Ver Plano do Mês" }).getAttribute("href")
    expect(href).toMatch(/^\/monthly-plan\?month=\d{4}-\d{2}$/)
  })

  test("aceita extremos, bloqueia meses externos e isola usuários A/B", async ({ browser }) => {
    const pageA = await authenticatedPage(browser, accounts.userA)
    const pageB = await authenticatedPage(browser, accounts.userB)
    const currentMonth = businessMonth(new Date())
    const currentYear = Number(currentMonth.slice(0, 4))
    const minMonth = `${currentYear - 1}-01`
    const maxMonth = `${currentYear + 1}-12`

    for (const month of [minMonth, maxMonth]) {
      const response = await pageA.request.get(`/api/monthly-plan?month=${month}`)
      expect(response.status(), `extremo ${month} deve ser aceito`).toBe(200)
    }
    for (const month of [`${currentYear - 2}-12`, `${currentYear + 2}-01`]) {
      const response = await pageA.request.get(`/api/monthly-plan?month=${month}`)
      expect(response.status(), `mês externo ${month} deve ser rejeitado`).toBe(400)
    }

    const savedA = await pageA.request.put("/api/monthly-plan", {
      data: { month: currentMonth, incomeOverride: 1500, savingsGoal: 321, safetyMargin: 45 },
    })
    expect(savedA.status()).toBe(200)

    const beforeB = await pageB.request.get(`/api/monthly-plan?month=${currentMonth}`)
    expect(beforeB.status()).toBe(200)
    expect((await beforeB.json()).savingsGoal).not.toBe(321)

    const savedB = await pageB.request.put("/api/monthly-plan", {
      data: { month: currentMonth, incomeOverride: 700, savingsGoal: 111, safetyMargin: 0 },
    })
    expect(savedB.status()).toBe(200)

    const afterA = await pageA.request.get(`/api/monthly-plan?month=${currentMonth}`)
    expect(afterA.status()).toBe(200)
    expect(await afterA.json()).toMatchObject({
      incomeOverride: 1500,
      savingsGoal: 321,
      safetyMargin: 45,
    })

    await pageA.goto(`/monthly-plan?month=${minMonth}`)
    await expect(pageA.getByRole("button", { name: "Mês anterior" })).toBeDisabled()
    await pageA.goto(`/monthly-plan?month=${maxMonth}`)
    await expect(pageA.getByRole("button", { name: "Próximo mês" })).toBeDisabled()

    await pageA.close()
    await pageB.close()
  })
})

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

async function registerApi(page: Page, email: string, name: string) {
  const response = await page.request.post("/api/auth/register", {
    data: { name, email, password: PASSWORD },
  })
  expect(response.status(), `cadastro de ${email}`).toBe(201)
  await markEmailVerified(email)
}

async function login(page: Page, email: string) {
  await page.goto("/login")
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha").fill(PASSWORD)
  await page.getByRole("button", { name: "Entrar" }).click()
  await page.waitForURL("**/dashboard")
}

async function authenticatedPage(browser: Browser, email: string) {
  const page = await browser.newPage()
  await login(page, email)
  return page
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
