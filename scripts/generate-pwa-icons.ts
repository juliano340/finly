import { chromium } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"

const OUT_DIR = join(import.meta.dirname, "..", "public", "icons")

function iconHtml(size: number, maskable: boolean) {
  const radius = maskable ? 0 : Math.round(size * 0.18)
  const fontSize = maskable ? Math.round(size * 0.46) : Math.round(size * 0.62)

  return `<!doctype html>
<html>
  <body style="margin:0;display:flex;width:${size}px;height:${size}px;background:transparent">
    <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:#080B14;color:#22C55E;font-size:${fontSize}px;font-weight:800;font-family:system-ui,-apple-system,sans-serif;border-radius:${radius}px">F</div>
  </body>
</html>`
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()

  const targets = [
    { file: "icon-192.png", size: 192, maskable: false, transparent: true },
    { file: "icon-512.png", size: 512, maskable: false, transparent: true },
    { file: "icon-maskable-512.png", size: 512, maskable: true, transparent: false },
    { file: "apple-touch-icon.png", size: 180, maskable: true, transparent: false },
  ]

  for (const target of targets) {
    const page = await browser.newPage({
      viewport: { width: target.size, height: target.size },
      deviceScaleFactor: 1,
    })
    await page.setContent(iconHtml(target.size, target.maskable))
    await page.waitForTimeout(150)

    const path = join(OUT_DIR, target.file)
    await page.screenshot({ path, omitBackground: target.transparent })
    await page.close()
    console.log(`generated ${path}`)
  }

  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
