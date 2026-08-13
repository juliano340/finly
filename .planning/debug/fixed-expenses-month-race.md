---
status: awaiting_human_verify
trigger: "tem um prolema na tela de lançamento fixos > despesas, quando navega para um mes atras, carrega, e se enquanto carrega eu avanço o mÊs novamente, as vezes ele mostra os dados do mes anterior e o mes avançado no seletor, depois de alguns segundos carrega, mas é bem etranho, fica desincronizada a tela e o seletor de mês. Entende?"
created: 2026-08-13
updated: 2026-08-13T00:57:00-03:00
---

## Symptoms

- expected: Seletor de mês, loading e despesas exibidas sempre correspondem ao mesmo mês, inclusive durante navegação rápida.
- actual: Ao voltar um mês e avançar antes do carregamento terminar, dados do mês anterior podem aparecer sob o mês avançado até nova carga terminar.
- errors: Nenhum erro visível relatado.
- timeline: Não informado.
- reproduction: Em Lançamentos fixos > Despesas, voltar um mês e avançar novamente enquanto a primeira carga ainda está em andamento.

## Current Focus

- hypothesis: Confirmed stale-request overwrite is blocked by request-generation validation.
- test: Human verifies rapid previous/next month navigation in the real browser workflow.
- expecting: Selector, loading state, totals, and expense rows stay on the same month; delayed prior-month data never flashes after returning forward.
- next_action: Ask user to repeat the original rapid-navigation workflow and report confirmed fixed or remaining desynchronization.
- reasoning_checkpoint:
    hypothesis: An obsolete month request overwrites current UI data because fetchData unconditionally commits responses and effect cleanup only cancels the launch timer, not an already-started request.
    confirming_evidence:
      - Complete code trace shows no cancellation or current-request check between awaited Promise.all and setOccurrences/setLoading.
      - Deferred-response component test rendered August 2, then late July response replaced it with two Julho atrasado rows while selector remained August.
    falsification_test: Resolve a prior-month request after a newer current-month request; if current rows remain unchanged without a guard, this hypothesis is wrong.
    fix_rationale: Incrementing a request generation for each load and on effect cleanup makes only the latest active load eligible to commit state, directly preventing obsolete responses from mutating the UI.
    blind_spots: Browser-level network cancellation is not added; requests may still complete server-side, but stale client state commits are prevented. Manual production-environment verification remains user-owned.
- tdd_checkpoint:

## Evidence

- timestamp: 2026-08-13T00:49:24-03:00
  checked: .planning/debug/knowledge-base.md
  found: No project debug knowledge base exists.
  implication: No known-pattern candidate is available; continue direct investigation.

- timestamp: 2026-08-13T00:49:24-03:00
  checked: Code search for fixed-cost month requests and state setters
  found: src/app/(dashboard)/fixed-costs/page.tsx owns month, loading, and occurrences state; its load callback fetches /api/fixed-costs/occurrences?month=${month} and later calls setOccurrences and setLoading.
  implication: The reported desynchronization is localized to this client request/state flow; full implementation must be read before testing the race hypothesis.

- timestamp: 2026-08-13T00:52:00-03:00
  checked: Complete src/app/(dashboard)/fixed-costs/page.tsx and src/hooks/use-month-param.ts implementations
  found: fetchData is recreated per month and unconditionally applies all four responses. Effect cleanup only clears the setTimeout that launches fetchData; it does not cancel or invalidate an already-started fetchData. useMonthParam updates the displayed month immediately via interactiveMonth.
  implication: A request started for month A remains able to overwrite occurrences and loading while selector already displays month B. This matches the Async/Timing race-condition and State Management stale-render patterns; controlled out-of-order resolution can confirm causality.

- timestamp: 2026-08-13T00:52:30-03:00
  checked: Next.js 16.2.11 bundled docs and existing Vitest component-test conventions
  found: The page is correctly a synchronous Client Component using useEffect/useSearchParams under Suspense, and project tests use Vitest plus React Testing Library with next/navigation mocks.
  implication: A focused deferred-fetch component test can reproduce the client race without changing production behavior.

- timestamp: 2026-08-13T00:52:45-03:00
  checked: Deferred-response regression test before production fix
  found: Test first rendered Agosto 2 for the reselected current month; after resolving the older July request, DOM contained two Julho atrasado rows and the assertion failed.
  implication: Out-of-order response completion alone reproduces the exact selector/data desynchronization, confirming the stale-request overwrite mechanism and ruling out month formatting or URL persistence as the cause.

- timestamp: 2026-08-13T00:54:15-03:00
  checked: Deferred-response regression test after request-generation guard
  found: src/app/(dashboard)/fixed-costs/__tests__/page.test.tsx passed (1 test, 1 pass); delayed July result did not replace Agosto 2.
  implication: The minimal guard prevents the confirmed stale overwrite under the original trigger ordering.

- timestamp: 2026-08-13T00:55:00-03:00
  checked: Repository-wide npx tsc --noEmit
  found: Typecheck fails across pre-existing unrelated manual E2E, Prisma client compatibility, auth, transaction test, and other files. Visible diagnostics do not reference the changed fixed-cost page or its new test.
  implication: Full typecheck cannot serve as a clean regression gate; changed-path diagnostics and focused checks must be isolated without modifying unrelated code.

- timestamp: 2026-08-13T00:56:15-03:00
  checked: Fixed-cost page regression plus useMonthParam regression suite
  found: 2 test files passed; 6 tests passed, 0 failed.
  implication: The race fix works and existing month URL/storage/navigation behavior remains intact.

- timestamp: 2026-08-13T00:56:30-03:00
  checked: ESLint on src/app/(dashboard)/fixed-costs/page.tsx and its new regression test
  found: ESLint completed successfully with no diagnostics.
  implication: Changed production and test files satisfy project lint rules.

- timestamp: 2026-08-13T00:57:00-03:00
  checked: Final scoped diff
  found: Production change is limited to request-generation tracking/validation in the fixed-cost page; new test is limited to the reported out-of-order response scenario.
  implication: Fix is surgical and ready for real-workflow human verification.

## Eliminated

## Resolution

- root_cause: src/app/(dashboard)/fixed-costs/page.tsx allows every fetchData invocation to commit state. Changing month cleans up only the scheduled timer; an already-started older request remains live and can call setOccurrences/setLoading after a newer month request has completed.
- fix: Added a monotonically increasing fetch request ID. Effect setup reserves the current ID, cleanup invalidates it, and fetchData parses responses but commits categories/cards/accounts/occurrences/loading only when its ID is still current. Added deferred-response regression coverage.
- verification: Focused deferred-response test passes after failing before the fix; related useMonthParam tests pass (6/6 total across 2 files); changed-file ESLint passes. Full repository tsc remains red from unrelated existing diagnostics. Awaiting browser workflow confirmation.
- files_changed:
    - src/app/(dashboard)/fixed-costs/page.tsx
    - src/app/(dashboard)/fixed-costs/__tests__/page.test.tsx
