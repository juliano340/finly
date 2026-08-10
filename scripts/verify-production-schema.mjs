import pg from "pg";
import { pathToFileURL } from "node:url";

const { Client } = pg;
const migrationName = "20260809180000_add_monthly_plan";
const runtimeRoles = ["finly_app", "finly_runtime"];
const dmlPrivileges = ["SELECT", "INSERT", "UPDATE", "DELETE"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function verifyProductionSchema(databaseUrl = process.env.DATABASE_URL) {
  assert(databaseUrl?.trim(), "DATABASE_URL is required for schema verification.");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const migration = await client.query(
      `SELECT EXISTS (
         SELECT 1
         FROM "_prisma_migrations"
         WHERE migration_name = $1
           AND finished_at IS NOT NULL
           AND rolled_back_at IS NULL
       ) AS applied`,
      [migrationName],
    );
    assert(migration.rows[0]?.applied, `Required migration ${migrationName} is not applied.`);

    const structure = await client.query(`
      SELECT
        to_regclass('public."MonthlyPlan"') IS NOT NULL AS table_exists,
        EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'public."MonthlyPlan"'::regclass
            AND conname = 'MonthlyPlan_userId_fkey'
            AND contype = 'f'
            AND confrelid = 'public."User"'::regclass
            AND confdeltype = 'c'
            AND confupdtype = 'c'
        ) AS foreign_key_exists,
        EXISTS (
          SELECT 1
          FROM pg_index AS indexed
          WHERE indexed.indrelid = 'public."MonthlyPlan"'::regclass
            AND indexed.indisunique
            AND NOT indexed.indisprimary
            AND (
              SELECT array_agg(attribute.attname::text ORDER BY key.ordinality)
              FROM unnest(indexed.indkey) WITH ORDINALITY AS key(attnum, ordinality)
              JOIN pg_attribute AS attribute
                ON attribute.attrelid = indexed.indrelid
               AND attribute.attnum = key.attnum
            ) = ARRAY['month', 'userId']::text[]
        ) AS unique_exists
    `);
    assert(structure.rows[0]?.table_exists, "MonthlyPlan table is missing.");
    assert(structure.rows[0]?.foreign_key_exists, "MonthlyPlan user foreign key is missing.");
    assert(structure.rows[0]?.unique_exists, "MonthlyPlan month/user unique index is missing.");

    const ownership = await client.query(`
      SELECT pg_get_userbyid(relowner) AS owner
      FROM pg_class
      WHERE oid = 'public."MonthlyPlan"'::regclass
    `);
    const owner = ownership.rows[0]?.owner;
    assert(owner, "MonthlyPlan owner could not be determined.");

    for (const role of runtimeRoles) {
      const roleExists = await client.query(
        "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS present",
        [role],
      );
      assert(roleExists.rows[0]?.present, `Required runtime role ${role} is missing.`);

      const privileges = await client.query(
        `SELECT
           has_table_privilege($1, 'public."MonthlyPlan"', 'SELECT') AS can_select,
           has_table_privilege($1, 'public."MonthlyPlan"', 'INSERT') AS can_insert,
           has_table_privilege($1, 'public."MonthlyPlan"', 'UPDATE') AS can_update,
           has_table_privilege($1, 'public."MonthlyPlan"', 'DELETE') AS can_delete,
           has_schema_privilege($1, 'public', 'CREATE') AS can_create,
           $1 = $2 AS owns_table,
           pg_has_role($1, $2, 'MEMBER') AS owner_member`,
        [role, owner],
      );
      const access = privileges.rows[0];
      for (const privilege of dmlPrivileges) {
        assert(access?.[`can_${privilege.toLowerCase()}`], `${role} lacks ${privilege} on MonthlyPlan.`);
      }
      assert(!access?.can_create, `${role} can CREATE in public schema.`);
      assert(!access?.owns_table, `${role} owns MonthlyPlan and can ALTER it.`);
      assert(!access?.owner_member, `${role} inherits MonthlyPlan owner and can ALTER it.`);
    }
  } finally {
    await client.end();
  }
}

const isMainModule = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMainModule) {
  verifyProductionSchema()
    .then(() => console.log("Production schema verification passed."))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : "Production schema verification failed.");
      process.exitCode = 1;
    });
}
