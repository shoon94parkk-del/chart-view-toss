import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch();const results=[];
const quote={ticker:'005930.KS',name:'검증용 기업',price:100000,change:2,currency:'KRW',asOf:'2026-10-02T06:30:00Z',sessionDate:'2026-10-02'};
try{for(let run=0;run<5;run++)for(const phase of ['baseline','after']){
 const base=phase==='baseline'?(process.env.QA_BASELINE_URL||'http://127.0.0.1:4174'):(process.env.QA_BASE_URL||'http://127.0.0.1:4173');
 const page=await browser.newPage({viewport:{width:390,height:844}}),calls=[],assets=[];
 page.on('request',r=>{if(r.url().includes('/assets/'))assets.push(r.url());});
 await page.route('https://chart-view-pkv8.onrender.com/**',async route=>{
  const path=new URL(route.request().url()).pathname;calls.push(path);let body={results:[],items:[]};
  if(path==='/api/market-now')body={results:['^KS11','^KQ11','^GSPC','^IXIC'].map(ticker=>({...quote,ticker}))};
  if(path==='/api/home-bootstrap')body={day:{tradeDate:'2026-10-02',top3:[]},recommendations:[]};
  if(path==='/api/home-snapshot')body={heatmap:{results:[]}};
  if(path==='/api/quotes')body={results:[quote]};
  if(path==='/api/compare')body={stocks:[]};
  if(path==='/static/data/screener.json')body={tradeDate:'2026-10-02',stocks:[]};
  await new Promise(r=>setTimeout(r,30));return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
 });
 let start=performance.now();await page.goto(base+'/#home');await page.locator('#market-card .quote-card').first().waitFor();const homeMs=performance.now()-start;
 start=performance.now();await page.goto(base+'/#detail/005930.KS');await page.locator('#detail-price').waitFor();await page.waitForFunction(()=>!document.querySelector('#detail-price')?.classList.contains('skeleton'));const detailMs=performance.now()-start;
 assert.equal(calls.some(x=>/guru/.test(x)),false);assert.equal(assets.some(x=>/guruInvestingView/.test(x)),false);
 results.push({phase,run,homeMs:Math.round(homeMs),detailMs:Math.round(detailMs)});await page.close();
}}finally{await browser.close();}
await fs.mkdir('output/playwright/gurus',{recursive:true});await fs.writeFile('output/playwright/gurus/performance.json',JSON.stringify(results,null,2));
const median=xs=>xs.sort((a,b)=>a-b)[2];
console.log(JSON.stringify(Object.fromEntries(['baseline','after'].map(phase=>[phase,{homeMedianMs:median(results.filter(x=>x.phase===phase).map(x=>x.homeMs)),detailMedianMs:median(results.filter(x=>x.phase===phase).map(x=>x.detailMs))}]))));
