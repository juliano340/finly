---
status: resolved
trigger: "invoices?month=2026-09 returns API 500; closing, dashboard, cards, and invoices do not load"
created: 2026-09-09
updated: 2026-09-09
---

# Symptoms

- Expected: pages load financial data for `2026-09`.
- Actual: API returns HTTP 500; fechamento, dashboard, cartões e faturas fail to load.
- Error: 500 from invoices API.
- Timeline: not provided.
- Reproduction: open `invoices?month=2026-09` and dependent pages.

# Current Focus

- hypothesis: Resolved: production schema is behind the generated Prisma client after the transaction reversal and auto-created invoice feature.
- next_action: Deploy the new Prisma migration to production using the existing privileged migration script.

# Evidence

- timestamp: 2026-09-09; observation: commit 56834a2 added `Transaction.status`/`TransactionStatus` and `CardInvoice.autoCreated` to both Prisma schemas and runtime services, but `prisma/migrations` had no migration after 20260907000000.
- timestamp: 2026-09-09; observation: `getCardInvoices()` executes `cardInvoice.findMany()` without a select, so Prisma reads `CardInvoice.autoCreated`; an absent production column causes the invoices route to reject with HTTP 500. Dashboard and monthly-closing services also query CardInvoice and Transaction, matching the reported cascade.
- timestamp: 2026-09-09; verification: `npx prisma validate` passed.
- timestamp: 2026-09-09; verification: focused Vitest run passed: 3 files, 21 tests (`card-invoices.service`, `dashboard.service`, `monthly-closing.service`).

# Eliminated

# Resolution

- root_cause: The production PostgreSQL schema was missing `TransactionStatus`, `Transaction.status`, and `CardInvoice.autoCreated`, despite generated Prisma client and shared finance services requiring them.
- fix: Added Prisma migration `20260909150000_add_transaction_status_and_invoice_auto_created` to create the enum and add both non-null columns with safe defaults for existing rows.
- verification: Prisma schema validation passed; focused card-invoice, dashboard, and monthly-closing service tests passed (21/21). Production deployment remains a deliberate operator action via `npm run db:migrate:prod`.
- files_changed: prisma/migrations/20260909150000_add_transaction_status_and_invoice_auto_created/migration.sql
