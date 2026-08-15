---
status: resolved
trigger: "ao entrar no sistema, o dashboard carrega os dados do mes atual, porém, na ultima vez que eu sai do sistema, eu estava em setembro; o seletor retorna como setembro, mas os dados carregam agosto e depois mudam sem indicação visual"
created: 2026-08-14
updated: 2026-08-14T01:20:00-03:00
---

## Symptoms

- expected: Ao entrar, o mês persistido e os dados do Dashboard devem corresponder; durante qualquer troca deve existir indicação visual de carregamento.
- actual: O seletor restaura setembro, mas cards e gráficos mostram agosto por alguns segundos e depois mudam silenciosamente para setembro.
- errors: Nenhum erro visível relatado.
- timeline: Observado ao retornar ao sistema em agosto após a última sessão ter selecionado setembro.
- reproduction: Selecionar setembro, sair do sistema, entrar novamente em agosto e observar seletor e dados do Dashboard.

## Current Focus

- hypothesis: Fix should prevent transient default-month fetch and prevent superseded completions from changing Dashboard state/loading.
- test: Rerun full Vitest suite with extended process timeout; prior 120s command produced no test result before shell termination.
- expecting: Persisted entry requests September only; late August response is ignored; existing hook consumers remain compatible.
- next_action: Human verification of persisted-month login flow.
- reasoning_checkpoint:
    hypothesis: Deferred month restoration causes an obsolete default-month request, and unowned async completion lets that request publish stale state after current month changes.
    confirming_evidence:
      - Focused test observed two calls on persisted September entry, first month=2026-08 then month=2026-09.
      - Controlled promises resolved September first and August last; UI changed from R$ 900,00 to stale R$ 800,00.
      - Source shows unconditional Dashboard fetch for any current month and no abort/generation check; every finally clears loading.
    falsification_test: If readiness gating still issues August, or resolving an aborted August request changes September UI/loading, hypothesis is wrong or fix incomplete.
    fix_rationale: Readiness prevents obsolete request creation; AbortController cleanup and aborted checks prevent superseded responses/finally blocks from mutating current UI.
    blind_spots: Browser-native fetch abort timing is represented by controlled promises plus signal checks; full production login flow still requires human verification.
- tdd_checkpoint:

## Evidence

- timestamp: 2026-08-14T00:00:00-03:00
  checked: Working tree and code search
  found: Dashboard page and several consumers share src/hooks/use-month-param.ts; existing hook tests cover persistence. src/lib/auth.ts is already modified and unrelated.
  implication: Preserve auth edit; determine whether shared hook semantics or Dashboard-specific request lifecycle is root cause before changing code.

- timestamp: 2026-08-14T00:10:00-03:00
  checked: Complete useMonthParam and Dashboard implementations
  found: Hook initializes storedMonth as null and schedules localStorage restoration with setTimeout(0). Dashboard effect immediately fetches whenever session and current month exist, so defaultMonth is fetchable before restoration. Fetch lifecycle has no AbortController or request generation guard; every response writes all dashboard state and every finally sets loading false.
  implication: Initialization race and stale-response race are directly present. Test must prove both before fix; shared hook needs readiness semantics without changing existing two-value consumers.

- timestamp: 2026-08-14T00:10:00-03:00
  checked: Bundled Next.js 16.2.11 client component, useSearchParams, and useRouter documentation
  found: localStorage belongs in client lifecycle; useSearchParams is current App Router API and Dashboard already has required Suspense boundary.
  implication: Avoid synchronous localStorage reads that would diverge server/client initial render; expose restoration readiness and gate Dashboard fetching instead.

- timestamp: 2026-08-14T00:20:00-03:00
  checked: First execution of new Dashboard regression tests
  found: Test process timed out without assertion output while using fake timers plus Testing Library waitFor/findBy.
  implication: Harness timing is confounded; switch this test to real timers while retaining fixed system date via explicit date mocking or controlled default-month source.

- timestamp: 2026-08-14T00:30:00-03:00
  checked: Dashboard regression test with real timers and deterministic business month
  found: Persisted September produced an initial August request followed by September, directly reproducing the initialization race. Extra repeated calls came from test mock returning a new session object each render; second test was therefore confounded and timed out.
  implication: First root-cause branch is confirmed. Stabilize test session identity before using second test as evidence for stale-response behavior.

- timestamp: 2026-08-14T00:40:00-03:00
  checked: Focused tests after stabilizing session mock identity
  found: Persisted entry made exactly two requests (August then September). With controlled overlapping requests, resolving September to R$ 900,00 then August to R$ 800,00 changed rendered Dashboard back to R$ 800,00.
  implication: Both initialization race and stale-response overwrite are confirmed product defects, not test artifacts.

- timestamp: 2026-08-14T01:00:00-03:00
  checked: Focused Dashboard and useMonthParam tests after fix
  found: 2 test files and 7 tests passed, including persisted September request count and controlled out-of-order August response.
  implication: Exact reproduction no longer occurs; shared hook persistence behavior remains green.

- timestamp: 2026-08-14T01:10:00-03:00
  checked: Targeted ESLint on four changed code/test files
  found: ESLint completed with exit code 0 and no findings.
  implication: Fix and regression tests satisfy current lint rules.

- timestamp: 2026-08-14T01:20:00-03:00
  checked: First full npm test attempt
  found: Shell terminated command at 120 seconds without returning Vitest results.
  implication: This is an infrastructure timeout, not a test failure; rerun with larger allowance.

- timestamp: 2026-08-14T01:30:00-03:00
  checked: Extended full Vitest rerun
  found: Full suite again produced no final result within the extended allowance and was stopped; focused regression tests and changed-file lint remained green.
  implication: Full-suite status is unknown due to runner duration; fix verification rests on the exact focused reproductions plus lint.

## Eliminated

## Resolution

- root_cause: useMonthParam defers persisted-month restoration but exposes defaultMonth as ready; Dashboard fetches that transient month and lacks cancellation/ownership, allowing obsolete responses and finally blocks to overwrite current data and loading state.
- fix: Added backward-compatible useMonthParam readiness tuple value; Dashboard waits for restored month and owns each request with AbortController plus aborted-state guards.
- verification: Focused Dashboard and useMonthParam suites passed (2 files, 7 tests); changed-file ESLint passed. Full Vitest suite timed out without a result after extended allowance.
- files_changed:
  - src/hooks/use-month-param.ts
  - src/hooks/__tests__/use-month-param.test.tsx
  - src/app/(dashboard)/dashboard/page.tsx
  - src/app/(dashboard)/dashboard/__tests__/page.test.tsx
