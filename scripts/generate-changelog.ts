import { writeFile } from "node:fs/promises"
import { pathToFileURL } from "node:url"

import { releases, type ChangeType, type Release } from "../src/content/releases"

const sections: readonly { type: ChangeType; heading: string }[] = [
  { type: "feat", heading: "Adicionado" },
  { type: "fix", heading: "Corrigido" },
  { type: "security", heading: "Segurança" },
  { type: "refactor", heading: "Alterado" },
  { type: "docs", heading: "Documentação" },
  { type: "chore", heading: "Manutenção" },
]

export function renderChangelog(items: readonly Release[]) {
  const output = [
    "# Changelog",
    "",
    "Todas as mudanças relevantes do Finly são registradas neste arquivo.",
    "",
  ]

  for (const release of items) {
    output.push(`## [${release.version}] - ${release.date}`, "")

    for (const section of sections) {
      const changes = release.changes.filter((change) => change.type === section.type)
      if (changes.length === 0) continue

      output.push(`### ${section.heading}`, "")
      for (const change of changes) output.push(`- ${change.description}`)
      output.push("")
    }
  }

  return `${output.join("\n").trimEnd()}\n`
}

const isMainModule = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url

if (isMainModule) {
  writeFile("CHANGELOG.md", renderChangelog(releases), "utf8").catch((error) => {
    console.error(error instanceof Error ? error.message : "Failed to generate changelog.")
    process.exitCode = 1
  })
}
