---
status: awaiting_human_verify
trigger: "fiz um backup da aplicação de produção e importei no servidor modo dev, mas duplicou as transações"
created: 2026-08-13
updated: 2026-08-13T20:00:00-03:00
---

## Symptoms

- expected: Restaurar o backup de produção no ambiente dev deve reproduzir os dados uma única vez.
- actual: Lançamentos fixos aparecem duplicados ou triplicados; PUC MINAS aparece três vezes e o total inclui todas as cópias.
- errors: Nenhum erro visível relatado.
- timeline: Ocorreu após importar um backup de produção no servidor em modo dev.
- reproduction: Fazer backup da aplicação de produção, importar no ambiente dev e abrir Lançamentos Fixos > Despesas.

## Current Focus

- hypothesis: Batch delete soft-deletes FixedCostOccurrence rows, while export includes those rows but omits deletedAt, causing replace import to recreate them as active.
- test: User verifies a fresh production export restored with replace mode does not resurrect previously deleted fixed-cost occurrences.
- expecting: Export contains only the active occurrence and replace restore leaves exactly one active occurrence in the database.
- next_action: Await human verification in the real backup and restore workflow.
- reasoning_checkpoint:
    hypothesis: Soft-deleted occurrences resurrect because export selects every user occurrence without filtering deletedAt, then import creates every exported occurrence without deletedAt as active.
    confirming_evidence:
      - Batch delete writes a non-null deletedAt and normal reads filter deletedAt:null.
      - exportData filters only userId and its payload omits deletedAt; replace import creates each payload row active.
    falsification_test: A soft-deleted occurrence appears in the export or exists after replace restore even when export filters deletedAt:null.
    fix_rationale: Excluding tombstones at the export boundary keeps backup semantics aligned with visible active state and prevents import from recreating hidden rows.
    blind_spots: Existing backup files and already-resurrected database rows remain unchanged by this application-only fix.
- tdd_checkpoint:

## Evidence

- timestamp: 2026-08-13T20:00:00-03:00
  checked: Final diff, diff whitespace check, and worktree status
  found: Application diff contains only the deletedAt:null export filter and regression test; git diff --check passed. No database or backup JSON files changed, and no commit was created.
  implication: Implementation stayed within approved application-and-test scope.

- timestamp: 2026-08-13T19:59:00-03:00
  checked: ESLint on backup.service.ts and backup.service.test.ts
  found: ESLint completed successfully with exit code 0 and no findings.
  implication: Changed TypeScript passes focused static analysis.

- timestamp: 2026-08-13T19:58:00-03:00
  checked: Focused backup service test suite after export filter and regression test
  found: Vitest passed 1 file and all 7 tests, including the soft-delete export and replace-restore regression.
  implication: Original resurrection path is blocked and adjacent backup service behavior remains passing in focused coverage.

- timestamp: 2026-08-13T19:57:00-03:00
  checked: RTK availability before focused verification
  found: PowerShell could not resolve the rtk command.
  implication: Use the underlying npm scripts directly for verification; this does not affect application behavior.

- timestamp: 2026-08-13
  checked: Newly supplied backup structure and PUC MINAS rows
  found: Backup exported at 2026-08-13T04:32:54.020Z contains 80 occurrences, exactly one PUC MINAS definition, and three active-looking September payload rows with restored IDs cmsr0e5qq008byournv8zgpwf, cmsr0e5qr008cyourst2hl0ed, and cmsr0e5qs008eyourteq8474u. Occurrence payload properties omit both deletedAt and scheduledDate.
  implication: Backup remains capable of losing deletion state. Whether it actually exported tombstones must be established from dev.db.

- timestamp: 2026-08-13
  checked: Static code path for occurrence visibility, deletion, export, and import
  found: Occurrence GET filters deletedAt:null; batch-delete updates deletedAt to current time; exportData queries fixedCostOccurrence by userId only and selects no deletedAt; backup schema/import mapping also omit deletedAt.
  implication: Soft-deleted occurrences are structurally eligible for export and would be recreated active. Data correlation is still required to prove this mechanism caused the reported duplicates.

- timestamp: 2026-08-13
  checked: Project skill discovery and repository inventory
  found: No project-local .agents/skills or .claude/skills directories were listed. Relevant code exists in src/features/backup, src/app/api/backup, src/features/fixed-costs, Prisma schemas/migrations, and backup-related tests.
  implication: Investigation should trace application-owned backup/import and recurrence logic; no extra project skill rules apply.

- timestamp: 2026-08-13
  checked: src/features/backup/backup.service.ts and Prisma schemas
  found: Replace mode calls deleteAllUserData before insertAll in one transaction. Merge mode deduplicates FixedCost by unique name_userId and FixedCostOccurrence by fixedCostId+month, but Transaction and BankAccountMovement are always created; schema has no natural-key uniqueness for transactions. FixedCost is unique by name+user and occurrence is unique by fixedCostId+scheduledDate (scheduledDate nullable).
  implication: Re-import in merge mode can duplicate ordinary transactions and movements by design; PUC MINAS triplication still requires JSON/DB comparison because fixed-cost definitions should not duplicate under current constraints.

- timestamp: 2026-08-13
  checked: finly-backup-2026-08-13.json summary and PUC MINAS direct matches
  found: Backup exportedAt=2026-08-13T04:17:22.468Z contains 7 fixedCosts, 81 fixedCostOccurrences, 4 transactions, 35 bankAccountMovements, and exactly one FixedCost named PUC MINAS (id cmrgrhgmn000204l938b9ybhp, amount 260, start 2026-07-11, monthly, COUNT 24) plus one movement PAGAMENTO PUC MINAS (id cmsgiwen3000004l7g3jnv6vo, amount 260, date 2026-08-05T20:11:59.389Z).
  implication: Fixed-cost definition triplication is not present in backup JSON. Linked occurrence count must be resolved by fixedCostId; dev.db must be queried to locate where copies were introduced.

- timestamp: 2026-08-13
  checked: Backup linked occurrences for fixedCostId cmrgrhgmn000204l938b9ybhp
  found: JSON already contains 14 PUC MINAS occurrences, including three logically identical September 2026 rows: cmslz104e000004jp898pi5hk, cmslz105d000104jpfxxofwuu, cmslz10br000204jpndl09d5w; each month=2026-09, financialMonthId=cmr5mnc96000j04jvqe04z3tv, dueDate=2026-09-01, amount=260, status=PENDING.
  implication: Restore did not originate the visible PUC triplication; source production data was already duplicated before export.

- timestamp: 2026-08-13
  checked: Read-only dev.db comparison after restore
  found: dev.db has one PUC MINAS FixedCost (new id cmsr0e5pj007eyour6kwsa78u, created 2026-08-13T04:19:22.855Z) and three September occurrences (cmsr0e5qq008byournv8zgpwf, cmsr0e5qr008cyourst2hl0ed, cmsr0e5qs008eyourteq8474u) created 2 ms apart at 04:19:22.898-.900Z. All have scheduledDate=NULL and otherwise identical logical key. This is the only duplicate occurrence group in dev.db. One PUC payment movement exists, not triplicated.
  implication: Replace import faithfully recreated the three JSON rows under new IDs. Unique(fixedCostId, scheduledDate) did not reject them because scheduledDate is NULL.

- timestamp: 2026-08-13
  checked: CUID timestamps and git history of occurrence generation
  found: Source duplicate IDs decode to 2026-08-09T15:42:18.590Z, .625Z, and .855Z. Commit 4dca71b was committed later at 2026-08-09T17:41:46Z and explicitly changed generation from read-then-createMany keyed by fixedCostId+month to upsert keyed by fixedCostId+scheduledDate to prevent concurrent SQLite/PostgreSQL duplicates.
  implication: The three production rows were created by the known pre-fix concurrency race roughly two hours before its idempotency fix landed.

- timestamp: 2026-08-13
  checked: Backup export/schema/import field mapping and scheduledDate migration
  found: Migration 20260809133000 adds nullable scheduledDate and unique(fixedCostId, scheduledDate) without backfilling legacy rows. exportData does not select scheduledDate; backupSchema has no scheduledDate; insertAll creates occurrences without scheduledDate. Both SQLite and PostgreSQL permit multiple NULL values under this unique constraint.
  implication: Backup/restore cannot preserve occurrence identity and cannot reject duplicated legacy/logical occurrences; it faithfully re-inserts all duplicate JSON rows with scheduledDate=NULL.

## Eliminated

- hypothesis: Restore created three PUC MINAS fixed-cost definitions.
  evidence: JSON and dev.db each have exactly one PUC MINAS FixedCost; schema unique(name,userId) prevents definition duplication.
  timestamp: 2026-08-13

- hypothesis: Restore generated extra PUC MINAS payment movements or ordinary transactions that explain the fixed-cost list triplication.
  evidence: JSON and dev.db each have one PAGAMENTO PUC MINAS movement and no PUC transaction; the three visible rows are FixedCostOccurrence records.
  timestamp: 2026-08-13

- hypothesis: The current post-fix recurrence generator created the three rows after restore.
  evidence: All dev duplicate rows were inserted within the restore transaction at 04:19:22.898-.900Z with scheduledDate=NULL and correspond one-for-one to the three pre-existing JSON IDs; current generated rows use non-null scheduledDate.
  timestamp: 2026-08-13

## Resolution

- root_cause: Batch deletion soft-deletes FixedCostOccurrence rows, but backup export includes deleted rows and omits deletedAt; import therefore recreates those hidden rows as active, resurrecting prior occurrences and causing visible duplicates/triplicates after restore.
- fix: Added deletedAt:null to fixedCost occurrence export filtering and a soft-delete -> export -> replace restore regression test. Existing data and backup files were not modified.
- verification: Focused backup service suite passed 7/7, including soft-delete -> export -> replace restore; ESLint passed both changed TypeScript files; git diff --check passed. Real-environment confirmation remains pending.
- files_changed:
  - src/features/backup/backup.service.ts
  - src/features/backup/__tests__/backup.service.test.ts

## Recommended Fix Direction

1. Code: add `deletedAt: null` to the `fixedCostOccurrences` export query. Do not preserve/import tombstones unless backup semantics are intentionally redesigned to include deleted state.
2. Tests: create active and soft-deleted occurrences, export, assert only active rows are present, replace-import, and assert active count/logical keys remain unchanged.
3. Data: identify restored active duplicates by user, fixed cost, financial month/due date, and amount; retain the intended row and soft-delete extras only after producing a reviewable dry-run report. Do not infer cleanup solely from matching descriptions.
