# 2026-10-25 Home, Watch and news loading improvements

User authorized improvements after separate production speed measurements. This is a coordinated Toss client/shared backend change; no dependency upgrade, paid scaling or reduced freshness. Baseline Toss main0c1017d/deployedindex-BWwc7rb3.js; backend deployed3a2ab5a with data-only maina15a4e6 preserved. Backend PR[168](https://github.com/shoon94parkk-del/chart_View/pull/168).

## Changes and invariants

- Home volume-surge observation uses `/api/home-screener-summary` through the same validated publication reader. Exact entire-universe count, date/source/status preserved; invalid source503. Actual local source2494 rows: count170,227-byte summary versus2,116,020-byte full JSON (99.989% fewer decoded bytes). Discover still loads its full source when opened. No fallback full Home download or provider collection.
- Watch uses ordinary singleton quote requests with at most4 concurrent calls,20 symbols and one12s consumer deadline. Every arriving canonical quote is displayed/persisted at existing priority40; normal request-client TTL,5s provider TTL and server/coalescing remain. Stable controls survive partial/final updates and held pointer gestures. Errors retain verified rows with explicit retry. HTTP calls increase from one combined request to up to20 single-symbol calls; this bounds simultaneous work and advances first price, but does not promise faster completion for uniformly slow providers.
- News uses additive `delivery=first_available`, then requests only remaining symbols; one10s consumer deadline, explicit pending state and no incomplete-success caching. Same owner/cache/300s TTL,4-provider concurrency and64-owner bound; default complete callers are unchanged. Final server highlights keep their exact balanced ordering and12-item limit. One client-only canonical revalidation handles joining an older in-flight response; it never adds backendforce except explicit retry. On failure acquired groups remain available with explicit partial/error state. Reader filters/count/summary session/focus and held clicks remain usable; late account/route results cannot publish.
- Ordinary backend imports no longer eagerly load pandas. Actual KRX/DART HTML and MultiIndex paths import it locally and retain fixture outputs. Fresh-process median RSS decreases about50MiB; demand-driven analysis can load it again. This is not a memory-leak diagnosis or a promise about warmed production RSS.

## Before/after evidence

[Archived raw measurements and scripts](audits/2026-10-25-loading/). Existing live baseline:3- and20-interest lists,390×844 viewport,3 cold/warm runs, real APIs through trusted HTTP relay. No forced provider refresh. News terminal readiness in the archived reusable harness additionally waits for the new explicit pending marker; this has no effect on old0c which has no such marker. First article and terminal are recorded separately; empty/error/skeleton states are not first articles.

| Measurement | Before | After | Conditions |
|---|---:|---:|---|
| Home count JSON decoded bytes |2,116,020|227|same2494-row published source/count170|
| Watch3 first price / all prices median |1.158s /1.158s|0.106s /0.959s|controlled900ms NVDA,40ms others;3 runs|
| Watch20 first price / all prices median |1.061s /1.061s|0.119s /0.961s|controlled900ms NVDA,40ms others;3 runs|
| News first response / all groups |1.008s /1.009s|0.006s /1.006s|real router, one cached AAPL plus controlled1s NVDA,1 provider call|
| Fresh-process import RSS,KiB |123196,125404,122884|71604,70456,71680|three alternating new processes|

Controlled Watch uses the exact deployed old client and new local production build with identical seeded lists/API responses; remote versus local shell delivery differs, so it demonstrates removal of the900ms sibling dependency rather than a general network speed ratio. All12 runs have zero runtime/unmocked request errors,3/20 actual prices, and max3/4 new requests concurrently. Raw payload/first/all/error evidence is retained. Controlled news is an ASGI router experiment, not a live provider SLA.

Live baseline cold medians: Home3 .309s, Watch3 .401s, news3 .228s; Home20 .266s, Watch20 1.266s, news20 .311s with a7.151s cold outlier. Warm visits .011–.029s. Backend memory502.4–505.8MiB out of512MiB at audit time. Post-deploy real speed and warmed memory are measured separately from these controlled results.

## Verification and release record

Final frozen source:874 Node tests and1184 deterministic browser cases pass, no skipped or flaky retries. The44 added browser cases cover exact Home count/date and independent failure/retry, first actual quote/article before held siblings, stable focus/held clicks, partial errors, account/navigation guards, final news ordering, and offline Back. Full delivery QA uses4 workers (defaultlocal3); performance measurements remain separately serialized under the same comparison conditions.

Eight related mobile scripts pass; final mobile_release/mobile_continuity/watch_quote_parity reruns also pass. Production web build exports30 direct routes. AIT artifact builds successfully; source and artifact hashes are archived. This is a build result, not a native upload or Android/iOS device approval.

Independent reviews checked publication equivalence/status, parser fixtures, canonical price guards, deadlines, owner cancellation, pending-cache exclusion, exact server-balanced12 news highlights, older in-flight reconciliation and storage lifecycles. A read-only lookup of the existing ready canonical60s API cache preserves Home/news and offline return without duplicate HTTP. Expiry, force, clear and clone isolation are retained; partial/error payloads never become ready hits. Explicit Watch retry bypasses only failed HTTP200-error singleton client entries, keeping successful15s keys and the ordinary backend endpoint/provider freshness. RED tests reproduced both failures before fixes; final browser regressions pass.

Backend PR168 merged to f1e4e5f1df3cb72d3fc23315ae8170b4c1490aa4.1207 Python tests +43 subtests,52 Node contracts and generated bundle check pass;80 existing deprecation warnings. Exact-main CI40182960418 passes check,7 mobile and4 production suites. Auto-deploy generated no event; authorized manual dep-dbet7bavcj2c73e38dog went live10:03:36Z. Public health revision, release asset hashes, summary227bytes/count170/date2026-10-23 and real partial news verified.

The summary retains the existing remote-publication freshness check. First post-start request5.227s, later revalidation.918s and cached response.204s were observed; the byte reduction is not a universal handler-latency claim. Production memory after restart/warm-up stayed around337MiB in10:25–10:35 samples; the entire difference from the old~511MiB process cannot be attributed to lazy imports. Controlled import RSS isolates the~50MiB saving.

This commit records pre-deployment client evidence. Client release follows the existing exact-main CI and promotion gate; actual Render commit/assets, real first/all timings, request counts and UI value checks are verified after publication and recorded in the delivery report. Render web deployment and native Toss release remain separate.
