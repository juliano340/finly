# Graph Report - finly  (2026-09-07)

## Corpus Check
- 422 files · ~312,754 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1678 nodes · 3914 edges · 107 communities (77 shown, 28 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Importação CSV/PDF & Faturamento
- Serviço de Fechamento Mensal
- API de Contas Bancárias
- API de Faturas de Cartão
- Página de Custos Fixos
- Orçamentos & Recuperação de Senha
- Página de Fechamento Mensal
- Página de Contas Bancárias
- Rotas de API Compartilhadas
- Análise de Faturas & Gráficos
- API de Estatísticas do Dashboard
- Tipos de Formulários & Tabelas
- Backup & Restauração
- Verificação de E-mail
- Página de Cartões
- API de Cartões
- Tabela de Transações
- Parsers de Extrato
- Sistema de Changelog
- API de Orçamentos
- Fluxo de Redefinição de Senha
- Pagamento de Faturas
- Calculadora do Plano Mensal
- API de Categorias
- Serviço de E-mail & Verificação
- Gráficos do Dashboard
- Recorrência & Datas
- API de Notificações
- Custos Fixos: Serviço & Erros
- Navegação de Mês & Testes
- Seed Demo
- Rate Limit & Perfil
- Gráfico de Evolução da Fatura
- Notificações no Layout
- Custos Fixos & Navegação de Mês
- API do Plano Mensal
- Diálogos & Perfil de Usuário
- Serviço de Billing
- Serviço de Autenticação
- Fontes Financeiras do Plano
- Transações Recentes
- Gráfico de Evolução Mensal
- Gráfico de Frequência de Compras
- Infraestrutura de Testes
- Gráfico de Ondas de Gastos
- Hook de Seleção de Tabela
- Tipos pdf-parse
- Formulários de Auth & Orçamento
- Contratos de Props & Tipos
- Utilitários & Helpers E2E
- Biblioteca de Componentes UI
- Componente de Tabs
- Rota do Plano Mensal & Testes
- Troca de Senha API
- Página 404
- Layout Raiz & Next.js
- Showcase de Marketing
- Rate Limit de Login
- Páginas de Faturas & Análise
- Verificação de Schema de Produção
- Página de Configurações
- Script de Build Vercel
- Wizard de Transferência
- Auth Secret & Proxy
- Seed do Prisma
- Ícone do App
- Plugin Graphify (OpenCode)
- Migração de Produção
- Página de Verificação de E-mail
- Páginas Dashboard & Plano Mensal
- { GET, POST }
- Configuração do Pacote
- Dependências do Projeto
- Scripts NPM
- Dependências de Dev
- Configuração de Componentes
- Configuração TypeScript
- Testes de Auth Guard
- Config OpenCode
- Configuração ESLint
- Configuração PostCSS
- Configuração Vercel
- Summary 01-05: Monthly Plan Page & Form
- Limite Diário Seguro Card
- Anti-Doubling Matrix
- PMES-003: Committed Expenses (No Double Count)
- America/Sao_Paulo Timezone Constraint
- ADRs & Pipeline de Produção
- Design: Auth & Marca
- Schema Prisma & CI/CD
- Screenshots do App
- Screenshots: Orçamentos & Categorias
- Design: Landing
- Ícones SVG Públicos
- Component → Hook → Service → Prisma → DB
- Feature-Based Architecture
- Cards Page - Dark Mode Screenshot
- Fixed Costs Page - Dark Mode Screenshot
- Dual Prisma Schema Pattern
- Multi-Tenant Isolation by userId
- setState inside useEffect Lint Rule
- Summary 01-01: MonthlyPlan Entity & Schema
- Summary 01-02: Contracts, Validation & Calculator
- Summary 01-03: Financial Composition & Service
- Summary 01-04: Authenticated API

## God Nodes (most connected - your core abstractions)
1. `cn()` - 96 edges
2. `vitest` - 64 edges
3. `formatCurrency()` - 57 edges
4. `react` - 54 edges
5. `lucide-react` - 49 edges
6. `prisma` - 44 edges
7. `Button()` - 41 edges
8. `moneyToNumber()` - 37 edges
9. `getTestClient()` - 25 edges
10. `scripts` - 25 edges

## Surprising Connections (you probably didn't know these)
- `Plan 01-02: Contracts, Validation & Calculator` --references--> `MonthlyPlanDto`  [EXTRACTED]
  .planning/phases/01-plano-do-mes/01-02-PLAN.md → src/features/monthly-plan/monthly-plan.types.ts
- `Plan 01-02: Contracts, Validation & Calculator` --references--> `calculateMonthlyPlan()`  [EXTRACTED]
  .planning/phases/01-plano-do-mes/01-02-PLAN.md → src/features/monthly-plan/monthly-plan.calculator.ts
- `Adaptive Daily Limit Redistribution` --rationale_for--> `calculateMonthlyPlan()`  [EXTRACTED]
  .planning/REQUIREMENTS.md → src/features/monthly-plan/monthly-plan.calculator.ts
- `Daily Safe Limit Formula` --rationale_for--> `calculateMonthlyPlan()`  [EXTRACTED]
  .planning/REQUIREMENTS.md → src/features/monthly-plan/monthly-plan.calculator.ts
- `calculateMonthlyPlan()` --calls--> `getSupportedMonthWindow (D-17 Window)`  [EXTRACTED]
  src/features/monthly-plan/monthly-plan.calculator.ts → .planning/phases/01-plano-do-mes/01-02-SUMMARY.md

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

## Communities (107 total, 28 thin omitted)

### Community 0 - "Importação CSV/PDF & Faturamento"
Cohesion: 0.06
Nodes (42): ImportResult, ParsedTransaction, AutoCategoryRule, PdfImportResult, BankParser, ChartDataItem, ImportedTransactionData, ImportSessionData (+34 more)

### Community 10 - "Serviço de Fechamento Mensal"
Cohesion: 0.19
Nodes (17): AmbiguousLegacyMovementError, CardInvoiceFixedCostSyncInput, FixedCostOccurrenceClient, MonthlyClosingSummary, POST(), POST(), GET(), aggregateTransactions() (+9 more)

### Community 11 - "API de Contas Bancárias"
Cohesion: 0.11
Nodes (29): BankAccountAdjustmentInput, BankAccountInput, BankAccountMovementInput, BankAccountTransferInput, BenefitRechargeInput, POST(), POST(), POST() (+21 more)

### Community 12 - "API de Faturas de Cartão"
Cohesion: 0.10
Nodes (32): CardInvoiceInput, CardInvoiceItemInput, ParsedCardInvoiceInput, ParsedCardInvoiceItemInput, InvoiceLockedError, POST(), DELETE(), POST() (+24 more)

### Community 13 - "Página de Custos Fixos"
Cohesion: 0.07
Nodes (30): BankAccountItem, CardItem, Category, FixedCostData, FixedCostEditScope, Occurrence, OccurrenceSortField, DataTableToolbarProps (+22 more)

### Community 16 - "Orçamentos & Recuperação de Senha"
Cohesion: 0.07
Nodes (33): Status, BudgetCardProps, DeleteDialogProps, Budget, BudgetSummary, Category, AddButtonProps, ForgotPasswordPage() (+25 more)

### Community 17 - "Página de Fechamento Mensal"
Cohesion: 0.17
Nodes (6): BillRow, BillSortField, ClosingData, DetailItem, ExpenseDetail, billCollator

### Community 18 - "Página de Contas Bancárias"
Cohesion: 0.11
Nodes (20): AccountSortField, BankAccount, StepperProps, StepperStep, Account, TransferWizardProps, SortDirection, BankAccountsPage() (+12 more)

### Community 19 - "Rotas de API Compartilhadas"
Cohesion: 0.10
Nodes (13): EmailNotVerifiedError, OAuthAccountError, AppPrismaClient, POST(), unpayFixedCostOccurrenceWithCard(), batchSchema, batchSchema, googleEnabled (+5 more)

### Community 22 - "Análise de Faturas & Gráficos"
Cohesion: 0.09
Nodes (22): CategoryData, Category, RankingItem, SortDir, SortKey, TxDetail, TxDetail, PlanContent() (+14 more)

### Community 24 - "API de Estatísticas do Dashboard"
Cohesion: 0.16
Nodes (19): CardInvoiceEvolutionStats, DashboardStats, MonthlyEvolutionStats, GET(), GET(), GET(), ensureMonthlyEvolutionData(), formatMonthKey() (+11 more)

### Community 25 - "Tipos de Formulários & Tabelas"
Cohesion: 0.06
Nodes (36): CategoryCardProps, CategoryTableProps, TransactionFormProps, TransactionTableProps, BankAccountOption, InvoiceOption, CategoryWithCount, TransactionInput (+28 more)

### Community 28 - "Backup & Restauração"
Cohesion: 0.16
Nodes (14): BackupData, ImportMode, ImportResult, GET(), POST(), deleteAllUserData(), exportData(), importData() (+6 more)

### Community 29 - "Verificação de E-mail"
Cohesion: 0.23
Nodes (10): EmailVerificationRateLimitError, EmailVerificationTokenExpiredError, EmailVerificationTokenInvalidError, POST(), createEmailVerificationToken(), hashToken(), identifierFor(), verifyEmail() (+2 more)

### Community 3 - "Página de Cartões"
Cohesion: 0.33
Nodes (9): BankAccountItem, CardItem, CardsTab, CardsPage(), changeTab(), isCardsTab(), resolveCardsTab(), withCardsTab() (+1 more)

### Community 30 - "API de Cartões"
Cohesion: 0.20
Nodes (14): CardInput, DELETE(), PUT(), GET(), POST(), createCard(), deleteCard(), dueDateWithDay() (+6 more)

### Community 31 - "Tabela de Transações"
Cohesion: 0.14
Nodes (14): TransactionRowProps, CategoryCellProps, CategoryOption, DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuRadioItem() (+6 more)

### Community 32 - "Parsers de Extrato"
Cohesion: 0.15
Nodes (11): BankParser, ParsedInvoice, ParsedTransaction, parseCurrency(), parsePortugueseDate(), extractTotal(), findValueAfter(), tryParseTransaction() (+3 more)

### Community 33 - "Sistema de Changelog"
Cohesion: 0.20
Nodes (17): ReleaseGroup, ChangeType, Release, ReleaseChange, pinAutoDates(), renderChangelog(), ChangelogPage(), formatReleaseDate() (+9 more)

### Community 34 - "API de Orçamentos"
Cohesion: 0.20
Nodes (14): BudgetInput, BudgetSummary, BudgetWithCategory, DELETE(), PUT(), GET(), POST(), createBudget() (+6 more)

### Community 35 - "Fluxo de Redefinição de Senha"
Cohesion: 0.14
Nodes (17): ForgotPasswordInput, ResetPasswordInput, RateLimitError, TokenExpiredError, TokenInvalidError, UserNotFoundError, POST(), createPasswordResetToken() (+9 more)

### Community 37 - "Pagamento de Faturas"
Cohesion: 0.19
Nodes (14): InvoiceCalculationInput, MoneyValue, GET(), POST(), getBankAccountBalance(), getBankAccountsTotal(), validateExpenseLimit(), calculateInvoiceTotals() (+6 more)

### Community 39 - "Calculadora do Plano Mensal"
Cohesion: 0.16
Nodes (19): MonthlyPlanCalculationInput, MonthlyPlanStatusInfo, calculateMonthlyPlan(), calendarDaysInMonth(), getDaysRemaining(), getStatus(), monthStart(), nextMonthStart() (+11 more)

### Community 4 - "API de Categorias"
Cohesion: 0.21
Nodes (13): CategoryFormProps, CategoryInput, DELETE(), PUT(), GET(), POST(), createCategory(), deleteCategory() (+5 more)

### Community 44 - "Serviço de E-mail & Verificação"
Cohesion: 0.15
Nodes (18): SendEmailInput, EmailVerificationEmailInput, PasswordResetEmailInput, POST(), POST(), POST(), getTransporter(), sendEmail() (+10 more)

### Community 46 - "Gráficos do Dashboard"
Cohesion: 0.12
Nodes (11): DailyTrendChartProps, ExpenseByCategoryChartProps, IncomeVsExpenseChartProps, Category, ChartMode, TxDetail, DailyTrendChart(), ExpenseByCategoryChart() (+3 more)

### Community 47 - "Recorrência & Datas"
Cohesion: 0.23
Nodes (10): EndType, Frequency, IntervalUnit, RecurrenceConfig, addInterval(), computeRecurrenceDates(), fixCostOccurrenceDueDate(), monthKey() (+2 more)

### Community 49 - "API de Notificações"
Cohesion: 0.27
Nodes (12): DueNotification, GET(), addDays(), deduplicateMonthlyOccurrences(), endOfDay(), fixedCostDueDate(), getDueSoonNotifications(), hasAtMostOneOccurrencePerMonth() (+4 more)

### Community 5 - "Custos Fixos: Serviço & Erros"
Cohesion: 0.07
Nodes (45): ProtectedFixedCostOccurrenceError, StaleFixedCostOccurrenceError, FixedCostInput, FixedCostOccurrenceAmountUpdateInput, DuplicateFixedCostNameError, ProtectedFixedCostOccurrenceError, StaleFixedCostOccurrenceError, dateInMonth() (+37 more)

### Community 51 - "Navegação de Mês & Testes"
Cohesion: 0.19
Nodes (12): UseMonthParamOptions, DashboardPage(), isValidMonth(), isWithinRange(), resolvePersistentMonth(), useMonthParam(), auth, navigation (+4 more)

### Community 52 - "Seed Demo"
Cohesion: 0.25
Nodes (11): FixedCostExpenseLimitError, POST(), currentMonth(), POST(), currentMonth(), POST(), GET(), ensureFinancialMonth() (+3 more)

### Community 53 - "Rate Limit & Perfil"
Cohesion: 0.15
Nodes (9): IpRateLimitOptions, DELETE(), consumeIpRateLimit(), clientAddress(), DELETE_ACCOUNT_RATE_LIMIT, deleteAccountOAuthSchema, deleteAccountSchema, updateProfileSchema (+1 more)

### Community 54 - "Gráfico de Evolução da Fatura"
Cohesion: 0.23
Nodes (10): CardInvoiceEvolutionChartProps, CardTooltipProps, ChartItem, TooltipPayloadItem, CardInvoiceEvolutionCard, CardInvoiceEvolutionMonth, CardInvoiceEvolutionChart(), CardTooltip() (+2 more)

### Community 55 - "Notificações no Layout"
Cohesion: 0.21
Nodes (11): DueNotification, RawDueNotification, DueNotificationStatus, DashboardLayoutContent(), notificationLabel(), DropdownMenuLabel(), Separator(), computeDaysUntilDue() (+3 more)

### Community 56 - "Custos Fixos & Navegação de Mês"
Cohesion: 0.19
Nodes (12): MonthNavigatorProps, dueDayIso(), FixedCostsPageInner(), formatCalendarDate(), formatDueDate(), MonthlyClosingPageContent(), changeMonth(), formatMonth() (+4 more)

### Community 59 - "API do Plano Mensal"
Cohesion: 0.28
Nodes (9): MonthlyPlanMonthError, GET(), json(), getMonthlyPlan(), updateMonthlyPlan(), validateRequestedMonth(), dynamic, AS_OF (+1 more)

### Community 6 - "Diálogos & Perfil de Usuário"
Cohesion: 0.10
Nodes (20): DeleteDialogProps, MeResponse, DeleteDialogProps, ConfirmDialogProps, CardOption, ImportPdfDialogProps, RegisterPage(), DeleteAccountButton() (+12 more)

### Community 61 - "Serviço de Billing"
Cohesion: 0.39
Nodes (6): Plan, UserPlan, GET(), canPerformAction(), getUserPlan(), PLANS

### Community 63 - "Serviço de Autenticação"
Cohesion: 0.18
Nodes (10): GoogleUserInput, RegisterInput, findOrCreateGoogleUser(), changePasswordSchema, initialPasswordSchema, registerSchema, testPrisma, prisma (+2 more)

### Community 65 - "Fontes Financeiras do Plano"
Cohesion: 0.36
Nodes (7): MonthlyFinancialSources, SourceInvoice, SourceOccurrence, composeMonthlyFinancialSources(), getMonthlyTransactionWindow(), loadMonthlyFinancialSources(), sumDecimals()

### Community 67 - "Transações Recentes"
Cohesion: 0.38
Nodes (5): RecentTransactionsProps, RecentTransactions(), Badge(), badgeVariants, class-variance-authority

### Community 68 - "Gráfico de Evolução Mensal"
Cohesion: 0.33
Nodes (5): MonthlyEvolutionChartProps, MonthlyEvolutionItem, MonthlyEvolutionChart(), metricColors, metricLabels

### Community 69 - "Gráfico de Frequência de Compras"
Cohesion: 0.33
Nodes (5): Category, ChartMode, RankingItem, CustomTooltip(), PurchaseFrequency()

### Community 7 - "Infraestrutura de Testes"
Cohesion: 0.16
Nodes (14): AppPrismaClient, registerUser(), disconnectTestClient(), getTestClient(), teardown(), prisma, testPrisma, prisma (+6 more)

### Community 71 - "Gráfico de Ondas de Gastos"
Cohesion: 0.33
Nodes (5): Category, ChartMode, TxDetail, CustomTooltip(), SpendingWaves()

### Community 73 - "Hook de Seleção de Tabela"
Cohesion: 0.60
Nodes (4): UseTableSelectionOptions, readStoredSelection(), useTableSelection(), writeStoredSelection()

### Community 76 - "Tipos pdf-parse"
Cohesion: 0.50
Nodes (3): PDFData, PDFOptions, pdf-parse

### Community 8 - "Formulários de Auth & Orçamento"
Cohesion: 0.12
Nodes (26): BudgetFormProps, Category, Category, BankAccountOption, InvoiceOption, getInitialEmail(), getInitialRemember(), LoginPage() (+18 more)

### Community 9 - "Contratos de Props & Tipos"
Cohesion: 0.07
Nodes (35): DailySafeLimitCardProps, EvolutionMetric, Category, AnalysisData, CategoryInfo, RankingItem, TransactionItem, MonthlyPlanFormProps (+27 more)

### Community 1 - "Utilitários & Helpers E2E"
Cohesion: 0.06
Nodes (18): authenticatedPage(), login(), register(), registerApi(), markEmailVerified(), toPrismaDateTime(), login(), main() (+10 more)

### Community 14 - "Biblioteca de Componentes UI"
Cohesion: 0.10
Nodes (29): Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage(), CardAction(), CardDescription() (+21 more)

### Community 20 - "Componente de Tabs"
Cohesion: 0.40
Nodes (5): Tabs(), TabsContent(), TabsList(), TabsTrigger(), tabsListVariants

### Community 36 - "Rota do Plano Mensal & Testes"
Cohesion: 0.33
Nodes (9): GET(), hasAllowedOrigin(), json(), PUT(), isMonthWithinSupportedWindow(), dynamic, mocks, projection (+1 more)

### Community 42 - "Troca de Senha API"
Cohesion: 0.27
Nodes (7): POST(), changePassword(), setInitialPassword(), CHANGE_PASSWORD_RATE_LIMIT, body, mocks, session

### Community 48 - "Layout Raiz & Next.js"
Cohesion: 0.20
Nodes (7): nextConfig, securityHeaders, version, geistMono, geistSans, metadata, next

### Community 50 - "Showcase de Marketing"
Cohesion: 0.15
Nodes (11): ShowcaseMockup(), accountCards, categories, evolution, invoices, navItems, summaryCards, transactions (+3 more)

### Community 57 - "Rate Limit de Login"
Cohesion: 0.36
Nodes (7): clearLoginFailures(), digest(), isLoginBlocked(), loginRateLimitKeys(), recordLoginFailure(), request, testPrisma

### Community 58 - "Páginas de Faturas & Análise"
Cohesion: 0.15
Nodes (10): AnalysisPage(), findCategory(), BillsList(), CardRows(), statusRank(), InvoicesTab(), fetchData(), monthLabel() (+2 more)

### Community 60 - "Verificação de Schema de Produção"
Cohesion: 0.25
Nodes (5): assert(), verifyProductionSchema(), dmlPrivileges, runtimeRoles, pg

### Community 64 - "Script de Build Vercel"
Cohesion: 0.38
Nodes (4): runCommand(), runVercelBuild(), mockedSpawnSync, successfulRun

### Community 66 - "Wizard de Transferência"
Cohesion: 0.38
Nodes (4): TransferWizard(), handleOpenChange(), handleSubmit(), resetForm()

### Community 70 - "Auth Secret & Proxy"
Cohesion: 0.28
Nodes (4): importAuthSecret(), AUTH_SECRET, config, MUTATING_METHODS

### Community 85 - "Páginas Dashboard & Plano Mensal"
Cohesion: 0.16
Nodes (13): DashboardPageContent(), formatChangePercent(), getCardInvoiceSummary(), getMetricSummary(), MonthlyPlanPageContent(), businessDateParts(), getBusinessMonthKey(), getSupportedMonthWindow() (+5 more)

### Community 15 - "Configuração do Pacote"
Cohesion: 0.06
Nodes (29): name, private, @auth/prisma-adapter, @base-ui/react, clsx, dotenv, eslint, eslint-config-next (+21 more)

### Community 21 - "Dependências do Projeto"
Cohesion: 0.07
Nodes (28): dependencies, @auth/prisma-adapter, @base-ui/react, bcryptjs, better-sqlite3, class-variance-authority, clsx, date-fns (+20 more)

### Community 23 - "Scripts NPM"
Cohesion: 0.08
Nodes (25): scripts, build, changelog:generate, db:migrate:deploy, db:migrate:prod, db:push:sqlite, dev, lint (+17 more)

### Community 26 - "Dependências de Dev"
Cohesion: 0.09
Nodes (23): devDependencies, dotenv, eslint, eslint-config-next, jsdom, @playwright/test, tailwindcss, @tailwindcss/postcss (+15 more)

### Community 27 - "Configuração de Componentes"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 40 - "Configuração TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 77 - "Testes de Auth Guard"
Cohesion: 0.50
Nodes (3): HTTP_METHODS, protectedRoutes, routeModules

### Community 2 - "ADRs & Pipeline de Produção"
Cohesion: 0.05
Nodes (50): MonthlyPlan Migration (20260809180000_add_monthly_plan), PostgreSQL Ephemeral Smoke Test, E2E Monthly Plan Test Suite, Production Schema Smoke Test (verify-production-schema.mjs), Vercel Build Pipeline (vercel-build.mjs), Dual Schema Concept, Per-Route Auth Pattern (No Middleware), JWT Invalidation via passwordChangedAt (+42 more)

### Community 38 - "Design: Auth & Marca"
Cohesion: 0.12
Nodes (19): Login Page (FinançasPro), Registration Page (FinançasPro), Social Preview / OG Image Mockup Page, Email/Password Auth + Social Login (Google, Apple), FinançasPro Brand Identity, Design System CSS Variables (Light Theme), Multi-Step Registration Wizard (3 steps), User Objective Selection (save/invest/control/debt/plan) (+11 more)

### Community 41 - "Schema Prisma & CI/CD"
Cohesion: 0.18
Nodes (18): Migration: Add MonthlyPlan Table, Prisma Schema (PostgreSQL), Prisma Schema (SQLite), daily-safe-limit-card.tsx (Dashboard Card), monthly-plan-form.tsx (Override/Goal/Margin Edit), monthly-plan-summary.tsx (Projection Explanation), PMES-001: Monthly Plan per Month, Dependabot Configuration (+10 more)

### Community 43 - "Screenshots do App"
Cohesion: 0.17
Nodes (17): Dark Theme, Landing Page, Light Theme, Login Page, Monthly Closing Page, Notifications Page, Transactions Page, Landing Page - Dark Theme Screenshot (+9 more)

### Community 72 - "Screenshots: Orçamentos & Categorias"
Cohesion: 0.50
Nodes (4): Budgets Page - Dark Mode Screenshot, Budgets Page - Light Mode Screenshot, Categories Page - Dark Mode Screenshot, Categories Page - Light Mode Screenshot

### Community 78 - "Design: Landing"
Cohesion: 0.67
Nodes (3): Dark/Light Theme Toggle System, Light Theme Landing Page, Cinema Dark Theme Landing Page

### Community 81 - "Ícones SVG Públicos"
Cohesion: 0.67
Nodes (3): File Icon SVG, Globe Icon SVG, Window Icon SVG

## Knowledge Gaps
- **469 isolated node(s):** `ImportResult`, `ParsedTransaction`, `AutoCategoryRule`, `PdfImportResult`, `ChartDataItem` (+464 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 636 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Infraestrutura de Testes` to `Importação CSV/PDF & Faturamento`, `Página de Cartões`, `API de Categorias`, `Custos Fixos: Serviço & Erros`, `Diálogos & Perfil de Usuário`, `Contratos de Props & Tipos`, `Serviço de Fechamento Mensal`, `API de Contas Bancárias`, `API de Faturas de Cartão`, `Página de Custos Fixos`, `Configuração do Pacote`, `Orçamentos & Recuperação de Senha`, `Página de Contas Bancárias`, `Tipos de Formulários & Tabelas`, `Backup & Restauração`, `Verificação de E-mail`, `API de Cartões`, `Sistema de Changelog`, `API de Orçamentos`, `Fluxo de Redefinição de Senha`, `Rota do Plano Mensal & Testes`, `Pagamento de Faturas`, `Calculadora do Plano Mensal`, `Troca de Senha API`, `Página 404`, `Recorrência & Datas`, `Navegação de Mês & Testes`, `Rate Limit & Perfil`, `Notificações no Layout`, `Rate Limit de Login`, `Páginas de Faturas & Análise`, `API do Plano Mensal`, `Verificação de Schema de Produção`, `Serviço de Billing`, `Serviço de Autenticação`, `Script de Build Vercel`, `Auth Secret & Proxy`, `Testes de Auth Guard`, `Páginas Dashboard & Plano Mensal`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Why does `react` connect `Formulários de Auth & Orçamento` to `Página de Cartões`, `Diálogos & Perfil de Usuário`, `Contratos de Props & Tipos`, `Página de Custos Fixos`, `Biblioteca de Componentes UI`, `Configuração do Pacote`, `Orçamentos & Recuperação de Senha`, `Página de Fechamento Mensal`, `Página de Contas Bancárias`, `Análise de Faturas & Gráficos`, `Tipos de Formulários & Tabelas`, `Tabela de Transações`, `Sistema de Changelog`, `Gráficos do Dashboard`, `Showcase de Marketing`, `Navegação de Mês & Testes`, `Notificações no Layout`, `Páginas de Faturas & Análise`, `Gráfico de Frequência de Compras`, `Gráfico de Ondas de Gastos`, `Hook de Seleção de Tabela`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `Orçamentos & Recuperação de Senha` to `Sistema de Changelog`, `Página de Cartões`, `Transações Recentes`, `Diálogos & Perfil de Usuário`, `Formulários de Auth & Orçamento`, `Contratos de Props & Tipos`, `Página de Custos Fixos`, `Página 404`, `Configuração do Pacote`, `Página de Fechamento Mensal`, `Página de Contas Bancárias`, `Notificações no Layout`, `Custos Fixos & Navegação de Mês`, `Tipos de Formulários & Tabelas`, `Tabela de Transações`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **What connects `ImportResult`, `ParsedTransaction`, `AutoCategoryRule` to the rest of the system?**
  _469 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Importação CSV/PDF & Faturamento` be split into smaller, more focused modules?**
  _Cohesion score 0.05649717514124294 - nodes in this community are weakly interconnected._
- **Should `API de Contas Bancárias` be split into smaller, more focused modules?**
  _Cohesion score 0.10661268556005399 - nodes in this community are weakly interconnected._
- **Should `API de Faturas de Cartão` be split into smaller, more focused modules?**
  _Cohesion score 0.09745293466223699 - nodes in this community are weakly interconnected._