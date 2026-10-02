# No-repeat regression policy

Last updated: 2026-10-02

This file exists because Chart View Toss has repeatedly revisited problems that had already been fixed. Chat memory is not an engineering control. Treat this document, `AGENTS.md`, regression tests, and the decision log as the durable source of truth.

## Mandatory pre-edit check

Before changing performance, quote freshness, caching, Home/detail navigation, heatmaps, valuation, or loading behavior:

1. Search `docs/decision-log.md`, `docs/regression-guardrails.md`, `docs/project-memory.md`, tests, and recent commits for the same symptom.
2. Classify the task as exactly one of:
   - **new behavior**
   - **new bug**
   - **regression of a previously fixed behavior**
3. If it is a regression, restore/preserve the known-good contract first. Do not redesign the subsystem as if it were new.
4. Identify the existing regression test that should have caught it. If none exists, add one before calling the fix complete.
5. Measure against the last known-good baseline with the same harness/viewport. Do not compare unlike measurements.
6. Do not trade data correctness for apparent speed. Fast cached/previous data may paint first, but canonical fresh validation must still run when the contract requires it.
7. Update this policy/guardrails only when the invariant itself changes intentionally.

## Previously fixed contracts that must not be reimplemented from scratch

### Current quote convergence
- Home, Watchlist, full heatmap, valuation price cards, and Detail converge through the timestamp-guarded live quote path.
- Older device/browser/API cache must never overwrite a newer in-session observation.
- Detail `fresh=true` remains a one-symbol canonical revalidation path. Do not weaken this contract merely to make first paint faster.
- First paint may use fast Home/market/screener data, then fresh data may supersede it.
- Returning Home after Detail must not roll the quote backward.

Relevant frontend files include:
- `src/main.js`
- `src/liveQuoteStore.js`
- `src/homeFastCache.js`
- `src/detailPresentation.js`
- `src/api.js`
- `src/liveHomeSync.js`

### Heatmap parity and availability
- Home and full heatmap overlapping symbols must show the same newest price/change.
- Sector heatmap UI must remain visible even when its data request is loading or failed; loading/error/retry belongs inside the mounted section.
- Full heatmap must not disappear because one provider or optional module fails.
- Heatmap work must remain non-blocking for initial Home paint.

### Detail first paint
- A direct Detail route must not wait for slow optional financial/news/provider calls before showing an available price.
- Korean Detail may seed from dated screener/Home data, U.S. Detail may seed from Home snapshot, and index Detail may seed from market/Home data.
- These are presentation fallbacks only. They do not replace canonical fresh validation.

### Valuation / valuation-band performance
- Expensive valuation-band data is expected to use backend caching/warming rather than recompute on every client visit.
- Do not remove backend prewarming/singleflight/cache merely to simplify code.
- A slow optional valuation section must not delay the basic Detail quote/chart.

## Reference production timings

These are **single-run reference measurements, not SLAs**. They are useful for regression detection only when measured with the same production Chromium 390x844 harness.

2026-10-02 post-fix reference:
- Home visible: ~0.55 s
- Samsung Electronics Detail price: ~0.54 s
- NVIDIA Detail price: ~0.95 s
- KOSPI index Detail price: ~1.93 s
- Valuation band: ~0.90 s
- Full heatmap: ~0.90 s

If a related change makes one of these materially slower, investigate whether an old blocking request/cache path was reintroduced before adding another optimization layer.

## Completion gate for a repeated-problem area

Do not report completion until all are true:
- previous fix/decision was checked;
- regression vs new bug was explicitly identified;
- relevant regression test passes;
- production revision is the exact tested revision;
- same-harness production timing/behavior was checked where performance is involved;
- no newer quote is rolled back by cache;
- optional slow modules do not block primary content.

If an intentional redesign conflicts with this file, update the decision log and guardrails in the same commit.
