import { chromium } from "@playwright/test"
import { join } from "path"

const HTML = join(import.meta.dirname, "..", "public", "social-preview.html")
const OUT = join(import.meta.dirname, "..", "public", "og.png")

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  })
  await page.goto(`file://${HTML}`)
  await page.waitForTimeout(500)
  await page.screenshot({ path: OUT, type: "png" })
  await browser.close()
  console.log(`✓ ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
