export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0

  const bigramsA = bigrams(a)
  const bigramsB = bigrams(b)

  let intersection = 0
  const used = new Set<number>()

  for (const ba of bigramsA) {
    for (let i = 0; i < bigramsB.length; i++) {
      if (!used.has(i) && ba === bigramsB[i]) {
        intersection++
        used.add(i)
        break
      }
    }
  }

  return intersection / (bigramsA.length + bigramsB.length - intersection)
}

function bigrams(s: string): string[] {
  const lower = s.toLowerCase()
  const result: string[] = []
  for (let i = 0; i < lower.length - 1; i++) {
    result.push(lower.slice(i, i + 2))
  }
  return result
}
