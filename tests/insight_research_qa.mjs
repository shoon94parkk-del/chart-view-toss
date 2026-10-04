const {chromium}=await import(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:5180',browser=await chromium.launch({headless:true,channel:process.env.QA_BROWSER_CHANNEL});
const row={symbol:'005930.KS',ticker:'005930.KS',name:'삼성전자',market:'KOSPI',industry:'반도체 제조업',mainProducts:'반도체 제조(메모리) 제품',price:100000,change:2,change1d:2,volumeRatio:2.3,rsi14:28,ret20:5,ret5:3,avgValue20:1e11,date:'2026-10-02',asOf:'2026-10-02T07:00:00Z'};
const peer={...row,symbol:'000660.KS',ticker:'000660.KS',name:'SK하이닉스',mainProducts:'DRAM NAND'};
const latest={period:'2026-08',exportsUsdBillion:38.61,importsUsdBillion:9.92,tradeBalanceUsdBillion:28.69,exportYoY:20,exportWeightYoY:10,unitValueYoY:-5};
const segments=[{key:'memory-total',name:'메모리 IC',exportMoM:18.2},{key:'dram',name:'DRAM',exportMoM:-42},{key:'flash',name:'Flash memory',exportMoM:-19.6}].map(x=>({...x,exportsUsdBillion:2,group:'memory'}));
try{for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:844}}),errors=[],requests=[];let ideaRetry=false,ideaRelationsCalls=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('chartview-toss-selected-v1',JSON.stringify(['005930.KS','NVDA','AAPL']));localStorage.setItem('chartview-toss-research-v1',JSON.stringify({'005930.KS':{question:'영업현금흐름과 순이익 비교',updatedAt:'2026-10-02'}}));localStorage.setItem('chartview-toss-review-v1',JSON.stringify({'005930.KS':{conditions:[{key:'margin',label:'영업이익률 비교',baseline:{value:20,label:'2025년'},savedAt:'2026-10-03'}]}}));});
 await page.route(/(?:\/backend\/|^https:\/\/chart-view-pkv8\.onrender\.com\/)/,async route=>{
  const u=new URL(route.request().url()),path=u.pathname.replace('/backend','');requests.push(u);let body={};
  if(path==='/api/export-momentum')body={period:'2026-09',itemPeriod:'2026-08',summary:{exportsUsdBillion:60,exportYoY:4},items:[{...latest,key:'semiconductor',name:'반도체',note:'HS 8541+8542 합산'}],semiconductorBreakdown:segments};
  if(path==='/api/export-momentum/item-detail')body={key:'semiconductor',name:'반도체',note:'HS 8541+8542',period:'2026-08',history:[latest],countries:[{name:'미국',exportsUsdBillion:3,sharePct:10}]};
  if(path==='/static/data/company_context.json')body={companies:[row,peer],source:'KRX KIND',updated:'2026-10-02'};
  if(path==='/static/data/screener.json')body={stocks:[row,peer],tradeDate:'2026-10-02'};
  if(path==='/api/quotes')body={results:[{...row,ticker:u.searchParams.get('tickers')||row.symbol,currency:'KRW'}]};
  if(path==='/api/compare')body={stocks:(u.searchParams.get('tickers')||row.symbol).split(',').map(ticker=>({ticker,data:[{time:'2026-09-01',value:0},{time:'2026-10-02',value:3}]}))};
  if(path==='/api/market-now')body={results:['^KS11','^KQ11','^GSPC','^IXIC'].map(ticker=>({...row,ticker}))};
  if(path==='/api/financial-history')body={available:true,basis:'연결재무제표',currency:'KRW',interim:{year:2026,quarter:2,revenue:120,operatingProfit:20,priorRevenue:100,priorOperatingProfit:10},interimSourceUrl:'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260814001146'};
  if(path==='/api/business-report')body={available:true,items:[{name:'반도체 제조',share:100,revenue:100}],source:'DART QA',reportYear:2025};
  if(path==='/api/relationship-evidence'&&ideaRetry){ideaRelationsCalls++;body=ideaRelationsCalls===1?{available:false,reason:'provider_timeout'}:{available:true,relations:[]};}
  return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto(base+'/#exports');await page.locator('[data-export-item=semiconductor]').first().click();await page.locator('[data-export-research-company]').first().waitFor();
 assert.match(await page.locator('.export-research').innerText(),/KRX KIND.*2026-10-02/s);await page.locator('[data-export-research-country]').selectOption('0');await page.locator('[data-export-research-company]').first().click();
 await page.locator('#detail-investigation').waitFor();assert.match(await page.locator('#detail-investigation').innerText(),/미국.*2026-08.*3?0?\.0.*억|미국.*2026-08/s);assert.match(await page.locator('#detail-investigation').innerText(),/수혜는 확인되지/);
 await page.locator('#detail-investigation [data-detail-jump]').click();await page.locator('#detail-industry-context .industry-context-card').waitFor();
 await page.getByRole('button',{name:'뒤로가기',exact:true}).click();await page.locator('[data-export-research-country]').waitFor();assert.equal(await page.locator('[data-export-research-country]').inputValue(),'0','export scope survives detail/back');
 assert.match(await page.locator('#export-memory').innerText(),/MoM 증가율.*메모리 IC.*MoM 감소율.*DRAM/s);
 await page.goto(base+'/#watch');assert.equal(await page.locator('.watch-detail-card').count(),0);await page.locator('[data-saved-jump=detail-research-card]').click();await page.locator('#research-question').waitFor();assert.equal(await page.locator('#research-question').inputValue(),'영업현금흐름과 순이익 비교');
 await page.locator('[data-research-example="2"]').click();assert.match(await page.locator('#research-question').inputValue(),/SK하이닉스/);await page.locator('.research-analyze').click();await page.locator('.research-table').waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('chartview-toss-selected-v1')).length),3,'report comparison leaves global chart selection alone');
 await page.locator('[data-research-chart]').click();await page.locator('#chart-canvas').waitFor();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('chartview-toss-selected-v1'))),['005930.KS','000660.KS']);
 await page.goto(base+'/#watch');await page.locator('[data-saved-jump=detail-report-review]').click();await page.locator('.tracked-condition').waitFor();assert.match(await page.locator('.tracked-condition').innerText(),/저장 당시.*2025년/s);
 ideaRetry=true;const reportCount=requests.filter(u=>u.pathname.endsWith('/business-report')).length;await page.goto(base+'/#ideas');await page.reload();await page.locator('.idea-candidate').first().waitFor();assert.equal(requests.filter(u=>u.pathname.endsWith('/business-report')).length,reportCount,'LAB does not fetch reports until expanded');
 const title=await page.locator('.idea-card h3').first().innerText();await page.locator('details[data-industry-context]').first().locator('summary').click();const wrap=page.locator('.idea-candidate-wrap').first();await wrap.locator('[data-industry-retry=relations]').waitFor();await wrap.locator('.industry-report').waitFor();await wrap.locator('[data-industry-retry=relations]').click();await page.waitForFunction(()=>!document.querySelector('.idea-candidate-wrap [data-industry-retry=relations]'));assert.equal(ideaRelationsCalls,2);assert.equal(await wrap.locator('.industry-report').count(),1,'relation retry retains the ready report');await page.locator('.idea-candidate').first().click();assert.match(await page.locator('#detail-investigation').innerText(),new RegExp(title));
 await page.goto(base+'/#home');await page.locator('.home-changes').scrollIntoViewIfNeeded();await page.locator('.home-change-card').first().waitFor();assert.equal(await page.locator('.home-change-card:visible').count(),2);await page.locator('[data-home-change-toggle]').click();assert.equal(await page.locator('.home-change-card:visible').count(),3);assert.match(await page.locator('.home-changes').innerText(),/2026-09.*2026-08.*2026-10-02/s);
 assert.equal(requests.filter(u=>u.pathname.endsWith('/export-momentum/item-detail')).length,1,'return reuses the item request cache');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 await fs.mkdir('output/playwright/insight',{recursive:true});await page.screenshot({path:`output/playwright/insight/${width}-home-changes.png`});await page.close();console.log(`${width}px export, saved evidence, peer comparison, LAB and Home passed`);
}}finally{await browser.close();}
