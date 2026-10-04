import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.QA_BROWSER_CHANNEL?{channel:process.env.QA_BROWSER_CHANNEL}:{})});
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
const quote={ticker:'005930.KS',name:'삼성전자',price:100000,change:2,currency:'KRW',asOf:'2026-10-02T06:30:00Z',sessionDate:'2026-10-02'};
const record={...quote,symbol:quote.ticker,code:'005930',recommendedDate:'2026-10-02',recommendedPrice:90000,currentPrice:100000,returnPct:11.1,reason:'해당 날짜에 기록된 실제 선정 이유'};
await fs.mkdir('artifacts/home-journey',{recursive:true});
try {
 for(const width of [320,390,430,1280])for(const scenario of ['ready-empty','ready-saved','watch-3','watch-20','failed','null-macro']){
  const height=width===320?693:844;
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];let macroSnapshots=0;
  page.on('pageerror',e=>errors.push(e.message));
  if(scenario==='watch-3'||scenario==='watch-20')await page.addInitScript(count=>localStorage.setItem('chartview-toss-watchlist-v1',JSON.stringify(Array.from({length:count},(_,i)=>({symbol:i===0?'005930.KS':'QA'+i,name:i===0?'삼성전자':'관심 '+i})))),scenario==='watch-3'?3:20);
  if(scenario==='ready-saved')await page.addInitScript(()=>localStorage.setItem('chartview-toss-watchlist-v1',JSON.stringify([{symbol:'005930.KS',name:'삼성전자'}])));
  await page.route('https://chart-view-pkv8.onrender.com/**',async route=>{
   const path=new URL(route.request().url()).pathname;let body={results:[],items:[]};
   if(path==='/api/market-now'){
    if(scenario==='failed')return route.fulfill({status:503,contentType:'application/json',body:'{}'});
    body={results:['^KS11','^KQ11','^GSPC','^IXIC'].map(ticker=>({...quote,ticker}))};
   }
   if(path==='/api/home-bootstrap')body={day:{tradeDate:'2026-10-02',top3:[record]},recommendations:[record,{...record,recommendedDate:'2026-09-01',returnPct:null}]};
   if(path==='/static/data/pick_monitor.json')body={picks:[]};
   if(path==='/api/quotes')body={results:[quote]};
   if(path==='/api/home-snapshot')body={heatmap:{results:[]},...(scenario==='null-macro'?{macro:++macroSnapshots===1?null:{summary:{text:'경제 지표 재시도 성공'},results:[]}}:{})};
   if(path==='/api/export-momentum')body={period:'2026-09',items:[],regions:[],summary:{exportsUsdBillion:60,exportYoY:4}};
   await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(base+'/#home',{waitUntil:'domcontentloaded'});
  await page.locator('.home-selection-link').waitFor();
  if(scenario==='null-macro'){
   await page.locator('[data-retry-brief]').waitFor();
   await page.locator('[data-retry-brief]').click();
   await page.waitForFunction(()=>document.querySelector('#brief-card')?.textContent.includes('경제 지표 재시도 성공'));
   assert.equal(await page.locator('[data-retry-brief]').count(),0);
  }
  if(scenario==='failed')await page.locator('#retry-market').waitFor();
  else await page.locator('#market-card .quote-card').first().waitFor();
  await page.locator('.home-changes').scrollIntoViewIfNeeded();await page.locator('.home-change-card').first().waitFor();await page.locator('body').press('Control+Home');
  if(scenario==='watch-20'){assert.equal(await page.locator('#home-watchlist .watch-rich-row').count(),3);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('chartview-toss-watchlist-v1')).length),20);}
  const geometry=await page.evaluate(()=>{
   const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom};};
   return {market:rect('.market-section'),entries:rect('.home-value-entries'),changes:rect('.home-changes'),watch:rect('.watch-section'),records:rect('#home-top-picks-section'),nav:rect('.bottom-nav')};
  });
  console.log(JSON.stringify({width,scenario,geometry}));
  await page.screenshot({path:`artifacts/home-journey/${width}-${scenario}-initial.png`});
  assert.ok(geometry.market.top<geometry.entries.top&&geometry.entries.top<geometry.changes.top&&geometry.changes.top<geometry.records.top&&geometry.records.top<geometry.watch.top,'market, entries, changes, records and personal watch order');
  assert.ok(geometry.market.bottom<geometry.nav.top,'all four market cards or explicit failure are readable on first screen');
  assert.ok(geometry.entries.bottom<geometry.nav.top,'core value entries remain discoverable on first screen');
  const visual=await page.locator('.home-value-entries button').evaluateAll(buttons=>buttons.map(button=>({label:button.innerText,background:getComputedStyle(button).backgroundColor,icons:button.querySelectorAll('svg[aria-hidden="true"][focusable="false"]').length,height:button.getBoundingClientRect().height})));
  assert.equal(new Set(visual.map(x=>x.background)).size,3,'each core tool has a distinct purpose surface');
  assert.ok(visual.every(x=>x.icons===1&&x.height>=44),'graphics stay decorative and controls remain touchable');
  assert.equal(await page.locator('.bottom-nav [data-tab="more"] svg rect').count(),3,'analysis has a tool dashboard icon');
  assert.equal(await page.locator('.bottom-nav [aria-current="page"]').innerText(),'홈');
  assert.equal(await page.locator('.home-pick-performance').count(),0,'aggregate performance belongs in records');
  assert.match(await page.locator('.home-selection-reason').first().innerText(),new RegExp(record.reason));
  assert.ok(await page.locator('.home-change-card').first().evaluate(el=>el.getBoundingClientRect().bottom+scrollY)<height*2,'first observation arrives within two screens');
  if(scenario==='ready-saved')assert.match(await page.locator('#home-watchlist').innerText(),/삼성전자/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.goto(base+'/#home');await page.locator('.home-selection-link').waitFor();
  await page.screenshot({path:`artifacts/home-journey/${width}-${scenario}-home.png`});
  await page.locator('.home-selection-link').click();
  await page.locator('[data-pick-key="2026-10-02:005930"] [data-pick-detail]').waitFor({state:'visible'});
  assert.match(await page.locator('[data-pick-key="2026-10-02:005930"]').innerText(),new RegExp(record.reason));assert.equal(await page.title(),'선정 기록·성과 | 차트뷰');
  assert.equal(await page.locator('[data-pick-key="2026-09-01:005930"] [data-pick-expand]').getAttribute('aria-expanded'),'false');
  await page.locator('.bottom-nav [data-tab="more"]').click();
  await page.getByRole('heading',{name:'분석',level:1,exact:true}).waitFor();
  assert.equal(await page.locator('.bottom-nav [aria-current="page"]').getAttribute('data-tab'),'more');
  assert.equal(await page.locator('.app-shell').getAttribute('data-ui-tone'),'analysis');
  assert.match(await page.locator('.surface-label').innerText(),/목적별 분석/);
  await page.screenshot({path:`artifacts/home-journey/${width}-${scenario}-analysis.png`});
  await page.locator('.tab-usage-guide summary').click();
  assert.deepEqual(await page.locator('.tab-usage-guide dt').allTextContents(),['홈','수익률','관심','분석']);
  assert.match(await page.locator('.tab-usage-guide').innerText(),/기간 수익률 비교.*기기에 저장한 내 종목 관리/s);
  const menuHash=new URL(page.url()).hash;
  for(const id of ['analysis-find','analysis-records','analysis-compare','analysis-evidence']){
   await page.locator(`[data-menu-jump="${id}"]`).click();
   assert.equal(new URL(page.url()).hash,menuHash,'purpose links scroll within the same route');
   assert.ok(await page.locator(`#${id}`).evaluate(el=>{const r=el.querySelector('h3').getBoundingClientRect();return r.top>=0&&r.bottom<innerHeight-90;}),'chosen section title stays readable');
  }
  if(width===320){await page.addStyleTag({content:'.analysis-category-nav a{font-size:20px!important}'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  assert.deepEqual(errors,[]);await context.close();console.log(`${width}px ${scenario}: first-screen market/analysis, watch/history ordering, honest performance, exact record and menu purpose navigation passed`);
 }
}finally{await browser.close();}
