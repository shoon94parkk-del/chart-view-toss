const {chromium}=await import(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:5180';
const browser=await chromium.launch({headless:true,channel:process.env.QA_BROWSER_CHANNEL});
await fs.mkdir('output/playwright/insight',{recursive:true});
const kr={symbol:'005930.KS',ticker:'005930.KS',name:'삼성전자',market:'KOSPI',industry:'반도체 제조업',mainProducts:'반도체 제조(메모리) 제품',date:'2026-10-02',price:100000,change:2,change1d:2,rsi14:28,volumeRatio:2.3,ret20:5,ret5:2,avgValue20:1e11,marketCap:300,sessionDate:'2026-10-02',asOf:'2026-10-02T07:00:00Z'};
const us={ticker:'NVDA',name:'엔비디아',market:'US',sector:'Technology',price:100,change:1,marketCap:200,sessionDate:'2026-10-02',asOf:'2026-10-02T07:00:00Z'};
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[],requests=[];let relationsCalls=0;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(/(?:\/backend\/|^https:\/\/chart-view-pkv8\.onrender\.com\/)/,async route=>{
   requests.push(route.request().url());
   const u=new URL(route.request().url()),path=u.pathname.replace('/backend','');let body={};
   if(path==='/api/heatmap/full')body={results:[{...kr,market:'KR'},us],refreshing:false};
   if(path==='/api/home-snapshot')body={macro:{summary:{text:'신호가 혼재합니다. 현재는 부정 압력이 넓게 나타납니다.',latestBasisDate:'2026-10-02'},results:[{symbol:'^VIX',value:16.34,asOf:'2026-09-30'}]},heatmap:{results:[kr,us]}};
   if(path==='/api/market-now')body={results:['^KS11','^KQ11','^GSPC','^IXIC'].map(ticker=>({ticker,price:3000,change:1,asOf:kr.asOf}))};
   if(path==='/static/data/screener.json')body={stocks:[kr],tradeDate:kr.date};
   if(path==='/static/data/company_context.json')body={companies:[kr],source:'KRX KIND',updated:'2026-10-02'};
   if(path==='/api/quotes')body={results:[{...kr,ticker:u.searchParams.get('tickers')||'005930.KS',currency:'KRW'}]};
   if(path==='/api/compare')body={stocks:[{ticker:'005930.KS',data:[{time:'2026-09-01',value:0},{time:'2026-10-02',value:1}]}]};
   if(path==='/api/relationship-evidence'){relationsCalls++;body=relationsCalls===1?{available:false,reason:'provider_timeout'}:{available:true,relations:[]};}
   if(path==='/api/business-report')body={available:false};
   if(path==='/api/consensus')body={periods:{'0q':{endDate:'2026-09-30',earnings:{avg:2},revenue:{avg:10}},'0y':{endDate:'2026-12-31',earnings:{avg:8},revenue:{avg:40}}},currency:'KRW'};
   if(path==='/api/valuation-band')body={years:3,pbr:{stats:{start:'2023-10-06',end:'2026-10-02',observations:157},points:[]}};
   return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(base+'/#heatmap');await page.locator('[data-full-market=US]').click();await page.locator('.market-map-stock').first().waitFor();
  await page.locator('[data-map-sector="기술"]').click();await page.locator('.market-map-members [data-stock-detail=NVDA]').click();await page.locator('.quote-main').waitFor();await page.getByRole('button',{name:'뒤로가기',exact:true}).click();
  await page.locator('[data-map-sector="기술"]').first().waitFor();assert.equal(await page.locator('[data-full-market=US]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.market-map-members').count(),1);
  await page.locator('[data-full-market=KR]').click();assert.equal(await page.locator('.market-map-stock[data-stock-detail="005930.KS"]').isVisible(),true);
  await page.locator('[data-full-market=US]').click();assert.equal(await page.locator('.market-map-stock[data-stock-detail=NVDA]').isVisible(),true);assert.equal(await page.locator('.market-map-stock[data-stock-detail="005930.KS"]').count(),0);
  await page.goto(base+'/#home');await page.locator('#brief-card[data-state=ready]').waitFor();assert.match(await page.locator('#brief-card').innerText(),/넓게 나타납니다\..*VIX 관측 2026-09-30/s);
  await page.goto(base+'/#discover/volume-surge');await page.locator('.analysis-stock').click();await page.locator('#detail-investigation').waitFor();assert.match(await page.locator('#detail-investigation').innerText(),/2\.3배.*2026-10-02|2026-10-02.*2\.3배/s);
  await page.locator('[data-industry-retry=relations]').click();await page.waitForFunction(()=>!document.querySelector('[data-industry-retry=relations]'));assert.equal(relationsCalls,2);
  assert.ok(requests.some(r=>r.includes('business-report?ticker=005930.KS&name=')&&decodeURIComponent(r).includes('삼성전자')),'DART uses the resolved Korean company name');
  assert.ok(requests.some(r=>r.includes('relationship-evidence')&&r.includes('force=true')),'manual retry bypasses the failed backend cache too');
  await page.goto(base+'/#discover/volume-surge');await page.locator('.analysis-stock').waitFor();await page.locator('.screener-advanced>summary').click();await page.locator('[name=volumeMin]').fill('1.5');await page.locator('[name=query]').fill('삼성');
  const actualUrl=page.url();assert.ok(actualUrl.includes('cv='));await page.reload();await page.locator('.analysis-stock').waitFor();assert.equal(await page.locator('[name=volumeMin]').inputValue(),'1.5');assert.equal(await page.locator('[name=query]').inputValue(),'삼성','actual shared conditions survive reload over the route preset');
  await page.goto(base+'/#consensus');await page.locator('#consensus-period').selectOption('0q');assert.match(await page.locator('.surface-label').innerText(),/분기/);
  await page.goto(base+'/#bands');await page.locator('#band-years').selectOption('5');await page.locator('#band-metric').selectOption('pbr');await page.locator('[data-band-coverage]').waitFor();assert.match(await page.locator('[data-band-coverage]').innerText(),/5년 요청.*약 3\.0년/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  await page.screenshot({path:`output/playwright/insight/${width}-bands.png`});await page.close();console.log(`${width}px insight navigation, explanations and recovery passed`);
 }
}finally{await browser.close();}
