import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('chartview-toss-watchlist-v1',JSON.stringify([
   {symbol:'000660.KS',name:'SK하이닉스'},
   {symbol:'005930.KS',name:'삼성전자'},
  ])));
  await page.route('https://chart-view-pkv8.onrender.com/**',route=>{
   const path=new URL(route.request().url()).pathname;
   const body=path==='/api/search'?{results:[
    {symbol:'AAPL',name:'애플',market:'NASDAQ'},
    {symbol:'005930.KS',name:'삼성전자',market:'KOSPI'},
    {symbol:'000660.KS',name:'SK하이닉스',market:'KOSPI'},
   ]}:{stocks:[],results:[],items:[]};
   return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(`${base}/#chart`);
  await page.locator('#open-compare-selector').click();
  assert.deepEqual(await page.locator('#selector-results [data-selector-symbol]').evaluateAll(nodes=>nodes.map(el=>el.dataset.selectorSymbol)),['000660.KS','005930.KS']);
  await page.locator('#selector-search-input').fill('삼성');
  await page.locator('#selector-results [data-selector-symbol="AAPL"]').waitFor();
  assert.deepEqual(await page.locator('#selector-results [data-selector-symbol]').evaluateAll(nodes=>nodes.map(el=>el.dataset.selectorSymbol)),['000660.KS','005930.KS','AAPL']);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`${width}px selector overflow`);
  await page.locator('.selector-close').click();
  await page.goto(`${base}/#home`);
  await page.locator('#home-search-open').click();
  assert.deepEqual(await page.locator('#selector-results [data-selector-symbol]').evaluateAll(nodes=>nodes.map(el=>el.dataset.selectorSymbol)),['000660.KS','005930.KS']);
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('Weekly/favorite selector mobile QA passed at 320 and 390px');
}finally{await browser.close();}
