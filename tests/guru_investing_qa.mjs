import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
const version='0123456789abcdef0123';
const row=i=>({symbol:`${String(i+1).padStart(6,'0')}.KS`,name:`검증용 기업 ${String(i).padStart(2,'0')}`,market:'KOSPI',tradeDate:'2026-10-02',annualReportYear:2025,metrics:{roeAvg3:18,debtRatio:35,epsCagr3:20,historicalPEG:.8,annualPE:16,basicEps:100,quarterEpsGrowth:30,breakoutVolumeRatio:1.8,relativeStrengthPercentile:90,distance52HighPct:-5,annualROA:30,valueRank:i+1},checks:[{id:'roe',label:'꾸준한 자본수익성',value:18,threshold:'평균 ≥15%',passed:true}]});
const strategy=()=>({universeCount:65,unsupportedCount:1,pendingCount:1,insufficientCount:1,evaluatedCount:62,failedCount:0,matchedCount:62,results:Array.from({length:62},(_,i)=>row(i))});
const names=['buffett','lynch','oneil','minervini','greenblatt'];
const snapshot=()=>({schemaVersion:1,criteriaVersion:'cv-gurus-v2',snapshotVersion:version,tradeDate:'2026-10-02',generatedAt:'2026-10-05T06:00:00+09:00',financialAsOf:'2026-10-05T05:00:00+09:00',strategies:Object.fromEntries(names.map(n=>[n,strategy()]))});
const proof=symbol=>({symbol,snapshotVersion:version,tradeDate:'2026-10-02',basis:'CFS',annual:[2022,2023,2024,2025].map(year=>({year,netIncome:1e9,assets:3e9,operatingCashFlow:2e9,equity:5e9,basicEps:100})),sources:{2025:{equity:{receiptNo:'20260312000123',reportYear:2025,filingDate:'2026-03-12',sourceUrl:'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260312000123'}}},quarter:{year:2026,quarter:2,basicEps:130,priorBasicEps:100,revenue:2e9,priorRevenue:1e9,receiptNo:'20260814000123',filingDate:'2026-08-14',sourceUrl:'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260814000123'},technical:{tradeDate:'2026-10-02',barCount:273,price:1600,sma50:1500,sma150:1400,sma200:1300,sma200Prior20:1200,high52:1650,low52:900,return252:60,relativeStrengthPercentile:90,rsObservedCount:2400,rsUniverseCount:2600,breakoutDate:'2026-10-01',breakoutLevel:1580,breakoutExtensionPct:1.3},strategies:Object.fromEntries(names.map(n=>[n,{status:'matched',checks:row(0).checks,metrics:row(0).metrics}]))});
await fs.mkdir('output/playwright/gurus',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,390,430]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];
  let mode='ready',conflict=false,delay=0,sourceUrl='';
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.open=url=>{window.__opened=url;return null;};});
  await page.route('https://chart-view-pkv8.onrender.com/**',async route=>{
   const u=new URL(route.request().url()),p=u.pathname;let body={};
   if(p==='/static/data/guru_screening.json'){
    if(mode==='error')return route.fulfill({status:503,body:'{}'});
    body=snapshot();
    if(mode!=='ready')for(const s of Object.values(body.strategies)){
     s.results=[];s.matchedCount=0;s.failedCount=62;
     if(mode==='pending'){s.evaluatedCount=0;s.failedCount=0;s.pendingCount=63;}
    }
    if(delay)await new Promise(r=>setTimeout(r,delay));
   }
   if(p.startsWith('/api/guru-investing/')){
    if(conflict)return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({detail:'changed version'})});
    body=proof(decodeURIComponent(p.split('/').at(-1)));
   }
   if(p==='/api/quotes')body={results:[{ticker:u.searchParams.get('tickers'),name:row(0).name,price:1600,currency:'KRW',date:'2026-10-02',asOf:'2026-10-02T06:00:00Z'}]};
   if(p==='/api/valuation'){const tickers=(u.searchParams.get('tickers')||'').split(',').filter(Boolean);body={stocks:tickers.map(ticker=>({ticker,roa:30,trailingPE:12,forwardPE:10,fieldMeta:{roa:{period:'TTM net income / latest reported assets'},trailingPE:{period:'TTM'}}}))};}
   if(p==='/api/compare')body={stocks:[]};
   if(p==='/static/data/screener.json')body={tradeDate:'2026-10-02',stocks:[]};
   return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  const noOverflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}px overflow`);
  await page.goto(base+'/');await page.evaluate(()=>sessionStorage.setItem('cv-guru-session-v1','null'));
  await page.goto(base+'/gurus/');await page.locator('.guru-candidate').first().waitFor();
  assert.equal(await page.locator('.guru-candidate').count(),30);
  const first=await page.locator('.guru-row').first().boundingBox();
  assert.ok(first.height>=72&&first.height<=88,`row ${first.height}`);
  if(width===390)assert.ok(first.y<=320,`first candidate y ${first.y}`);
  assert.ok((await page.locator('.guru-page small,.guru-page button').evaluateAll(xs=>xs.map(x=>parseFloat(getComputedStyle(x).fontSize)))).every(x=>x>=12));
  await noOverflow();await page.screenshot({path:`output/playwright/gurus/${width}-buffett.png`});
  await page.locator('.guru-guide summary').click();assert.match(await page.locator('.guru-guide').innerText(),/차트뷰가 정한 수치 기준/);await page.locator('.guru-guide summary').click();
  await page.locator('.guru-more').click();assert.equal(await page.locator('.guru-candidate').count(),60);
  await page.getByRole('searchbox').fill('000001');assert.equal(await page.locator('.guru-candidate').count(),1);
  await page.locator('.guru-expand').click();await page.locator('.guru-table-wrap').waitFor();
  assert.match(await page.locator('.guru-checks').innerText(),/18%/);
  await page.locator('.guru-source-links button').click();sourceUrl=await page.evaluate(()=>window.__opened);assert.match(sourceUrl,/dart.fss.or.kr/);
  await page.locator('.guru-next summary').click();assert.match(await page.locator('.guru-next').innerText(),/일시적/);
  await page.locator('.guru-stock').click();await page.locator('.quote-main').waitFor();
  await page.getByRole('button',{name:'뒤로가기',exact:true}).click();await page.locator('.guru-candidate').waitFor();
  assert.equal(await page.getByRole('searchbox').inputValue(),'000001');assert.equal(await page.locator('.guru-expand').getAttribute('aria-expanded'),'true');
  await page.reload();await page.locator('.guru-candidate').waitFor();assert.equal(await page.getByRole('searchbox').inputValue(),'000001');
  await page.locator('[data-guru-strategy=lynch]').click();await page.locator('.guru-table-wrap').waitFor();
  assert.ok((await page.locator('.guru-row').first().boundingBox()).height<=88,'Lynch metric labels must fit a compact mobile row');
  assert.match(page.url(),/gurus\/lynch/);assert.match(await page.locator('.guru-evidence').innerText(),/연간 실적 PER 16배/);
  await noOverflow();await page.screenshot({path:`output/playwright/gurus/${width}-lynch-evidence.png`});
  for(const name of names.slice(2)){
   await page.locator(`[data-guru-strategy=${name}]`).click();await page.locator('.guru-table-wrap').first().waitFor();
   assert.match(page.url(),new RegExp('gurus/'+name));
   assert.equal(await page.locator(`[data-guru-strategy=${name}]`).getAttribute('aria-pressed'),'true');
   assert.ok((await page.locator('.guru-row').first().boundingBox()).height<=88,`${name} row must stay compact`);
    let text=await page.locator('.guru-evidence').innerText();
    assert.match(text,name==='oneil'?/단일3개월/:name==='minervini'?/253|273거래일/:/ROA\/PER 대안/);
    if(name==='greenblatt'){
     await page.waitForFunction(()=>document.querySelector('.guru-current-summary')?.textContent?.includes('TTM 재확인 · 충족'));
     assert.match(await page.locator('.guru-current-summary').innerText(),/TTM 재확인.*충족/);
     assert.match(await page.locator('.guru-reason-label').first().innerText(),/25년.*TTM충족/);
     text=await page.locator('.guru-evidence').innerText();
     assert.match(text,/2025년 확정 실적 \+ 2026-10-02 종가/);
     assert.match(text,/TTM ROA 30%.*TTM PER 12배.*Forward PER 10배/);
    }
   await noOverflow();await page.reload();await page.locator('.guru-table-wrap').first().waitFor();
   await page.locator('.guru-evidence-actions [data-stock-detail]').click();await page.locator('.quote-main').waitFor();
   await page.getByRole('button',{name:'뒤로가기',exact:true}).click();await page.locator('.guru-table-wrap').first().waitFor();
   await page.screenshot({path:`output/playwright/gurus/${width}-${name}.png`});
  }
  await page.locator('.guru-evidence-actions [data-tab=discover]').click();await page.locator('.screener-preset-panel').waitFor();
  await page.getByRole('button',{name:'뒤로가기',exact:true}).click();await page.locator('.guru-candidate').waitFor();
  await page.getByRole('searchbox').fill('없는 기업');assert.match(await page.locator('.guru-empty').innerText(),/검색 조건/);
  await page.getByRole('searchbox').fill('');await page.getByLabel('선정 기업 시장').selectOption('KOSDAQ');assert.match(await page.locator('.guru-empty').innerText(),/검색 조건/);
  await page.getByLabel('선정 기업 시장').selectOption('');
  conflict=true;await page.locator('.guru-expand').nth(1).click();await page.locator('.guru-retry-evidence').waitFor();assert.match(await page.locator('.guru-evidence').innerText(),/결과가 갱신/);
  conflict=false;await page.locator('.guru-retry-evidence').click();await page.locator('.guru-table-wrap').waitFor();
  mode='error';conflict=true;await page.locator('.guru-expand').nth(2).click();await page.locator('.guru-retry-evidence').click();await page.locator('.guru-refresh-error').waitFor();assert.ok(await page.locator('.guru-candidate').count()>0);
  conflict=false;mode='empty';await page.reload();await page.locator('.guru-empty').waitFor();assert.match(await page.locator('.guru-empty').innerText(),/条件|조건을 모두 충족한 기업이 없어요/);
  mode='pending';await page.reload();await page.locator('.guru-empty').waitFor();assert.match(await page.locator('.guru-empty').innerText(),/순차적으로/);
  mode='error';await page.reload();await page.locator('.guru-retry').waitFor();mode='ready';await page.locator('.guru-retry').click();await page.locator('.guru-candidate').first().waitFor();
  delay=200;await page.locator('[data-guru-strategy=buffett]').click();await page.locator('[data-guru-strategy=lynch]').click();await page.locator('.guru-candidate').first().waitFor();assert.equal(await page.locator('[data-guru-strategy=lynch]').getAttribute('aria-pressed'),'true');
  await noOverflow();assert.deepEqual(errors,[]);await page.close();console.log(`${width}px: compact rows, filters, proof, sources, Back/Reload, conflict and offline recovery passed`);
 }
}finally{await browser.close();}

