import {chromium} from 'playwright';
import fs from 'node:fs/promises';

const base=process.env.QA_BASE_URL||'https://chart-view-toss.onrender.com';
const routes=[
  ['home','#home','#market-card .quote-card strong'],
  ['detail','#detail/005930.KS','.quote-main strong'],
  ['US-detail','#detail/NVDA','.quote-main strong'],
  ['index','#detail/%5EKS11','.quote-main strong'],
  ['bands','#bands','#band-chart canvas'],
  ['heatmap','#heatmap','.market-map-stock']
];

const browser=await chromium.launch({headless:true});
const results=[];
try{
  for(const [name,route,selector] of routes){
    const ctx=await browser.newContext({viewport:{width:390,height:844}});
    const page=await ctx.newPage();
    const requests=[],errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',async r=>{
      if(/\/api\/|\/static\/data\/|\/(screener|company_context|heatmap|pick_monitor)\.json/.test(r.url())){
        const req=r.request();
        await r.finished().catch(()=>{});
        const t=req.timing();
        requests.push({path:new URL(r.url()).pathname,status:r.status(),ms:Math.round(t.responseEnd)});
      }
    });
    const start=Date.now();
    await page.goto(base+'/'+route,{waitUntil:'domcontentloaded',timeout:20000});
    const domMs=Date.now()-start;
    let readyMs=null;
    try{await page.locator(selector).first().waitFor({timeout:12000});readyMs=Date.now()-start;}catch{}
    const readyText=readyMs===null?null:(await page.locator(selector).first().textContent())?.trim().slice(0,100);
    const paint=await page.evaluate(()=>performance.getEntriesByType('paint').map(x=>({name:x.name,ms:Math.round(x.startTime)})));
    results.push({name,domMs,readyMs,readyText,paint,requests,errors,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
    await ctx.close();
  }
}finally{
  await browser.close();
}
await fs.mkdir('docs',{recursive:true});
await fs.writeFile(process.env.QA_TIMING_OUTPUT||'docs/performance-targeted-final.json',JSON.stringify({base,measuredAt:new Date().toISOString(),results},null,2));
console.log(JSON.stringify(results));
