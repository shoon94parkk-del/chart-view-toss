import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {performanceOutcome,dataRequestPath} from './performance-outcome.mjs';
import path from 'node:path';
const browser=await chromium.launch({headless:true});
const base=process.env.QA_BASE_URL||'https://chart-view-toss.onrender.com';
const out=process.env.QA_OUTPUT||'artifacts/performance/latest.json';
const routes=[['home','#home','#market-card .quote-card:not(.market-card-loading) strong'],['detail','#detail/005930.KS','.quote-main strong'],['US-detail','#detail/NVDA','.quote-main strong'],['index','#detail/%5EKS11','.quote-main strong'],['chart','#chart','#chart-canvas canvas'],['heatmap','#heatmap','.market-map-stock'],['discover','#discover','.analysis-stock'],['macro','#macro','.macro-tile:not(.skeleton)'],['news','#news/005930.KS','.news-card,#news-list .empty'],['tools','#tools','.investment-tool-card'],['watch','#watch','.watch-empty'],['valuation','#valuation','.valuation-compare-row'],['consensus','#consensus','.analysis-metrics'],['bands','#bands','#band-chart canvas'],['more','#more','.feature-row'],['picks','#picks','[data-testid="pick-performance"],#pick-ledger-summary .empty'],['exports','#exports','[data-export-panel]:not([hidden])[data-load-state="ready"],[data-export-panel]:not([hidden])[data-load-state="error"]'],['gurus','#gurus','#guru-data .guru-coverage,#guru-data .guru-empty'],['memory','#memory','.dram-spot-price,.memory-price-page .empty'],['ideas','#ideas','#idea-body:not([aria-busy="true"]) .idea-card,#idea-body:not([aria-busy="true"]) .empty']];
const results=[];
for(const [name,route,selector] of routes){
 const ctx=await browser.newContext({viewport:{width:390,height:844}});const page=await ctx.newPage();const requests=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',async r=>{if(dataRequestPath(r.url())){const req=r.request();const bodyError=await r.finished().catch(()=>true);const t=req.timing();requests.push({path:new URL(r.url()).pathname,status:r.status(),bodyComplete:!bodyError&&t.responseEnd>=0,headersMs:t.responseStart>=0?Math.round(t.responseStart):null,ms:t.responseEnd>=0?Math.round(t.responseEnd):null});}});
 const start=Date.now();await page.goto(base+'/'+route,{waitUntil:'domcontentloaded',timeout:20000});const dom=Date.now()-start;
 let ready;try{await page.locator(selector).first().waitFor({timeout:12000});ready=Date.now()-start;}catch{ready=null;}
 const outcome=ready===null?'timeout':await page.evaluate(performanceOutcome,route.slice(1));
 const info=await page.evaluate(()=>({paint:performance.getEntriesByType('paint').map(x=>({name:x.name,ms:Math.round(x.startTime)})),overflow:document.documentElement.scrollWidth>innerWidth,loaders:[...document.querySelectorAll('.loading-indicator')].filter(el=>!el.closest('[hidden]')).map(el=>el.textContent?.trim()).filter(Boolean)}));
 const readyText=ready===null?null:(await page.locator(selector).first().textContent())?.trim().slice(0,140);
 const result={name,domMs:dom,terminalMs:ready,readyMs:outcome==='ready'?ready:null,outcome,readyText,...info,requests,errors};results.push(result);await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify({base,measuredAt:new Date().toISOString(),results},null,2));console.log(JSON.stringify(result));await ctx.close();
}
await browser.close();await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify({base,measuredAt:new Date().toISOString(),results},null,2));
