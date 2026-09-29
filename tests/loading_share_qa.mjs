import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});
const page=await context.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const json=body=>({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let failCompare=false;

await page.route('https://chart-view-pkv8.onrender.com/**',async route=>{
 const path=new URL(route.request().url()).pathname;
 if(path==='/api/compare'){
  await wait(2200);
  if(failCompare)return route.fulfill({status:503,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{}'});
  return route.fulfill(json({stocks:[{ticker:'005930.KS',name:'삼성전자',currency:'KRW',data:[{time:'2026-09-28',value:0},{time:'2026-09-29',value:1}],return:1,startDate:'2026-09-28',endDate:'2026-09-29'}],fetchedAt:'2026-09-29T10:00:00Z'}));
 }
 if(path==='/api/search')return route.fulfill(json({results:[{symbol:'066570.KS',name:'LG전자'}]}));
 if(path==='/api/quotes')return route.fulfill(json({results:[{ticker:'066570.KS',name:'LG전자',price:100000,change:1,currency:'KRW',asOf:new Date().toISOString()}]}));
 if(path==='/static/data/screener.json')return route.fulfill(json({stocks:[{symbol:'066570.KS',name:'LG전자',industry:'전자제품',mainProducts:'가전'}]}));
 if(path==='/api/valuation')return route.fulfill(json({stocks:[]}));
 if(path==='/api/business-report'||path==='/api/relationship-evidence')return route.fulfill(json({available:false}));
 if(path==='/api/personalized-news')return route.fulfill(json({items:[]}));
 return route.fulfill(json({}));
});

try{
 await page.goto(`${base}/#chart`,{waitUntil:'domcontentloaded'});
 await page.locator('#chart-loading .loading-spinner').waitFor();
 assert.match(await page.locator('#chart-loading').innerText(),/수익률 차트를 불러오고 있어요/);
 assert.equal(await page.locator('#chart-loading .chart-loading-scaffold').count(),1);
 assert.notEqual(await page.locator('#chart-loading .loading-spinner').evaluate(el=>getComputedStyle(el).animationName),'none');
 if(process.env.QA_SCREENSHOT)await page.screenshot({path:process.env.QA_SCREENSHOT});
 await page.locator('#chart-loading').waitFor({state:'detached',timeout:12000});
 await page.locator('.return-table').waitFor();
 const chartCanvases=await page.locator('#chart-canvas canvas').count();
 failCompare=true;
 await page.locator('[data-period="3mo"]').click();
 await page.locator('#chart-loading.is-refresh').waitFor();
 assert.equal(await page.locator('#chart-canvas canvas').count(),chartCanvases);
 await page.locator('#chart-refresh-error').waitFor({timeout:12000});
 assert.match(await page.locator('#chart-status').innerText(),/이전 결과/);
 failCompare=false;
 await page.locator('#chart-refresh-error button').click();
 await page.locator('#chart-loading').waitFor({state:'detached',timeout:12000});
 assert.equal(await page.locator('[data-period="3mo"]').getAttribute('aria-pressed'),'true');
 await page.locator('.topbar [data-share-current]').click();
 assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'https://chart-view-pkv8.onrender.com/share/toss/chart');
 await page.evaluate(()=>document.documentElement.dataset.aitRuntime='true');
 assert.equal(await page.locator('.ait-share-row [data-share-current]').isVisible(),true);
 await page.locator('.ait-share-row [data-share-current]').click();
 assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'https://chart-view-pkv8.onrender.com/share/toss/chart');
 await page.evaluate(()=>document.documentElement.dataset.aitRuntime='false');

 await page.goto(`${base}/#detail/066570.KS`,{waitUntil:'domcontentloaded'});
 await page.locator('#detail-chart-loading .loading-spinner').waitFor();
 await page.locator('#detail-chart-loading').waitFor({state:'detached',timeout:12000});
 await page.locator('#detail-name').getByText('LG전자',{exact:true}).waitFor();
 const detailCanvases=await page.locator('#detail-chart canvas').count();
 failCompare=true;
 await page.locator('[data-detail-period="6mo"]').click();
 await page.locator('#detail-chart-loading.is-refresh').waitFor();
 assert.equal(await page.locator('#detail-chart canvas').count(),detailCanvases);
 await page.locator('#detail-chart-refresh-error').waitFor({timeout:12000});
 assert.match(await page.locator('#detail-chart-status').innerText(),/이전 결과/);
 failCompare=false;
 await page.locator('#detail-chart-refresh-error button').click();
 await page.locator('#detail-chart-loading').waitFor({state:'detached',timeout:12000});
 assert.equal(await page.locator('[data-detail-period="6mo"]').getAttribute('aria-pressed'),'true');
 await page.locator('.topbar [data-share-current]').click();
 assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'https://chart-view-pkv8.onrender.com/share/toss/detail?symbol=066570.KS');
 failCompare=true;
 await page.goto(`${base}/#detail/AAPL`,{waitUntil:'domcontentloaded'});
 await page.locator('#detail-chart-loading').waitFor({state:'detached',timeout:20000});
 assert.equal(await page.locator('#detail-chart-status').innerText(),'오류');
 assert.match(await page.locator('#detail-chart').innerText(),/차트를 불러오지 못했어요/);
 assert.deepEqual(errors,[]);
 console.log('PASS chart/detail visible loading and cleared states, current-screen share links');
}finally{await browser.close();}
