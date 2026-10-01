import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
await fs.mkdir('artifacts/reliability-audit',{recursive:true});
try{
 for(const width of [320,390,430]){
 const ctx=await browser.newContext({viewport:{width,height:844}}),page=await ctx.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let mode='empty',calls=0,newsMode='failure',newsCalls=0,identityFails=false;
 const mock=async route=>{
  const url=new URL(route.request().url()),path=url.pathname.replace(/^\/backend/,'');let body={};
  if(path==='/api/compare'){
   calls++;const tickers=(url.searchParams.get('tickers')||'').split(',');
   body={stocks:mode==='empty'?[]:tickers.filter((_,i)=>mode!=='partial'||i===0).map(ticker=>({ticker,name:ticker==='005930.KS'?'삼성전자':'SK하이닉스',return:2,currency:'KRW',startDate:'2026-09-01',endDate:'2026-09-30',data:[{time:'2026-09-01',value:0,price:100},{time:'2026-09-30',value:2,price:102}]})),errors:mode==='ready'?[]:[{ticker:'000660.KS',error:'provider temporarily unavailable'}]};
  }
  if(path==='/api/search'){
   if(identityFails)return route.fulfill({status:503,contentType:'application/json',body:'{}'});
   body={results:[]};
  }
  if(path==='/api/quotes')body={results:[]};
  if(path==='/api/personalized-news'){
   newsCalls++;
   if(newsMode==='failure')return route.fulfill({status:503,contentType:'application/json',body:'{}'});
   body={items:newsMode==='article'?[{symbol:'NVDA',name:'엔비디아',title:'엔비디아 공식 자료',url:'https://www.nvidia.com/qa-link',source:'NVIDIA',relation:'direct'}]:[]};
  }
  if(path==='/api/valuation')body={stocks:[]};
  if(path==='/static/data/screener.json')body={stocks:[]};
  await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
 };
 await page.route('https://chart-view-pkv8.onrender.com/**',mock);await page.route('**/backend/**',mock);
 await page.addInitScript(()=>localStorage.setItem('chartview-toss-selected-v1',JSON.stringify(['005930.KS','000660.KS'])));
 await page.goto(base+'/#chart');await page.locator('#retry-chart').waitFor();
 const failedCalls=calls;mode='ready';await page.locator('#retry-chart').click();
 await page.waitForFunction(()=>document.querySelector('#chart-canvas canvas'),{},{timeout:2000});
 assert.ok(calls>failedCalls,'retry must bypass a cached HTTP200 missing-data response');
 mode='partial';await page.locator('[data-period="3mo"]').click();
 await page.locator('#chart-coverage-notice').waitFor({timeout:2000});
 assert.match(await page.locator('#chart-coverage-notice').innerText(),/SK하이닉스/);
 assert.equal(await page.locator('#chart-canvas canvas').count()>0,true,'successful comparison survives a partial response');
 const partialCalls=calls;mode='ready';await page.locator('[data-retry-chart-coverage]').click();
 await page.waitForFunction(()=>document.querySelectorAll('#chart-table-wrap [data-stock-detail]').length===2,{},{timeout:2000});
 assert.ok(calls>partialCalls);assert.equal(await page.locator('#chart-coverage-notice').count(),0);
 mode='empty';await page.locator('[data-period="6mo"]').click();await page.locator('#chart-refresh-error').waitFor();
 assert.equal(await page.locator('[data-period="3mo"]').getAttribute('aria-pressed'),'true','failed refresh keeps displayed-period controls');
 const refreshCalls=calls;mode='ready';await page.locator('#chart-refresh-error button').click();
 await page.waitForFunction(()=>!document.querySelector('#chart-refresh-error')&&document.querySelector('[data-period="6mo"]').getAttribute('aria-pressed')==='true');
 assert.ok(calls>refreshCalls,'retained-chart retry also bypasses empty-response cache');
 mode='empty';
 await page.goto(base+'/#detail/NVDA');await page.locator('.detail-jump-nav').waitFor();
 assert.equal(await page.locator('[data-detail-jump="detail-industry-block"]').count(),0,'overseas nav has no missing industry target');
 assert.equal(await page.locator('#detail-research-card').count(),0,'DART-only comparison is not offered for overseas companies');
 await page.locator('#retry-detail-chart').waitFor();const detailCalls=calls;
 mode='ready';await page.locator('#retry-detail-chart').click();await page.locator('#detail-chart canvas').first().waitFor();
 assert.ok(calls>detailCalls,'detail retry bypasses its empty-response cache');
 await page.locator('#retry-detail-news').waitFor();
 assert.doesNotMatch(await page.locator('#detail-news').innerText(),/表示|표시할 관련 뉴스가 없어요/);
 const chartCalls=calls,failedNewsCalls=newsCalls;newsMode='empty';await page.locator('#retry-detail-news').click();
 await page.waitForFunction(()=>document.querySelector('#detail-news')?.textContent.includes('표시할 관련 뉴스가 없어요'));
 assert.ok(newsCalls>failedNewsCalls);assert.equal(calls,chartCalls,'news retry does not reload unrelated chart');
 if(width===320){
   newsMode='article';await page.reload();await page.locator('#detail-news .news-card').waitFor();
   await ctx.route('https://www.nvidia.com/qa-link',route=>route.fulfill({contentType:'text/html',body:'<title>External source fixture</title>'}));
   const popupPromise=page.waitForEvent('popup');await page.locator('#detail-news .news-card').click();const popup=await popupPromise;
   await popup.waitForLoadState('domcontentloaded');assert.equal(await popup.evaluate(()=>window.opener),null);
   assert.equal(await page.getByText('외부 링크를 열지 못했어요. 잠시 후 다시 시도해주세요.',{exact:true}).count(),0,'a successfully opened secure source must not report failure');
   await popup.close();newsMode='empty';
 }
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:`artifacts/reliability-audit/US-detail-${width}.png`});
 await page.goto(base+'/#detail/005930.KS');await page.locator('#detail-research-card').waitFor();
 await page.waitForFunction(()=>!document.querySelector('#detail-industry-block'));
 assert.equal(await page.locator('[data-detail-jump="detail-industry-block"]').count(),0,'missing Korean context also removes its jump');
 assert.equal(await page.locator('[data-detail-jump="detail-research-card"]').count(),1);
 if(width===430){
   identityFails=true;const previousNewsCalls=newsCalls;await page.goto(base+'/#detail/ABCD');
   await page.waitForFunction(()=>document.querySelector('#detail-news')?.textContent.includes('표시할 관련 뉴스가 없어요'));
   assert.ok(newsCalls>previousNewsCalls,'identity lookup failure does not suppress ticker-based news');
 }
 assert.deepEqual(errors,[]);await ctx.close();
 console.log(`PASS ${width}px: chart recovery/partial disclosure, detail retry, supported navigation, news failure/recovery`);
 }
}finally{await browser.close();}
