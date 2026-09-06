import { readFile, writeFile } from "node:fs/promises"
import { pathToFileURL } from "node:url"

import { releases, resolveReleaseDate, type ChangeType, type Release } from "../src/content/releases"

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
    output.push(`## [${release.version}] - ${resolveReleaseDate(release.date)}`, "")

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

/**
 * Fixa datas "auto" no releases.ts: a versão em desenvolvimento recebe a data
 * de hoje no momento em que o changelog é gerado, evitando divergência depois.
 */
async function pinAutoDates() {
  const filePath = new URL("../src/content/releases.ts", import.meta.url)
  const source = await readFile(filePath, "utf8")
  if (!source.includes('date: "auto"')) return

  const today = resolveReleaseDate("auto")
  await writeFile(filePath, source.replaceAll('date: "auto"', `date: "${today}"`), "utf8")
}

const isMainModule = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url

if (isMainModule) {
  pinAutoDates()
    .then(() => writeFile("CHANGELOG.md", renderChangelog(releases), "utf8"))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : "Failed to generate changelog.")
      process.exitCode = 1
    })
}
