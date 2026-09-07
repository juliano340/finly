# Graph Report - finly  (2026-09-07)

## Corpus Check
- 420 files · ~311,362 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1668 nodes · 3880 edges · 108 communities (76 shown, 30 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- CSV Import & Invoicing
- E2E Playwright Testing
- Architecture Decision Records
- Dashboard UI Components
- Categories CRUD API
- Fixed Costs API
- Budgets UI Components
- Auth Service Core
- Auth UI Pages
- Dashboard Feature Components
- Fixed Cost Payments API
- Bank Accounts API
- Invoices CRUD API
- Fixed Costs Page UI
- Dashboard Layout & Navigation
- Package Dependencies
- Budgets UI Widgets
- Monthly Closing Page
- Bank Accounts Page UI
- Shared API Routes
- UI Component Library
- Package Dependencies Detail
- Invoice Analysis Page
- Package Scripts
- Dashboard Stats API
- Transactions CRUD API
- Dev Dependencies
- Components Configuration
- Backup & Restore
- Email Verification Flow
- Cards API
- Invoices & Data Table
- Formatters & Parsers
- Changelog System
- Budgets API
- Password Reset Flow
- Monthly Plan API
- Invoice Charts & Analytics
- Auth Design Files
- Monthly Plan Calculator
- TypeScript Configuration
- CI/CD & Phase Plans
- Change Password API
- Screenshots Collection
- Registration & Email Service
- Invoice Payment Processing
- Dashboard Home Page
- Recurrence & Date Utils
- App Layout & Theming
- Notifications API
- Marketing Showcase
- Monthly Closing Hooks
- Seed Demo Script
- User Profile API
- Card Invoice Evolution Chart
- Dashboard Charts
- Cards Tab State
- Login Rate Limiting
- Monthly Plan Schema
- Monthly Plan Sources
- Production Schema Verification
- Billing Service
- Settings Page
- Transaction Row Component
- Vercel Build Script
- Monthly Evolution Chart
- Transfer Wizard
- Dashboard Page Tests
- Transactions Page
- Card Invoices Service Tests
- Auth Secret & Proxy
- Project Documentation
- Budget/Categories Screenshots
- Next.js Configuration
- Prisma Seed
- App Icon
- PDF Parse Types
- Auth Guard Tests
- Landing Design Files
- OpenCode Config
- Graphify Plugin
- Public SVG Assets
- Production Migration
- Invoice Months API
- Verify Email Page
- Monthly Plan Page
- Architecture Pattern Docs
- Architecture & Case Study
- Cards Screenshots
- Fixed Costs Screenshots
- ESLint Configuration
- PostCSS Configuration
- Vercel Deployment
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 105
- Community 106

## God Nodes (most connected - your core abstractions)
1. `cn()` - 96 edges
2. `vitest` - 63 edges
3. `formatCurrency()` - 57 edges
4. `react` - 54 edges
5. `lucide-react` - 49 edges
6. `prisma` - 44 edges
7. `Button()` - 41 edges
8. `moneyToNumber()` - 37 edges
9. `scripts` - 25 edges
10. `getTestClient()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `Plan 01-02: Contracts, Validation & Calculator` --references--> `calculateMonthlyPlan()`  [EXTRACTED]
  .planning/phases/01-plano-do-mes/01-02-PLAN.md → src/features/monthly-plan/monthly-plan.calculator.ts
- `Adaptive Daily Limit Redistribution` --rationale_for--> `calculateMonthlyPlan()`  [EXTRACTED]
  .planning/REQUIREMENTS.md → src/features/monthly-plan/monthly-plan.calculator.ts
- `Daily Safe Limit Formula` --rationale_for--> `calculateMonthlyPlan()`  [EXTRACTED]
  .planning/REQUIREMENTS.md → src/features/monthly-plan/monthly-plan.calculator.ts
- `calculateMonthlyPlan()` --calls--> `getSupportedMonthWindow (D-17 Window)`  [EXTRACTED]
  src/features/monthly-plan/monthly-plan.calculator.ts → .planning/phases/01-plano-do-mes/01-02-SUMMARY.md
- `Plan 01-02: Contracts, Validation & Calculator` --references--> `MonthlyPlanDto`  [EXTRACTED]
  .planning/phases/01-plano-do-mes/01-02-PLAN.md → src/features/monthly-plan/monthly-plan.types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Monthly Plan Full Implementation Stack** — prisma_migrations_20260809180000_add_monthly_plan, src_features_monthly_plan_monthly_plan_types_monthlyplandto, src_features_monthly_plan_monthly_plan_schema, src_features_monthly_plan_monthly_plan_calculator_calculatemonthlyplan, src_features_monthly_plan_monthly_plan_sources, src_features_monthly_plan_monthly_plan_service, src_app_api_monthly_plan_route, src_app_dashboard_monthly_plan_page, src_app_dashboard_monthly_plan_monthly_plan_form, src_app_dashboard_monthly_plan_monthly_plan_summary [EXTRACTED 1.00]
- **Month Navigation Race Condition Bugs** — planning_debug_fixed_expenses_month_race_md, planning_debug_resolved_dashboard_restored_month_race_md, src_hooks_use_month_param [EXTRACTED 1.00]
- **Phase 01 Wave Dependency Chain** — planning_phases_01_plano_do_mes_01_01_plan_md, planning_phases_01_plano_do_mes_01_02_plan_md, planning_phases_01_plano_do_mes_01_03_plan_md, planning_phases_01_plano_do_mes_01_04_plan_md, planning_phases_01_plano_do_mes_01_05_plan_md, planning_phases_01_plano_do_mes_01_06_plan_md [EXTRACTED 1.00]
- **MonthlyPlan Feature Full Implementation Stack** — planning_phases_01_plano_do_mes_01_context__monthly_plan_feature, planning_phases_01_plano_do_mes_01_context__daily_safe_limit, planning_phases_01_plano_do_mes_01_patterns__pure_calculator, planning_phases_01_plano_do_mes_01_06_summary__monthly_plan_card, planning_phases_01_plano_do_mes_01_verification__phase_verification_result [EXTRACTED 0.95]
- **Production Safety Pipeline (Build-Smoke-Migration)** — planning_phases_01_plano_do_mes_01_08_plan__fail_closed_build, planning_phases_01_plano_do_mes_01_08_plan__vercel_build_pipeline, planning_phases_01_plano_do_mes_01_08_plan__production_schema_smoke, docs_migrations__monthly_plan_migration, docs_migrations__database_roles [EXTRACTED 0.95]
- **Security Defense-in-Depth (Auth + Rate Limiting + Input Validation + Tenant Isolation)** — docs_adr_002__per_route_auth_concept, docs_adr_003__jwt_invalidation_concept, docs_adr_006__rate_limiting_concept, planning_phases_01_plano_do_mes_01_research__known_threat_patterns, docs_migrations__database_roles [INFERRED 0.85]
- **Authentication Flow (login <-> register)** — design_login_html, design_register_html, design_login_html_auth_system, design_register_html_multistep_form [EXTRACTED 1.00]
- **Light/Dark Theme Screenshot Pairs** — docs_screenshots_dashboard_light, docs_screenshots_dashboard_dark, docs_screenshots_bank_accounts_light, docs_screenshots_bank_accounts_dark, docs_screenshots_budgets_light, docs_screenshots_budgets_dark, docs_screenshots_cards_light, docs_screenshots_cards_dark, docs_screenshots_categories_light, docs_screenshots_categories_dark, docs_screenshots_fixed_costs_light, docs_screenshots_fixed_costs_dark [EXTRACTED 1.00]
- **Social Preview Branding Assets** — public_social_preview_html, public_social_preview_html_brand_finly, public_og_png, public_social_preview_html_tech_stack [INFERRED 0.85]
- **Landing Page Theme Pair** — docs_screenshots_landing_dark, docs_screenshots_landing_light [EXTRACTED 1.00]
- **Login Page Theme Pair** — docs_screenshots_login_dark, docs_screenshots_login_light [EXTRACTED 1.00]
- **UI Screenshot Showcase** — docs_screenshots_landing_dark, docs_screenshots_landing_light, docs_screenshots_login_dark, docs_screenshots_login_light, docs_screenshots_monthly_closing_dark, docs_screenshots_monthly_closing_light, docs_screenshots_notifications_dark, docs_screenshots_notifications_light, docs_screenshots_transactions_dark, docs_screenshots_transactions_light [INFERRED 0.85]

## Communities (108 total, 30 thin omitted)

### Community 0 - "CSV Import & Invoicing"
Cohesion: 0.06
Nodes (40): pdf-parse, POST(), GET(), POST(), POST(), PATCH(), POST(), ImportResult (+32 more)

### Community 1 - "E2E Playwright Testing"
Cohesion: 0.06
Nodes (18): accounts, authenticatedPage(), basePlan, login(), register(), registerApi(), markEmailVerified(), toPrismaDateTime() (+10 more)

### Community 2 - "Architecture Decision Records"
Cohesion: 0.05
Nodes (46): Dual Schema Concept, ADR-001: Dual Prisma Schema, Per-Route Auth Pattern (No Middleware), ADR-002: Per-Route Auth Guards, JWT Invalidation via passwordChangedAt, ADR-003: JWT with passwordChangedAt Invalidation, PrismaDecimal Monetary Precision, ADR-004: Monetary Precision with PrismaDecimal (+38 more)

### Community 3 - "Dashboard UI Components"
Cohesion: 0.08
Nodes (32): BankAccountItem, CardItem, colorOptions, iconOptions, Category, ImportForm(), DeleteDialog(), BankAccountOption (+24 more)

### Community 4 - "Categories CRUD API"
Cohesion: 0.08
Nodes (27): @testing-library/user-event, DELETE(), PUT(), GET(), POST(), CategoryCard(), CategoryCardProps, iconMap (+19 more)

### Community 5 - "Fixed Costs API"
Cohesion: 0.09
Nodes (33): Debug: Fixed Cost Edit Scope, DELETE(), PATCH(), PUT(), mocks, payload, ProtectedFixedCostOccurrenceError, seriesPayload (+25 more)

### Community 6 - "Budgets UI Components"
Cohesion: 0.12
Nodes (23): BudgetFormProps, Category, DeleteDialogProps, DeleteDialogProps, DeleteAccountButton(), MeResponse, SignOutButton(), DeleteDialogProps (+15 more)

### Community 7 - "Auth Service Core"
Cohesion: 0.11
Nodes (25): bcryptjs, vitest, changePasswordSchema, findOrCreateGoogleUser(), GoogleUserInput, initialPasswordSchema, RegisterInput, registerSchema (+17 more)

### Community 8 - "Auth UI Pages"
Cohesion: 0.11
Nodes (18): lucide-react, react, sonner, ForgotPasswordPage(), getInitialEmail(), getInitialRemember(), LoginPage(), RegisterPage() (+10 more)

### Community 9 - "Dashboard Feature Components"
Cohesion: 0.09
Nodes (23): @testing-library/react, DailySafeLimitCard(), DailySafeLimitCardProps, PlanContent(), statusPresentation, plan, MonthlyPlanForm(), MonthlyPlanFormProps (+15 more)

### Community 10 - "Fixed Cost Payments API"
Cohesion: 0.14
Nodes (27): POST(), currentMonth(), POST(), currentMonth(), POST(), POST(), GET(), GET() (+19 more)

### Community 11 - "Bank Accounts API"
Cohesion: 0.11
Nodes (27): POST(), POST(), POST(), DELETE(), PUT(), GET(), GET(), POST() (+19 more)

### Community 12 - "Invoices CRUD API"
Cohesion: 0.12
Nodes (27): POST(), DELETE(), POST(), DELETE(), PUT(), GET(), POST(), CardInvoiceInput (+19 more)

### Community 13 - "Fixed Costs Page UI"
Cohesion: 0.10
Nodes (27): BankAccountItem, CardItem, Category, dueDayIso(), FixedCostData, FixedCostEditScope, FixedCostsPageInner(), formatCalendarDate() (+19 more)

### Community 14 - "Dashboard Layout & Navigation"
Cohesion: 0.10
Nodes (22): DashboardLayoutContent(), DueNotification, navItems, notificationLabel(), RawDueNotification, DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent() (+14 more)

### Community 15 - "Package Dependencies"
Cohesion: 0.06
Nodes (30): name, private, @auth/prisma-adapter, @base-ui/react, clsx, dotenv, eslint, eslint-config-next (+22 more)

### Community 16 - "Budgets UI Widgets"
Cohesion: 0.12
Nodes (21): class-variance-authority, BudgetCard(), BudgetCardProps, BudgetForm(), DeleteDialog(), Budget, BudgetsPage(), BudgetSummary (+13 more)

### Community 17 - "Monthly Closing Page"
Cohesion: 0.08
Nodes (22): billCollator, BillRow, BillsList(), BillSortField, BreakdownRows(), CardRows(), ClosingData, DetailItem (+14 more)

### Community 18 - "Bank Accounts Page UI"
Cohesion: 0.11
Nodes (20): Debug: Account Adjust Loading Hidden, AccountSortField, BankAccount, BankAccountsPage(), businessDaysInCurrentMonth(), estimatedBenefitCredit(), formatMovementDescription(), Stepper() (+12 more)

### Community 19 - "Shared API Routes"
Cohesion: 0.11
Nodes (11): next-auth, POST(), POST(), unpayFixedCostOccurrenceWithCard(), EmailNotVerifiedError, googleEnabled, { handlers, auth, signIn, signOut }, OAuthAccountError (+3 more)

### Community 20 - "UI Component Library"
Cohesion: 0.12
Nodes (25): Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage(), CardAction(), CardDescription() (+17 more)

### Community 21 - "Package Dependencies Detail"
Cohesion: 0.07
Nodes (28): dependencies, @auth/prisma-adapter, @base-ui/react, bcryptjs, better-sqlite3, class-variance-authority, clsx, date-fns (+20 more)

### Community 22 - "Invoice Analysis Page"
Cohesion: 0.09
Nodes (21): AnalysisData, AnalysisPage(), CategoryInfo, findCategory(), RankingItem, TransactionItem, Category, ChartMode (+13 more)

### Community 23 - "Package Scripts"
Cohesion: 0.08
Nodes (25): scripts, build, changelog:generate, db:migrate:deploy, db:migrate:prod, db:push:sqlite, dev, lint (+17 more)

### Community 24 - "Dashboard Stats API"
Cohesion: 0.16
Nodes (19): GET(), GET(), GET(), GET(), dynamic, GET(), json(), getBankAccountsTotal() (+11 more)

### Community 25 - "Transactions CRUD API"
Cohesion: 0.15
Nodes (18): POST(), DELETE(), PUT(), GET(), POST(), TransactionFormProps, TransactionInput, transactionSchema (+10 more)

### Community 26 - "Dev Dependencies"
Cohesion: 0.09
Nodes (23): devDependencies, dotenv, eslint, eslint-config-next, jsdom, @playwright/test, tailwindcss, @tailwindcss/postcss (+15 more)

### Community 27 - "Components Configuration"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 28 - "Backup & Restore"
Cohesion: 0.16
Nodes (14): Debug: Backup Import Duplicates, GET(), POST(), BackupData, backupSchema, ImportMode, isoDate, deleteAllUserData() (+6 more)

### Community 29 - "Email Verification Flow"
Cohesion: 0.18
Nodes (15): POST(), RESEND_RATE_LIMIT, resendSchema, RESPONSE, POST(), createEmailVerificationToken(), EMAIL_VERIFICATION_TTL_MINUTES, EmailVerificationRateLimitError (+7 more)

### Community 30 - "Cards API"
Cohesion: 0.19
Nodes (15): DELETE(), PUT(), GET(), POST(), createBankAccount(), CardInput, cardSchema, createCard() (+7 more)

### Community 31 - "Invoices & Data Table"
Cohesion: 0.11
Nodes (14): TransactionTable(), DataTableContainer(), DataTableToolbar(), DataTableToolbarProps, ImportPdfDialog(), BankAccountItem, CardItem, Invoice (+6 more)

### Community 32 - "Formatters & Parsers"
Cohesion: 0.15
Nodes (11): parseCurrency(), months, parsePortugueseDate(), parsers, extractTotal(), findValueAfter(), interParser, tryParseTransaction() (+3 more)

### Community 33 - "Changelog System"
Cohesion: 0.20
Nodes (17): pinAutoDates(), renderChangelog(), sections, ChangelogPage(), flatItems, formatReleaseDate(), getReleaseGroups(), ReleaseGroup (+9 more)

### Community 34 - "Budgets API"
Cohesion: 0.20
Nodes (14): DELETE(), PUT(), GET(), POST(), BudgetInput, budgetSchema, createBudget(), deleteBudget() (+6 more)

### Community 35 - "Password Reset Flow"
Cohesion: 0.19
Nodes (12): POST(), RESET_RATE_LIMIT, createPasswordResetToken(), RateLimitError, resetPassword(), sha256(), TokenExpiredError, TokenInvalidError (+4 more)

### Community 36 - "Monthly Plan API"
Cohesion: 0.21
Nodes (15): dynamic, GET(), hasAllowedOrigin(), json(), PUT(), mocks, projection, updateRequestSchema (+7 more)

### Community 37 - "Invoice Charts & Analytics"
Cohesion: 0.12
Nodes (16): CategoryChart(), CategoryData, CustomTooltip(), Category, ChartMode, CustomTooltip(), TxDetail, Category (+8 more)

### Community 38 - "Auth Design Files"
Cohesion: 0.12
Nodes (19): Login Page (FinançasPro), Email/Password Auth + Social Login (Google, Apple), FinançasPro Brand Identity, Design System CSS Variables (Light Theme), Registration Page (FinançasPro), Multi-Step Registration Wizard (3 steps), User Objective Selection (save/invest/control/debt/plan), Password Strength Meter (weak/medium/strong) (+11 more)

### Community 39 - "Monthly Plan Calculator"
Cohesion: 0.19
Nodes (17): Adaptive Daily Limit Redistribution, Daily Safe Limit Formula, calculateMonthlyPlan(), calendarDaysInMonth(), getDaysRemaining(), getStatus(), getSupportedMonthWindow (D-17 Window), MonthlyPlanCalculationInput (+9 more)

### Community 40 - "TypeScript Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 41 - "CI/CD & Phase Plans"
Cohesion: 0.18
Nodes (18): Dependabot Configuration, CI Workflow, Security Workflow, Plan 01-01: MonthlyPlan Entity & Schema, Plan 01-02: Contracts, Validation & Calculator, Plan 01-03: Financial Composition & Service, Plan 01-04: Authenticated API, Plan 01-05: Monthly Plan Page & Form (+10 more)

### Community 42 - "Change Password API"
Cohesion: 0.16
Nodes (11): CHANGE_PASSWORD_RATE_LIMIT, POST(), body, mocks, session, changePassword(), setInitialPassword(), clientAddress() (+3 more)

### Community 43 - "Screenshots Collection"
Cohesion: 0.17
Nodes (17): Landing Page - Dark Theme Screenshot, Landing Page - Light Theme Screenshot, Login Page - Dark Theme Screenshot, Login Page - Light Theme Screenshot, Monthly Closing Page - Dark Theme Screenshot, Monthly Closing Page - Light Theme Screenshot, Notifications Page - Dark Theme Screenshot, Notifications Page - Light Theme Screenshot (+9 more)

### Community 44 - "Registration & Email Service"
Cohesion: 0.21
Nodes (13): nodemailer, POST(), POST(), REGISTER_RATE_LIMIT, registerSchema, getTransporter(), sendEmail(), SendEmailInput (+5 more)

### Community 45 - "Invoice Payment Processing"
Cohesion: 0.24
Nodes (12): POST(), getBankAccountBalance(), validateExpenseLimit(), calculateInvoiceTotals(), InvoiceCalculationInput, fixedOccurrences, markCardInvoiceFixedCostsPaid(), sum() (+4 more)

### Community 46 - "Dashboard Home Page"
Cohesion: 0.16
Nodes (12): RecentTransactions(), RecentTransactionsProps, DashboardPageContent(), EvolutionMetric, evolutionMetrics, formatChangePercent(), getCardInvoiceSummary(), getMetricSummary() (+4 more)

### Community 47 - "Recurrence & Date Utils"
Cohesion: 0.20
Nodes (12): date-fns, ensureMonthlyEvolutionData(), ensureFixedCostOccurrencesForMonths(), addInterval(), computeRecurrenceDates(), EndType, fixCostOccurrenceDueDate(), Frequency (+4 more)

### Community 48 - "App Layout & Theming"
Cohesion: 0.18
Nodes (8): version, next-themes, geistMono, geistSans, metadata, footerColumns, Providers(), Toaster()

### Community 49 - "Notifications API"
Cohesion: 0.27
Nodes (12): GET(), addDays(), deduplicateMonthlyOccurrences(), DueNotification, endOfDay(), fixedCostDueDate(), getDueSoonNotifications(), hasAtMostOneOccurrencePerMonth() (+4 more)

### Community 50 - "Marketing Showcase"
Cohesion: 0.15
Nodes (11): accountCards, categories, evolution, invoices, navItems, ShowcaseMockup(), summaryCards, transactions (+3 more)

### Community 51 - "Monthly Closing Hooks"
Cohesion: 0.27
Nodes (10): Debug: Fixed Expenses Month Race, Debug: Dashboard Restored Month Race (Resolved), MonthlyClosingPageContent(), navigation, isValidMonth(), isWithinRange(), LAST_SELECTED_MONTH_STORAGE_KEY, resolvePersistentMonth() (+2 more)

### Community 52 - "Seed Demo Script"
Cohesion: 0.23
Nodes (12): ACCOUNTS, BUDGETS, CARDS, CATEGORIES, dateInMonth(), daysInMonth(), FIXED_COSTS, getMonthsToSeed() (+4 more)

### Community 53 - "User Profile API"
Cohesion: 0.17
Nodes (7): zod, deleteAccountSchema, updateProfileSchema, ForgotPasswordInput, forgotPasswordSchema, ResetPasswordInput, resetPasswordSchema

### Community 54 - "Card Invoice Evolution Chart"
Cohesion: 0.23
Nodes (10): CardInvoiceEvolutionChart(), CardInvoiceEvolutionChartProps, CardTooltip(), CardTooltipProps, ChartItem, formatTooltipCurrency(), TooltipPayloadItem, tooltipValue() (+2 more)

### Community 55 - "Dashboard Charts"
Cohesion: 0.20
Nodes (7): recharts, DailyTrendChart(), DailyTrendChartProps, ExpenseByCategoryChart(), ExpenseByCategoryChartProps, IncomeVsExpenseChart(), IncomeVsExpenseChartProps

### Community 56 - "Cards Tab State"
Cohesion: 0.31
Nodes (8): CardsPage(), changeTab(), CARDS_TAB_STORAGE_KEY, CardsTab, isCardsTab(), resolveCardsTab(), withCardsTab(), fetchData()

### Community 57 - "Login Rate Limiting"
Cohesion: 0.33
Nodes (8): clearLoginFailures(), clientAddress(), digest(), isLoginBlocked(), loginRateLimitKeys(), recordLoginFailure(), request, testPrisma

### Community 58 - "Monthly Plan Schema"
Cohesion: 0.31
Nodes (7): businessDateParts(), getSupportedMonthWindow(), moneySchema, monthlyPlanQuerySchema, monthlyPlanUpdateSchema, monthSchema, VALID_UPDATE

### Community 59 - "Monthly Plan Sources"
Cohesion: 0.31
Nodes (8): @date-fns/tz, composeMonthlyFinancialSources(), getMonthlyTransactionWindow(), loadMonthlyFinancialSources(), MonthlyFinancialSources, SourceInvoice, SourceOccurrence, sumDecimals()

### Community 60 - "Production Schema Verification"
Cohesion: 0.25
Nodes (5): pg, assert(), dmlPrivileges, runtimeRoles, verifyProductionSchema()

### Community 61 - "Billing Service"
Cohesion: 0.39
Nodes (6): GET(), canPerformAction(), getUserPlan(), Plan, PLANS, UserPlan

### Community 63 - "Transaction Row Component"
Cohesion: 0.43
Nodes (5): mockTx, TransactionRow(), TransactionRowProps, TransactionTableProps, TransactionWithRelations

### Community 64 - "Vercel Build Script"
Cohesion: 0.38
Nodes (4): runCommand(), runVercelBuild(), mockedSpawnSync, successfulRun

### Community 65 - "Monthly Evolution Chart"
Cohesion: 0.33
Nodes (5): metricColors, metricLabels, MonthlyEvolutionChart(), MonthlyEvolutionChartProps, MonthlyEvolutionItem

### Community 66 - "Transfer Wizard"
Cohesion: 0.38
Nodes (4): TransferWizard(), handleOpenChange(), handleSubmit(), resetForm()

### Community 67 - "Dashboard Page Tests"
Cohesion: 0.33
Nodes (3): DashboardPage(), auth, navigation

### Community 69 - "Card Invoices Service Tests"
Cohesion: 0.47
Nodes (4): findOverflowPair(), monthKey(), offsetMonth(), prisma

### Community 70 - "Auth Secret & Proxy"
Cohesion: 0.40
Nodes (3): AUTH_SECRET, config, MUTATING_METHODS

### Community 71 - "Project Documentation"
Cohesion: 0.50
Nodes (4): AGENTS.md — Next.js Agent Rules, Finly Changelog, CLAUDE.md — Project Canonical Documentation, Finly README

### Community 72 - "Budget/Categories Screenshots"
Cohesion: 0.50
Nodes (4): Budgets Page - Dark Mode Screenshot, Budgets Page - Light Mode Screenshot, Categories Page - Dark Mode Screenshot, Categories Page - Light Mode Screenshot

### Community 73 - "Next.js Configuration"
Cohesion: 0.50
Nodes (3): nextConfig, securityHeaders, next

### Community 76 - "PDF Parse Types"
Cohesion: 0.50
Nodes (3): pdf-parse, PDFData, PDFOptions

### Community 77 - "Auth Guard Tests"
Cohesion: 0.50
Nodes (3): HTTP_METHODS, protectedRoutes, routeModules

### Community 78 - "Landing Design Files"
Cohesion: 0.67
Nodes (3): Light Theme Landing Page, Dark/Light Theme Toggle System, Cinema Dark Theme Landing Page

### Community 81 - "Public SVG Assets"
Cohesion: 0.67
Nodes (3): File Icon SVG, Globe Icon SVG, Window Icon SVG

## Knowledge Gaps
- **461 isolated node(s):** `$schema`, `plugin`, `$schema`, `style`, `rsc` (+456 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 629 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Auth Service Core` to `CSV Import & Invoicing`, `Categories CRUD API`, `Fixed Costs API`, `Auth UI Pages`, `Dashboard Feature Components`, `Fixed Cost Payments API`, `Invoices CRUD API`, `Fixed Costs Page UI`, `Dashboard Layout & Navigation`, `Package Dependencies`, `Monthly Closing Page`, `Bank Accounts Page UI`, `Transactions CRUD API`, `Backup & Restore`, `Email Verification Flow`, `Cards API`, `Changelog System`, `Budgets API`, `Password Reset Flow`, `Monthly Plan API`, `Monthly Plan Calculator`, `Change Password API`, `Invoice Payment Processing`, `Recurrence & Date Utils`, `Monthly Closing Hooks`, `Cards Tab State`, `Login Rate Limiting`, `Monthly Plan Schema`, `Production Schema Verification`, `Billing Service`, `Transaction Row Component`, `Vercel Build Script`, `Dashboard Page Tests`, `Card Invoices Service Tests`, `Auth Guard Tests`?**
  _High betweenness centrality (0.176) - this node is a cross-community bridge._
- **Why does `react` connect `Auth UI Pages` to `Dashboard UI Components`, `Categories CRUD API`, `Budgets UI Components`, `Dashboard Feature Components`, `Fixed Costs Page UI`, `Dashboard Layout & Navigation`, `Package Dependencies`, `Budgets UI Widgets`, `Monthly Closing Page`, `Bank Accounts Page UI`, `UI Component Library`, `Invoice Analysis Page`, `Transactions CRUD API`, `Invoices & Data Table`, `Changelog System`, `Invoice Charts & Analytics`, `Dashboard Home Page`, `App Layout & Theming`, `Marketing Showcase`, `Monthly Closing Hooks`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `@playwright/test` connect `E2E Playwright Testing` to `Package Dependencies`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `$schema`, `plugin`, `$schema` to the rest of the system?**
  _461 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CSV Import & Invoicing` be split into smaller, more focused modules?**
  _Cohesion score 0.05868118572292801 - nodes in this community are weakly interconnected._
- **Should `E2E Playwright Testing` be split into smaller, more focused modules?**
  _Cohesion score 0.06037414965986394 - nodes in this community are weakly interconnected._
- **Should `Architecture Decision Records` be split into smaller, more focused modules?**
  _Cohesion score 0.051207729468599035 - nodes in this community are weakly interconnected._