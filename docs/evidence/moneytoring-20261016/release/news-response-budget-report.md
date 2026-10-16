# Public news response budget — implementation report

Workspace `/workspace/chartview-news-response-budget-20261016`, branch `fix/news-response-budget-20261016`, base `a406a4c`. Root owns git/CI/release. No commit, push, deployment, browser run, provider acquisition or subagent was performed by this implementer.

## Changed files

1. `news_service_v37.py`: fresh-cache endpoint fast path; existing-owner public singleflight with bounded64 queued/running acquisitions; loop-independent futures and per-caller shields; one7.0s monotonic collection deadline; explicit `news_timeout`/`news_busy` incomplete groups; genuine late completion retained; cache record/result type validation; generation-ordered canonical writes preserving internal force's own result.
2. New `tests/test_news_response_budget.py`:15 meaningful synthetic cases. Existing news tests remain unchanged and verify public error-only force, successful/empty cache preservation, actual HTTP query forwarding and internal full-force compatibility.
3. New `docs/NEWS_RESPONSE_BUDGET_2026-10-16.md`: behavior, lifecycle, limits and verification boundary.

No provider/scoring/PICK/LAB/macro/main.py/frontend source or infrastructure changed. The full suite generated untracked `static/data/news_summary_cache.json` with synthetic test data; root was notified to remove it during git preparation. Full suite used `PYTHONDONTWRITEBYTECODE=1` to avoid tracked bytecode changes.

## Final behavior and compatibility

- Public collection deadline starts once at endpoint entry and applies across the whole ordered symbol list. All completed real groups are harvested; unfinished groups return error code `news_timeout`, never fake articles or `no_news`.
- Cached success/no_news/error hits use the existing300s cache before executor submission. Public `force=true` skips cached errors only; healthy/empty groups remain hits.
- Public duplicate normalized `symbol|name` acquisitions share one queued/running worker. The64-owner limit counts work waiting for default-executor capacity as well as active provider work. Overflow returns `news_busy`; healthy cache delivery still works.
- A caller deadline/cancellation releases only its wrapper. Real owners remain until actual worker completion, publish real cache data and clean up registry slots. No timeout/busy placeholder is saved. Concurrent event-loop callers share a thread-safe future rather than an asyncio task belonging to another loop.
- No new executor or provider client exists. Provider semaphore4,7s Requests connect/read timeout behavior, max20 symbols, existing sources/scoring/relations and cache TTL are preserved.
- Internal `_cached_fetch(force=True)` still performs a full refresh and returns its own acquired data/cache miss. A newer-started completed acquisition keeps the canonical cache when older work finishes later. Ordinary older public work may reuse newer fresh canonical data; no internal coalescing expansion was made.
- Cache handoff and provider-capacity waits recheck the existing cache to avoid a duplicate acquisition after another consumer has populated it. Malformed cache and provider-result shapes cannot create a false empty success.

## Evidence

Runtime `/workspace/scratch/chartview-backend-venv/bin/python`.

- Initial RED: `-m pytest -q tests/test_news_response_budget.py tests/test_v37_personalized_news.py` → **12 failed,12 passed**, one existing Starlette deprecation warning. Evidence `news-budget-red.txt`. Failures reproduced thread-queue-delayed cache hits, absent response deadline, duplicate/cancel-affected acquisitions, missing owner bounds, cache rollback and malformed shapes.
- Root compatibility-review RED: `-m pytest -q tests/test_news_response_budget.py -k concurrent_internal_forces` → **1 failed,14 deselected**. It caught the initial generation guard returning another forced caller's result. Evidence `news-budget-force-red.txt`; fixed by preserving each force caller's own actual result while suppressing only stale canonical writes.
- Final targeted: `-m pytest -q tests/test_news_response_budget.py tests/test_v37_personalized_news.py tests/test_relationship_evidence_service.py` → **44 passed**, one existing Starlette warning,1.10s. Evidence `news-budget-green.txt`. The capacity test explicitly saturates a one-thread default executor and verifies queued owners remain bounded and healthy cache hits bypass them.
- Final full backend: `PYTHONDONTWRITEBYTECODE=1 ... -m pytest -q` → **975 passed,80 existing warnings**,15.21s. Evidence `news-budget-full.txt`.
- `... scripts/build_frontend_bundle.py --check` → passed. Evidence `news-budget-bundle.txt` (empty successful output).
- AST parsing of `news_service_v37.py` and the new test file → passed.

Root/reviewer were notified of final stable code and full-suite completion. Reviewer has source, tests, scoped documentation and evidence paths. Root's separate before/after simulated-provider harness and exact-revision production verification remain independent deliverables.

## Remaining risks and limits

The7s budget bounds server collection wait, not event-loop starvation, network/relay time or blocking provider-thread lifetime. Long-running underlying work remains counted toward64 until real completion; overflow is explicit rather than additional queued acquisition. This does not prove that a production response traverses the network within the client's remaining3s margin.

The captured32011–21s timings included relay transport and lacked backend stage timing/cache-body evidence. No exact bottleneck attribution or provider-speed improvement is claimed. Root owns correlated production/browser revalidation and must keep native Toss Sandbox results separate.
