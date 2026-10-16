import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { payloadFor, quotes } from './fixtures/data.mjs';
// Run from the frontend checkout after npm ci, or set PERF_PLAYWRIGHT_PACKAGE.
const { chromium } = createRequire(resolve(process.env.PERF_PLAYWRIGHT_PACKAGE || 'package.json'))('playwright');

const [phase, distArg, iterationsArg = '7'] = process.argv.slice(2);
if (!['before', 'after'].includes(phase) || !distArg) throw Error('Usage: measure.mjs before|after DIST [iterations]');
const dist = resolve(distArg), iterations = Number(iterationsArg), output = new URL('./', import.meta.url);
const timeoutMs = 20000, dataDelayMs = 80;
const capturePath = new URL('./fixture-macro.json', import.meta.url);
if (!existsSync(capturePath)) throw Error('Required immutable fixture-macro.json is missing');
const capturedMacro = JSON.parse(await readFile(capturePath, 'utf8'));
const macroBytes = Buffer.from(JSON.stringify(capturedMacro));
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let file = resolve(dist, `.${decodeURIComponent(url.pathname)}`);
    if (!file.startsWith(dist + '/') && file !== dist) throw Error('Invalid path');
    if (url.pathname.endsWith('/')) file = resolve(file, 'index.html');
    if (!existsSync(file) && !extname(url.pathname)) file = resolve(dist, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

async function measure(routeName, iteration) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
    locale: 'ko-KR', timezoneId: 'Asia/Seoul', isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await context.newPage(), requests = [], errors = [], unexpected = [], failed = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', req => failed.push({ path: new URL(req.url()).pathname, error: req.failure()?.errorText }));
  await page.clock.setFixedTime(new Date('2026-10-16T03:00:00Z'));
  await context.addInitScript(({ lists, routeName }) => {
    if (!['http:', 'https:'].includes(location.protocol)) return;
    localStorage.setItem('chartview-toss-watchlist-v1', JSON.stringify(lists));
    localStorage.setItem('chartview-toss-selected-v1', JSON.stringify([lists[0].symbol]));
    window.__releasePerf = { ready: {}, longTasks: [] };
    const check = () => {
      const r = window.__releasePerf.ready;
      if (!r.primary) {
        const ready = routeName === 'home'
          ? /3,500/.test(document.querySelector('#market-card')?.textContent || '')
          : routeName === 'detail/005930.KS'
            ? /103,700원/.test(document.querySelector('#detail-price:not(.skeleton)')?.textContent || '')
            : document.querySelectorAll('#macro-groups .macro-tile').length === 16;
        if (ready) r.primary = performance.now();
      }
      if (routeName === 'macro' && !r.inflation && document.querySelectorAll('[data-inflation-series]').length >= 4 && document.querySelector('.inflation-chart-svg') && /[0-9]/.test(document.querySelector('[data-inflation-value]')?.textContent || '')) r.inflation = performance.now();
      if (routeName === 'home' && !r.briefing && document.querySelectorAll('.home-change-card').length >= 2) r.briefing = performance.now();
    };
    new MutationObserver(check).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    try { new PerformanceObserver(list => {
      for (const entry of list.getEntries()) window.__releasePerf.longTasks.push({ startMs: entry.startTime, ms: entry.duration });
    }).observe({ type: 'longtask', buffered: true }); } catch {}
  }, { lists: quotes.map(row => ({ symbol: row.ticker, name: row.name })), routeName });
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname.replace(/^\/backend/, '');
    if (path.startsWith('/api/') || path.startsWith('/static/data/')) {
      const entry = { path, query: url.search, method: req.method(), startMs: Date.now(), status: 'pending', bytes: null };
      requests.push(entry);
      try {
        const payload = path === '/api/macro' ? capturedMacro : payloadFor(url);
        const body = JSON.stringify(payload);
        await new Promise(resolve => setTimeout(resolve, dataDelayMs));
        await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body });
        Object.assign(entry, { status: 200, bytes: Buffer.byteLength(body), endMs: Date.now() });
      } catch (error) {
        unexpected.push({ path, message: error.message });
        entry.status = 'fixture_error';
        await route.fulfill({ status: 500, json: { detail: error.message } });
      }
      return;
    }
    if (url.origin !== base) { unexpected.push({ path, message: `External request ${url.origin}` }); return route.abort('blockedbyclient'); }
    return route.continue();
  });
  let state = 'ready';
  try {
    const response = await page.goto(`${base}/#${routeName}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    if (response.status() !== 200) throw Error(`HTML status ${response.status()}`);
    await page.waitForFunction(() => Boolean(window.__releasePerf?.ready.primary), null, { timeout: timeoutMs, polling: 10 });
    if (routeName === 'macro') await page.waitForFunction(() => Boolean(window.__releasePerf?.ready.inflation), null, { timeout: timeoutMs, polling: 10 });
    // Wait for all startup API responses; this is a quiet-window check, not product delay.
    await page.waitForFunction(() => [...document.querySelectorAll('#market-card .market-card-loading,#macro-groups .skeleton')].length === 0, null, { timeout: timeoutMs, polling: 10 });
    for (let quiet = 0, count = -1; quiet < 3;) {
      await new Promise(resolve => setTimeout(resolve, 50));
      if (requests.every(row => row.status !== 'pending') && requests.length === count) quiet++; else quiet = 0;
      count = requests.length;
    }
  } catch (error) { state = 'failed'; errors.push(error.message); }
  const result = await page.evaluate(() => ({ ...window.__releasePerf,
    overflowPx: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    resources: performance.getEntriesByType('resource').filter(row => /\.(js|css)(\?|$)/.test(row.name)).map(row => ({ path: new URL(row.name).pathname, decodedBytes: row.decodedBodySize, durationMs: row.duration })),
    fcpMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
  }));
  const beforeDrillRequests = requests.map(row => ({ ...row }));
  if (routeName === 'home' && state === 'ready') {
    try {
      const scrollStartMs = await page.evaluate(() => performance.now());
      await page.locator('.home-changes').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => Boolean(window.__releasePerf?.ready.briefing), null, { timeout: timeoutMs, polling: 10 });
      result.briefingDrill = await page.evaluate(startMs => ({ msFromScroll: Math.max(0, window.__releasePerf.ready.briefing - startMs), cards: document.querySelectorAll('.home-change-card').length, states: [...document.querySelectorAll('[data-publication-state]')].map(row => row.dataset.publicationState) }), scrollStartMs);
    } catch (error) { state = 'failed'; errors.push(error.message); }
  }
  if (errors.length || unexpected.length || failed.length || result.overflowPx > 1) state = 'failed';
  const row = { phase, route: routeName, iteration, state, ...result, primaryMs: state === 'ready' ? result.ready.primary : null,
    requestsAtInitialReady: beforeDrillRequests, requestsAfterDrill: requests.map(row => ({ ...row })), errors, unexpected, failed };
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await context.close();
  return row;
}
function median(values) { const sorted = values.toSorted((a,b) => a-b); return sorted.length % 2 ? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2; }
const rows = [];
try {
  // One discarded warm-up per route reduces server/OS one-time startup noise.
  for (const route of ['home', 'detail/005930.KS', 'macro']) {
    const warmup = await measure(route, 0);
    if (warmup.state !== 'ready') { rows.push(warmup); throw Error(`Warm-up ${route} failed`); }
    for (let i = 1; i <= iterations; i++) {
      const row = await measure(route, i); rows.push(row);
      console.log(`${phase} ${route} #${i}: ${row.state} ${Math.round(row.primaryMs || 0)} ms${row.ready.inflation ? ` / inflation ${Math.round(row.ready.inflation)} ms` : ''}`);
      if (row.state !== 'ready') throw Error(`Measurement ${route} ${i} failed`);
    }
  }
} finally {
  const assets = (await readdir(resolve(dist, 'assets'))).filter(file => /^index-.*\.js$/.test(file));
  const main = await Promise.all(assets.map(async file => { const body = await readFile(resolve(dist, 'assets', file)); return { file, bytes: body.length, gzipBytes: gzipSync(body).length, sha256: createHash('sha256').update(body).digest('hex') }; }));
  const report = { phase, recordedAt: new Date().toISOString(), dist, baselineSourceCommit: '95d6b8361e22958f9cea6773afcf6ca446c2447a',
    conditions: { viewport: '390x844', browser: await browser.version(), deviceScaleFactor: 1, touch: true, CPUThrottling: 'none', cache: 'new context, no service workers, no-store static assets', API: `same captured/contract fixtures, ${dataDelayMs} ms artificial API latency per request`, externalNetwork: 'blocked', clock: '2026-10-16T03:00:00Z', iterationsPerRoute: iterations, discardedWarmupsPerRoute: 1, statisticLimit: 'median/max of small local sample; not a production SLA or robust p95' },
    fixture: { file: 'fixture-macro.json', bytes: macroBytes.length, sha256: createHash('sha256').update(macroBytes).digest('hex'), legacyIndicators: capturedMacro.results.length, inflationSeries: capturedMacro.inflation.series.length }, main,
    summaries: ['home', 'detail/005930.KS', 'macro'].map(route => { const selected = rows.filter(row => row.route === route && row.iteration > 0), success = selected.filter(row => row.state === 'ready'), times = success.map(row => row.primaryMs), inflation = success.map(row => row.ready.inflation).filter(Number.isFinite), drill = success.map(row => row.briefingDrill?.msFromScroll).filter(Number.isFinite); return { route, samples: selected.length, successfulSamples: success.length, medianMs: times.length ? median(times) : null, maxMs: times.length ? Math.max(...times) : null, inflationMedianMs: inflation.length ? median(inflation) : null, inflationMaxMs: inflation.length ? Math.max(...inflation) : null, briefingDrillMedianMs: drill.length ? median(drill) : null, initialRequestCounts: success.map(row => row.requestsAtInitialReady.length), initialDataPaths: [...new Set(success.flatMap(row => row.requestsAtInitialReady.map(req => req.path)))], initialDataByteCounts: success.map(row => row.requestsAtInitialReady.reduce((sum, req) => sum + (req.bytes || 0), 0)), errors: selected.flatMap(row => row.errors), overflowPx: selected.map(row => row.overflowPx) }; }), rows };
  await mkdir(output, { recursive: true });
  await writeFile(new URL(`./${phase}.json`, import.meta.url), JSON.stringify(report, null, 2));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
