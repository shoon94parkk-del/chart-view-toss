# Insight implementation — 2026-10-04 / 0.13.0

Approved source: chartview-insight-plan-2026-10-04.md (five stages, verified F1–F8). Software changes are implemented; exact-revision production validation is recorded separately after deployment.

## Implemented
- F1: HS leaf `balPayments` was zero-clamped by max(default=0,value). Backend now keeps signed values, preserving exact-parent/shallow hierarchy and duplicate handling. Same-month amount/import/balance regression fixtures pass. The client displays original backend values.
- F2: market/mode/expanded sector and scroll restore after detail/back. Both stock→sector and sector→stock market transitions repaint consistently. Actual screener filters replace stale preset conditions in URL; in-session panel openness survives back.
- F3: complete market text and per-series dates; separate memory increase/decrease and hierarchy limits; selection caution derives from actual triggered reasons.
- F4/F5: current company and selected/classified peer examples, quarter/year title, requested/actual/provided band coverage. Current service caps history at3years; no hidden expensive expansion.
- F6: independent relation/report retry, retain healthy siblings. Explicit relationship force reaches both backend caches; normal TTL unchanged.
- F7: semiconductor classification candidates from dated KRX actual products; item/country/month/value context follows into company research; no direct trade/benefit inference. Other families remain questions-only without evidence. Screener/LAB carry actual conditions, observations, date and counter-signal. Passive report comparison preserves global selected list; explicit chart action changes it.
- F8: market-first Home retained. At most3 independently loaded, individually dated observations; saved questions/evidence reuse existing device-scoped keys in Home/watch. Recent selections precede smaller secondary aggregate performance, retaining denominator, date, exclusions and calculation explanation.

## Verification
- RED→GREEN: signed negative HS balances; actual provider reasons/date/peer models; existing saved notes; partial retry and actual URL condition restoration; LAB navigation after retry; reverse heatmap market; secondary performance ordering; independent Home source settlement and healthy-content retention.
- `npm run build`: AIT contract and189unit tests passed, Vite build passed,19direct-entry files verified.
- New `insight_flow_qa` and `insight_research_qa`:320/390px passed on the production bundle (Edge).
- Existing home_journey (nine ready/saved/error states), value_discovery, sector_heatmap, research_card, export_recovery, analysis, experience_audit, progressive, reliability_audit, mobile_release passed. Checks include320/390/430px, source failure/retry, missing data, filter/focus/back/reload, local storage failure, stale response guards and no horizontal overflow.
- Backend:57focused Python tests passed (export signed/service,relationship,v37news). Web frontend bundle `--check` passed; Web UI untouched.
- Runtime adaptations used bundled Playwright with installed Edge, preserving assertions. These are local QA runtime choices, not production dependencies.

## Final independent review
Fresh reviewer found no Critical or Minor issues and3Important findings. Each was reproduced failing before fix: sector→stock market mismatch; whole-history performance leading recent selections; optional Home sources coupled by allSettled. All3fixed and final whole unit/build plus affected mobile suites passed. No second reviewer or implementation agent was used.

## Rulings made
1. Native worktree tool could not resolve the parent chat directory as a repo. Git worktree fallback isolates Toss; backend clone isolates shared changes. Cost if wrong: worktree registration/cleanup would need manual handling, not production behavior.
2. Current band service's3-year cap remains. Explain requested/actual/provided coverage instead of increasing provider load without evidence. Cost:5/10-year observations remain unavailable.
3. Initial export bridge is one verified product family; KRX product classification is a research candidate, not HS-identical/direct export exposure. Cost: other families require manual investigation until a verified mapping exists.
4. Signed fixtures identify the backend defect; authenticated provider raw records are not independently fetched locally. Exact production identity and API/UI reconciliation remain required before declaring the software deployment finished. Cost: a further upstream anomaly might remain discoverable only in production data.
5. Android/iOS Toss Sandbox behavior and five-person task study cannot be established by browser automation. Keep them as external gates. Cost: actual device/usability findings may require another iteration.
6. Fixed5/20trading-day cohort medians/benchmarks remain deferred until price/corporate-action inputs validate, as explicitly planned. Cost: users retain the current clearly limited whole-history performance metric.

Deferred minors: none from final review. Public Toss launch approval is outside this Render preview deployment and retains existing P0 gates.


## Live validation follow-up — 0.13.1
Backend ad9eac1 is live, /health exact match. All6item balances and12semiconductor history months satisfy exports-imports=balance within output rounding. Corrected card balances: semiconductor286.9,petroleum54.4,steel8.8hundred-million USD. The old browser HTTP detail response persisted after origin correction; stable balanceBasis=signed-v1 separates those entries without TTL changes. KRX real multi-business Samsung products and non-chip substrate/parts entries are now clause-matched, with actual industry required for bare chip products. Both defects reproduced RED→GREEN;190unit tests/build19routes, export-research320/390 and export-recovery320/390/430passed. No second final review; these are focused production-verification fixes with regression coverage.
Render automatic events did not start despite confirmed settings and matching Git branches; read-only deploy/log/health checks proved old revisions. Clean-cache manual redeploys were used in the approved Chart View workspace, without changing plan/credentials/provider settings.
