import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.QA_BROWSER_EXECUTABLE?{executablePath:process.env.QA_BROWSER_EXECUTABLE}:{})});
const base=process.env.QA_BASE_URL||'http://127.0.0.1:5180';
const observe=process.env.QA_OBSERVE==='1';
const out=process.env.QA_OUTPUT||'artifacts/strategy-report';
await fs.mkdir(out,{recursive:true});
const common={date:'2026-10-02',avgValue20:2e9,volumeRatio:2,industry:'반도체 제조업',mainProducts:'반도체',ret5:1,ret20:4,trend2060:true};
const stocks=[
 {...common,symbol:'005110.KS',name:'한창',market:'KOSPI',price:112,previousClose:1254,change1d:-91.07,rsi14:0,volumeRatio:20,trend2060:false},
 {...common,symbol:'005930.KS',name:'삼성전자',market:'KOSPI',price:276000,change1d:0,rsi14:60},
 {...common,symbol:'0004V0.KQ',name:'엔비알모션',market:'KOSDAQ',price:6180,change1d:0.32,rsi14:53.7},
];
const evidence=[];
try{
 for(const width of [320,390,430]){
  const context=await browser.newContext({viewport:{width,height:844}});
  const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  const mock=async route=>{
   const url=new URL(route.request().url()),path=url.pathname.replace(/^\/backend/,'');requests.push(path);
   const body=path==='/static/data/screener.json'?{tradeDate:'2026-10-02',stocks}:path==='/api/quotes'?{results:stocks.map(s=>({...s,ticker:s.symbol,currency:'KRW',asOf:'2026-10-02T06:30:00Z'}))}:{stocks:[],results:[],items:[],picks:[],recommendations:[],available:false};
   return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  };
  await page.route('**/backend/**',mock);await page.route('https://chart-view-pkv8.onrender.com/**',mock);
  await page.goto(base+'/#discover',{waitUntil:'domcontentloaded'});
  await page.locator('#screener-filters').waitFor();
  await page.locator('[data-screener-preset="rsi-oversold"]').click();
  const hanchang=page.locator('.analysis-stock[data-stock-detail="005110.KS"]');
  await hanchang.waitFor();
  const warning=await hanchang.locator('.data-quality-warning').count();
  if(!observe){
   assert.equal(warning,1);assert.match(await hanchang.innerText(),/-91.07%/);assert.match(await hanchang.innerText(),/RSI 0/);
   assert.doesNotMatch(await hanchang.locator('.data-quality-warning').innerText(),/감자|상장폐지/);
  }
  await page.locator('[data-clear-preset]').click();
  const clearedRsi=await page.locator('[name="rsiMax"]').inputValue();
  if(!observe)assert.equal(clearedRsi,'','technical clear must clear the actual form condition');
  await page.locator('#screener-filters button[type="reset"]').click();
  await page.locator('[name="query"]').fill('삼성');
  await page.locator('[name="market"]').selectOption('KOSPI');
  await page.locator('[data-screener-preset="rsi-oversold"]').click();
  assert.equal(await page.locator('[name="query"]').inputValue(),'삼성');
  assert.equal(await page.locator('[name="market"]').inputValue(),'KOSPI');
  const emptyText=await page.locator('#analysis-body').innerText();
  if(!observe){
   assert.match(emptyText,/검색어·시장에 맞는 종목 1개가 기술 조건에서 제외/);
   await page.locator('[data-clear-technical]').click();
   await page.locator('.analysis-stock[data-stock-detail="005930.KS"]').waitFor();
   assert.equal(await page.locator('[name="query"]').inputValue(),'삼성');assert.equal(await page.locator('[name="market"]').inputValue(),'KOSPI');
   assert.equal(await page.locator('[name="rsiMax"]').inputValue(),'');
   await page.locator('.analysis-stock[data-stock-detail="005930.KS"]').click();await page.locator('#detail-name').waitFor();
   await page.locator('[data-back]').first().click();await page.locator('#screener-filters').waitFor();
   assert.equal(await page.locator('[name="query"]').inputValue(),'삼성');assert.equal(await page.locator('[name="market"]').inputValue(),'KOSPI');
   assert.equal(await page.locator('[name="rsiMax"]').inputValue(),'');
   await page.locator('[name="rsiMax"]').fill('10');assert.match(await page.locator('#analysis-body').innerText(),/기술 조건/);
   await page.locator('[data-clear-preset]').click();await page.locator('.analysis-stock[data-stock-detail="005930.KS"]').waitFor();
   await page.locator('[name="query"]').fill('없는종목');assert.match(await page.locator('#analysis-body').innerText(),/종목명·코드와 시장/);
   assert.equal(await page.locator('[data-clear-technical]').count(),0);
  }
  await page.locator('#screener-filters button[type="reset"]').click();
  const alphanumeric=page.locator('.analysis-stock[data-stock-detail="0004V0.KQ"]');await alphanumeric.waitFor();
  assert.equal(await alphanumeric.locator('.data-quality-warning').count(),0);
  await page.screenshot({path:`${out}/${width}-${observe?'before':'after'}-screener.png`,fullPage:true});
  await page.evaluate(()=>window.__chartviewNavigate('ideas'));
  const idea=page.locator('[data-idea-symbol="005110.KS"]');await idea.waitFor();
  const ideaWarning=await idea.locator('.data-quality-warning').count();
  if(!observe)assert.equal(ideaWarning,1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:`${out}/${width}-${observe?'before':'after'}-ideas.png`,fullPage:true});
  assert.equal(requests.some(p=>p.includes('export-momentum')),false,'no unrelated export requests');
  evidence.push({width,warning,clearedRsi,emptyText,ideaWarning,errors,mode:observe?'before':'verified'});
  await context.close();
 }
 await fs.writeFile(`${out}/${observe?'before':'after'}.json`,JSON.stringify(evidence,null,2));
 console.log(JSON.stringify(evidence));
}finally{await browser.close();}
