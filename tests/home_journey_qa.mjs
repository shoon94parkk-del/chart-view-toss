import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.QA_BROWSER_CHANNEL?{channel:process.env.QA_BROWSER_CHANNEL}:{})});
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
const quote={ticker:'005930.KS',name:'삼성전자',price:100000,change:2,currency:'KRW',asOf:'2026-10-02T06:30:00Z',sessionDate:'2026-10-02'};
const record={...quote,symbol:quote.ticker,code:'005930',recommendedDate:'2026-10-02',recommendedPrice:90000,currentPrice:100000,returnPct:11.1,reason:'해당 날짜에 기록된 실제 선정 이유'};
await fs.mkdir('artifacts/home-journey',{recursive:true});
try {
 for(const width of [320,390,430])for(const scenario of ['ready-empty','ready-saved','failed','null-macro']){
  const height=width===320?693:844;
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
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
   if(path==='/api/home-snapshot')body={heatmap:{results:[]},...(scenario==='null-macro'?{macro:null}:{})};
   if(path==='/api/export-momentum')body={period:'2026-09',items:[],regions:[],summary:{}};
   await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(base+'/#home',{waitUntil:'domcontentloaded'});
  await page.locator('.home-selection-link').waitFor();
  if(scenario==='null-macro'){
   await page.locator('[data-retry-brief]').waitFor();
   await page.locator('[data-retry-brief]').click();
   await page.locator('[data-retry-brief]').waitFor();
   assert.match(await page.locator('#brief-card').innerText(),/경제지표|경제 지표/);
  }
  if(scenario==='failed')await page.locator('#retry-market').waitFor();
  else await page.locator('#market-card .quote-card').first().waitFor();
  const geometry=await page.evaluate(()=>{
   const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom};};
   return {market:rect('.market-section'),entries:rect('.home-value-entries'),watch:rect('.watch-section'),records:rect('#home-top-picks-section'),nav:rect('.bottom-nav')};
  });
  console.log(JSON.stringify({width,scenario,geometry}));
  await page.screenshot({path:`artifacts/home-journey/${width}-${scenario}-initial.png`});
  assert.ok(geometry.market.top<geometry.entries.top&&geometry.entries.top<geometry.watch.top&&geometry.watch.top<geometry.records.top,'daily context, research entries, watch and history order');
  assert.ok(geometry.market.bottom<geometry.nav.top,'all four market cards or explicit failure are readable on first screen');
  assert.ok(geometry.entries.bottom<geometry.nav.top,'core value entries remain discoverable on first screen');
  const visual=await page.locator('.home-value-entries button').evaluateAll(buttons=>buttons.map(button=>({label:button.innerText,background:getComputedStyle(button).backgroundColor,icons:button.querySelectorAll('svg[aria-hidden="true"][focusable="false"]').length,height:button.getBoundingClientRect().height})));
  assert.equal(new Set(visual.map(x=>x.background)).size,3,'each core tool has a distinct purpose surface');
  assert.ok(visual.every(x=>x.icons===1&&x.height>=44),'graphics stay decorative and controls remain touchable');
  assert.equal(await page.locator('.bottom-nav [data-tab="more"] svg rect').count(),3,'analysis has a tool dashboard icon');
  assert.equal(await page.locator('.bottom-nav [aria-current="page"]').innerText(),'홈');
  assert.equal(await page.locator('.home-pick-performance-main strong').innerText(),'+11.10%');
  assert.ok(await page.evaluate(()=>document.querySelector('.home-selection-link').compareDocumentPosition(document.querySelector('.home-pick-performance'))&Node.DOCUMENT_POSITION_FOLLOWING),'recent records precede secondary performance');
  assert.ok(await page.locator('.home-pick-performance-main strong').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)<=16),'whole-history performance is secondary verification');
  assert.match(await page.locator('.home-pick-performance-kpis').innerText(),/1\/2건/);
  assert.ok(await page.locator('.home-pick-performance-main strong').isVisible(),'performance visible without a disclosure click');
  await page.locator('.home-performance-details summary').click();
  assert.match(await page.locator('.home-performance-details').innerText(),/산술 평균.*미평가.*선정일·보유기간.*포트폴리오/s);
  if(scenario==='ready-saved')assert.match(await page.locator('#home-watchlist').innerText(),/삼성전자/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.goto(base+'/#home');await page.locator('.home-selection-link').waitFor();
  await page.screenshot({path:`artifacts/home-journey/${width}-${scenario}-home.png`});
  await page.locator('.home-selection-link').click();
  await page.locator('[data-pick-key="2026-10-02:005930"] [data-pick-detail]').waitFor({state:'visible'});
  assert.match(await page.locator('[data-pick-key="2026-10-02:005930"]').innerText(),new RegExp(record.reason));
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
