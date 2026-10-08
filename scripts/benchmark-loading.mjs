import {chromium} from 'playwright';
import {payloadFor} from '../tests/e2e/data.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';

// Local deterministic counterfactual, not production latency or server cold start.
const base=process.env.BENCH_BASE_URL;
if(!base||!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('Set a local BENCH_BASE_URL');
const delay=Number(process.env.BENCH_DELAY_MS||1500),runs=Number(process.env.BENCH_RUNS||5);
const output=process.env.BENCH_OUTPUT||'artifacts/performance/loading-benchmark.json';
const scenarios=[
  {name:'picks',hash:'#picks',delayed:'/static/data/pick_monitor.json',usable:'[data-testid="pick-performance"]'},
  {name:'cosmetics',hash:'#exports/cosmetics',delayed:'/api/export-momentum',usable:'[data-export-panel="cosmetics"] [data-testid="industry-metrics"]'},
];
const browser=await chromium.launch();const results=[];
try {
  for(const scenario of scenarios)for(let run=0;run<runs;run++) {
    const context=await browser.newContext({viewport:{width:393,height:851},deviceScaleFactor:1});
    const page=await context.newPage();const errors=[];const calls=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-10-07T06:35:00Z'));
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url()),apiPath=url.pathname.replace(/^\/backend/,'');
      if(apiPath.startsWith('/api/')||apiPath.startsWith('/static/data/')) {
        calls.push(apiPath);
        // Simulated network delay applies only to the unrelated dependency.
        if(apiPath===scenario.delayed)await new Promise(resolve=>setTimeout(resolve,delay));
        return route.fulfill({json:payloadFor(url)});
      }
      if(url.origin!==new URL(base).origin)return route.abort('blockedbyclient');
      return route.continue();
    });
    const started=performance.now();await page.goto(base+'/'+scenario.hash,{waitUntil:'domcontentloaded'});
    await page.locator(scenario.usable).first().waitFor({timeout:15000});
    const usableMs=Math.round(performance.now()-started);
    results.push({scenario:scenario.name,run,usableMs,calls,errors});
    await context.close();
  }
}finally{await browser.close();}
const summary=scenarios.map(({name})=>{
  const values=results.filter(row=>row.scenario===name).map(row=>row.usableMs).sort((a,b)=>a-b);
  return {scenario:name,medianMs:values[Math.floor(values.length/2)],minMs:values[0],maxMs:values.at(-1)};
});
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,JSON.stringify({base,viewport:'393x851',delayMs:delay,runs,browser:'Chromium',measurement:'fresh browser context; fixed API fixtures; unrelated response delay',summary,results},null,2));
console.log(JSON.stringify(summary));
if(results.some(row=>row.errors.length))process.exitCode=1;
