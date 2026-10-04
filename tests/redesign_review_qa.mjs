import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.QA_BROWSER_CHANNEL?{channel:process.env.QA_BROWSER_CHANNEL}:{})});
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
await fs.mkdir('artifacts/redesign-review',{recursive:true});
try{
 for(const width of [320,390,430]){
  const context=await browser.newContext({viewport:{width,height:width===320?693:844}});
  await context.addInitScript(()=>{
   localStorage.setItem('chartview-toss-watchlist-v1',JSON.stringify([{symbol:'005930.KS',name:'삼성전자'}]));
   window.__reviewDrawnDates=[];
   const fill=CanvasRenderingContext2D.prototype.fillText;
   CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(/\d{4}\.\d{2}\.\d{2}/.test(String(text)))window.__reviewDrawnDates.push(String(text));return fill.call(this,text,...args);};
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://chart-view-pkv8.onrender.com/**',route=>{
   const path=new URL(route.request().url()).pathname;
   const stock={ticker:'005930.KS',name:'삼성전자',price:100000,currency:'KRW',change:0,asOf:'2026-10-02T06:30:00Z'};
   let body={results:[],stocks:[]};
   if(path==='/api/quotes')body={results:[stock]};
   if(path==='/api/home-bootstrap')body={day:{tradeDate:'2026-10-02'},recommendations:[{symbol:'251970.KQ',name:'펌텍코리아',recommendedDate:'2026-09-17',score:0,analysisSource:'사용자 최종 선택',recommendedPrice:61900,currentPrice:60500,returnPct:-2.26},{symbol:'039030.KQ',name:'이오테크닉스',recommendedDate:'2026-09-17',score:null,returnPct:null}]};
   if(path==='/static/data/pick_monitor.json')body={picks:[]};
   if(path==='/api/compare')body={fetchedAt:stock.asOf,stocks:[{ticker:stock.ticker,name:stock.name,currency:'KRW',return:9,startDate:'2026-09-01',endDate:'2026-09-10',data:Array.from({length:10},(_,i)=>({time:`2026-09-${String(i+1).padStart(2,'0')}`,value:i}))}]};
   return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(base+'/#favorites');await page.locator('.watch-detail-card').waitFor();assert.match(await page.locator('body').innerText(),/삼성전자/);
  await page.goto(base+'/favorites/');await page.locator('.watch-detail-card').waitFor();
  await page.goto(base+'/#picks');const zero=page.locator('[data-pick-key="2026-09-17:251970"]');await zero.waitFor();
   assert.doesNotMatch(await zero.innerText(),/선정 점수/, 'raw score belongs in the record detail');
   await zero.locator('[data-pick-expand]').click();assert.match(await zero.innerText(),/선정 점수 0점.*계산 산식과 척도가 제공되지 않아/s);
   assert.match(await zero.locator('[data-pick-score-basis]').innerText(),/사용자 최종 선택.*0점은 원자료.*현재 기술점수/s);
   const missing=page.locator('[data-pick-key="2026-09-17:039030"]');assert.doesNotMatch(await missing.innerText(),/선정 점수/);
   await missing.locator('[data-pick-expand]').click();assert.match(await missing.innerText(),/선정 점수 미제공/);
  await page.screenshot({path:`artifacts/redesign-review/${width}-score.png`,fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByRole('button',{name:'수익률',exact:true}).click();await page.locator('#chart-table-wrap .return-table').waitFor();
  await page.locator('#chart-canvas').hover();
  await page.waitForFunction(()=>window.__reviewDrawnDates.some(s=>/^2026\.09\.\d{2}$/.test(s)));
  assert.match(await page.locator('#chart-tooltip').innerText(),/2026\.09\.\d{2}/);
  await page.screenshot({path:`artifacts/redesign-review/${width}-chart.png`});
  assert.deepEqual(errors,[]);await context.close();console.log(`${width}px aliases, zero/missing score provenance, and native crosshair date passed`);
 }
}finally{await browser.close();}
