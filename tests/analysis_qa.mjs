import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true}),base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
await fs.mkdir('artifacts/analysis-qa',{recursive:true});
try{
 for(const width of [320,390,430]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://chart-view-pkv8.onrender.com/**',async route=>{
   const url=new URL(route.request().url()),path=url.pathname;
   let body={};
   if(path==='/static/data/screener.json')body={tradeDate:'2026-09-21',stocks:Array.from({length:85},(_,i)=>({name:`검증 종목 ${i}`,symbol:`${String(i).padStart(6,'0')}.KS`,market:i%2?'KOSDAQ':'KOSPI',date:'2026-09-21',price:10000+i,change1d:i%3===0?null:i,volumeRatio:1.5,rsi14:45,ret20:2}))};
   if(path==='/static/data/heatmap.json')body={updated:'2026-09-21',sectors:[{name:'Technology',stocks:[{ticker:'AAPL',change:0,price:200},{ticker:'MSFT',change:-1,price:400}]}]};
   if(path==='/api/consensus')body={ticker:url.searchParams.get('ticker'),currency:'USD',asOf:'2026-09-21',source:'Test provider',periods:{'0y':{endDate:'2026-12-31',earnings:{avg:4,low:3,high:5,analysts:10},epsTrend:{current:4,'30daysAgo':3},revisions:{up30:1,down30:0},revenue:{avg:1000000}}}};
   if(path==='/api/valuation-band')body={source:'Test provider',generatedAt:'2026-09-21',method:'재무자료 시차 적용',per:{points:[{time:'2025-01-01',value:10},{time:'2026-01-01',value:20}],stats:{current:20,median:15,p20:12,p80:18,observations:2,start:'2025-01-01',end:'2026-01-01'}},pbr:{points:[],stats:null}};
   if(path==='/api/compare')body={stocks:[],errors:[]};
   return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  for(const tab of ['discover','heatmap','consensus','bands','tools']){
   await page.goto(`${base}/#${tab}`);await page.waitForSelector('#analysis-body:not(:has(.skeleton))');
   await page.waitForTimeout(120);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`${width}px ${tab} overflow`);
   if(tab==='discover'){
    assert.equal(await page.locator('.analysis-stock').count(),30);
    await page.click('#screener-more');assert.equal(await page.locator('.analysis-stock').count(),60);
    await page.locator('[name=market]').selectOption('KOSDAQ');assert.match(await page.locator('.analysis-meta').innerText(),/42개/);
    await page.locator('[name=query]').fill('없는 종목');assert.equal(await page.locator('.analysis-stock').count(),0);
    await page.getByRole('button',{name:'초기화',exact:true}).click();assert.equal(await page.locator('.analysis-stock').count(),30);
   }
   if(tab==='consensus'){await page.waitForSelector('.analysis-metrics');await page.selectOption('#consensus-period','+1y');assert.match(await page.locator('#analysis-body').innerText(),/제공되지/);}
   if(tab==='bands'){await page.waitForSelector('#band-chart canvas');await page.selectOption('#band-metric','pbr');assert.match(await page.locator('#analysis-body').innerText(),/제공되지/);}
   await page.screenshot({path:`artifacts/analysis-qa/${width}-${tab}.png`,fullPage:true});
  }
  await page.goto(`${base}/#chart`);await page.locator('summary').filter({hasText:'기간 직접 지정'}).click();
  await page.fill('[name=start]','2026-01-01');await page.fill('[name=end]','2026-03-01');
  const request=page.waitForRequest(r=>r.url().includes('/api/compare')&&r.url().includes('start=2026-01-01'));
  await page.getByRole('button',{name:'기간 적용',exact:true}).click();assert.match((await request).url(),/end=2026-03-01/);
  assert.deepEqual(errors,[],`${width}px JavaScript errors`);await page.close();
 }
 console.log('Analysis QA passed: 3 widths, all rows/filter/reset/paging, consensus periods, band missing data, custom dates');
}finally{await browser.close();}
