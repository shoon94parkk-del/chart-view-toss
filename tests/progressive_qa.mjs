import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('chartview-toss-watchlist-v1',JSON.stringify([{symbol:'AAPL',name:'애플'}])));
 await page.route('https://chart-view-pkv8.onrender.com/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const json=body=>route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/api/market-now')return json({results:[{ticker:'^KS11',price:3500,change:0,asOf:'2026-09-21'}]});
  if(path==='/api/quotes'){await new Promise(r=>setTimeout(r,2200));return json({results:[{ticker:'AAPL',price:200,change:null,currency:'USD'}]});}
  if(path==='/api/personalized-news'){await new Promise(r=>setTimeout(r,2600));return json({items:[]});}
  if(path==='/api/home-snapshot')return json({macro:{summary:{text:'시장 환경'}}});
  if(path==='/api/compare')return json({stocks:[]});
  return json({stocks:[]});
 });
 await page.goto(process.env.QA_BASE_URL||'http://127.0.0.1:4173');
 await page.locator('.quote-card').waitFor({timeout:1200});
 await page.locator('[data-stock-detail="AAPL"]').first().waitFor({timeout:4000});
 await page.locator('[data-stock-detail="AAPL"]').first().click();
 // Return immediately while four requests are still pending.
 await page.locator('.bottom-nav [data-tab="more"]').click();
 await page.waitForTimeout(3000);
 assert.deepEqual(errors,[],'late requests must not access a destroyed screen');
 assert.equal(await page.locator('.page-intro h2').innerText(),'전체');
 console.log('Progressive home and navigation race checks passed');
}finally{await browser.close();}
