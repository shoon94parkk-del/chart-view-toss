// Deterministic, local-only before/after diagnostic. Does not dispatch native analytics.
// Run each build serially, after build completion; use a fresh context per sample.
import { chromium } from 'playwright';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { payloadFor, quotes } from '../tests/e2e/data.mjs';
import { performanceOptions, summarizeRequests, summarizeMeasurements } from './performance-harness.mjs';
import { performanceOutcome, dataRequestPath } from './performance-outcome.mjs';

const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  if (!['--url', '--source-dir', '--dist-dir', '--output', '--runs'].includes(key) || !process.argv[index + 1]) {
    throw new Error('Use --url, --source-dir, --dist-dir, --output, --runs with values');
  }
  args.set(key, process.argv[index + 1]);
}
const base = new URL(args.get('--url') || process.env.BASE_URL || process.env.PERF_BASE_URL || 'http://127.0.0.1:4173');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) || !['http:', 'https:'].includes(base.protocol) || base.search || base.hash || base.username || base.password) {
  throw new Error('The diagnostic requires a local, anonymous URL without a query or hash');
}
const sourceRoot = path.resolve(args.get('--source-dir') || process.env.PERF_SOURCE_DIR || harnessRoot);
const distRoot = path.resolve(args.get('--dist-dir') || process.env.PERF_DIST_DIR || path.join(sourceRoot, 'dist'));
const output = args.get('--output') || process.env.PERF_OUTPUT;
if (!output) throw new Error('Pass --output or PERF_OUTPUT');
const options = performanceOptions({ ...process.env, PERF_RUNS: args.get('--runs') || process.env.PERF_RUNS || '5', PERF_PHASES: 'cold' });
if (![5, 10].includes(options.runs)) throw new Error('Use 5 or 10 runs per route for this bounded diagnostic');
const routes = ['home', 'watch', 'detail/005930.KS', 'chart', 'exports', 'exports/memory', 'exports/cosmetics'];
const round = value => Math.round(value * 100) / 100;
const hash = buffer => createHash('sha256').update(buffer).digest('hex');

async function treeFiles(root, relative = '') {
  const files = [];
  for (const entry of (await readdir(path.join(root, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const next = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await treeFiles(root, next));
    else if (entry.isFile()) files.push(next);
  }
  return files;
}
async function fileManifest(root, files) {
  return Promise.all([...new Set(files)].sort().map(async relative => {
    const content = await readFile(path.join(root, relative));
    return { path: relative, bytes: content.length, sha256: hash(content) };
  }));
}
async function manifests() {
  const sourceFiles = await treeFiles(path.join(sourceRoot, 'src'));
  const source = await fileManifest(sourceRoot, ['index.html', 'package.json', 'package-lock.json', 'apps-in-toss.config.ts', 'scripts/export-preview-routes.mjs', ...sourceFiles.map(file => `src/${file}`)]);
  const harness = await fileManifest(harnessRoot, ['scripts/exposure-performance.mjs', 'scripts/performance-harness.mjs', 'scripts/performance-outcome.mjs', 'tests/e2e/data.mjs', 'tests/fixtures/export-recovery.mjs']);
  const dist = await fileManifest(distRoot, await treeFiles(distRoot));
  const html = await readFile(path.join(distRoot, 'index.html'), 'utf8');
  const entryPath = html.match(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/)?.[1];
  if (!entryPath) throw new Error('Built index.html has no entry script');
  const entry = await readFile(path.join(distRoot, entryPath.replace(/^\//, '')));
  return {
    sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8' }).trim(),
    sourceRevisionMeaning: 'Git HEAD identifies the base commit; sourceTreeSha256 identifies measured application/config working-tree contents and distTreeSha256 identifies all built artifacts',
    sourceTreeSha256: hash(JSON.stringify(source)), sourceFiles: source,
    harnessSha256: hash(JSON.stringify(harness)), harnessFiles: harness,
    distTreeSha256: hash(JSON.stringify(dist)), distFiles: dist,
    initialJavaScript: { path: entryPath, decodedBytes: entry.length, gzipBytes: gzipSync(entry).length, sha256: hash(entry), gzipMeaning: 'node:zlib default gzip; build artifact comparison, not observed wire transfer' },
  };
}

// A numeric, visible data result is required. Skeleton removal and error/empty
// panels never pass. Scope is identical for both builds and the SDK stays in web
// preview mode (isAppsInTossRuntime=false); no account identity or native adapter.
function primaryReady(route) {
  const visible = node => node && !node.closest('[hidden]') && node.getClientRects().length > 0;
  const nodes = selector => [...document.querySelectorAll(selector)].filter(visible);
  const numeric = node => /\d/.test(node.textContent);
  if (route === 'home') return nodes('#market-card .quote-card:not(.market-missing):not(.market-card-loading) strong').filter(numeric).length >= 4 && nodes('#home-daily-heatmap .skeleton').length === 0;
  if (route === 'watch') return nodes('#watch-rich-list .watch-card-price strong').filter(numeric).length === 3 && nodes('#watch-rich-list .skeleton').length === 0;
  if (route.startsWith('detail/')) return nodes('#detail-price .quote-main > div:first-child strong').some(numeric);
  if (route === 'chart') return nodes('#chart-table-wrap .return-table button b').filter(numeric).length === 3 && !String(document.querySelector('#chart-status')?.textContent || '').includes('불러오는 중');
  const panel = nodes('[data-export-panel][data-load-state="ready"]')[0];
  if (!panel) return false;
  if (route === 'exports') return panel.dataset.exportPanel === 'overview' && nodes('#export-momentum-map .export-momentum-list button').length > 0;
  if (route === 'exports/memory') return panel.dataset.exportPanel === 'semiconductor' && nodes('[data-export-panel="semiconductor"] [data-testid="semiconductor-month"]').length === 12;
  if (route === 'exports/cosmetics') return panel.dataset.exportPanel === 'cosmetics' && nodes('[data-export-panel="cosmetics"] [data-testid="export-month"]').length === 36;
  return false;
}

function requestCollector(page) {
  const rows = [], pending = new Set(), markers = new WeakMap();
  page.on('request', request => {
    const pathname = dataRequestPath(request.url());
    if (!pathname) return;
    const cleanPath = pathname.replace(/^\/backend/, '');
    const row = { key: cleanPath, path: cleanPath, method: request.method(), state: 'pending', status: null, bodyComplete: false, ms: null, decodedBodyBytes: null };
    rows.push(row); markers.set(request, { row, started: performance.now() });
  });
  page.on('response', response => {
    const marker = markers.get(response.request());
    if (!marker) return;
    const work = (async () => {
      marker.row.status = response.status();
      const error = await response.finished().catch(() => true);
      if (error) { marker.row.state = 'failed'; return; }
      try {
        marker.row.decodedBodyBytes = (await response.body()).length;
        marker.row.ms = round(performance.now() - marker.started);
        marker.row.bodyComplete = true; marker.row.state = 'complete';
      } catch { marker.row.state = 'failed'; }
    })();
    pending.add(work); void work.finally(() => pending.delete(work));
  });
  page.on('requestfailed', request => {
    const marker = markers.get(request);
    if (marker) marker.row.state = /abort|cancel/i.test(request.failure()?.errorText || '') ? 'canceled' : 'failed';
  });
  return { rows, finishObservedResponses: () => Promise.all([...pending]) };
}

const manifest = await manifests();
const startedAt = new Date().toISOString();
const browser = await chromium.launch({ headless: true, args: ['--disable-background-networking', '--dns-prefetch-disable', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1, EXCLUDE [::1]'] });
const results = [];
try {
  for (let run = 1; run <= options.runs; run++) {
    for (const route of routes) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
      const page = await context.newPage();
      const collector = requestCollector(page);
      const unexpectedPaths = [], errors = [], assetResponses = new Set();
      let servedEntrySha256 = null;
      page.on('pageerror', () => errors.push('pageerror'));
      page.on('crash', () => errors.push('pagecrash'));
      page.on('response', response => {
        if (new URL(response.url()).origin !== base.origin || new URL(response.url()).pathname !== manifest.initialJavaScript.path) return;
        const work = response.body().then(body => { servedEntrySha256 = hash(body); }).catch(() => errors.push('entry-body-incomplete'));
        assetResponses.add(work); void work.finally(() => assetResponses.delete(work));
      });
      await page.clock.setFixedTime(new Date('2026-10-07T06:35:00Z'));
      await context.addInitScript(lists => {
        if (!['http:', 'https:'].includes(location.protocol)) return;
        localStorage.setItem('chartview-toss-watchlist-v1', JSON.stringify(lists.watchlist));
        localStorage.setItem('chartview-toss-selected-v1', JSON.stringify(lists.selected));
      }, { watchlist: quotes.map(row => ({ symbol: row.ticker, name: row.name })), selected: quotes.map(row => row.ticker) });
      await context.route('**/*', async intercepted => {
        const url = new URL(intercepted.request().url());
        const pathname = url.pathname.replace(/^\/backend/, '');
        if (dataRequestPath(url.href)) {
          try { return await intercepted.fulfill({ json: payloadFor(url) }); }
          catch { unexpectedPaths.push(pathname); return intercepted.fulfill({ status: 500, json: { detail: 'Unmocked deterministic data endpoint' } }); }
        }
        if (url.origin !== base.origin) {
          unexpectedPaths.push(pathname); return intercepted.abort('blockedbyclient');
        }
        return intercepted.continue();
      });
      const start = performance.now();
      let outcome = 'timeout', elapsedMs = null, navigationStatus = null, failureCategory = null;
      try {
        const response = await page.goto(new URL(`/#${route}`, base).href, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs });
        navigationStatus = response.status();
        await page.waitForFunction(primaryReady, route, { timeout: options.timeoutMs, polling: 50 });
        elapsedMs = round(performance.now() - start);
        outcome = await page.evaluate(performanceOutcome, route);
      } catch (error) {
        elapsedMs = round(performance.now() - start);
        failureCategory = error.name === 'TimeoutError' ? 'readiness-or-navigation-timeout' : 'navigation-or-readiness-error';
      }
      const requestCountAtPrimary = collector.rows.length;
      await collector.finishObservedResponses();
      await Promise.all([...assetResponses]);
      const diagnostics = await page.evaluate(() => ({
        aitRuntime: document.documentElement.dataset.aitRuntime,
        overflow: document.documentElement.scrollWidth > innerWidth,
        resourceTiming: 'unavailable: Playwright fixed clock substitutes browser Performance; no loaded-resource byte/absence claim',
      })).catch(() => ({ aitRuntime: 'unknown', resourceTiming: 'unavailable', overflow: null }));
      if (navigationStatus !== 200 || servedEntrySha256 !== manifest.initialJavaScript.sha256 || diagnostics.aitRuntime !== 'false' || unexpectedPaths.length || errors.length) outcome = 'measurement_error';
      const sample = { route, run, coldMs: elapsedMs, coldReadyState: outcome, usableDataMs: outcome === 'ready' ? elapsedMs : null,
        navigationStatus, requestCountAtPrimary, api: summarizeRequests(collector.rows), diagnostics,
        servedEntrySha256, failureCategory, errors, unexpectedPaths };
      results.push(sample);
      console.log(JSON.stringify({ route, run, coldMs: elapsedMs, outcome, apiCalls: collector.rows.length }));
      await page.unrouteAll({ behavior: 'ignoreErrors' });
      await context.close();
    }
  }
} finally { await browser.close(); }

const nearestRank = (values, percentile) => values.length ? values[Math.ceil(percentile * values.length) - 1] : null;
const summary = summarizeMeasurements(results, ['cold']).map(row => {
  const ready = results.filter(sample => sample.route === row.route && sample.coldReadyState === 'ready').map(sample => sample.coldMs).sort((a, b) => a - b);
  const samples = results.filter(sample => sample.route === row.route);
  const paths = [...new Set(samples.flatMap(sample => sample.api.map(request => request.path)))].sort();
  return { ...row, p50ReadyMs: row.medianReadyMs, p95ReadyMs: nearestRank(ready, .95),
    apiRequests: paths.map(pathname => ({ path: pathname, countsPerRun: samples.map(sample => sample.api.find(request => request.path === pathname)?.calls || 0) })) };
});
const report = {
  schemaVersion: 1, project: 'github:shoon94parkk-del/chart-view-toss', measuredAt: new Date().toISOString(), startedAt,
  baseUrl: base.origin, nodeVersion: process.version, browser: 'Chromium', browserVersion: browser.version(), viewport: { width: 390, height: 844 },
  runsPerRoute: options.runs, phases: ['cold'], timeoutMs: options.timeoutMs, pollingMs: 50, fixtureDate: '2026-10-07T06:35:00Z',
  methodology: {
    cold: 'Fresh Chromium context for each route/run, empty browser/app caches, same deterministic data fixture; host process and browser binary stay warm',
    readiness: 'Visible numeric primary data; existing performanceOutcome excludes unavailable, empty and error placeholders; optional sections do not delay detail price',
    percentiles: 'p50 is median; p95 is nearest rank. With 5 or 10 samples p95 equals sample maximum; no production percentile or SLA claim',
    networking: 'All data endpoints fulfilled by tests/e2e/data.mjs payloadFor. Only the selected loopback origin may continue. No live providers, telemetry or LLM APIs',
    runtime: 'Anonymous web preview: SDK runtime is false and native analytics remains inactive. No user identity, query, credentials, notes or real interest list is collected',
    requestCounts: 'Path-only counts from navigation to primary readiness plus diagnostic capture; requestCountAtPrimary records the boundary; observed response bodies complete without fixed sleeps',
    bytes: 'Initial entry JS comes from the built dist; response SHA must match. Local gzip comparison is not observed wire transfer or total loaded-resource bytes',
    limits: ['Local desktop Chromium viewport, not Android/iOS native Toss', 'No mobile network/CPU throttling or server cold start', '50ms readiness polling and host scheduling can move small latency differences', 'No fixed wait or network-idle barrier; optional requests initiated after primary capture may be outside counts and optional bodies can remain pending/null', 'Playwright routing disables HTTP cache identically in both builds', 'Fixed fixture Date uses Playwright clock, which substitutes browser Performance/timers; elapsed primary-readiness time is measured by real Node performance.now, resource timing is unavailable', 'Readiness validates primary data presence rather than every optional section or every fixture value'],
  },
  command: ['node', 'scripts/exposure-performance.mjs', '--url', base.origin, '--source-dir', sourceRoot, '--dist-dir', distRoot, '--runs', String(options.runs), '--output', output],
  ...manifest, summary, results,
};
await mkdir(path.dirname(path.resolve(output)), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output, successfulSamples: results.filter(row => row.coldReadyState === 'ready').length, totalSamples: results.length, initialJavaScript: manifest.initialJavaScript, summary }));
if (results.some(row => row.coldReadyState !== 'ready')) process.exitCode = 1;
