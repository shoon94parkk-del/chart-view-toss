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
    await page.addInitScript(()=>localStorage.setItem('chartview-toss-watchlist-v1',JSON.stringify([{symbol:'000660.KS',name:'SK하이닉스'},{symbol:'005930.KS',name:'삼성전자'}])));
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
    assert.equal(await page.locator('#research-save-state').innerText(), '질문은 이 기기에서만 처리해요.');
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
    await page.locator('.research-table').screenshot({ path: `${output}/${width}-${symbol}-table.png` });
    await page.locator('#detail-financial-history .financial-quality').waitFor({timeout:60000});
    assert.match(await page.locator('#detail-financial-history .financial-quality').innerText(),/확장 항목 7\/7개 확인/);
    const peerSymbol=symbol==='005930.KS'?'000660.KS':'005930.KS';
    await page.locator(`[data-peer-symbol="${peerSymbol}"]`).click();
    await page.locator('[data-research-example="3"]').click();
    assert.equal(await page.locator('.research-table').count(),0);
    await page.locator('.research-analyze').click();await page.locator('.research-table').waitFor({timeout:60000});
    const cashTable=await page.locator('.research-table').innerText();
    assert.match(cashTable,/순이익/);assert.match(cashTable,/영업현금흐름/);
    assert.equal(await page.locator('.research-table thead th').count(),3);
    assert.ok(!cashTable.includes('확인 불가'),'real major-company current and prior cash flow values are supported');
    assert.match(await page.locator('.research-findings').innerText(),/영업현금흐름은 전년 같은 기간/);
    await page.locator('.research-table').screenshot({path:`${output}/${width}-${symbol}-cash-table.png`});
    await page.locator('[data-research-example="4"]').click();await page.locator('.research-analyze').click();
    await page.locator('.research-quality-details[open]').waitFor({timeout:60000});
    assert.equal(await page.locator('.research-quality-details .financial-quality').count(),2);
    assert.match(await page.locator('.research-quality-details').innerText(),/원인·매매 판단 아님/);
    await page.locator('.research-quality-details .quality-raw').first().locator('summary').click();
    assert.match(await page.locator('.research-quality-details').innerText(),/ifrs-full_CashFlowsFromUsedInOperatingActivities/);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
    await page.locator('.research-table').screenshot({path:`${output}/${width}-${symbol}-quality-table.png`});
    await page.locator('.financial-subnav [data-detail-jump="detail-quality"]').click();
    await page.locator('#detail-financial-history .financial-quality').screenshot({path:`${output}/${width}-${symbol}-quality-detail.png`});
    if(width===390){
      await page.locator('[data-research-prices]').click();
      await page.locator('#research-prices table').waitFor({timeout:60000});
      assert.match(await page.locator('#research-prices').innerText(),/가격 지표는 별도 제공처/);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
      await page.locator('#research-prices').screenshot({path:`${output}/${width}-${symbol}-prices.png`});
    }
    assert.deepEqual(errors,[]);
    evidence.pages.push({ width, symbol, readyMs, analysisMs, headers, table, cashTable, errors });
    await page.close();
  }
  await fs.writeFile(`${output}/evidence.json`, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
