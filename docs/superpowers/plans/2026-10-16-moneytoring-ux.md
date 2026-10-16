# Moneytoring UX implementation plan

> **For agentic workers:** Use subagent-driven-development for the disjoint modules and serialized integration below. User explicitly requested execution of all feasible improvements; do not stop after planning.

**Goal:** Complete the five approved research adaptations within existing Toss flows, and explicitly resolve or report the macro API issuance dependency.

**Architecture:** Lazy feature modules consume current cached data; the coordinator alone wires main.js/api.js. Backend optional forecast receipts are generated offline and read alongside the current inflation cache. Research history remains under existing account-separated storage.

**Tech Stack:** Node24.21/Vite7/vanilla JS/lightweight-charts4, Python/FastAPI saved JSON, Playwright1.55 Chromium/WebKit.

**Spec:** [Moneytoring scope](../specs/2026-10-16-moneytoring-ux.md)

## Global constraints

- PICK/LAB selection, scores, records, calculations, performance, APIs/display and disclaimers remain unchanged.
- No fake forecasts, backdated capture times, first-release claims from revised indexes, or historical news/price reconstruction.
- No new provider calls on Home or macro request paths; summaries only after explicit expansion, maximum3 active.
- No paid account/contract, new infrastructure, secret exposure, or unsupported SDK/API.
- Native Sandbox/console issuance and data-display license status must be reported separately from web/AIT success.

## Review focus

- Same article may be directly related to one stock and industry-related to another: keep both relation receipts.
- A delayed summary or news request must not mutate a later route/selected symbol.
- A post-release archive retrieval may show an evidenced forecast while comparison remains unverified; preserve old pre-release guards.
- Weekend/date-only/after-hours news must not be moved to a convenient chart date or called a price cause.
- A note save without timed quote or failed storage must not create a fake/double checkpoint.

## Task 1 — API issuance and optional receipt cache

Files: backend new `scripts/macro_forecast_data.py`, `tests/test_macro_forecast_data.py`; existing `inflation_release_service.py`, relevant tests and scheduled workflow only if needed. No Web UI or protected files.

Interface: cached per-series `forecasts` and `comparisons` use exact series ID,month,rate,basis,unit; forecast expected/source/retrievedAt/evidenceKind/archive evidence; original comparisons remain compatible. No credentials means explicit unavailable metadata and legacy numeric output unchanged.

- [ ] Check official3-provider signup flow and report actual issued key or exact missing user/auth/license requirement.
- [ ] Pin reader tests for wrong period/basis/duplicates/late captures, safe archive evidence, zero and no provider I/O.
- [ ] Implement bounded offline receipt import/provider adapter only against a documented contract; no enabled scrape or invented values.
- [ ] Run targeted then backend suite/bundles; coordinator reviews contract with frontend.

## Task 2 — Macro forecast/result view

Files: `src/macroInflationModel.js`, `src/macroInflationView.js`, `src/macroInflationView.css`, closest tests.

Interface: preserve `normalizeInflationPayload`, `inflationComparison` and `mountMacroInflation`; add checked archive/standalone forecast evidence and recent publication navigation from current rows. Backend raw `forecasts` fields shared withTask1. No main.js edits.

- [ ] Red tests: old late capture still rejected; validated archive visible with actual retrieval label; wrong basis/duplicate/future/missing proof stays unknown.
- [ ] Add recent published/next-release states and one-line indicator definitions, preserving current numeric precision/source provenance.
- [ ] Run macro Node tests and existing view contracts; report UI hooks for integrated browser QA.

## Task 3 — News filters, merged stock links and on-demand summaries

Files: new `src/newsReaderModel.js`, `src/newsReaderView.js`, `src/newsReaderView.css`, `tests/newsReader*.test.mjs`.

Interface: `buildNewsFeed(payload,options)` gives same-URL merged rows and verified relations; `mountNewsReader(host,payload,options)` consumes sort/preferences, `loadSummary(row,{force})`, `onExternal(url)`, `onStock(symbol,name)`, `isCurrent()`, returning cleanup. No main.js/api.js edits.

- [ ] Red tests for shared URL/different relations, source filtering/reset/empty and range count, sorting/zero timestamps.
- [ ] Implement accessible compact cards and filters, same-visit state, per-card pending/error/retry and cached summaries with concurrency3.
- [ ] Test late response/cleanup/double clicks and report module integration hooks.

## Task 4 — Research checkpoints

Files: `src/researchNotes.js`, `src/researchCard.js`, new checkpoint model/view CSS if needed, closest tests.

Interface: mountResearchCard accepts optional `getQuoteSnapshot()`; checkpoint storage stays embedded in the existing research note under the existing key. Keep latest-note/peer/save/review contracts and add max20 events.

- [ ] Red tests for legacy migration, explicit-save append, missing/stale/no-time quote, failure/idempotency/retention and no mutation of old records.
- [ ] Add compact collapsible timeline and local reviewOn editor; retain existing saved/draft/review behavior.
- [ ] Run research/storage and current isolated-account tests.

## Task 5 — Chart evidence dates

Files: new `src/chartEvidence.js`, `src/chartEvidence.css`, `tests/chartEvidence.test.mjs`.

Interface: `mountChartEvidence(host,{series,points,rows,symbol,onExternal})` consumes existing lightweight-charts4 area series and existing news rows; returns cleanup. Mark only actual points matching issuer-market publication dates; list missing/off-chart dates explicitly. No main.js edits.

- [ ] Red tests: timezone/date-only/weekend/after-hours/missing URL/timestamp/wrong-symbol/duplicate/date clusters and short-history coverage.
- [ ] Implement optional marker toggle + keyboard-readable event list; do not fetch or alter chart points/calculation.
- [ ] Verify cleanup and unrelated symbol protection; report exact root wiring needs.

## Task 6 — Serialized integration, regression and release

Files: coordinator `src/main.js`, `src/api.js`, optional bounded lazy-loading hooks, `tests/e2e/moneytoring-ux.spec.mjs` + fixtures, docs/memory/evidence.

- [ ] Integrate lazy news reader; API summary wrapper; research canonical quote callback; detail chart/news race-safe event controller.
- [ ] Browser regressions for API→processing→UI, back/reload/private storage, macro archive/pending, summaries, event pins and all320/390/430 viewports + axe.
- [ ] Compare identical95d6b83/current harness performance and requests; run full Node/Python, Vite/prepush4projects, Mobile release QA, live backend smoke, freshAIT and protectedPICK checks.
- [ ] Independent final review, exact-head PR CI, merge/promote under existing release authorization; actual Render revision/asset/data/mobile smoke.
- [ ] Report A–E, actual API issuance status and remaining native/license gates; no false complete claim for external dependencies.
