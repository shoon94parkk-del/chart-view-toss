import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.QA_BROWSER_CHANNEL?{channel:process.env.QA_BROWSER_CHANNEL}:{})});
const BASE=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
const observe=process.env.QA_OBSERVE==='1';
try{
 for(const width of [320,390,430]){
  const context=await browser.newContext({viewport:{width,height:844}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const old={ticker:'005930.KS',name:'삼성전자',price:61200,change:1,currency:'KRW',marketCap:1e15,asOf:'2026-09-01T15:30:00+09:00'};
  const fresh={...old,price:276000,change:0,asOf:'2026-10-02T15:30:00+09:00'};
  let blocked=true,releaseHome;const holdHome=new Promise(r=>releaseHome=r);let broken=0,empty=0,macro=0,bootstrapFails=false;
  await context.addInitScript(old=>{
   localStorage.setItem('chartview-home-fast-v1:snapshot',JSON.stringify({savedAt:Date.now(),value:{generatedAt:old.asOf,heatmap:{results:[old]}}}));
   localStorage.setItem('chartview-home-fast-v1:market',JSON.stringify({savedAt:Date.now(),value:{results:[{ticker:'^KS11',price:2000,change:0,asOf:old.asOf}]}}));
  },old);
  await page.route('https://chart-view-pkv8.onrender.com/**',async route=>{
   const url=new URL(route.request().url()),path=url.pathname;
   const json=body=>route.fulfill({contentType:'application/json',body:JSON.stringify(body)}).catch(()=>{});
   if(['/api/market-now','/api/home-snapshot','/api/home-live'].includes(path)&&blocked)await holdHome;
   if(path==='/api/market-now')return json({results:[{ticker:'^KS11',price:3000,change:0,asOf:fresh.asOf}]});
   if(path==='/api/home-snapshot'||path==='/api/home-live')return json({generatedAt:fresh.asOf,heatmap:{results:[fresh]},results:[fresh]});
   if(path==='/api/search'){
    const q=url.searchParams.get('q');
    if(q==='broken'&&++broken===1)return route.fulfill({status:503,body:'unavailable'});
    if(q==='empty'&&++empty===1)return json({results:[]});
    if(q==='ZZZZZZ'||q==='MU')return json({results:[{symbol:q,name:q,type:'DIRECT'}]});
    if(q==='마이크론')return json({results:[{symbol:'067310.KQ',name:'하나마이크론',type:'KRX'}]});
    if(q==='slow'){await new Promise(r=>setTimeout(r,1200));return json({results:[{symbol:'SLOW',name:'늦은 결과',type:'EQUITY'}]});}
    return json({results:[{symbol:'005930.KS',name:'삼성전자',type:'KRX'}]});
   }
   if(path==='/api/quotes')return json({results:url.searchParams.get('tickers')==='ZZZZZZ'?[]:url.searchParams.get('tickers')==='MU'?[{ticker:'MU',name:'Micron Technology',price:100,currency:'USD',asOf:fresh.asOf}]:[fresh]});
   if(path==='/api/valuation')return json({stocks:[{ticker:url.searchParams.get('tickers'),marketCap:2e15,currency:'KRW',forwardPE:3.89,fieldMeta:{marketCap:{source:'Cap fixture',asOf:old.asOf,period:'latest available'}}}]});
   if(path==='/api/macro')return json(++macro===1?{results:[],summary:{text:'should not appear'}}:{results:[{symbol:'DFF',name:'실효 금리',value:3.88,asOf:'2026-10-02'}]});
   if(path==='/static/data/pick_monitor.json')return json({picks:[]});
   if(path==='/api/home-bootstrap')return bootstrapFails?route.fulfill({status:503,body:'unavailable'}):json({recommendations:[]});
   return json({stocks:[],results:[],items:[],available:false});
  });
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.locator('#home-daily-heatmap .home-heatmap-cell').first().waitFor();
  const cachedText=await page.locator('#home-daily-heatmap .home-heatmap-meta').innerText();
  if(!observe){assert.match(cachedText,/이전 저장 시세/);assert.match(await page.locator('#market-time').innerText(),/이전 저장 시세/);}
  blocked=false;releaseHome();
  if(!observe)await page.waitForFunction(()=>!document.querySelector('#home-daily-heatmap .home-heatmap-meta')?.textContent.includes('이전 저장'));
  await page.locator('#home-search-open').click();
  const search=async q=>{await page.locator('#selector-search-input').fill(q);await page.waitForTimeout(220);await page.waitForFunction(()=>!document.querySelector('#selector-results .loading-indicator'));};
  await search('ZZZZZZ');const rawAllowed=await page.locator('[data-selector-symbol="ZZZZZZ"]').count();
  if(!observe){assert.equal(rawAllowed,0);await search('마이크론');assert.equal(await page.locator('[data-selector-symbol="MU"]').count(),1);}
  await search('broken');assert.equal(await page.locator('[data-selector-retry]').count(),1);
  await page.locator('[data-selector-retry]').click();await page.locator('[data-selector-symbol="005930.KS"]').waitFor();
  if(!observe){
   await search('empty');await page.locator('[data-selector-retry]').click();await page.locator('[data-selector-symbol="005930.KS"]').waitFor();assert.equal(empty,2);
   for(let i=0;i<4;i++)await search(i%2?'MU':'삼성전자');
   await page.locator('#selector-search-input').fill('slow');await page.waitForTimeout(250);await search('삼성전자');await page.waitForTimeout(1300);assert.equal(await page.locator('[data-selector-symbol="SLOW"]').count(),0);
   await page.locator('#selector-search-input').fill('slow');await page.waitForTimeout(250);await page.locator('.selector-close').click();await page.locator('#home-search-open').click();await page.waitForTimeout(1300);assert.equal(await page.locator('[data-selector-symbol="SLOW"]').count(),0);
  }
  await page.locator('.selector-close').click();
  await page.goto(BASE+'/#detail/ZZZZZZ');await page.waitForTimeout(1000);
  const invalidEnabled=await page.locator('#detail-watch').count()?await page.locator('#detail-watch').isEnabled():false;
  if(!observe){assert.equal(invalidEnabled,false);assert.equal(await page.locator('#detail-compare').count(),0);assert.equal(await page.locator('[data-invalid-search]').count(),1);}
  bootstrapFails=!observe;
  await page.goto(BASE+'/#detail/NVDA');await page.reload();
  if(!observe){
   await page.waitForFunction(()=>document.querySelector('#detail-cap')?.textContent.includes('2,000조 0억원'));
   assert.match(await page.locator('.detail-support-note').innerText(),/국내 종목/);
   assert.match(await page.locator('#detail-cap').innerText(),/Cap fixture/);
   bootstrapFails=true;
   await page.locator('#detail-review summary').click();await page.waitForFunction(()=>document.querySelector('#detail-review-body')?.textContent.includes('선정 기록을 확인하지 못했어요'));
   assert.doesNotMatch(await page.locator('#detail-review-body').innerText(),/선정 기록이 없는/);
   bootstrapFails=false;await page.locator('[data-review-retry]').click();await page.waitForFunction(()=>document.querySelector('#detail-review-body')?.textContent.includes('선정 기록이 없는'));assert.equal(await page.locator('#detail-watch').isEnabled(),true);
  }
  await page.goto(BASE+'/#macro');await page.waitForTimeout(500);
  const macroEmpty=await page.locator('#macro-groups').innerText();
  if(!observe){assert.equal(await page.locator('#retry-macro').count(),1);await page.locator('#retry-macro').click();await page.locator('.macro-tile:not(.skeleton)').waitFor();assert.match(await page.locator('.macro-value').innerText(),/3.88%/);assert.equal(macro,2);}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({width,cachedText,rawAllowed,invalidEnabled,macroEmpty,mode:observe?'before':'verified'}));
  await context.close();
 }
}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,2000))]);}
process.exit(0);
