import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,...(process.env.QA_BROWSER_CHANNEL?{channel:process.env.QA_BROWSER_CHANNEL}:{})});
await fs.mkdir('artifacts/value-discovery',{recursive:true});
const quote={ticker:'005930.KS',name:'삼성전자',price:100000,change:2,marketCap:300,currency:'KRW',asOf:'2026-10-02T06:30:00Z',sessionDate:'2026-10-02'};
const record={symbol:'005930.KS',name:'삼성전자',code:'005930',recommendedDate:'2026-10-02',reason:'검증된 최신 날짜의 원문 선정 근거',recommendedPrice:90000,currentPrice:100000,returnPct:11.1};
try {
 for(const width of [320,360,390,430]){
  const height=width===320?693:width===430?932:844;
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[],calls=[];let releaseScreener;const screenerReady=new Promise(resolve=>{releaseScreener=resolve;});
  page.setDefaultNavigationTimeout(60000);
  console.log(`${width}px value discovery QA started`);
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://chart-view-pkv8.onrender.com/**',async route=>{
   const path=new URL(route.request().url()).pathname;calls.push(path);if(path==='/static/data/screener.json')await screenerReady;let body={};
   if(path==='/api/home-bootstrap')body={day:{tradeDate:'2026-10-02',top3:[record]},recommendations:[{...record,recommendedDate:'2026-09-01',reason:'과거 다른 근거',returnPct:null},record]};
   if(path==='/static/data/pick_monitor.json')body={picks:[{pickId:'2026-10-02:005930',pickDate:'2026-10-02',code:'005930',symbol:'005930.KS',status:'WATCH',monitor:{reason:'신규 근거 점검'},technical:{signal:'TECH_NORMAL'}}]};
   if(path==='/api/market-now')body={results:['^KS11','^KQ11','^GSPC','^IXIC'].map(ticker=>({...quote,ticker}))};
   if(path==='/api/home-snapshot')body={heatmap:{results:[quote]},generatedAt:quote.asOf};
   if(path==='/api/quotes')body={results:[quote]};
   if(path==='/static/data/screener.json')body={tradeDate:'2026-10-02',stocks:[{symbol:'005930.KS',name:'삼성전자',market:'KOSPI',date:'2026-10-02',volumeRatio:3,rsi14:0,price:100000,change1d:-91.07,ret20:-91.07},{symbol:'000660.KS',name:'SK하이닉스',market:'KOSPI',date:'2026-10-02',volumeRatio:1,rsi14:60,price:200000}]};
   if(path==='/api/compare')body={stocks:[]};
   if(path==='/api/export-momentum')body={period:'2026-09',summary:{exportsUsdBillion:60,exportYoY:12},itemPeriod:'2026-08',regionPeriod:'2026-08',items:[{key:'semiconductor',name:'반도체',exportsUsdBillion:10,exportYoY:20,exportWeightYoY:5,unitValueYoY:3}],regions:[{name:'미국',exportsUsdBillion:5,exportYoY:20}],history:[{period:'2026-08',exportsUsdBillion:55,exportYoY:10},{period:'2026-09',exportsUsdBillion:60,exportYoY:12}]};
   await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(base+'/#home',{waitUntil:'domcontentloaded'});await page.locator('.home-selection-link').waitFor();
  for(const button of await page.locator('.home-value-entries button').all())assert.ok(await button.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<innerHeight-90;}),'core entry above fixed bottom nav');
  assert.ok(calls.filter(path=>path==='/static/data/screener.json').length<=1,'visible Home observations reuse one shared request');await page.locator('.home-change-card [data-feature-target=items]').waitFor();await page.locator('.home-change-card [data-feature-target=items]').focus();releaseScreener();await page.waitForFunction(()=>document.querySelectorAll('.home-change-card').length===3);assert.equal(await page.evaluate(()=>document.activeElement?.dataset.featureTarget),'items','late screener preserves export CTA focus');assert.equal(calls.includes('/api/heatmap/full'),false,'Home does not fetch full market');assert.equal(calls.includes('/api/export-momentum/item-detail'),false);
  assert.match(await page.locator('.home-selection-link').innerText(),/삼성전자/);await page.waitForFunction(()=>document.querySelector('[data-selection-status]')?.textContent==='경계');
  assert.equal(await page.locator('.home-pick-summary').count(),1);
  assert.match(await page.locator('.home-selection-sub small').first().textContent(),new RegExp(record.reason));
  await page.screenshot({path:`artifacts/value-discovery/${width}-home.png`});
  if(width===390){
   await page.addStyleTag({content:'.home-value-entries strong{font-size:21px!important}.home-value-entries small{font-size:16px!important}.home-compact-head h2{font-size:33px!important}'});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'large labels do not overflow');
   await page.reload();await page.locator('.home-selection-link').waitFor();
  }
  await page.locator('.home-selection-link[data-feature-route=picks]').click();await page.locator('[data-pick-key="2026-10-02:005930"] [data-pick-detail]').waitFor({state:'visible'});
  assert.match(await page.locator('[data-pick-key="2026-10-02:005930"] [data-pick-detail]').innerText(),new RegExp(record.reason));
  const pickRowHeight=await page.locator('.pick-ledger-row').first().evaluate(el=>el.getBoundingClientRect().height);assert.ok(pickRowHeight<=64,`mobile pick row exceeds two-line density target: ${pickRowHeight}`);
  assert.equal(await page.locator('.pick-ledger-summary').isVisible(),true,'PICK performance summary stays visible');
  assert.equal(await page.locator('.pick-ledger-status-strip').isVisible(),true,'PICK status summary stays visible');
  assert.match(await page.locator('.pick-ledger-summary').innerText(),/11.10%/,'unevaluated records do not dilute mean');
  assert.equal(await page.locator('[data-pick-key="2026-09-01:005930"] [data-pick-detail]').isVisible(),false);assert.match(page.url(),/2026-10-02%3A005930/);
  await page.getByRole('button',{name:'홈',exact:true}).click();await page.locator('.home-value-entries [data-feature-route=discover]').click();await page.locator('.analysis-stock').waitFor();
  assert.equal(await page.locator('.analysis-stock').count(),1);assert.equal(await page.locator('.screener-advanced').getAttribute('open'),null);assert.ok(await page.locator('.analysis-stock').first().evaluate(el=>el.getBoundingClientRect().bottom<document.querySelector('.bottom-nav').getBoundingClientRect().top-6),'entire first preset result is readable above the fixed navigation');
  assert.match(await page.locator('.analysis-stock .data-quality-warning').innerText(),/일간 변동 ±35% 이상.*가격 기준과 기업 공시 등 원자료/,'the complete unusual-move warning stays visible');
  const screenerCardHeight=await page.locator('.analysis-stock').first().evaluate(el=>el.getBoundingClientRect().height);assert.ok(screenerCardHeight<=118,`mobile screener card is too tall even with warning: ${screenerCardHeight}`);
  await page.screenshot({path:`artifacts/value-discovery/${width}-screener.png`});
  await page.locator('.screener-advanced>summary').click();if(!await page.locator('.screener-extra').evaluate(el=>el.open))await page.locator('.screener-extra>summary').click();await page.locator('[name=volumeMin]').fill('4');assert.equal(await page.locator('.analysis-stock').count(),0);
  if(!await page.locator('.screener-extra').evaluate(el=>el.open))await page.locator('.screener-extra>summary').click();await page.locator('[name=volumeMin]').fill('2');await page.locator('.analysis-stock').first().click();await page.locator('#detail-price').waitFor();await page.goBack();await page.locator('.analysis-stock').waitFor();assert.equal(await page.locator('[name=volumeMin]').inputValue(),'2');assert.equal(await page.locator('.screener-advanced').getAttribute('open'),'');
  await page.goto(base+'/#exports');await page.locator('[data-export-panel=overview]:not([hidden])').waitFor();await page.getByRole('tab',{name:'국가',exact:true}).click();assert.equal(new URL(page.url()).hash,'#exports/countries');await page.waitForFunction(()=>{const r=document.querySelector('#export-countries h3')?.getBoundingClientRect();return Boolean(r)&&r.top>=0&&r.bottom<innerHeight-90;});
  await page.goto(base+'/#picks/2026-10-01%3A005930');await page.locator('.pick-ledger-item').first().waitFor();assert.match(await page.locator('.pick-ledger-focus-note').innerText(),/찾지 못/);assert.equal(await page.locator('[data-pick-expand][aria-expanded=true]').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();console.log(`${width}px value entry, exact record, preset result, back-state and export jump passed`);
 }
}finally{await browser.close();}
