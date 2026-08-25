import { chromium, type Page } from "@playwright/test"
import { execSync } from "child_process"
import { mkdirSync } from "fs"
import { join } from "path"

const PORT = process.env.E2E_PORT ?? "3000"
const BASE = `http://localhost:${PORT}`
const OUT = join(import.meta.dirname, "..", "docs", "screenshots")
const EMAIL = "demo@finly.com"
const PASSWORD = "demo1234"

const PAGES = [
  { path: "/dashboard", name: "dashboard" },
  { path: "/transactions", name: "transactions" },
  { path: "/categories", name: "categories" },
  { path: "/cards", name: "cards" },
  { path: "/budgets", name: "budgets" },
  { path: "/fixed-costs", name: "fixed-costs" },
  { path: "/monthly-closing", name: "monthly-closing" },
  { path: "/bank-accounts", name: "bank-accounts" },
  { path: "/notifications", name: "notifications" },
]

const PUBLIC_PAGES = [
  { path: "/login", name: "login" },
  { path: "/", name: "landing" },
]

async function login(page: Page) {
  await page.goto(`${BASE}/login`)
  await page.waitForLoadState("networkidle")
  await page.fill('input[name="email"], input[type="email"]', EMAIL)
  await page.fill('input[name="password"], input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL("**/dashboard", { timeout: 15000 })
}

async function screenshot(page: Page, name: string, theme: "light" | "dark") {
  const file = join(OUT, `${name}-${theme}.png`)
  if (theme === "dark") {
    await page.evaluate(() => document.documentElement.classList.add("dark"))
    await page.waitForTimeout(300)
  } else {
    await page.evaluate(() => document.documentElement.classList.remove("dark"))
    await page.waitForTimeout(300)
  }
  await page.screenshot({ path: file, fullPage: false })
  console.log(`  ✓ ${name}-${theme}.png`)
}

async function main() {
  mkdirSync(OUT, { recursive: true })

  console.log("🌱 Seeding demo data...")
  execSync("npx tsx scripts/seed-demo.ts --reset", {
    cwd: join(import.meta.dirname, ".."),
    stdio: "inherit",
  })

  console.log("🚀 Starting dev server...")
  const { exec } = await import("child_process")
  const server = exec("npm run dev", { cwd: join(import.meta.dirname, "..") })

  // Wait for server
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE}/api/auth/session`)
      if (res.ok) break
    } catch {}
    await new Promise((r) => setTimeout(r, 1000))
  }

  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()

  console.log("📸 Taking screenshots...")
  await login(page)

  for (const p of PAGES) {
    await page.goto(`${BASE}${p.path}`)
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(500)
    await screenshot(page, p.name, "light")
    await screenshot(page, p.name, "dark")
  }

  for (const p of PUBLIC_PAGES) {
    await page.goto(`${BASE}${p.path}`)
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(500)
    await screenshot(page, p.name, "light")
    await screenshot(page, p.name, "dark")
  }

  await browser.close()
  server.kill()
  console.log(`\n✅ Screenshots saved to ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
