import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
await fs.mkdir('artifacts/insight-followup',{recursive:true});
const browser=await chromium.launch({headless:true});
try{for(const width of [320,390,430]){
 const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 let financialCalls=0,failed=false,held=false,release;
 const oldUrl='https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260814001146';
 const old={type:'interim',year:2026,quarter:2,label:'2026년 반기 누적',basis:'연결재무제표',currency:'KRW',sourceUrl:oldUrl,current:{revenue:100,operatingProfit:10,netIncome:null,operatingCashFlow:null,inventories:null,receivables:null},previous:{revenue:80,operatingProfit:8,netIncome:null,operatingCashFlow:null,inventories:null,receivables:null}};
 await context.addInitScript(({old})=>{if(!localStorage.getItem('chartview-toss-review-v1'))localStorage.setItem('chartview-toss-review-v1',JSON.stringify({'005930.KS':{filing:old,reviewedAt:'2026-10-04T10:00:00Z',conditions:[]}}));},{old});
 const route=async r=>{
  const u=new URL(r.request().url()),path=u.pathname.replace(/^\/backend/,'');let body={};
  if(path==='/api/financial-history'){
   financialCalls++;if(held)await new Promise(resolve=>release=resolve);
   if(failed)return r.fulfill({status:503,body:'{}'});
   body={available:true,basis:'연결재무제표',currency:'KRW',interim:{year:2026,quarter:3,revenue:140,operatingProfit:14,priorRevenue:90,priorOperatingProfit:9},interimSourceUrl:'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20261114001146'};
  }
  if(path.endsWith('/screener.json')||path==='/api/screener')body={tradeDate:'2026-10-02',stocks:[{symbol:'005110.KS',name:'가격기준확인',market:'KOSPI',date:'2026-10-02',price:112,change1d:-91.07,volumeRatio:20},{symbol:'005930.KS',name:'삼성전자',market:'KOSPI',date:'2026-10-02',price:120000,change1d:2,volumeRatio:4}]};
  if(path==='/api/market-now')body={results:['^KS11','^KQ11','^GSPC','^IXIC'].map(ticker=>({ticker,price:3000,change:1,asOf:'2026-10-02T07:00:00Z'}))};
  if(path==='/api/export-momentum/snapshot')body={period:'2026-09',itemPeriod:'2026-08',summary:{exportsUsdBillion:60,importsUsdBillion:50,balanceUsdBillion:10,exportYoY:12},items:[{key:'semiconductor',name:'반도체',exportsUsdBillion:12,exportWeightYoY:3,unitValueYoY:5}]};
  if(path==='/api/home-bootstrap')body={recommendations:[],day:{top3:[]},home:{results:[]}};
  if(path==='/api/home-snapshot'||path==='/api/quotes')body={results:[]};
  return r.fulfill({contentType:'application/json',body:JSON.stringify(body)});
 };
 await page.route('https://chart-view-pkv8.onrender.com/**',route);await page.route('**/backend/**',route);
 await page.goto(base+'/#home');await page.locator('.saved-research-row').waitFor();
 assert.equal(financialCalls,0,'Home must not automatically request saved reports');
 await page.locator('[data-refresh-saved-research]').click();
 await page.locator('[data-revisit-kind="new"]').waitFor();assert.equal(financialCalls,1);
 assert.match(await page.locator('.saved-research-row').innerText(),/2026년 반기 누적/);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('chartview-toss-review-v1'))['005930.KS'].filing.year),2026);
 failed=true;await page.locator('[data-refresh-saved-research]').click();await page.locator('[data-revisit-kind="unavailable"]').waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('chartview-toss-review-v1'))['005930.KS'].filing.quarter),2,'failure cannot acknowledge or replace baseline');
 await page.locator('[data-feature-route="discover"]').first().click();await page.locator('.analysis-stock').first().waitFor();
 assert.equal(await page.locator('.analysis-stock').count(),2);
 await page.locator('[data-price-basis-toggle]').click();assert.equal(await page.locator('.analysis-stock').count(),1);
 assert.equal(await page.locator('.analysis-stock').getAttribute('data-stock-detail'),'005930.KS');
 assert.equal(JSON.parse(new URL(page.url()).searchParams.get('cv')).screener.filters.priceBasis,'exclude');
 await page.reload();await page.locator('.analysis-stock').waitFor();assert.equal(await page.locator('.analysis-stock').count(),1);
 await page.getByRole('button',{name:'홈',exact:true}).click();await page.locator('[data-refresh-saved-research]').waitFor();
 failed=false;held=true;await page.locator('[data-refresh-saved-research]').click();
 await assert.doesNotReject(async()=>{for(let i=0;i<40&&!release;i++)await page.waitForTimeout(25);assert.ok(release,'held financial request must start before leaving Home');});
 const prior=await page.evaluate(()=>JSON.parse(localStorage.getItem('chartview-toss-review-v1'))['005930.KS'].observation.checkedAt);
 await page.getByRole('button',{name:'관심',exact:true}).click();
 if(release)release();await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('chartview-toss-review-v1'))['005930.KS'].observation.checkedAt),prior,'closed Home cannot write a late report');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);await page.screenshot({path:`artifacts/insight-followup/${width}.png`});await context.close();
 console.log(`followup ${width}px: explicit revisit, failure baseline, warning filters, reload and stale response passed`);
}}finally{await browser.close();}
