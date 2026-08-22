// @vitest-environment node
import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

import packageJson from "../../package.json"
import { renderChangelog } from "../../scripts/generate-changelog"
import { CURRENT_VERSION, releases } from "@/content/releases"

describe("release metadata", () => {
  it("keeps package version aligned with latest release", () => {
    expect(releases[0]?.version).toBe(CURRENT_VERSION)
    expect(packageJson.version).toBe(CURRENT_VERSION)
  })

  it("keeps releases ordered from newest to oldest", () => {
    const dates = releases.map((release) => release.date)

    expect(dates).toEqual([...dates].sort().reverse())
  })

  it("keeps generated CHANGELOG.md up to date", async () => {
    const changelog = await readFile("CHANGELOG.md", "utf8")

    expect(changelog).toBe(renderChangelog(releases))
  })
})
