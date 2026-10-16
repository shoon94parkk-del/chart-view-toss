# Release insights implementation plan

Goal: implement the approved AFTERNS/REA comparison's release-reading improvements and publish the verified DRAM MoM correction to the existing services.

Approved design: the 2026-10-16 REA comparison report proposed (1) improving existing dated Home changes, (2) four CPI/PPI graphs, (3) verified release schedules, (4) event comparisons only when compatible pre-event data exists, (5) returning to existing research, and (6) precise data timestamps. The user explicitly requested implementation and deployment of that report plus the DRAM fix. This plan records the execution details; it does not introduce a new investment strategy.

Baseline: Toss main02cb311, pending audit PR134/head1dd69ac; backend mainc028781 plus PR152/head92c1e56. Work branches are `feat/release-insights-20261016` in both repositories. Preserve the existing pending commits through ancestry rather than copying their features.

Architecture: keep Vite/Toss and FastAPI. Add provider-free, precomputed inflation and verified issuer-call datasets; expose inflation as optional additions to `/api/macro` while retaining its original16 rows/summary and excluding graph histories from Home snapshots. Issuer schedules use a lazy optional endpoint on the existing consensus screen. Reuse the existing Home changes, device storage, research and cache contracts.

Global constraints:

- PICK/LAB selection, records, formulas, API/exposure, scores/statuses and disclaimers are unchanged. Compare protected file hashes and run existing regressions.
- No paid infrastructure, new keys, external LLM, copied AFTERNS data or runtime data-provider calls on Home.
- Observation month, release time, collection/check time and revision status remain distinct; unknown stays unknown. Corporate call times are not results-publication times.
- Missing monthly observations stay null, including chart gaps; compare YoY and MoM using their explicit NSA/SA bases.
- Home publication receipts are account/device-local, bounded public topic fingerprints; no personal notes/search/watchlist sent to analytics.
- Node24.21, existing Python environment, existing CI/Render promotion path. Real Sandbox remains separately unverified.

Review focus:

1. Provider gaps/revisions/partial failure must preserve valid dated data without inventing freshness.
2. Date-only schedules and DST must not become exact guessed times.
3. Home refresh/reset/navigation must preserve pointer targets, account separation, private records and original PICK output.
4. Old backend/optional module failure must leave existing macro/consensus content usable.
5. Current estimates without pre-event snapshots must not produce historical surprise/reaction claims.

Tasks:

- [x] Official inflation cache and calendar: `scripts/generate_inflation_release_cache.py`, `inflation_release_service.py`, static cache, existing macro workflow. Test exact-month transforms, gaps, null/zero, DST, partial failure/check timestamps and provider-free reader. Preserve original generator and16 results.
- [x] Inflation view: new isolated model/view/CSS and Node tests. Root mounts it lazily in `renderMacro` after its existing API. Four series, YoY/MoM and bounded period controls, source/date/basis/coverage and independent schedule/empty/error states.
- [x] Official corporate calls: standalone generator/cache/reader/tests and bounded scheduled workflow. Verify actual official sources; expose AAPL/Samsung calls only where confirmed. Current source inspection cannot establish immutable historical pre-event estimates, so comparison stays explicitly unavailable instead of generating surprise or price-response statistics.
- [x] Home publication reading: model and tests classify first/same/new-period/changed-value/older public observations from existing calls; confirmed account-local bounded receipts prevent repeat-new claims. Keep compact existing cards and gesture protection.
- [x] Research/source navigation: completion CTA from a successfully loaded DART report to its existing question/peer form; retain draft/save behavior. Clarify export and consensus collection-versus-publication labels. No new research analysis logic.
- [x] Integration: root owns `main.py`, `src/main.js`, API wiring, storage key list, shared workflow fixture wiring, documentation and package version. Agents edit disjoint modules only; no concurrent full QA.
- [ ] Validation: red/green targeted tests, full Python/Node, `qa:prepush`, accessibility and relevant mobile/live smoke, 320/390/430 and WebKit, before/after same-harness performance, fresh AIT build/hash, protected files/output comparisons, independent final review.
- [ ] Release: PRs, exact-head CI, integrate through normal main ancestry, wait for exact-main checks and frontend Render branch promotion, use existing services. Respect auto-deploy configuration and avoid duplicate deploy requests. Verify actual backend health SHA, static assets, DRAM MoM/history agreement, official inflation series/dates, source links and Home/Watch/research recovery. Record console/native/policy limitations separately.

Execution: root coordinates/integrates/releases; backend inflation, inflation frontend and official issuer evidence proceed independently, then one read-only final reviewer checks the integrated result. This preserves the user's request to continue through verified deployment without another design-approval round.
