import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
const screener={tradeDate:'2026-09-29',stocks:[
 {symbol:'005930.KS',name:'삼성전자',industry:'통신 및 방송 장비 제조업',mainProducts:'통신 장비, 반도체 제조(메모리) 제품',date:'2026-09-29',ret5:4,change1d:-1,trend2060:true,volumeRatio:1.2,technicalScore:20,avgValue20:100000000000},
 {symbol:'000660.KS',name:'SK하이닉스',industry:'반도체 제조업',mainProducts:'DRAM NAND 메모리',date:'2026-09-29',ret5:5,change1d:-2,trend2060:true,volumeRatio:1.3,technicalScore:22,avgValue20:100000000000},
 {symbol:'A.KS',name:'메모리A',industry:'반도체 제조업',mainProducts:'반도체 제조(메모리)',date:'2026-09-29',ret5:3,change1d:-1,trend2060:true,volumeRatio:1,technicalScore:18,avgValue20:2000000000},
]};
await fs.mkdir('artifacts/financial-flow',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,390,430]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];
  let financialAttempts=0;
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://chart-view-pkv8.onrender.com/**',async route=>{
   const url=new URL(route.request().url()),path=url.pathname;
   if(path==='/static/data/screener.json')return route.fulfill({contentType:'application/json',body:JSON.stringify(screener)});
   if(path==='/api/business-report')return route.fulfill({contentType:'application/json',body:'{"available":false}'});
   if(path==='/api/financial-history'&&width===320&&financialAttempts++===0){
    return route.fulfill({status:503,contentType:'application/json',body:'{"detail":"temporary unavailable"}'});
   }
   let body={};
   if(path==='/api/financial-history')body={
   available:true,basis:'연결재무제표',currency:'KRW',
   annual:[{year:2023,revenue:258935494000000,operatingProfit:6566977000000},{year:2024,revenue:300870903000000,operatingProfit:32725961000000},{year:2025,revenue:333605900000000,operatingProfit:43591100000000}],
   annualSourceUrl:'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260310002820',
   interim:{year:2026,quarter:2,revenue:160000000000000,operatingProfit:17000000000000,priorRevenue:155000000000000,priorOperatingProfit:12000000000000},
   interimSourceUrl:'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260814001146',
   };
   if(path==='/api/quotes')body={results:[{ticker:'005930.KS',name:'삼성전자',price:85000,currency:'KRW',change:1.1,asOf:'2026-09-29T07:00:00Z',source:'QA'}]};
   if(path==='/api/compare')body={stocks:[{ticker:'005930.KS',name:'삼성전자',currency:'KRW',return:3.2,startDate:'2026-06-29',endDate:'2026-09-29',priceBasis:'adjusted_close',data:[{time:'2026-06-29',value:0},{time:'2026-08-01',value:2},{time:'2026-09-29',value:3.2}]}]};
   if(path==='/api/valuation')body={stocks:[{ticker:'005930.KS',name:'삼성전자',currency:'KRW',pbr:1.7,roe:12,operatingMargin:13,generatedAt:'2026-09-29T07:00:00Z'}]};
   if(path==='/api/relationship-evidence')body={available:false,relations:[],reason:width===390?'provider_timeout':'no_evidence_backed_direct_relation'};
   if(path==='/api/personalized-news')body={items:[]};
   return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(`${base}/#detail/005930.KS`);
  if(width===320){
   await page.locator('[data-retry-financial]').waitFor({timeout:45000});
   await page.locator('[data-retry-financial]').click();
  }
  await page.locator('.financial-history').waitFor({timeout:45000});
  assert.match(await page.locator('#detail-financial-history').innerText(),/2026년 반기 누적/);
  assert.match(await page.locator('#detail-financial-history').innerText(),/연간 실적/);
  await page.locator('.industry-context-card').waitFor({timeout:45000});
  assert.ok((await page.locator('.industry-name').innerText()).includes('반도체'));
  assert.match(await page.locator('.industry-section.sector').innerText(),/5거래일 상승/);
  assert.match(await page.locator('.industry-section.sector').innerText(),/5거래일 평균/);
  if(width===390)assert.match(await page.locator('.industry-section.supply').innerText(),/기사 제공처가 지연되어 거래 단서를 지금 확인하지 못했어요/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`${width}px detail overflow`);
  await page.screenshot({path:`artifacts/financial-flow/${width}-detail.png`,fullPage:true});
  assert.ok(await page.locator('.bottom-nav [data-tab="home"]').evaluate(el=>el.classList.contains('active')),'direct detail has Home context');
  await page.evaluate(()=>window.__chartviewNavigate('chart'));
  await page.evaluate(()=>window.__chartviewNavigate('detail','005930.KS','삼성전자'));
  assert.ok(await page.locator('.bottom-nav [data-tab="chart"]').evaluate(el=>el.classList.contains('active')),'detail retains Chart origin');
  await page.goto(`${base}/#more`);
  await page.waitForTimeout(200);
  assert.match(await page.locator('.page-intro h2').innerText(),/분석과 도구/);
  await page.screenshot({path:`artifacts/financial-flow/${width}-more.png`,fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`${width}px more overflow`);
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('Financial/detail/More mobile flow QA passed at 320, 390, 430px');
}finally{await browser.close();}
