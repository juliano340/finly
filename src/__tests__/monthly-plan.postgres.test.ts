// @vitest-environment node
import { execFileSync, spawnSync } from "node:child_process"
import { resolve } from "node:path"
import { Client } from "pg"
import { describe, expect, it } from "vitest"

const dockerAvailable = spawnSync(
  "docker",
  ["info", "--format", "{{.ServerVersion}}"],
  { encoding: "utf8" },
).status === 0

const postgresSuite = dockerAvailable ? describe : describe.skip

function docker(...args: string[]) {
  return execFileSync("docker", args, { encoding: "utf8" }).trim()
}

async function waitForPostgres(containerName: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const ready = spawnSync(
      "docker",
      [
        "exec",
        containerName,
        "pg_isready",
        "-h",
        "127.0.0.1",
        "-U",
        "postgres",
        "-d",
        "postgres",
      ],
      { encoding: "utf8" },
    )
    if (ready.status === 0) return
    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }
  throw new Error("PostgreSQL temporário não ficou pronto em 30 segundos")
}

postgresSuite("migration MonthlyPlan — PostgreSQL", () => {
  it("cria contrato persistente e limita os roles runtime a DML", async () => {
    const containerName = `finly-monthly-plan-${process.pid}-${Date.now()}`
    let admin: Client | undefined

    try {
      docker(
        "run",
        "--rm",
        "--detach",
        "--name",
        containerName,
        "--env",
        "POSTGRES_PASSWORD=postgres",
        "--publish-all",
        "postgres:15-alpine",
      )
      await waitForPostgres(containerName)

      const portOutput = docker("port", containerName, "5432/tcp")
      const port = portOutput.match(/:(\d+)$/m)?.[1]
      if (!port) throw new Error(`Porta PostgreSQL não encontrada: ${portOutput}`)

      const adminUrl = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`
      admin = new Client({ connectionString: adminUrl })
      await admin.connect()
      await admin.query(`
        CREATE ROLE finly_owner NOLOGIN;
        CREATE ROLE finly_migrator LOGIN PASSWORD 'migrator' IN ROLE finly_owner;
        CREATE ROLE finly_app LOGIN PASSWORD 'app';
        CREATE ROLE finly_runtime LOGIN PASSWORD 'runtime';
        GRANT CONNECT, CREATE ON DATABASE postgres TO finly_owner;
        ALTER SCHEMA public OWNER TO finly_owner;
        GRANT CREATE, USAGE ON SCHEMA public TO finly_owner;
      `)

      const prismaCli = resolve(process.cwd(), "node_modules/prisma/build/index.js")
      execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: `postgresql://finly_migrator:migrator@127.0.0.1:${port}/postgres?schema=public`,
        },
        encoding: "utf8",
      })

      const columns = await admin.query<{
        column_name: string
        data_type: string
        numeric_precision: number | null
        numeric_scale: number | null
      }>(`
        SELECT column_name, data_type, numeric_precision, numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'MonthlyPlan'
      `)
      const names = columns.rows.map((column) => column.column_name)
      expect(names).toEqual(
        expect.arrayContaining([
          "id",
          "month",
          "incomeOverride",
          "savingsGoal",
          "safetyMargin",
          "userId",
          "createdAt",
          "updatedAt",
        ]),
      )
      expect(names).not.toEqual(
        expect.arrayContaining([
          "suggestedIncome",
          "committedExpenses",
          "variableAvailable",
          "dailySafeLimit",
          "projectedSavings",
        ]),
      )

      for (const field of ["incomeOverride", "savingsGoal", "safetyMargin"]) {
        const column = columns.rows.find((candidate) => candidate.column_name === field)
        expect(column).toMatchObject({
          data_type: "numeric",
          numeric_precision: 19,
          numeric_scale: 2,
        })
      }

      const constraints = await admin.query<{
        columns: string[]
        delete_action: string
      }>(`
        SELECT
          array_agg(attribute.attname::text ORDER BY indexed_column.ordinality) AS columns,
          (
            SELECT confdeltype
            FROM pg_constraint
            WHERE conrelid = 'public."MonthlyPlan"'::regclass
              AND contype = 'f'
              AND conname = 'MonthlyPlan_userId_fkey'
          ) AS delete_action
        FROM pg_index AS indexed
        CROSS JOIN LATERAL unnest(indexed.indkey)
          WITH ORDINALITY AS indexed_column(attnum, ordinality)
        JOIN pg_attribute AS attribute
          ON attribute.attrelid = indexed.indrelid
         AND attribute.attnum = indexed_column.attnum
        WHERE indexed.indrelid = 'public."MonthlyPlan"'::regclass
          AND indexed.indisunique
          AND NOT indexed.indisprimary
        GROUP BY indexed.indexrelid
      `)
      expect(constraints.rows[0]?.columns).toEqual(["month", "userId"])
      expect(constraints.rows[0]?.delete_action).toBe("c")

      const ownership = await admin.query<{ owner: string }>(`
        SELECT pg_get_userbyid(relowner) AS owner
        FROM pg_class
        WHERE oid = 'public."MonthlyPlan"'::regclass
      `)
      expect(ownership.rows[0]?.owner).toBe("finly_owner")

      for (const role of ["finly_app", "finly_runtime"]) {
        for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
          const access = await admin.query<{ allowed: boolean }>(
            `SELECT has_table_privilege($1, 'public."MonthlyPlan"', $2) AS allowed`,
            [role, privilege],
          )
          expect(access.rows[0]?.allowed).toBe(true)
        }

        const schemaAccess = await admin.query<{
          can_create: boolean
          owns_table: boolean
          owner_member: boolean
        }>(
          `SELECT
             has_schema_privilege($1, 'public', 'CREATE') AS can_create,
             $1 = $2 AS owns_table,
             pg_has_role($1, $2, 'MEMBER') AS owner_member`,
          [role, ownership.rows[0]?.owner],
        )
        expect(schemaAccess.rows[0]).toEqual({
          can_create: false,
          owns_table: false,
          owner_member: false,
        })
      }
    } finally {
      await admin?.end().catch(() => undefined)
      if (spawnSync("docker", ["inspect", containerName]).status === 0) {
        spawnSync("docker", ["stop", containerName], { encoding: "utf8" })
      }
    }
  }, 180_000)
})
