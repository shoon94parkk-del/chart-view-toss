import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
await fs.mkdir('artifacts/investment-review',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,390,430]){
  const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let quarterCalls=0,corrected=false,changed=false,newPeriod=false,indexStockRequests=0,financialHold=null,financialFailure=false;
  const report=(peer=false)=>({available:true,basis:'연결재무제표',currency:'KRW',interim:{year:2026,quarter:newPeriod?3:2,revenue:peer?100:changed?90:corrected?130:120,operatingProfit:peer?10:12,priorRevenue:80,priorOperatingProfit:8},interimSourceUrl:`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${newPeriod?'20261114001146':corrected?'20260815001146':'20260814001146'}`});
  const rows=Array.from({length:8},(_,i)=>({year:2024+Math.floor((i+2)/4),quarter:(i+2)%4+1,available:true,revenue:1e12*(10+i),operatingProfit:1e12*(i-2),margin:(i-2)/(10+i)*100,revenueGrowth:10,profitGrowth:i===7?null:20,currency:'KRW',basis:'CFS',method:(i+2)%4===3?'annual_minus_q3':'reported_three_months',sourceUrls:['https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260814001146']}));
  const mock=async route=>{
   const url=new URL(route.request().url()),path=url.pathname.replace(/^\/backend/,'');let body={};
   if(path==='/api/market-now')body={results:['^KS11','^KQ11','^GSPC','^IXIC'].map(ticker=>({ticker,price:3000,change:1,asOf:'2026-10-01T07:00:00Z'}))};
   if(path==='/api/quotes')body={results:[{ticker:(url.searchParams.get('tickers')||'005930.KS').split(',')[0],price:120000,currency:'KRW',change:2.93,asOf:'2026-10-01T07:00:00Z',source:'QA provider'}]};
   if(path==='/api/compare')body={stocks:[{ticker:url.searchParams.get('tickers'),return:10,currency:'KRW',startDate:'2026-07-01',endDate:'2026-10-01',priceBasis:'close',data:[{time:'2026-07-01',value:0,price:3000},{time:'2026-09-01',value:5,price:3150},{time:'2026-10-01',value:10,price:3300}]}]};
   if(path==='/api/financial-history'){if(url.searchParams.get('ticker').startsWith('^'))indexStockRequests++;if(financialHold)await financialHold;if(financialFailure)return route.fulfill({status:503,body:'{}'});body=report(url.searchParams.get('ticker')==='000660.KS');}
   if(path==='/api/valuation'){if(url.searchParams.get('tickers')?.startsWith('^'))indexStockRequests++;body={stocks:[]};}
   if(path==='/api/financial-quarters'){
    quarterCalls++;
    if(quarterCalls===1&&width===320)return route.fulfill({status:503,body:'{}'});
    const ready=quarterCalls>=(width===320?3:2),refreshing=quarterCalls===(width===320?3:2);
    body=!ready?{available:false,state:'loading'}:{available:true,state:'ready',refreshing,basis:'연결재무제표',quarters:rows,ttm:{revenue:refreshing?62e12:63e12,operatingProfit:14e12,margin:22.6,currency:'KRW',start:'2025 Q3',end:'2026 Q2'}};
   }
   return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  };
  await page.route('https://chart-view-pkv8.onrender.com/**',mock);await page.route('**/backend/**',mock);
  await page.goto(`${base}/#detail/005930.KS`);
  await page.locator('.quote-compact').waitFor();
  const box=await page.locator('.quote-compact').boundingBox();assert.ok(box.height<180,`${width}: compact quote height ${box.height}`);
  assert.match(await page.locator('.quote-main').innerText(),/전 거래일 대비/);
  await page.locator('.quote-provenance summary').click();assert.match(await page.locator('.quote-provenance').innerText(),/QA provider/);
  await page.waitForTimeout(5200);assert.equal(await page.locator('.quote-provenance').evaluate(el=>el.open),true,'live polling keeps provenance open');await page.locator('.quote-provenance summary').click();
  if(width===320){await page.locator('[data-quarter-retry]').click();}
  else assert.ok(quarterCalls>=1);
  await page.locator('.quarter-chart').waitFor({timeout:15000});
  await page.locator('[data-quarter-key="operatingProfit"]').click();assert.equal(await page.locator('[data-quarter-key="operatingProfit"]').getAttribute('aria-pressed'),'true');
  await page.locator('.quarter-table-details summary').click();assert.equal(await page.locator('.quarter-table-details tbody tr:not(.quarter-source-row)').count(),8);
  await page.waitForFunction(()=>document.querySelector('.review-ttm')?.textContent.includes('63조'),{},{timeout:10000});
  assert.equal(await page.locator('.quarter-table-details').evaluate(el=>el.open),true,'background refresh retains expanded table');
  assert.match(await page.locator('.quarter-table-details').innerText(),/연간 − 3분기 누적/);
  await page.locator('.quarter-table-details summary').click();
  await page.locator('[data-review-ack]').click();assert.match(await page.locator('.report-review').innerText(),/마지막 확인한 공시와 같아요/);
  await page.locator('#research-question').fill('하이닉스와 매출 및 영업이익 증가율을 비교해줘');await page.locator('.research-analyze').click();
  await page.locator('[data-track-condition="0"]').click();await page.locator('.tracked-condition').waitFor();
  assert.match(await page.locator('.tracked-condition').innerText(),/SK하이닉스/);
  const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('chartview-toss-review-v1')));
  assert.equal(persisted['005930.KS'].conditions.length,1);assert.ok(persisted['005930.KS'].filing.sourceUrl);
  await page.reload();await page.locator('[data-tracked-results][aria-busy="false"] .tracked-condition').waitFor();
  corrected=true;changed=true;await page.reload();await page.locator('[data-tracked-results][aria-busy="false"] .tracked-condition').waitFor();
  assert.match(await page.locator('.report-review').innerText(),/같은 기간의 공시 수치/);assert.match(await page.locator('.tracked-condition').innerText(),/달라짐/);
  newPeriod=true;await page.reload();await page.locator('[data-review-ack]').waitFor();assert.match(await page.locator('.report-review').innerText(),/새 기간의 공시/);
  let release;financialHold=new Promise(resolve=>release=resolve);financialFailure=true;
  await page.reload();await page.locator('.tracked-condition').waitFor();
  assert.match(await page.locator('.tracked-condition').innerText(),/SK하이닉스/);assert.match(await page.locator('.tracked-condition').innerText(),/저장 당시/);
  assert.match(await page.locator('.tracked-condition').innerText(),/공시 확인 중/);
  release();financialHold=null;await page.locator('[data-tracked-results][aria-busy="false"]').waitFor();
  assert.match(await page.locator('.tracked-condition').innerText(),/확인 불가/);
  financialFailure=false;await page.locator('[data-retry-financial]').click();await page.locator('[data-review-ack]').waitFor();
  if(width===390){
   await page.route('**/reportReviewView-*.js',route=>route.abort());await page.reload();
   await page.locator('.financial-history').waitFor();await page.locator('[data-reload-review]').waitFor();
   assert.match(await page.locator('#detail-report-review').innerText(),/이 기기에 보관/);
   await page.unroute('**/reportReviewView-*.js');await page.locator('[data-reload-review]').click();
   await page.locator('[data-tracked-results][aria-busy="false"] .tracked-condition').waitFor();
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'no body overflow');
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`artifacts/investment-review/${width}-detail.png`});
  await page.locator('#detail-financial-quarters').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/investment-review/${width}-quarters.png`});
  const selected=await page.evaluate(()=>localStorage.getItem('chartview-toss-selected-v1'));
  await page.goto(`${base}/#home`);await page.locator('.market-grid [data-stock-detail="^KS11"]').click();
  await page.waitForFunction(()=>document.querySelector('#detail-period-label')?.textContent.includes('지수 흐름'));
  assert.match(await page.locator('#detail-period-label').innerText(),/지수 흐름 · pt/);
  assert.equal(await page.locator('#detail-financial-block').count(),0);assert.equal(await page.locator('#detail-metrics-section').count(),0);assert.equal(indexStockRequests,0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('chartview-toss-selected-v1')),selected,'index tap preserves selected comparisons');
  await page.screenshot({path:`artifacts/investment-review/${width}-index.png`});
  assert.deepEqual(errors,[]);await context.close();console.log(`${width}px compact quotes, index, quarter retry, filing correction/new period, saved peer condition passed`);
 }
}finally{await browser.close();}
