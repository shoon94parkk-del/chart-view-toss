# Personalized-news retry backend review

**SPEC: PASS. QUALITY: PASS.** No Critical, Important, or minor findings in this scoped backend patch.

Reviewed uncommitted changes on `fix/news-provider-retry-20261016`, base `934e054`, in `/workspace/chartview-quote-release-main-20261015`: `news_service_v37.py`, three new tests in `tests/test_v37_personalized_news.py`, appended operating/decision documentation, and `task-news-retry.md`.

## Behavior and regression assessment

- `news_service_v37.py:343` exposes an optional boolean query flag with default false. The public `force=true` path passes `retry_errors_only=True`, rather than the existing broader internal `force=True` behavior.
- `news_service_v37.py:320` bypasses the cached record only when it contains a truthy provider error. A normal warm request still returns the cached failure without provider work; explicit retry can reach a recovered provider and replace that record with a genuine success or genuine `no_news` result. Failures remain errors rather than being relabeled as empty successful coverage.
- Fresh healthy cached groups, including legitimate empty/no-news groups, take the same cache-hit return at `news_service_v37.py:321`. A partial retry therefore does not refresh healthy groups simply because another symbol failed. Cold and expired records retain the existing normal acquisition behavior.
- Existing relationship-evidence callers still use `_cached_fetch(force=True)`, whose unconditional cache-bypass behavior remains intact. The default path avoids adding keyword arguments to existing ordinary callers.
- Provider acquisition still runs under the existing global bounded semaphore of four. Cache read/write lock boundaries, the 300-second TTL, symbol/item limits, provider error classification, ranking, relation evidence, and response shape are unchanged. No introduced concurrency regression was identified. This patch adds no per-key single-flight guarantee; concurrent misses/full-force refreshes already lacked that guarantee before the change.
- Documentation accurately distinguishes the public error-only retry from the internal full refresh. Frontend query wiring remains an integration task owned by the coordinator; this backend PASS does not claim that the current browser Retry button already transmits `force=true`.

## Verification

Independently ran only the three focused synthetic regressions:

`PYTHONDONTWRITEBYTECODE=1 /workspace/scratch/chartview-backend-venv/bin/python -B -m pytest -q -p no:cacheprovider tests/test_v37_personalized_news.py -k 'explicit_http_retry or explicit_partial_retry or internal_force'`

Result: **3 passed, 7 deselected**, one existing Starlette/AnyIO alias deprecation warning, 0.46 seconds. These cover actual HTTP boolean forwarding and failure recovery, ordinary cached-error reuse with no second provider call, mixed-group success/no-news preservation, and internal full-force compatibility. Also reviewed the implementer's focused 29-test evidence and RED failure descriptions.

No repository edits, full-suite rerun, provider I/O, commits, or subagents were used by this reviewer. The coordinator owns the final full-backend run, browser retry integration/QA, and release verification. The pre-existing untracked summary-cache file was outside this patch and left untouched.
