import { chromium } from 'playwright';

// audit-run: p0-valuation-swr-live-20260928

// audit-run: default-analysis-prewarm-20260928
const BASE=process.env.PERF_BASE_URL||'https://chart-view-toss.onrender.com';
const TIMEOUT=Number(process.env.PERF_TIMEOUT_MS||20000);

const routes=[
  {route:'home',label:'홈',ready:()=>Boolean(document.querySelector('#market-card .quote-card'))&&document.querySelectorAll('#home-top-picks .skeleton,#home-daily-heatmap .skeleton').length===0},
  {route:'chart',label:'차트',ready:()=>{const s=document.querySelector('#chart-status');return Boolean(s)&&!String(s.textContent||'').includes('불러오는 중')&&Boolean(document.querySelector('#chart-table-wrap .return-table,#chart-table-wrap .empty'))}},
  {route:'watch',label:'관심종목',ready:()=>Boolean(document.querySelector('#watch-rich-list'))&&document.querySelectorAll('#watch-rich-list .skeleton').length===0},
  {route:'valuation',label:'밸류에이션',ready:()=>Boolean(document.querySelector('#valuation-list'))&&document.querySelectorAll('#valuation-list .skeleton').length===0},
  {route:'macro',label:'경제지표',ready:()=>Boolean(document.querySelector('#macro-groups'))&&document.querySelectorAll('#macro-groups .skeleton').length===0&&Boolean(document.querySelector('#macro-groups .macro-group,#macro-groups .empty'))},
  {route:'discover',label:'시장 스크리너',ready:()=>Boolean(document.querySelector('#analysis-body'))&&document.querySelectorAll('#analysis-body .skeleton').length===0&&Boolean(document.querySelector('#analysis-body .analysis-list,#analysis-body .empty'))},
  {route:'picks',label:'추천 기록',ready:()=>Boolean(document.querySelector('#pick-ledger-list'))&&document.querySelectorAll('#pick-ledger-list .skeleton').length===0},
  {route:'news',label:'관심종목 뉴스',ready:()=>Boolean(document.querySelector('#news-list'))&&document.querySelectorAll('#news-list .skeleton').length===0},
  {route:'heatmap',label:'시장 히트맵',ready:()=>document.querySelectorAll('#analysis-body .home-heatmap-cell').length>=18||Boolean(document.querySelector('#analysis-body .empty'))},
  {route:'consensus',label:'실적 전망',ready:()=>Boolean(document.querySelector('#analysis-body'))&&document.querySelectorAll('#analysis-body [role="status"]').length===0&&document.querySelectorAll('#analysis-body .skeleton').length===0},
  {route:'bands',label:'역사적 밸류에이션',ready:()=>Boolean(document.querySelector('#analysis-body .analysis-metrics,#analysis-body .empty'))},
  {route:'detail/005930.KS',label:'종목 상세',ready:()=>Boolean(document.querySelector('#detail-price'))&&!document.querySelector('#detail-price')?.classList.contains('skeleton')},
  {route:'tools',label:'자료 출처',ready:()=>Boolean(document.querySelector('#analysis-body .feature-row,#analysis-body .empty'))},
  {route:'info',label:'데이터·이용 안내',ready:()=>Boolean(document.querySelector('.info-stack'))},
  {route:'more',label:'전체 메뉴',ready:()=>Boolean(document.querySelector('.menu-group'))},
];

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const round=n=>Math.round(Number(n)||0);

function apiCollector(page){
  const starts=new WeakMap();
  const rows=[];
  let generation=0;
  const onRequest=req=>{
    if(req.url().includes('chart-view-pkv8.onrender.com/api/'))starts.set(req,{started:performance.now(),generation});
  };
  const onResponse=async res=>{
    const req=res.request();
    const marker=starts.get(req);
    if(!marker||marker.generation!==generation)return;
    const start=marker.started;
    const url=new URL(req.url());
    let meta=null;
    if(url.pathname==='/api/compare'||url.pathname==='/api/valuation'){
      try{
        const body=await res.json();
        meta={cacheHits:Number(body?.cacheHits??-1),providerFetches:Number(body?.providerFetches??-1)};
      }catch{}
    }
    rows.push({path:url.pathname,ms:round(performance.now()-start),status:res.status(),meta});
  };
  page.on('request',onRequest);
  page.on('response',onResponse);
  return {
    rows,
    reset(){generation++;rows.length=0;},
    stop(){page.off('request',onRequest);page.off('response',onResponse);}
  };
}

async function seed(context){
  await context.addInitScript(()=>{
    localStorage.setItem('chartview-toss-watchlist-v1',JSON.stringify([
      {symbol:'005930.KS',name:'삼성전자'},
      {symbol:'NVDA',name:'엔비디아'},
      {symbol:'AAPL',name:'애플'}
    ]));
    localStorage.setItem('chartview-toss-selected-v1',JSON.stringify(['005930.KS','NVDA','AAPL']));
  });
}

async function waitReady(page,cfg){
  const started=performance.now();
  let state='ready';
  try{
    await page.waitForFunction(cfg.ready,{timeout:TIMEOUT,polling:50});
  }catch{
    state='timeout';
  }
  return {ms:round(performance.now()-started),state};
}

function apiSummary(rows){
  const by=new Map();
  for(const row of rows){
    if(!by.has(row.path))by.set(row.path,[]);
    by.get(row.path).push(row);
  }
  return [...by.entries()].map(([path,list])=>({
    path,
    calls:list.length,
    ms:Math.max(...list.map(x=>x.ms)),
    status:list.map(x=>x.status).join(','),
    meta:list.find(x=>x.meta)?.meta||null
  })).sort((a,b)=>b.ms-a.ms);
}

async function coldMeasure(browser,cfg){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  await seed(context);
  const page=await context.newPage();
  const api=apiCollector(page);
  const start=performance.now();
  await page.goto(`${BASE}/#${cfg.route}`,{waitUntil:'domcontentloaded',timeout:30000});
  const domMs=round(performance.now()-start);
  let shellMs=domMs;
  try{
    await page.waitForSelector('.app-shell',{timeout:TIMEOUT});
    shellMs=round(performance.now()-start);
  }catch{}
  const ready=await waitReady(page,cfg);
  const totalMs=round(performance.now()-start);
  const nav=await page.evaluate(()=>{
    const n=performance.getEntriesByType('navigation')[0];
    return n?{ttfb:n.responseStart,dom:n.domContentLoadedEventEnd,load:n.loadEventEnd}:null;
  });
  const result={coldMs:totalMs,coldShellMs:shellMs,coldReadyState:ready.state,navTtfbMs:round(nav?.ttfb),apiCold:apiSummary(api.rows)};
  api.stop();await context.close();
  return result;
}

async function spaMeasure(browser,cfg){
  if(cfg.route==='home')return {spaMs:0,spaReadyState:'root',apiSpa:[]};
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  await seed(context);
  const page=await context.newPage();
  const api=apiCollector(page);
  await page.goto(`${BASE}/#home`,{waitUntil:'domcontentloaded',timeout:30000});
  await waitReady(page,routes[0]);
  await sleep(100);
  api.reset();
  const start=performance.now();
  await page.evaluate(route=>{location.hash='#'+route},cfg.route);
  const ready=await waitReady(page,cfg);
  const totalMs=round(performance.now()-start);
  const result={spaMs:totalMs,spaReadyState:ready.state,apiSpa:apiSummary(api.rows)};
  api.stop();await context.close();
  return result;
}

const browser=await chromium.launch({headless:true});
const results=[];
try{
  for(const cfg of routes){
    const cold=await coldMeasure(browser,cfg);
    const spa=await spaMeasure(browser,cfg);
    const merged={route:cfg.route,label:cfg.label,...cold,...spa};
    results.push(merged);
    console.log('PERF_RESULT '+JSON.stringify(merged));
  }
} finally {
  await browser.close();
}

const apiCell=api=>{
  if(!api)return '없음';
  const meta=api?.meta?` · cache ${api.meta.cacheHits}/fetch ${api.meta.providerFetches}`:'';
  return `${api.path} ${api.ms}ms${meta}`;
};
const table=[
  '| 화면 | Cold 데이터 표시 | SPA 이동 | 앱 Shell | Navigation TTFB | Cold 최장 API | SPA 최장 API |',
  '|---|---:|---:|---:|---:|---|---|',
  ...results.map(r=>{
    const coldApi=(r.apiCold||[])[0];
    const spaApi=(r.apiSpa||[])[0];
    return `| ${r.label} | ${r.coldMs}ms | ${r.spaMs}ms | ${r.coldShellMs}ms | ${r.navTtfbMs}ms | ${apiCell(coldApi)} | ${apiCell(spaApi)} |`;
  })
].join('\n');
console.log('\nPERF_TABLE\n'+table);
if(process.env.GITHUB_STEP_SUMMARY){
  const fs=await import('node:fs');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Chart View Toss route performance\n\n'+table+'\n');
}

async function verifySamsungParity(){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  await seed(context);
  const page=await context.newPage();
  const freshResponses=[];
  page.on('response',async res=>{
    try{
      const u=new URL(res.url());
      if(u.pathname==='/api/quotes'&&u.searchParams.get('fresh')==='true'){
        freshResponses.push(await res.json());
      }
    }catch{}
  });
  await page.goto(`${BASE}/#home`,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForSelector('#home-daily-heatmap [data-stock-detail="005930.KS"]',{timeout:20000});
  await sleep(6500);
  const homeRow=await page.evaluate(()=>{
    const raw=localStorage.getItem('chartview-home-fast-v1:snapshot');
    const value=raw?JSON.parse(raw)?.value:null;
    return value?.heatmap?.results?.find(row=>String(row?.ticker||'').toUpperCase()==='005930.KS')||null;
  });
  await page.locator('#home-daily-heatmap [data-stock-detail="005930.KS"]').click();
  await page.waitForSelector('#detail-price:not(.skeleton)',{timeout:10000});
  const immediate=await page.locator('#detail-price').innerText();
  await sleep(6200);
  const after=await page.locator('#detail-price').innerText();
  const cachedAfter=await page.evaluate(()=>{
    const raw=localStorage.getItem('chartview-home-fast-v1:snapshot');
    const value=raw?JSON.parse(raw)?.value:null;
    return value?.heatmap?.results?.find(row=>String(row?.ticker||'').toUpperCase()==='005930.KS')||null;
  });
  await page.evaluate(()=>{location.hash='#home';});
  await page.waitForSelector('#home-daily-heatmap [data-stock-detail="005930.KS"]',{timeout:10000});
  await sleep(1800);
  const returnHomeRow=await page.evaluate(()=>{
    const raw=localStorage.getItem('chartview-home-fast-v1:snapshot');
    const value=raw?JSON.parse(raw)?.value:null;
    return value?.heatmap?.results?.find(row=>String(row?.ticker||'').toUpperCase()==='005930.KS')||null;
  });
  const beforeTs=Date.parse(cachedAfter?.asOf||'')||0;
  const returnTs=Date.parse(returnHomeRow?.asOf||'')||0;
  if(beforeTs&&returnTs&&returnTs<beforeTs)throw new Error('Home quote rolled backward after detail');
  if(cachedAfter?.price!=null&&returnHomeRow?.price!==cachedAfter.price)throw new Error(`Home price rolled back: ${cachedAfter.price} -> ${returnHomeRow?.price}`);
  console.log('QUOTE_PARITY '+JSON.stringify({homeRow,immediate,after,cachedAfter,returnHomeRow,freshResponses}));
  await context.close();
  await browser.close();
}
await verifySamsungParity();
