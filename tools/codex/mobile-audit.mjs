import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { createServer } from 'node:net';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import { payloadFor, quotes } from '../../tests/e2e/data.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium, expect } = createRequire(resolve(root, 'package.json'))('@playwright/test');
const target = process.env.CODEX_AUDIT_URL || 'http://127.0.0.1:4173/';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(target).hostname), 'Fixture audit is restricted to the local app; use the live suite for production.');
const output = resolve(root, 'artifacts/codex-tools');
await mkdir(output, { recursive: true });
const portServer = createServer();
await new Promise(resolve => portServer.listen(0, '127.0.0.1', resolve));
const port = portServer.address().port;
await new Promise(resolve => portServer.close(resolve));
const context = await chromium.launchPersistentContext('', {
  headless: true, viewport: { width: 393, height: 851 }, locale: 'ko-KR',
  args: [`--remote-debugging-port=${port}`], serviceWorkers: 'block',
});
const unexpected = [], errors = [];
context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
try {
  // Reuse the CI's existing API contracts. These are fixtures, not live prices.
  await context.addInitScript(rows => {
    if (!['http:', 'https:'].includes(location.protocol)) return;
    localStorage.setItem('chartview-toss-watchlist-v1', JSON.stringify(rows.map(row => ({ symbol: row.ticker, name: row.name }))));
    localStorage.setItem('chartview-toss-selected-v1', JSON.stringify([rows[0].ticker]));
  }, quotes);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (/^\/(backend\/)?(api\/|static\/data\/)/.test(url.pathname)) {
      try { return await route.fulfill({ json: payloadFor(url) }); }
      catch (error) {
        unexpected.push(error.message);
        return route.fulfill({ status: 500, json: { detail: error.message } });
      }
    }
    if (url.origin === new URL(target).origin) return route.continue();
    unexpected.push(`Unexpected external request: ${url.origin}${url.pathname}`);
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  // Persistent Chromium initially opens about:blank. The CLI selects the
  // first tab when attaching over CDP, so expose only our actual app tab.
  for (const opened of context.pages()) if (opened !== page) await opened.close();
  await page.goto(target);
  await expect(page.locator('#home-watchlist')).toContainText('삼성전자');
  for (const width of [393, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 851 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Home overflow at ${width}px`);
    await page.screenshot({ path: resolve(output, `home-${width}-fixture.png`), fullPage: true });
  }
  // Exercise the new CLI against the same loaded browser, without a second
  // browser account, AI provider, or duplicate set of API mocks.
  const { stdout } = await promisify(execFile)(process.execPath, [
    resolve(root, 'tools/codex/run.mjs'), 'browser', '--cdp', String(port), 'snapshot', '-i', '--json',
  ], { cwd: root, maxBuffer: 2 * 1024 * 1024 });
  const snapshot = JSON.parse(stdout);
  assert.equal(snapshot.success, true, snapshot.error || 'agent-browser snapshot failed');
  assert.match(snapshot.data.snapshot, /삼성전자/);
  await writeFile(resolve(output, 'agent-browser-fixture.json'), JSON.stringify(snapshot, null, 2));
  const result = await lighthouse(target, {
    port, hostname: '127.0.0.1', logLevel: 'error', output: ['html', 'json'],
    onlyCategories: ['performance'], disableStorageReset: true,
  });
  assert.ok(result && !result.lhr.runtimeError, result?.lhr.runtimeError?.message || 'Lighthouse returned no result');
  await writeFile(resolve(output, 'lighthouse-mobile-fixture.html'), result.report[0]);
  await writeFile(resolve(output, 'lighthouse-mobile-fixture.json'), result.report[1]);
  assert.deepEqual(unexpected, [], 'Fixture contract missing or external requests attempted');
  assert.deepEqual(errors, [], 'Uncaught browser errors');
  console.log(JSON.stringify({ data: 'existing E2E fixtures, not live prices', browser: 'Chromium; 320px is geometry coverage, not iOS WebKit', widths: [393, 320], performance: result.lhr.categories.performance.score, warnings: result.lhr.runWarnings, output }, null, 2));
} finally {
  await context.close();
}
