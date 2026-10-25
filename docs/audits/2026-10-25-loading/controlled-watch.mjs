import {chromium} from 'playwright';
import {payloadFor,quotes} from '../../../tests/e2e/data.mjs';
import fs from 'node:fs/promises';
const symbols=['005930.KS','NVDA','AAPL','MSFT','GOOGL','AMZN','META','TSLA','AVGO','AMD','NFLX','TSM','JPM','V','WMT','COST','005380.KS','035420.KS','035720.KS','000660.KS'];
const browser=await chromium.launch({headless:true});const results=[];
try{for(const [version,base] of [['before','https://chart-view-toss.onrender.com'],['after','http://127.0.0.1:4175']])for(const count of [3,20])for(let run=1;run<=3;run++){
 const context=await browser.newContext({viewport:{width:390,height:844},...(base.startsWith('https')?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
 await context.addInitScript(list=>{if(!['http:','https:'].includes(location.protocol))return;localStorage.setItem('chartview-toss-watchlist-v1',JSON.stringify(list.map(symbol=>({symbol,name:symbol}))));},symbols.slice(0,count));
 await context.addInitScript(()=>{if(!['http:','https:'].includes(location.protocol))return;window.times={};setInterval(()=>{const ready=[...document.querySelectorAll('.watch-card-price > strong')].filter(e=>/\d/.test(e.textContent));if(ready.length&&!window.times.first)window.times.first=performance.now();if(ready.length===JSON.parse(localStorage.getItem('chartview-toss-watchlist-v1')).length&&!window.times.all)window.times.all=performance.now();},10);});
 let active=0,max=0;const calls=[],errors=[];const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(!/\/(api|static\/data)\//.test(u.pathname))return route.continue();if(u.pathname==='/api/quotes'){
  const ss=u.searchParams.get('tickers').split(',');calls.push(ss);max=Math.max(max,++active);await new Promise(r=>setTimeout(r,ss.includes('NVDA')?900:40));active--;return route.fulfill({json:{results:ss.map(ticker=>({...quotes[0],ticker,symbol:ticker,name:ticker,currency:'USD',price:123.45})),errors:[]}});
 }try{return route.fulfill({json:payloadFor(u)});}catch(e){errors.push(e.message);return route.fulfill({status:503,json:{detail:'unmocked'}});}});
 await page.goto(base+'/#watch',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.times.all,null,{timeout:10000});const times=await page.evaluate(()=>window.times);const asset=await page.locator('script[type="module"][src]').getAttribute('src');results.push({version,count,run,...times,calls,maxConcurrentRequests:max,errors,asset});console.log(JSON.stringify(results.at(-1)));await context.close();
}}finally{await browser.close();await fs.writeFile(process.env.PERF_OUTPUT||'/tmp/controlled-watch.json',JSON.stringify({controlled:true,slowResponseMs:900,otherResponseMs:40,viewport:[390,844],results},null,2));}
