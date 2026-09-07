# Graph Report - finly  (2026-09-07)

## Corpus Check
- 390 files · ~314,566 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1684 nodes · 3940 edges · 98 communities (69 shown, 27 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ffd3f32b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- parse-inter-invoice.ts
- Utilitários & Helpers E2E
- ADRs & Pipeline de Produção
- import.service.ts
- categories/page.tsx
- fixed-costs.service.ts
- dialog.tsx
- vitest
- react
- monthly-plan.types.ts
- monthly-closing.service.ts
- bank-accounts.service.ts
- card-invoices.service.ts
- fixed-costs/page.tsx
- cn
- package.json
- lucide-react
- monthly-closing/page.tsx
- FixedCostsPageInner
- lib/prisma.ts
- settings/page.tsx
- Dependências do Projeto
- formatCurrency
- Scripts NPM
- dashboard.service.ts
- transaction-row.tsx
- Dependências de Dev
- Configuração de Componentes
- backup.service.ts
- next-themes
- seed-demo.ts
- pdf-import.service.ts
- purchase-frequency.tsx
- Sistema de Changelog
- API de Orçamentos
- monthly-plan.schema.ts
- pdf-import.types.ts
- Design: Auth & Marca
- monthly-plan.calculator.ts
- Configuração TypeScript
- Plan 01-02: Contracts, Validation & Calculator
- password/route.ts
- Screenshots do App
- resend-verification/route.ts
- @testing-library/react
- recurrence.ts
- app/layout.tsx
- API de Notificações
- Showcase de Marketing
- use-month-param.ts
- me/route.ts
- Gráfico de Evolução da Fatura
- notifications-panel.tsx
- buttonVariants
- auth.ts
- monthly-plan.service.ts
- Verificação de Schema de Produção
- Serviço de Billing
- SettingsPage
- Script de Build Vercel
- monthly-plan.sources.ts
- TransferWizard
- Auth Secret & Proxy
- Screenshots: Orçamentos & Categorias
- transactions/page.tsx
- Seed do Prisma
- Ícone do App
- Tipos pdf-parse
- Testes de Auth Guard
- Design: Landing
- Config OpenCode
- Plugin Graphify (OpenCode)
- Ícones SVG Públicos
- Migração de Produção
- Página de Verificação de E-mail
- dashboard/page.tsx
- Component → Hook → Service → Prisma → DB
- Feature-Based Architecture
- Cards Page - Dark Mode Screenshot
- Fixed Costs Page - Dark Mode Screenshot
- Configuração ESLint
- Configuração PostCSS
- Configuração Vercel
- Dual Prisma Schema Pattern
- Multi-Tenant Isolation by userId
- setState inside useEffect Lint Rule
- Summary 01-01: MonthlyPlan Entity & Schema
- Summary 01-02: Contracts, Validation & Calculator
- Summary 01-03: Financial Composition & Service
- Summary 01-04: Authenticated API
- Summary 01-05: Monthly Plan Page & Form
- Limite Diário Seguro Card
- Anti-Doubling Matrix
- PMES-003: Committed Expenses (No Double Count)
- America/Sao_Paulo Timezone Constraint
- { GET, POST }

## God Nodes (most connected - your core abstractions)
1. `cn()` - 96 edges
2. `vitest` - 64 edges
3. `formatCurrency()` - 57 edges
4. `react` - 55 edges
5. `lucide-react` - 50 edges
6. `prisma` - 45 edges
7. `Button()` - 41 edges
8. `moneyToNumber()` - 37 edges
9. `scripts` - 25 edges
10. `getTestClient()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `calculateMonthlyPlan()` --calls--> `getSupportedMonthWindow (D-17 Window)`  [EXTRACTED]
  src/features/monthly-plan/monthly-plan.calculator.ts → .planning/phases/01-plano-do-mes/01-02-SUMMARY.md
- `Plan 01-02: Contracts, Validation & Calculator` --references--> `MonthlyPlanDto`  [EXTRACTED]
  .planning/phases/01-plano-do-mes/01-02-PLAN.md → src/features/monthly-plan/monthly-plan.types.ts
- `Plan 01-02: Contracts, Validation & Calculator` --references--> `calculateMonthlyPlan()`  [EXTRACTED]
  .planning/phases/01-plano-do-mes/01-02-PLAN.md → src/features/monthly-plan/monthly-plan.calculator.ts
- `Adaptive Daily Limit Redistribution` --rationale_for--> `calculateMonthlyPlan()`  [EXTRACTED]
  .planning/REQUIREMENTS.md → src/features/monthly-plan/monthly-plan.calculator.ts
- `Daily Safe Limit Formula` --rationale_for--> `calculateMonthlyPlan()`  [EXTRACTED]
  .planning/REQUIREMENTS.md → src/features/monthly-plan/monthly-plan.calculator.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **MonthlyPlan Feature Full Implementation Stack** — planning_phases_01_plano_do_mes_01_context__monthly_plan_feature, planning_phases_01_plano_do_mes_01_context__daily_safe_limit, planning_phases_01_plano_do_mes_01_patterns__pure_calculator, planning_phases_01_plano_do_mes_01_06_summary__monthly_plan_card, planning_phases_01_plano_do_mes_01_verification__phase_verification_result [EXTRACTED 0.95]
- **Production Safety Pipeline (Build-Smoke-Migration)** — planning_phases_01_plano_do_mes_01_08_plan__fail_closed_build, planning_phases_01_plano_do_mes_01_08_plan__vercel_build_pipeline, planning_phases_01_plano_do_mes_01_08_plan__production_schema_smoke, docs_migrations__monthly_plan_migration, docs_migrations__database_roles [EXTRACTED 0.95]
- **Authentication Flow (login <-> register)** — design_login_html, design_register_html, design_login_html_auth_system, design_register_html_multistep_form [EXTRACTED 1.00]
- **Landing Page Theme Pair** — docs_screenshots_landing_dark, docs_screenshots_landing_light [EXTRACTED 1.00]
- **Login Page Theme Pair** — docs_screenshots_login_dark, docs_screenshots_login_light [EXTRACTED 1.00]
- **Month Navigation Race Condition Bugs** — planning_debug_fixed_expenses_month_race_md, planning_debug_resolved_dashboard_restored_month_race_md, src_hooks_use_month_param [EXTRACTED 1.00]
- **Monthly Plan Full Implementation Stack** — prisma_migrations_20260809180000_add_monthly_plan, src_features_monthly_plan_monthly_plan_types_monthlyplandto, src_features_monthly_plan_monthly_plan_schema, src_features_monthly_plan_monthly_plan_calculator_calculatemonthlyplan, src_features_monthly_plan_monthly_plan_sources, src_features_monthly_plan_monthly_plan_service, src_app_api_monthly_plan_route, src_app_dashboard_monthly_plan_page, src_app_dashboard_monthly_plan_monthly_plan_form, src_app_dashboard_monthly_plan_monthly_plan_summary [EXTRACTED 1.00]
- **Phase 01 Wave Dependency Chain** — planning_phases_01_plano_do_mes_01_01_plan_md, planning_phases_01_plano_do_mes_01_02_plan_md, planning_phases_01_plano_do_mes_01_03_plan_md, planning_phases_01_plano_do_mes_01_04_plan_md, planning_phases_01_plano_do_mes_01_05_plan_md, planning_phases_01_plano_do_mes_01_06_plan_md [EXTRACTED 1.00]
- **Light/Dark Theme Screenshot Pairs** — docs_screenshots_dashboard_light, docs_screenshots_dashboard_dark, docs_screenshots_bank_accounts_light, docs_screenshots_bank_accounts_dark, docs_screenshots_budgets_light, docs_screenshots_budgets_dark, docs_screenshots_cards_light, docs_screenshots_cards_dark, docs_screenshots_categories_light, docs_screenshots_categories_dark, docs_screenshots_fixed_costs_light, docs_screenshots_fixed_costs_dark [EXTRACTED 1.00]
- **UI Screenshot Showcase** — docs_screenshots_landing_dark, docs_screenshots_landing_light, docs_screenshots_login_dark, docs_screenshots_login_light, docs_screenshots_monthly_closing_dark, docs_screenshots_monthly_closing_light, docs_screenshots_notifications_dark, docs_screenshots_notifications_light, docs_screenshots_transactions_dark, docs_screenshots_transactions_light [INFERRED 0.85]
- **Security Defense-in-Depth (Auth + Rate Limiting + Input Validation + Tenant Isolation)** — docs_adr_002__per_route_auth_concept, docs_adr_003__jwt_invalidation_concept, docs_adr_006__rate_limiting_concept, planning_phases_01_plano_do_mes_01_research__known_threat_patterns, docs_migrations__database_roles [INFERRED 0.85]
- **Social Preview Branding Assets** — public_social_preview_html, public_social_preview_html_brand_finly, public_og_png, public_social_preview_html_tech_stack [INFERRED 0.85]

## Communities (98 total, 27 thin omitted)

### Community 0 - "parse-inter-invoice.ts"
Cohesion: 0.15
Nodes (11): parseCurrency(), months, parsePortugueseDate(), parsers, extractTotal(), findValueAfter(), interParser, tryParseTransaction() (+3 more)

### Community 1 - "Utilitários & Helpers E2E"
Cohesion: 0.06
Nodes (18): accounts, authenticatedPage(), basePlan, login(), register(), registerApi(), markEmailVerified(), toPrismaDateTime() (+10 more)

### Community 2 - "ADRs & Pipeline de Produção"
Cohesion: 0.05
Nodes (50): AGENTS.md — Next.js Agent Rules, Finly Changelog, CLAUDE.md — Project Canonical Documentation, Dual Schema Concept, ADR-001: Dual Prisma Schema, Per-Route Auth Pattern (No Middleware), ADR-002: Per-Route Auth Guards, JWT Invalidation via passwordChangedAt (+42 more)

### Community 3 - "import.service.ts"
Cohesion: 0.21
Nodes (11): POST(), ImportResult, MAX_CSV_LINES, parseAmount(), parseCSV(), parseDate(), ParsedTransaction, sanitizeCell() (+3 more)

### Community 4 - "categories/page.tsx"
Cohesion: 0.09
Nodes (26): DELETE(), PUT(), GET(), POST(), CategoryCard(), CategoryCardProps, iconMap, CategoryForm() (+18 more)

### Community 5 - "fixed-costs.service.ts"
Cohesion: 0.09
Nodes (34): Debug: Fixed Cost Edit Scope, DELETE(), PATCH(), PUT(), mocks, payload, ProtectedFixedCostOccurrenceError, seriesPayload (+26 more)

### Community 6 - "dialog.tsx"
Cohesion: 0.16
Nodes (16): DeleteDialog(), DeleteDialogProps, DeleteDialogProps, DeleteDialogProps, ConfirmDialog(), ConfirmDialogProps, Dialog(), DialogContent() (+8 more)

### Community 7 - "vitest"
Cohesion: 0.10
Nodes (24): bcryptjs, vitest, changePasswordSchema, findOrCreateGoogleUser(), GoogleUserInput, initialPasswordSchema, RegisterInput, registerSchema (+16 more)

### Community 8 - "react"
Cohesion: 0.13
Nodes (27): react, sonner, ForgotPasswordPage(), getInitialEmail(), getInitialRemember(), LoginPage(), ResetPasswordForm(), Status (+19 more)

### Community 9 - "monthly-plan.types.ts"
Cohesion: 0.18
Nodes (12): DailySafeLimitCard(), DailySafeLimitCardProps, PlanContent(), statusPresentation, plan, MonthlyPlanSummaryProps, basePlan, MonthlyPlanDto (+4 more)

### Community 10 - "monthly-closing.service.ts"
Cohesion: 0.16
Nodes (23): POST(), POST(), GET(), validateExpenseLimit(), calculateInvoiceTotals(), InvoiceCalculationInput, aggregateTransactions(), buildInvoiceEstimates() (+15 more)

### Community 11 - "bank-accounts.service.ts"
Cohesion: 0.11
Nodes (28): POST(), POST(), POST(), DELETE(), PUT(), GET(), POST(), POST() (+20 more)

### Community 12 - "card-invoices.service.ts"
Cohesion: 0.06
Nodes (50): POST(), DELETE(), POST(), DELETE(), PUT(), GET(), GET(), POST() (+42 more)

### Community 13 - "fixed-costs/page.tsx"
Cohesion: 0.06
Nodes (39): Debug: Account Adjust Loading Hidden, AccountSortField, BankAccount, BankAccountItem, CardItem, BankAccountItem, CardItem, Category (+31 more)

### Community 14 - "cn"
Cohesion: 0.06
Nodes (43): navItems, Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage(), CardAction() (+35 more)

### Community 15 - "package.json"
Cohesion: 0.06
Nodes (31): name, private, @auth/prisma-adapter, @base-ui/react, clsx, dotenv, eslint, eslint-config-next (+23 more)

### Community 16 - "lucide-react"
Cohesion: 0.11
Nodes (27): lucide-react, BudgetCard(), BudgetCardProps, BudgetForm(), Budget, BudgetsPage(), BudgetSummary, Category (+19 more)

### Community 17 - "monthly-closing/page.tsx"
Cohesion: 0.11
Nodes (13): billCollator, BillRow, BillsList(), BillSortField, BreakdownRows(), ClosingData, DetailItem, ExpenseComposition() (+5 more)

### Community 18 - "FixedCostsPageInner"
Cohesion: 0.16
Nodes (14): dueDayIso(), FixedCostsPageInner(), formatCalendarDate(), formatDueDate(), MonthlyClosingPageContent(), changeMonth(), formatMonth(), formatMonthDistance() (+6 more)

### Community 19 - "lib/prisma.ts"
Cohesion: 0.10
Nodes (12): zod, batchSchema, POST(), POST(), batchSchema, POST(), AmbiguousLegacyMovementError, unpayFixedCostOccurrence() (+4 more)

### Community 20 - "settings/page.tsx"
Cohesion: 0.10
Nodes (17): class-variance-authority, RegisterPage(), DeleteAccountButton(), MeResponse, NOTIFICATION_DAYS_OPTIONS, SignOutButton(), Stepper(), StepperProps (+9 more)

### Community 21 - "Dependências do Projeto"
Cohesion: 0.07
Nodes (28): dependencies, @auth/prisma-adapter, @base-ui/react, bcryptjs, better-sqlite3, class-variance-authority, clsx, date-fns (+20 more)

### Community 22 - "formatCurrency"
Cohesion: 0.07
Nodes (25): CategoryChart(), CategoryData, CustomTooltip(), Category, ChartMode, CustomTooltip(), TxDetail, Category (+17 more)

### Community 23 - "Scripts NPM"
Cohesion: 0.08
Nodes (25): scripts, build, changelog:generate, db:migrate:deploy, db:migrate:prod, db:push:sqlite, dev, lint (+17 more)

### Community 24 - "dashboard.service.ts"
Cohesion: 0.14
Nodes (24): GET(), GET(), GET(), GET(), dynamic, GET(), json(), getBankAccountsTotal() (+16 more)

### Community 25 - "transaction-row.tsx"
Cohesion: 0.19
Nodes (12): AnalysisPage(), findCategory(), CardRows(), mockTx, TransactionRow(), TransactionRowProps, TransactionTable(), TransactionTableProps (+4 more)

### Community 26 - "Dependências de Dev"
Cohesion: 0.09
Nodes (23): devDependencies, dotenv, eslint, eslint-config-next, jsdom, @playwright/test, tailwindcss, @tailwindcss/postcss (+15 more)

### Community 27 - "Configuração de Componentes"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 28 - "backup.service.ts"
Cohesion: 0.16
Nodes (14): Debug: Backup Import Duplicates, GET(), POST(), BackupData, backupSchema, ImportMode, isoDate, deleteAllUserData() (+6 more)

### Community 29 - "next-themes"
Cohesion: 0.38
Nodes (3): next-themes, footerColumns, Toaster()

### Community 30 - "seed-demo.ts"
Cohesion: 0.12
Nodes (25): ACCOUNTS, BUDGETS, CARDS, CATEGORIES, dateInMonth(), daysInMonth(), FIXED_COSTS, getMonthsToSeed() (+17 more)

### Community 31 - "pdf-import.service.ts"
Cohesion: 0.11
Nodes (24): pdf-parse, GET(), POST(), POST(), PATCH(), POST(), autoCategorizeTransactions(), AutoCategoryRule (+16 more)

### Community 32 - "purchase-frequency.tsx"
Cohesion: 0.33
Nodes (5): Category, ChartMode, CustomTooltip(), PurchaseFrequency(), RankingItem

### Community 33 - "Sistema de Changelog"
Cohesion: 0.20
Nodes (17): pinAutoDates(), renderChangelog(), sections, ChangelogPage(), flatItems, formatReleaseDate(), getReleaseGroups(), ReleaseGroup (+9 more)

### Community 34 - "API de Orçamentos"
Cohesion: 0.20
Nodes (14): DELETE(), PUT(), GET(), POST(), BudgetInput, budgetSchema, createBudget(), deleteBudget() (+6 more)

### Community 36 - "monthly-plan.schema.ts"
Cohesion: 0.17
Nodes (18): dynamic, GET(), hasAllowedOrigin(), json(), PUT(), mocks, projection, updateRequestSchema (+10 more)

### Community 37 - "pdf-import.types.ts"
Cohesion: 0.20
Nodes (7): BankParser, ChartDataItem, ImportedTransactionData, ImportSessionData, ParsedInvoice, ParsedTransaction, RankingItem

### Community 38 - "Design: Auth & Marca"
Cohesion: 0.12
Nodes (19): Login Page (FinançasPro), Email/Password Auth + Social Login (Google, Apple), FinançasPro Brand Identity, Design System CSS Variables (Light Theme), Registration Page (FinançasPro), Multi-Step Registration Wizard (3 steps), User Objective Selection (save/invest/control/debt/plan), Password Strength Meter (weak/medium/strong) (+11 more)

### Community 39 - "monthly-plan.calculator.ts"
Cohesion: 0.21
Nodes (16): Adaptive Daily Limit Redistribution, Daily Safe Limit Formula, calculateMonthlyPlan(), calendarDaysInMonth(), getDaysRemaining(), getStatus(), MonthlyPlanCalculationInput, monthStart() (+8 more)

### Community 40 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 41 - "Plan 01-02: Contracts, Validation & Calculator"
Cohesion: 0.17
Nodes (19): Dependabot Configuration, CI Workflow, Security Workflow, Plan 01-01: MonthlyPlan Entity & Schema, Plan 01-02: Contracts, Validation & Calculator, Plan 01-03: Financial Composition & Service, Plan 01-04: Authenticated API, Plan 01-05: Monthly Plan Page & Form (+11 more)

### Community 42 - "password/route.ts"
Cohesion: 0.27
Nodes (7): CHANGE_PASSWORD_RATE_LIMIT, POST(), body, mocks, session, changePassword(), setInitialPassword()

### Community 43 - "Screenshots do App"
Cohesion: 0.17
Nodes (17): Landing Page - Dark Theme Screenshot, Landing Page - Light Theme Screenshot, Login Page - Dark Theme Screenshot, Login Page - Light Theme Screenshot, Monthly Closing Page - Dark Theme Screenshot, Monthly Closing Page - Light Theme Screenshot, Notifications Page - Dark Theme Screenshot, Notifications Page - Light Theme Screenshot (+9 more)

### Community 44 - "resend-verification/route.ts"
Cohesion: 0.06
Nodes (49): nodemailer, FORGOT_RATE_LIMIT, POST(), POST(), REGISTER_RATE_LIMIT, registerSchema, POST(), RESEND_RATE_LIMIT (+41 more)

### Community 45 - "@testing-library/react"
Cohesion: 0.10
Nodes (11): @testing-library/react, @testing-library/user-event, FixedCostsPage(), navigation, MonthlyPlanForm(), plan, MonthlyPlanPage(), navigation (+3 more)

### Community 47 - "recurrence.ts"
Cohesion: 0.23
Nodes (10): date-fns, addInterval(), computeRecurrenceDates(), EndType, fixCostOccurrenceDueDate(), Frequency, IntervalUnit, monthKey() (+2 more)

### Community 48 - "app/layout.tsx"
Cohesion: 0.18
Nodes (8): nextConfig, securityHeaders, version, next, geistMono, geistSans, metadata, Providers()

### Community 49 - "API de Notificações"
Cohesion: 0.27
Nodes (12): GET(), addDays(), deduplicateMonthlyOccurrences(), DueNotification, endOfDay(), fixedCostDueDate(), getDueSoonNotifications(), hasAtMostOneOccurrencePerMonth() (+4 more)

### Community 50 - "Showcase de Marketing"
Cohesion: 0.15
Nodes (11): accountCards, categories, evolution, invoices, navItems, ShowcaseMockup(), summaryCards, transactions (+3 more)

### Community 51 - "use-month-param.ts"
Cohesion: 0.15
Nodes (13): Debug: Fixed Expenses Month Race, Debug: Dashboard Restored Month Race (Resolved), DashboardPage(), auth, navigation, MonthlyPlanPageContent(), navigation, isValidMonth() (+5 more)

### Community 53 - "me/route.ts"
Cohesion: 0.25
Nodes (5): DELETE(), DELETE_ACCOUNT_RATE_LIMIT, deleteAccountOAuthSchema, deleteAccountSchema, updateProfileSchema

### Community 54 - "Gráfico de Evolução da Fatura"
Cohesion: 0.23
Nodes (10): CardInvoiceEvolutionChart(), CardInvoiceEvolutionChartProps, CardTooltip(), CardTooltipProps, ChartItem, formatTooltipCurrency(), TooltipPayloadItem, tooltipValue() (+2 more)

### Community 55 - "notifications-panel.tsx"
Cohesion: 0.26
Nodes (11): SheetDescription(), DueNotification, fetchNotifications(), NotificationBell(), notificationLabel(), NotificationsSheet(), RawDueNotification, computeDaysUntilDue() (+3 more)

### Community 56 - "buttonVariants"
Cohesion: 0.38
Nodes (5): StatusIconTooltip(), PrivacidadePage(), TermosDeUsoPage(), buttonVariants, InvoiceActionIcon()

### Community 57 - "auth.ts"
Cohesion: 0.18
Nodes (13): GET(), clearLoginFailures(), digest(), isLoginBlocked(), loginRateLimitKeys(), recordLoginFailure(), request, testPrisma (+5 more)

### Community 59 - "monthly-plan.service.ts"
Cohesion: 0.19
Nodes (14): currentMonth(), POST(), currentMonth(), POST(), GET(), ensureFinancialMonth(), testPrisma, ensureFixedCostOccurrences() (+6 more)

### Community 60 - "Verificação de Schema de Produção"
Cohesion: 0.25
Nodes (5): pg, assert(), dmlPrivileges, runtimeRoles, verifyProductionSchema()

### Community 61 - "Serviço de Billing"
Cohesion: 0.39
Nodes (6): GET(), canPerformAction(), getUserPlan(), Plan, PLANS, UserPlan

### Community 64 - "Script de Build Vercel"
Cohesion: 0.38
Nodes (4): runCommand(), runVercelBuild(), mockedSpawnSync, successfulRun

### Community 65 - "monthly-plan.sources.ts"
Cohesion: 0.25
Nodes (7): @date-fns/tz, getMonthlyTransactionWindow(), MonthlyFinancialSources, SourceInvoice, SourceOccurrence, sumDecimals(), BUSINESS_TIME_ZONE

### Community 66 - "TransferWizard"
Cohesion: 0.10
Nodes (21): BankAccountsPage(), businessDaysInCurrentMonth(), estimatedBenefitCredit(), formatMovementDescription(), CardsPage(), changeTab(), TransferWizard(), handleOpenChange() (+13 more)

### Community 70 - "Auth Secret & Proxy"
Cohesion: 0.28
Nodes (4): AUTH_SECRET, importAuthSecret(), config, MUTATING_METHODS

### Community 72 - "Screenshots: Orçamentos & Categorias"
Cohesion: 0.50
Nodes (4): Budgets Page - Dark Mode Screenshot, Budgets Page - Light Mode Screenshot, Categories Page - Dark Mode Screenshot, Categories Page - Light Mode Screenshot

### Community 73 - "transactions/page.tsx"
Cohesion: 0.12
Nodes (12): DeleteDialog(), formatMonth(), TransactionForm(), BankAccountOption, InvoiceOption, TransactionsPage(), readStoredSelection(), useTableSelection() (+4 more)

### Community 76 - "Tipos pdf-parse"
Cohesion: 0.50
Nodes (3): pdf-parse, PDFData, PDFOptions

### Community 77 - "Testes de Auth Guard"
Cohesion: 0.50
Nodes (3): HTTP_METHODS, protectedRoutes, routeModules

### Community 78 - "Design: Landing"
Cohesion: 0.67
Nodes (3): Light Theme Landing Page, Dark/Light Theme Toggle System, Cinema Dark Theme Landing Page

### Community 81 - "Ícones SVG Públicos"
Cohesion: 0.67
Nodes (3): File Icon SVG, Globe Icon SVG, Window Icon SVG

### Community 85 - "dashboard/page.tsx"
Cohesion: 0.09
Nodes (24): recharts, DailyTrendChart(), DailyTrendChartProps, ExpenseByCategoryChart(), ExpenseByCategoryChartProps, IncomeVsExpenseChart(), IncomeVsExpenseChartProps, metricColors (+16 more)

## Knowledge Gaps
- **470 isolated node(s):** `name`, `private`, `dev`, `build`, `changelog:generate` (+465 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 638 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `import.service.ts`, `categories/page.tsx`, `fixed-costs.service.ts`, `monthly-plan.types.ts`, `monthly-closing.service.ts`, `bank-accounts.service.ts`, `card-invoices.service.ts`, `package.json`, `settings/page.tsx`, `dashboard.service.ts`, `transaction-row.tsx`, `backup.service.ts`, `seed-demo.ts`, `pdf-import.service.ts`, `Sistema de Changelog`, `API de Orçamentos`, `monthly-plan.schema.ts`, `monthly-plan.calculator.ts`, `password/route.ts`, `resend-verification/route.ts`, `@testing-library/react`, `recurrence.ts`, `use-month-param.ts`, `notifications-panel.tsx`, `auth.ts`, `monthly-plan.service.ts`, `Verificação de Schema de Produção`, `Serviço de Billing`, `Script de Build Vercel`, `TransferWizard`, `Auth Secret & Proxy`, `Testes de Auth Guard`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `purchase-frequency.tsx`, `Sistema de Changelog`, `categories/page.tsx`, `dialog.tsx`, `transactions/page.tsx`, `fixed-costs/page.tsx`, `cn`, `package.json`, `lucide-react`, `monthly-closing/page.tsx`, `Showcase de Marketing`, `use-month-param.ts`, `settings/page.tsx`, `dashboard/page.tsx`, `formatCurrency`, `notifications-panel.tsx`, `next-themes`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `lucide-react` to `Sistema de Changelog`, `categories/page.tsx`, `dialog.tsx`, `react`, `monthly-plan.types.ts`, `transactions/page.tsx`, `fixed-costs/page.tsx`, `cn`, `package.json`, `@testing-library/react`, `monthly-closing/page.tsx`, `FixedCostsPageInner`, `settings/page.tsx`, `dashboard/page.tsx`, `notifications-panel.tsx`, `buttonVariants`, `transaction-row.tsx`, `next-themes`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `name`, `private`, `dev` to the rest of the system?**
  _470 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Utilitários & Helpers E2E` be split into smaller, more focused modules?**
  _Cohesion score 0.06205673758865248 - nodes in this community are weakly interconnected._
- **Should `ADRs & Pipeline de Produção` be split into smaller, more focused modules?**
  _Cohesion score 0.052244897959183675 - nodes in this community are weakly interconnected._
- **Should `categories/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09059233449477352 - nodes in this community are weakly interconnected._