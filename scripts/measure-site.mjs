import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const base=process.env.QA_BASE_URL||'https://chart-view-toss.onrender.com';
const out=process.env.QA_OUTPUT||'artifacts/performance/latest.json';
const routes=[['home','#home','#market-card .quote-card strong'],['detail','#detail/005930.KS','.quote-main strong'],['US-detail','#detail/NVDA','.quote-main strong'],['index','#detail/%5EKS11','.quote-main strong'],['chart','#chart','#chart-canvas canvas'],['heatmap','#heatmap','.market-map-stock'],['discover','#discover','.analysis-stock'],['macro','#macro','.macro-tile:not(.skeleton)'],['news','#news/005930.KS','.news-card,#news-list .empty'],['tools','#tools','.investment-tool-card'],['watch','#watch','.watch-empty'],['valuation','#valuation','.valuation-compare-row'],['consensus','#consensus','.analysis-metrics'],['bands','#bands','#band-chart canvas'],['more','#more','.feature-row'],['picks','#picks','.pick-ledger-item'],['ideas','#ideas','#idea-body:not([aria-busy="true"]) .idea-card,#idea-body:not([aria-busy="true"]) .empty']];
const results=[];
for(const [name,route,selector] of routes){
 const ctx=await browser.newContext({viewport:{width:390,height:844}});const page=await ctx.newPage();const requests=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',async r=>{if(/\/api\/|\/static\/data\/|\/(screener|company_context|heatmap|pick_monitor)\.json/.test(r.url())){const req=r.request();await r.finished().catch(()=>{});const t=req.timing();requests.push({path:new URL(r.url()).pathname,status:r.status(),ms:Math.round(t.responseEnd)});}});
 const start=Date.now();await page.goto(base+'/'+route,{waitUntil:'domcontentloaded',timeout:20000});const dom=Date.now()-start;
 let ready;try{await page.locator(selector).first().waitFor({timeout:12000});ready=Date.now()-start;}catch{ready=null;}
 await page.waitForTimeout(1000);
 const info=await page.evaluate(()=>({paint:performance.getEntriesByType('paint').map(x=>({name:x.name,ms:Math.round(x.startTime)})),overflow:document.documentElement.scrollWidth>innerWidth,loaders:[...document.querySelectorAll('.loading-indicator')].filter(el=>!el.closest('[hidden]')).map(el=>el.textContent?.trim()).filter(Boolean)}));
 const readyText=ready===null?null:(await page.locator(selector).first().textContent())?.trim().slice(0,140);
 const result={name,domMs:dom,readyMs:ready,readyText,...info,requests,errors};results.push(result);await fs.mkdir('artifacts/performance',{recursive:true});await fs.writeFile(out,JSON.stringify({base,measuredAt:new Date().toISOString(),results},null,2));console.log(JSON.stringify(result));await ctx.close();
}
await browser.close();await fs.mkdir('artifacts/performance',{recursive:true});await fs.writeFile(out,JSON.stringify({base,measuredAt:new Date().toISOString(),results},null,2));
