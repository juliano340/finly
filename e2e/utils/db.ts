import Database from "better-sqlite3"

const databaseUrl = process.env.DATABASE_URL ?? "file:./test.db"

export function markEmailVerified(email: string) {
  const file = databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl
  const db = new Database(file)

  try {
    const result = db
      .prepare("UPDATE User SET emailVerified = ? WHERE email = ?")
      .run(toPrismaDateTime(new Date()), email.trim().toLowerCase())

    if (result.changes === 0) {
      throw new Error(`[e2e] usuário não encontrado para verificação de e-mail: ${email}`)
    }
  } finally {
    db.close()
  }
}

function toPrismaDateTime(date: Date) {
  return `${date.toISOString().slice(0, -1)}+00:00`
}
