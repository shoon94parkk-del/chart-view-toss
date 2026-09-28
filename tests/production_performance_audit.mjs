import { chromium } from 'playwright';

const BASE=process.env.PERF_BASE_URL||'https://chart-view-pkv8.onrender.com';
// audit-run: original-boot-css-live-20260928-final
const TIMEOUT=Number(process.env.PERF_TIMEOUT_MS||20000);
const RUNS=3;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const round=n=>Math.round(Number(n)||0);

function apiCollector(page){
  const starts=new WeakMap();
  const rows=[];
  page.on('request',req=>{
    try{
      const u=new URL(req.url());
      if(u.origin===new URL(BASE).origin && u.pathname.startsWith('/api/')) starts.set(req,performance.now());
    }catch{}
  });
  page.on('response',async res=>{
    const req=res.request();
    const start=starts.get(req);
    if(start==null)return;
    const u=new URL(req.url());
    rows.push({path:u.pathname,ms:round(performance.now()-start),status:res.status()});
  });
  return {rows,mark(){return rows.length;}};
}

async function waitFor(page,fn){
  const t=performance.now();
  await page.waitForFunction(fn,{timeout:TIMEOUT,polling:50});
  return round(performance.now()-t);
}

async function measureRun(browser,run){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const page=await context.newPage();
  const api=apiCollector(page);
  const out={run};

  let mark=api.mark();
  let t=performance.now();
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
  const dom=round(performance.now()-t);
  await page.waitForSelector('.app-bottom-nav',{timeout:TIMEOUT});
  await waitFor(page,()=>document.querySelectorAll('#home-market-v9-grid .home-market-v9-item:not(.is-loading)').length>=4);
  const perf=await page.evaluate(()=>{
    const nav=performance.getEntriesByType('navigation')[0];
    const resources=performance.getEntriesByType('resource')
      .map(r=>({name:new URL(r.name).pathname,duration:Math.round(r.duration),transferSize:r.transferSize||0,decodedBodySize:r.decodedBodySize||0,initiatorType:r.initiatorType}))
      .filter(r=>r.name.startsWith('/static/'))
      .sort((a,b)=>b.duration-a.duration)
      .slice(0,12);
    return {
      nav:nav?{ttfb:Math.round(nav.responseStart-nav.requestStart),response:Math.round(nav.responseEnd-nav.responseStart),dcl:Math.round(nav.domContentLoadedEventEnd-nav.startTime)}:null,
      resources
    };
  });
  out.home={ms:round(performance.now()-t),domMs:dom,api:api.rows.slice(mark),perf};

  mark=api.mark(); t=performance.now();
  await page.locator('.app-bottom-btn[data-app-mode="analysis"]').click();
  await page.waitForFunction(()=>document.getElementById('chart-tab')?.classList.contains('active'),{timeout:TIMEOUT});
  await page.waitForFunction(()=>{
    const c=document.getElementById('chart-container');
    const loading=document.getElementById('loading');
    return c && c.children.length>0 && (!loading || loading.classList.contains('hidden'));
  },{timeout:TIMEOUT});
  out.chart={ms:round(performance.now()-t),api:api.rows.slice(mark)};

  mark=api.mark(); t=performance.now();
  await page.locator('.app-context-btn[data-app-tab="fwdper"]').click();
  await page.waitForFunction(()=>document.getElementById('fwdper-tab')?.classList.contains('active'),{timeout:TIMEOUT});
  await page.waitForFunction(()=>{
    const l=document.getElementById('per-loading');
    const box=document.getElementById('per-table-container');
    return box && (!l || l.classList.contains('hidden')) && box.textContent.trim().length>0;
  },{timeout:TIMEOUT});
  out.valuation={ms:round(performance.now()-t),api:api.rows.slice(mark)};

  mark=api.mark(); t=performance.now();
  await page.locator('.app-bottom-btn[data-app-mode="market"]').click();
  await page.waitForFunction(()=>document.getElementById('macro-tab')?.classList.contains('active'),{timeout:TIMEOUT});
  await page.waitForFunction(()=>document.querySelectorAll('#macro-grid > *').length>0,{timeout:TIMEOUT});
  out.macro={ms:round(performance.now()-t),api:api.rows.slice(mark)};

  mark=api.mark(); t=performance.now();
  await page.locator('.app-bottom-btn[data-app-mode="discover"]').click();
  await page.waitForFunction(()=>document.getElementById('screener-tab')?.classList.contains('active'),{timeout:TIMEOUT});
  await page.waitForFunction(()=>Boolean(document.querySelector('#screener-tab .screener-table-wrap,#screener-tab .empty-state,#screener-tab .screener-empty')),{timeout:TIMEOUT});
  out.screener={ms:round(performance.now()-t),api:api.rows.slice(mark)};

  mark=api.mark(); t=performance.now();
  await page.locator('.app-bottom-btn[data-app-mode="watchlist"]').click();
  await page.waitForFunction(()=>document.getElementById('watchlist-tab')?.classList.contains('active'),{timeout:TIMEOUT});
  await page.waitForFunction(()=>Boolean(document.querySelector('#watchlist-v30-grid > *')));
  out.watchlist={ms:round(performance.now()-t),api:api.rows.slice(mark)};

  await context.close();
  return out;
}

const metric=(rows,key)=>{
  const a=rows.map(r=>r[key].ms).sort((x,y)=>x-y);
  return {median:a[Math.floor(a.length/2)],min:a[0],max:a[a.length-1]};
};
const slowApi=(entry)=>{
  const a=(entry.api||[]).slice().sort((x,y)=>y.ms-x.ms)[0];
  return a?{path:a.path,ms:a.ms}:null;
};

const browser=await chromium.launch({headless:true});
const runs=[];
try{
  for(let i=1;i<=RUNS;i++){
    const r=await measureRun(browser,i);
    runs.push(r);
    console.log('ORIGINAL_PERF_RESULT '+JSON.stringify(r));
    await sleep(300);
  }
}finally{await browser.close();}

const keys=[['home','홈'],['chart','차트 비교'],['valuation','밸류에이션'],['macro','경제지표'],['screener','종목발굴'],['watchlist','관심종목']];
const table=[
  '| 화면 | 실제 표시 중앙값 | 최소 | 최대 | 대표 느린 API |',
  '|---|---:|---:|---:|---|',
  ...keys.map(([key,label])=>{
    const m=metric(runs,key);
    const sample=runs.map(r=>slowApi(r[key])).filter(Boolean).sort((a,b)=>b.ms-a.ms)[0];
    return `| ${label} | ${m.median}ms | ${m.min}ms | ${m.max}ms | ${sample?`${sample.path} ${sample.ms}ms`:'없음'} |`;
  })
].join('\n');
console.log('\nORIGINAL_PERF_TABLE\n'+table);
