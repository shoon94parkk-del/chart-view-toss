import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
const names=['Technology','Communication','Consumer Cyclical','Financial','Healthcare','Consumer Defensive','Industrials','Energy','Materials','Utilities','Real Estate'];
const rows=[{ticker:'005930.KS',name:'삼성전자',market:'KR',industry:'통신 및 방송 장비 제조업',mainProducts:'메모리 반도체 제품',marketCap:300,change:2,price:100000},{ticker:'000660.KS',name:'SK하이닉스',market:'KR',industry:'반도체 제조업',mainProducts:'DRAM NAND',marketCap:100,change:-2,price:500000},...names.map((sector,i)=>({ticker:i?'US'+i:'NVDA',name:i?sector:'엔비디아',market:'US',sector,marketCap:200-i,change:i%2?-1:1,price:100}))].map(r=>({...r,sessionDate:'2026-10-01',asOf:'2026-10-01T07:00:00Z',stale:false}));
const browser=await chromium.launch({headless:true});await fs.mkdir('artifacts/sector-heatmap',{recursive:true});
try{
 for(const width of [320,390,430]){
  const ctx=await browser.newContext({viewport:{width,height:844}}),page=await ctx.newPage();let calls=0,screenCalls=0,fail=false;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const mock=async route=>{
   const path=new URL(route.request().url()).pathname.replace(/^\/backend/,'');let body={};
   if(path==='/api/heatmap/full'){calls++;if(fail)return route.fulfill({status:503,body:'{}'});body={results:width===390&&calls===2?[]:rows,counts:{KR:2,US:11},complete:true,refreshing:calls===1||(width===390&&calls===2),generatedAt:'2026-10-01T07:00:00Z'};}
   if(path==='/api/market-now')body={results:['^KS11','^KQ11','^GSPC','^IXIC'].map(ticker=>({ticker,price:3000,change:1,asOf:'2026-10-01T07:00:00Z'}))};
   if(path==='/api/home-snapshot')body={heatmap:{results:rows.map(row=>({...row,change:-8,sessionDate:'2026-09-30',asOf:'2026-09-30T07:00:00Z'}))},generatedAt:'2026-09-30T07:00:00Z'};
   if(path==='/api/quotes')body={results:[{ticker:'NVDA',price:100,change:1,asOf:'2026-10-01T07:00:00Z',currency:'USD'}]};
   if(path==='/api/compare')body={stocks:[{ticker:'NVDA',data:[{time:'2026-09-01',value:0,price:90},{time:'2026-10-01',value:10,price:99}]}]};
   if(path==='/static/data/screener.json'){screenCalls++;body={stocks:[]};}
   return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  };
  await page.route('https://chart-view-pkv8.onrender.com/**',mock);await page.route('**/backend/**',mock);
  await page.goto(base+'/#home');await page.locator('#market-card .quote-card').first().waitFor();await page.waitForTimeout(500);
  assert.equal(calls,0,'sector API is not requested on initial Home');
  assert.equal(await page.locator('[data-home-sectors]').count(),0,'Home offers a stock preview, full sector exploration is on the full screen');
  await page.goto(base+'/#heatmap');const host=page.locator('.shared-heatmap-analysis');await host.locator('.market-map-stock').first().waitFor();
  assert.equal(await page.locator('[data-heatmap-view],[data-heatmap-display]').count(),0,'only market selector remains');
  assert.equal(await host.locator('.market-map-stock').count(),2);assert.match(await host.innerText(),/삼성전자.*\+2\.00%/s);
  await host.locator('[data-map-sector="반도체"]').click();assert.match(await host.locator('.market-map-members').innerText(),/삼성전자.*100,000원.*\+2\.00%/s);
  await page.locator('[data-full-market=US]').click();assert.equal(await host.locator('.market-map-sector').count(),11);
  await host.locator('[data-map-sector="기술"]').click();
  if(width===390){await page.waitForTimeout(3300);assert.equal(await host.locator('.market-map-stock').count(),11,'empty refresh cannot blank cached tiles');assert.equal(await host.locator('.market-map-members').count(),1,'empty refresh retains expanded members');}
  await page.waitForTimeout(6500);
  assert.equal(await page.locator('[data-full-market=US]').getAttribute('aria-pressed'),'true');assert.equal(await host.locator('.market-map-members').count(),1,'poll retains expanded sector');
  assert.doesNotMatch(await host.innerText(),/-8\.00%/,'older Home quote must not overwrite full quotes');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await host.screenshot({path:`artifacts/sector-heatmap/${width}-US.png`});
  const beforeDetailScreens=screenCalls;await host.locator('.market-map-members [data-stock-detail="NVDA"]').click();await page.locator('.quote-main').waitFor();await page.waitForTimeout(300);
  assert.equal(screenCalls,beforeDetailScreens,'US detail does not download additional KR universe');
  const before=calls;await page.goto(base+'/#heatmap');await page.locator('.market-map-stock').first().waitFor();
  assert.ok(calls<=before+1,'grouped map reuses one payload or fresh client cache');
  await page.locator('[data-full-market=KR]').click();await host.screenshot({path:`artifacts/sector-heatmap/${width}-KR.png`});
  if(width===320){fail=true;await page.goto(base+'/#home');await page.goto(base+'/#heatmap');await page.reload();await page.locator('[data-full-heatmap-retry]').waitFor({timeout:10000});assert.ok(await host.locator('.market-map-stock').count()>0,'retain cached map on error');fail=false;await page.locator('[data-full-heatmap-retry]').click();await page.waitForFunction(()=>!document.querySelector('[data-full-heatmap-retry]'));}
  assert.deepEqual(errors,[]);await ctx.close();console.log(`${width}px sector loading, weighting, selection, cache, navigation and overflow passed`);
 }
}finally{await browser.close();}
