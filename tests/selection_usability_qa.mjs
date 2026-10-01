import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:5180';
const browser = await chromium.launch({headless:true});
const stocks = Array.from({length:12}, (_,i)=>({symbol:`${String(i+1).padStart(6,'0')}.KS`,name:`비교 회사 ${i+1}`,market:'KOSPI'}));
const market = ['^KS11','^KQ11','^GSPC','^IXIC'].map(ticker=>({ticker,price:3000,change:1,asOf:'2026-10-01T07:00:00Z'}));
await fs.mkdir('output/playwright/selection-usability',{recursive:true});
try {
 for (const width of [320,390,430]) {
  const context=await browser.newContext({viewport:{width,height:844}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let failSearch=true,fullMarket=false,fullExtras=false,extraRequests=0;
  const mock=async route=>{
   const path=new URL(route.request().url()).pathname.replace(/^\/backend/,'');
   let body={};
   if(path==='/api/search') {
    if(failSearch)return route.fulfill({status:503,body:'{}'});
    body={results:stocks};
   }
   if(path==='/api/market-now')body={results:fullMarket?market:[market[0]]};
   if(path==='/api/quotes') {extraRequests++;body={results:fullExtras?['^TNX','^VIX','CL=F','KRW=X'].map(ticker=>({ticker,price:100,change:1,asOf:'2026-10-01T07:00:00Z'})):[]};}
   if(path==='/static/data/screener.json')body={stocks:[]};
   if(path==='/api/compare')body={stocks:[]};
   return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  };
  await page.route('**/backend/**',mock);
  await page.route('https://chart-view-pkv8.onrender.com/**',mock);
  await page.goto(`${base}/#home`);
  await page.locator('#home-search-open').click();
  await page.locator('#selector-search-input').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.selector-overlay').count(),0,'Escape closes stock search');
  assert.equal(await page.locator('#home-search-open').evaluate(el=>el===document.activeElement),true,'focus returns to search trigger');
  await page.locator('#home-search-open').click();
  const input=page.locator('#selector-search-input');
  assert.ok(await input.getAttribute('aria-label'),'search has an accessible label');
  assert.equal(await page.locator('#app').evaluate(el=>el.inert),true,'background is excluded while modal is open');
  await page.locator('.selector-close').focus();await page.keyboard.press('Shift+Tab');
  assert.equal(await input.evaluate(el=>el===document.activeElement),true,'focus wraps inside dialog');
  await input.fill('회사');
  await page.locator('[data-selector-retry]').waitFor();
  failSearch=false;await page.locator('[data-selector-retry]').click();
  await page.locator('[data-selector-symbol]').first().waitFor();
  await page.locator('[data-selector-clear]').click();
  assert.equal(await input.inputValue(),'');
  assert.equal(await input.evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#app').evaluate(el=>el.inert),false,'background is available again after close');
  await page.evaluate(()=>window.__chartviewNavigate('chart'));
  await page.locator('#open-compare-selector').click();
  await page.locator('#selector-search-input').fill('회사');
  await page.locator('[data-selector-symbol]').first().waitFor();
  const list=page.locator('.selector-results');
  await list.evaluate(el=>{el.scrollTop=el.scrollHeight;});
  const last=page.locator('[data-selector-symbol]').last();
  await last.click();
  assert.equal(await last.getAttribute('aria-pressed'),'true','selection exposed accessibly');
  assert.equal(await last.evaluate(el=>el===document.activeElement),true,'selected result retains focus after repaint');
  assert.ok(await list.evaluate(el=>el.scrollTop)>0,'result list retains scroll');
  await page.screenshot({path:`output/playwright/selection-usability/selector-${width}.png`});
  await page.keyboard.press('Escape');
  await page.evaluate(()=>window.__chartviewNavigate('home'));
  await page.locator('.market-missing').first().waitFor();
  assert.ok(!(await page.locator('#market-card').innerText()).includes('불러오는 중'),'settled partial response is not loading forever');
  fullMarket=true;await page.locator('[data-retry-market-missing]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.market-grid .market-missing').length===0);
  await page.locator('#market-expand').click();
  await page.locator('[data-retry-market-extra]').waitFor();
  assert.ok(!(await page.locator('.market-extra-wrap').innerText()).includes('불러오는 중'));
  const requests=extraRequests;await page.locator('[data-retry-market-extra]').click();
  await page.waitForFunction(()=>document.querySelector('[data-retry-market-extra]')!==null);
  assert.ok(extraRequests>requests,'retry bypasses empty cached quotes');
  await page.screenshot({path:`output/playwright/selection-usability/partial-market-${width}.png`});
  fullExtras=true;await page.locator('[data-retry-market-extra]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.market-extra-wrap .market-missing').length===0);
  await page.evaluate(market=>document.dispatchEvent(new CustomEvent('chartview:market-now-live',{detail:{results:market}})),market);
  assert.equal(await page.locator('.market-extra-wrap .market-missing').count(),0,'primary live refresh retains dated optional observations');
  await page.goto(`${base}/#home`);
  await page.reload();
  await page.locator('#home-search-open').waitFor();
  await page.evaluate(()=>window.__chartviewNavigate('watch'));
  await page.evaluate(()=>window.__chartviewNavigate('detail','005930.KS','삼성전자'));
  await page.locator('[data-back]').waitFor();
  await page.goBack();await page.locator('#watch-add').waitFor();
  await page.goForward();await page.locator('[data-back]').waitFor();
  await page.locator('[data-back]').click();await page.waitForTimeout(150);
  assert.equal(new URL(page.url()).hash,'#watch','app back still works after browser forward');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  assert.deepEqual(errors,[]);
  await context.close();
  console.log(`${width}px: keyboard, search retry/clear, selection continuity, partial-market terminal states passed`);
 }
} finally {await browser.close();}
