import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base = process.env.QA_BASE_URL || 'https://chart-view-toss.onrender.com';
const output = 'output/playwright/live-research';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const evidence = { base, checkedAt: new Date().toISOString(), pages: [] };
try {
  for (const [width, symbol, peer] of [[390, '005930.KS', 'SK하이닉스'], [320, '000660.KS', '삼성전자']]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(request.url() + (request.postData() || '')));
    const start = Date.now();
    const response = await page.goto(`${base}/#detail/${symbol}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    assert.equal(response.status(), 200);
    await page.locator('#research-question').waitFor({ timeout: 30000 });
    const readyMs = Date.now() - start;
    assert.match(await page.locator('.research-guide').innerText(), /전년 대비 증가율/);
    assert.match(await page.locator('.research-guide').innerText(), /앞으로의 전망.*지원하지 않아요/);
    await page.locator('[data-detail-jump="detail-research-card"]').click();
    await page.locator('[data-research-example="2"]').click();
    assert.ok((await page.locator('#research-question').inputValue()).includes(peer));
    assert.equal(await page.locator('.research-table').count(), 0);
    const question = symbol === '005930.KS'
      ? '하이닉스랑 비교했을때 매출 및 영업이익 증가율 자체를 비교하면 어때'
      : '삼성전자와 매출 및 영업이익 증가율을 비교해줘';
    await page.locator('#research-question').fill(question);
    const analysisStart = Date.now();
    await page.locator('.research-analyze').click();
    await page.locator('.research-table').waitFor({ timeout: 120000 });
    const analysisMs = Date.now() - analysisStart;
    const headers = await page.locator('.research-table thead th').allTextContents();
    assert.equal(headers.length, 3);
    assert.ok(headers.includes('삼성전자'));
    assert.ok(headers.includes('SK하이닉스'));
    assert.equal(await page.locator('.research-table tbody th').first().innerText(), '매출 증가율');
    assert.equal(await page.locator('.research-table tbody th').nth(1).innerText(), '영업이익 증가율');
    assert.equal(await page.locator('[data-research-source]').count(), 2);
    assert.ok(!requests.some(value => value.includes('financial-history?ticker=452400')));
    assert.ok(!requests.some(value => value.includes(question) || value.includes(encodeURIComponent(question))));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
    assert.deepEqual(errors, []);
    const table = await page.locator('.research-table').innerText();
    await page.locator('#detail-research-card').screenshot({ path: `${output}/${width}-${symbol}.png` });
    evidence.pages.push({ width, symbol, readyMs, analysisMs, headers, table, errors });
    await page.close();
  }
  await fs.writeFile(`${output}/evidence.json`, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
