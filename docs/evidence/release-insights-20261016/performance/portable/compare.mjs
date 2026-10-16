import { readFile, writeFile } from 'node:fs/promises';

const read = async name => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));
const before = await read('./before.json'), after = await read('./after.json');
if (before.fixture.sha256 !== after.fixture.sha256) throw Error('Before/after fixtures differ');
if (JSON.stringify(before.conditions) !== JSON.stringify(after.conditions)) throw Error('Before/after measurement conditions differ');
const round = value => Math.round(value * 10) / 10;
const compared = after.summaries.map(next => {
  const prev = before.summaries.find(row => row.route === next.route);
  if (!prev || prev.successfulSamples !== prev.samples || next.successfulSamples !== next.samples) throw Error(`Incomplete successful samples: ${next.route}`);
  return { route: next.route, samples: next.samples, beforeMedianMs: round(prev.medianMs), afterMedianMs: round(next.medianMs),
    medianChangeMs: round(next.medianMs - prev.medianMs), medianChangePercent: round((next.medianMs / prev.medianMs - 1) * 100),
    beforeMaxMs: round(prev.maxMs), afterMaxMs: round(next.maxMs),
    beforeStartupRequestCounts: prev.initialRequestCounts, afterStartupRequestCounts: next.initialRequestCounts,
    beforeStartupDataPaths: prev.initialDataPaths, afterStartupDataPaths: next.initialDataPaths,
    beforeStartupBytes: prev.initialDataByteCounts, afterStartupBytes: next.initialDataByteCounts,
    afterInflationMedianMs: next.inflationMedianMs ? round(next.inflationMedianMs) : null, afterInflationMaxMs: next.inflationMaxMs ? round(next.inflationMaxMs) : null,
    overflowPx: Math.max(...prev.overflowPx, ...next.overflowPx) };
});
const summary = { comparedAt: new Date().toISOString(), conditions: after.conditions, fixtureSha256: after.fixture.sha256,
  scope: 'Local browser rendering and request-count comparison against the PR134 source archive. Same API data and fixed 80ms response delay in both versions. This does not measure production provider latency or quote freshness.',
  baselineSourceCommit: before.baselineSourceCommit, beforeMain: before.main, afterMain: after.main, compared };
await writeFile(new URL('./comparison.json', import.meta.url), JSON.stringify(summary, null, 2));
const lines = [
  '# Chart View Toss local before/after performance', '',
  `- Baseline: exact frontend source archive \`${before.baselineSourceCommit}\` (PR134).`,
  '- Chromium mobile 390 × 844; a fresh context for each observation; service workers blocked; local static server uses no-store.',
  `- Same immutable captured/contract API payloads and ${after.conditions.API}; external requests blocked.`,
  `- ${after.conditions.iterationsPerRoute} successful measured samples per route, after one discarded warm-up for each route and build. CPU throttling: none.`,
  '- Time starts at navigation and ends when actual numeric data is present. Error, missing data, runtime error, unmocked API or overflow cannot be counted as a fast success.',
  '- Startup request counts include all requests that settle in the startup quiet window, before the optional home scroll drill; they are not a millisecond snapshot at first content.',
  '- Local small-sample median/max only. These values are not a production SLA, provider response-time claim or a statistically robust p95.', '',
  '| Visible content | Before median / max | After median / max | Median change | Startup API requests |',
  '| --- | ---: | ---: | ---: | ---: |',
  ...compared.map(row => `| ${row.route} | ${row.beforeMedianMs} / ${row.beforeMaxMs} ms | ${row.afterMedianMs} / ${row.afterMaxMs} ms | ${row.medianChangeMs > 0 ? '+' : ''}${row.medianChangeMs} ms (${row.medianChangePercent > 0 ? '+' : ''}${row.medianChangePercent}%) | ${[...new Set(row.beforeStartupRequestCounts)].join('/')} → ${[...new Set(row.afterStartupRequestCounts)].join('/')} |`),
  '', `- New CPI/core CPI/PPI/core PPI graph readiness: median ${round(after.summaries.find(row => row.route === 'macro').inflationMedianMs)} ms / max ${round(after.summaries.find(row => row.route === 'macro').inflationMaxMs)} ms, from navigation. The baseline has no equivalent graph.`,
  `- Main JavaScript: ${before.main.map(row => `${row.bytes.toLocaleString('en-US')} B / gzip ${row.gzipBytes.toLocaleString('en-US')} B`).join(', ')} → ${after.main.map(row => `${row.bytes.toLocaleString('en-US')} B / gzip ${row.gzipBytes.toLocaleString('en-US')} B`).join(', ')}.`,
  '- Existing current-price API remains unchanged in this release. Any sub-second local median change reflects rendering/build variance and must not be advertised as a quote-provider speed gain.',
  '- Both builds receive the enriched macro fixture (same bytes), isolating UI work from network payload differences. The enriched macro payload appears only on the macro route; the home fixture remains unchanged.',
  '- All measured samples completed successfully; page runtime errors, unmocked external/API requests and horizontal overflow were zero.', '',
  'Reproduce:', '', '```bash',
  '# Run from the frontend checkout after npm ci; HARNESS is this directory.',
  'node "$HARNESS/measure.mjs" before "$BASELINE_DIST" 7',
  'node "$HARNESS/measure.mjs" after "$RELEASE_DIST" 7',
  'node "$HARNESS/compare.mjs"', '```', '',
  'Files: `before.json`, `after.json`, `comparison.json`, immutable `fixture-macro.json`, baseline build log and source `measure.mjs`/`compare.mjs`.', '',
];
await writeFile(new URL('./REPORT.md', import.meta.url), lines.join('\n'));
console.log(JSON.stringify(summary, null, 2));
