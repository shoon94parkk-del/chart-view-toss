# Loading performance implementation plan

Spec: ../specs/2026-10-25-loading-performance.md. User approved the preceding measured improvement priorities. Root owns integration, builds/browser tests/performance runs, docs and delivery; owners do not commit/push.

- [x] Baselines: F832 Node, B full Python; archive same-harness live measurements and source manifests. Keep public data commits.
- [x] B news owner: `news_service_v37.py` additive delivery=first_available; real-router held-worker tests for early cached/first group, pending/no-store, default complete, cancellation and reused owners. Preserve public error-only force and internal force generation.
- [x] Home owner: B `home_screener_service.py` router and tests; F `homeScreenerSource.js`, `homeChangesView.js`, `insightModel.js` + dedicated/nearby tests. Root registers router and E2E payload. Assert exact full-source count equivalence, date/source flags, no stocks array and no Home full screener request.
- [x] News F owner: `progressiveNews.js`, reader model/view/response + tests. Export `loadProgressiveNews(tickers,names,{force,onUpdate,isCurrent,signal})` final payload; cleanup.update(payload) preserves reader session/count/filter/summary/focus and held-click. Root mounts once and updates guarded hosts.
- [x] Root Watch: new pure `watchQuoteLoader.js`, controlled concurrency/failure/stale-route tests. Bounded4 existing ordinary calls, canonical ingest40, cache saved after received values, progress/error state, patch existing controls during partial arrivals and preserve sort/focus on final render.
- [x] Root memory: subprocess test forbids pandas during ordinary main import; prove real DART parser fixtures still work. Local imports only at actual uses in main.py/dart_business_service.py. Same-command RSS before/after.
- [x] Integration: root `main.js`, shared E2E `data.mjs`, backend router registration. Add held API browser regressions for first fast quote/article while slow work remains, completion/failure/return/reset and Home summary→full Discover.
- [x] Independent final review, fix validated findings with regression evidence.
- [x] Serialize relevant QA, full F qa:prepush/AIT, B Python/bundle checks; rerun same performance harness after fixes, compare first/all-data and API count/body size. No speed claims from placeholders or error states.
- [ ] Update decision logs/memory, commit and reviewable paired PRs; use existing authorized release paths and exact-SHA CI before production verification.

Review focus: cache partial results never appear complete; late account/navigation results cannot repaint or resurrect data; acquired articles/summaries survive a later failure; final global article ranking still comes from server; quote timestamps never roll back; projection preserves entire-universe count and exact tradeDate; lazy imports retain MultiIndex/HTML parser behavior; first-price speed does not hide worsened all-price/provider load.
