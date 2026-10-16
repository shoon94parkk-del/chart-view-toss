# Portable controlled performance harness

This directory is a portable variant of the exact executed harness. The only functional-location differences are the Playwright package lookup, local copied fixtures, and refusal to regenerate the immutable macro fixture. Measurement predicates, timings, context settings, request handling, and sample reporting are identical to the executed version.

Requires the project's Node 24, `npm ci`, and installed Chromium Playwright browser/system dependencies. No external provider API, key, proxy, paid service or production request is required. Run the commands from the frontend checkout so Playwright resolves from its package.json, or set `PERF_PLAYWRIGHT_PACKAGE=/absolute/path/to/frontend/package.json`.

Use Git worktrees to build two isolated versions. The recorded baseline is the exact PR135 commit `637507cd4a5ab892e25510772a0610756447f8c2`, rather than the older production deploy. Use the frontend release commit stated in the release report for the after checkout. Run only one browser measurement at a time, with other build/test jobs stopped, to limit CPU interference.

```bash
# In each isolated checkout, after npm ci:
npx vite build

# From a frontend checkout; HARNESS is this portable directory:
node "$HARNESS/measure.mjs" before /absolute/path/to/baseline/dist 7
node "$HARNESS/measure.mjs" after /absolute/path/to/release/dist 7
node "$HARNESS/compare.mjs"
```

Outputs are written next to these scripts: `before.json`, `after.json`, `comparison.json`, and `REPORT.md`. The comparison script refuses different fixture hashes or conditions and rejects incomplete successful samples. Each route gets one discarded warm-up then seven samples, each in a new browser context. Both builds receive the same captured macro payload. Startup request counts include all requests that settle in the startup quiet window before optional home scroll; an error is never a fast success. The clock is fixed to 2026-10-16, while performance.now remains monotonic.

The copied endpoint contracts are synthetic QA fixtures from the baseline test suite. The macro file combines the captured public production macro response with the newly collected official FRED/BLS cache. It contains only public information and no personal notes, search terms, watchlist contents or secrets; the three seeded companies are fixed QA examples. No data is transmitted externally.

Interpret local median/max and small sub-second differences cautiously. This experiment isolates render/request effects; it does not measure real provider, internet or Render cold-start latency, prove p95, or show a current-price API speed gain.

PCE extension run: both versions already contain the inflation graph. The readiness predicate accepts at least four fixed slots, so baseline four and release six are both measured; both phases await a real rendered inflation value. The shared fixture includes six series; the baseline ignores the optional PCE rows. Compare payload-size differences separately. Run both phases after stopping other browser/build/test work; preliminary runs made during integration are excluded from the final report.
