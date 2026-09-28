import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base=process.env.QA_BASE_URL||'https://chart-view-toss.onrender.com';
await mkdir('artifacts/live-diagnostics',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  for(const route of ['/#chart','/chartviewHome']){
    const context=await browser.newContext({viewport:{width:390,height:844}});
    const page=await context.newPage();
    const events=[];
    page.on('pageerror',e=>events.push({type:'pageerror',message:e.message}));
    page.on('response',r=>{if(r.url().includes('/api/compare'))events.push({type:'compare',status:r.status(),url:r.url()});});
    page.on('requestfailed',r=>{if(r.url().includes('/api/'))events.push({type:'requestfailed',url:r.url(),failure:r.failure()?.errorText});});
    const start=Date.now();
    let navigationError=null;
    try{await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:25000});}catch(e){navigationError=String(e);}
    await page.waitForTimeout(10000);
    const snapshot=await page.evaluate(()=>({url:location.href,title:document.title,status:document.querySelector('#chart-status')?.textContent,body:document.body.innerText.slice(0,1200),canvas:document.querySelectorAll('#chart-canvas canvas').length}));
    await page.screenshot({path:`artifacts/live-diagnostics/${route.includes('chartviewHome')?'deep-link':'hash-chart'}.png`,fullPage:true});
    console.log(JSON.stringify({route,elapsedMs:Date.now()-start,navigationError,events,snapshot}));
    if(navigationError||snapshot.body==='Not Found'||!snapshot.body.includes('수익률 비교'))throw new Error(`${route} did not open the chart app`);
    await context.close();
  }
}finally{await browser.close();}
