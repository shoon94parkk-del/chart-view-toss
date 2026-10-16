# Chart View Toss local before/after performance

- Baseline: exact frontend source archive `1dd69ac67412980064db76ebe35b97e914934a50` (PR134).
- Chromium mobile 390 × 844; a fresh context for each observation; service workers blocked; local static server uses no-store.
- Same immutable captured/contract API payloads and same captured/contract fixtures, 80 ms artificial API latency per request; external requests blocked.
- 7 successful measured samples per route, after one discarded warm-up for each route and build. CPU throttling: none.
- Time starts at navigation and ends when actual numeric data is present. Error, missing data, runtime error, unmocked API or overflow cannot be counted as a fast success.
- Startup request counts include all requests that settle in the startup quiet window, before the optional home scroll drill; they are not a millisecond snapshot at first content.
- Local small-sample median/max only. These values are not a production SLA, provider response-time claim or a statistically robust p95.

| Visible content | Before median / max | After median / max | Median change | Startup API requests |
| --- | ---: | ---: | ---: | ---: |
| home | 132 / 141 ms | 133 / 214 ms | +1 ms (+0.8%) | 9 → 9 |
| detail/005930.KS | 276 / 331 ms | 280 / 370 ms | +4 ms (+1.4%) | 10 → 10 |
| macro | 201 / 238 ms | 220 / 248 ms | +19 ms (+9.5%) | 2 → 2 |

- New CPI/core CPI/PPI/core PPI graph readiness: median 269 ms / max 305 ms, from navigation. The baseline has no equivalent graph.
- Main JavaScript: 325,948 B / gzip 108,615 B → 327,103 B / gzip 108,943 B.
- Existing current-price API remains unchanged in this release. Any sub-second local median change reflects rendering/build variance and must not be advertised as a quote-provider speed gain.
- Both builds receive the enriched macro fixture (same bytes), isolating UI work from network payload differences. The enriched macro payload appears only on the macro route; the home fixture remains unchanged.
- All measured samples completed successfully; page runtime errors, unmocked external/API requests and horizontal overflow were zero.

Reproduce:

```bash
source /workspace/scratch/chartview-qa-env.sh
node /workspace/research/release-insights-20261016/performance/measure.mjs before /workspace/research/release-insights-20261016/performance/baseline-dist 7
node /workspace/research/release-insights-20261016/performance/measure.mjs after /workspace/chartview-audit-20261015/dist 7
node /workspace/research/release-insights-20261016/performance/compare.mjs
```

Files: `before.json`, `after.json`, `comparison.json`, immutable `fixture-macro.json`, baseline build log and source `measure.mjs`/`compare.mjs`.
