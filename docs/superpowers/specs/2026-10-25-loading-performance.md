# Loading performance improvements

User approved fixing the measured bottlenecks after reviewing `/workspace/chartview-speed-report-2026-10-25/report.md`. Source F main0c1017d, B latest maina15a4e6 (runtime identical to deployed3a2ab5a; newer published data preserved). No new approval pause is necessary for these authorized reversible fixes.

## Behavior

- News shows actual already-acquired groups while other requested stocks remain pending. Default backend complete response, concurrency4, TTL300, owner64,7s collection budget remain. Add optional `delivery=first_available`; unfinished groups are pending, never false empty/error. Follow-up requests only pending names; preserve exact final all-symbol balanced highlights. Client work ends within one10s bounded lifecycle, preserves received rows on failure and view/account cleanup. No automatic summaries.
- Watch uses existing ordinary canonical quote API with at most4 concurrent singleton requests, at most20 requested stocks, no fresh/force/TTL changes. This trades bounded extra HTTP requests for first-price progress and reduces peak provider acquisition from a20-symbol gather. Request-client caching/singleflight stays in use. Paint each acquired canonical value without erasing existing rows or changing focus/click target; missing values stay pending until terminal and errors are visibly distinct. Measure both first and all-prices times; never label early results as all ready.
- Home replaces only the briefing's full screener count load with `/api/home-screener-summary`: schemaVersion1, counts.volumeSurge (exact finite volumeRatio>=2 count), original tradeDate/updated/source/status flags. The endpoint uses the existing validated latest publication reader. No top3/PICK/LAB or scoring changes; same card text and publication journal. No giant fallback for an ordinary summary error. Discover and detailed consumers retain full screener data.
- Lazy-load pandas at actual KRX HTML/DART parsing use sites to reduce idle import RSS. Preserve parsing outputs/type handling and local-universe-first search. Measure controlled import memory before/after; do not claim a memory-leak cure or increase paid resources.

## Choices and constraints

A shared quote streaming/polling API would add ownership/transport risk. Bounded ordinary requests reuse current provider coalescing and timestamps; actual measurements must justify the HTTP tradeoff. News already has a bounded async owner so first-available JSON is additive and compatible. Returning fake empty results, lengthening quote caches, uncontrolled concurrency, new provider/LLM calls and paid scaling are excluded. Existing saved research/privacy/native Back/gesture/pointer/source-date contracts remain.

## Evidence

Record before/after using the same existing route harness, the detailed3/20-stock harness and home12s background observer. Add controlled slow-provider regressions so warm upstream caches cannot hide causality. Full frontend Node/build/four-browser gate, nearby mobile checks and AIT; relevant/full backend Python and unchanged frontend-bundle check. Review independently before delivery. Keep backend/API release before frontend consumers and verify exact source/production revisions if deploying.
