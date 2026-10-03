import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const site = process.env.QA_BASE_URL || 'https://chart-view-toss.onrender.com';
const api = process.env.QA_API_BASE_URL || 'https://chart-view-pkv8.onrender.com';
const [selectionResponse, screenerResponse] = await Promise.all([
  fetch(`${api}/api/home-bootstrap`),
  fetch(`${api}/static/data/screener.json`),
]);
assert.equal(selectionResponse.ok, true, 'selection API must respond');
assert.equal(screenerResponse.ok, true, 'screener data must respond');
const selection = await selectionResponse.json();
const screener = await screenerResponse.json();
const selected = (selection.day?.top3 || []).slice(0, 3);
assert.ok(selected.length > 0, 'live selection must have at least one stock');
for (const row of selected) {
  assert.ok(screener.stocks?.some(stock => stock.symbol === row.symbol), `${row.symbol} absent from screener`);
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => errors.push(`${new URL(request.url()).pathname}: ${request.failure()?.errorText}`));
  await page.goto(`${site}/#home`, { waitUntil: 'domcontentloaded' });
  try {
    await page.locator('#home-top-picks .home-pick-row').first().waitFor({ timeout: 30000 });
  } catch (error) {
    throw new Error(`Home spotlight missing: ${(await page.locator('body').innerText()).slice(0, 1000)}; errors=${errors.join(' | ')}`, { cause: error });
  }
  assert.match(await page.locator('#home-top-picks-section').innerText(), /선정 기록·성과/);
  assert.equal(await page.locator('#home-top-picks .home-pick-row').count(), selected.length);
  for (const row of selected) {
    assert.ok(await page.locator(`#home-top-picks [data-home-extra-stock="${row.symbol}"]`).count(), `${row.symbol} absent from Home`);
  }
  await page.locator('#home-top-picks-section [data-home-extra-route="picks"]').click();
  await page.locator('.pick-ledger-item').first().waitFor({ timeout: 30000 });
  assert.match(await page.locator('.pick-ledger-head').innerText(), /선정 기록·성과/);
  await page.goto(`${site}/picks`, { waitUntil: 'domcontentloaded' });
  await page.locator('.pick-ledger-item').first().waitFor({ timeout: 30000 });
  assert.deepEqual(errors, [], 'live browser must have no JavaScript errors');
  console.log(JSON.stringify({ version: '0.9.4', selected: selected.map(row => row.symbol), screenerParity: true, homeCount: selected.length, page: '선정 기록·성과', errors }));
} finally {
  await browser.close();
}
