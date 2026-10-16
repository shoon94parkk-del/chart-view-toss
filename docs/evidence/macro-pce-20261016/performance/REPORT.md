# Chart View Toss local before/after performance

- Baseline: exact frontend source archive `637507cd4a5ab892e25510772a0610756447f8c2` (PR135).
- Chromium mobile 390 × 844; a fresh context for each observation; service workers blocked; local static server uses no-store.
- Same immutable captured/contract API payloads and same captured/contract fixtures, 80 ms artificial API latency per request; external requests blocked.
- 7 successful measured samples per route, after one discarded warm-up for each route and build. CPU throttling: none.
- Time starts at navigation and ends when actual numeric data is present. Error, missing data, runtime error, unmocked API or overflow cannot be counted as a fast success.
- Startup request counts include all requests that settle in the startup quiet window, before the optional home scroll drill; they are not a millisecond snapshot at first content.
- Local small-sample median/max only. These values are not a production SLA, provider response-time claim or a statistically robust p95.

| Visible content | Before median / max | After median / max | Median change | Startup API requests |
| --- | ---: | ---: | ---: | ---: |
| home | 139 / 150 ms | 134 / 166 ms | -5 ms (-3.6%) | 9 → 9 |
| detail/005930.KS | 292 / 305 ms | 307 / 362 ms | +15 ms (+5.1%) | 10 → 10 |
| macro | 239 / 256 ms | 232 / 244 ms | -7 ms (-2.9%) | 2 → 2 |

- Expanded inflation graph readiness: before median 312 ms → after median 309 ms / max 323 ms, from navigation. The baseline has four indicator slots; the release has six slots and the optional comparison display.
- Main JavaScript: 327,103 B / gzip 108,950 B → 327,103 B / gzip 108,947 B.
- Existing current-price API remains unchanged in this release. Any sub-second local median change reflects rendering/build variance and must not be advertised as a quote-provider speed gain.
- Both builds receive the same six-series macro fixture, isolating UI work from network payload differences. The baseline ignores PCE. This comparison does not hide the additional real macro payload: record the separate decoded payload-size delta. Home receives no new history.
- All measured samples completed successfully; page runtime errors, unmocked external/API requests and horizontal overflow were zero.

Reproduce:

```bash
# Run from the frontend checkout after npm ci; HARNESS is this directory.
node "$HARNESS/measure.mjs" before "$BASELINE_DIST" 7
node "$HARNESS/measure.mjs" after "$RELEASE_DIST" 7
node "$HARNESS/compare.mjs"
```

Files: `before.json`, `after.json`, `comparison.json`, immutable `fixture-macro.json`, baseline build log and source `measure.mjs`/`compare.mjs`.
