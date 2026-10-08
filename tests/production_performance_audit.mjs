import { chromium } from 'playwright';
import { performanceOutcome, dataRequestPath } from '../scripts/performance-outcome.mjs';

// audit-run: p0-valuation-swr-live-20260928

// audit-run: default-analysis-prewarm-20260928
const BASE=process.env.PERF_BASE_URL||'https://chart-view-toss.onrender.com';
const TIMEOUT=Number(process.env.PERF_TIMEOUT_MS||20000);

const routes=[
  {route:'home',label:'홈',ready:()=>Boolean(document.querySelector('#market-card .quote-card:not(.market-card-loading)'))&&document.querySelectorAll('#home-daily-heatmap .skeleton').length===0},
  {route:'chart',label:'차트',ready:()=>{const s=document.querySelector('#chart-status');return Boolean(s)&&!String(s.textContent||'').includes('불러오는 중')&&Boolean(document.querySelector('#chart-table-wrap .return-table,#chart-table-wrap .empty'))}},
  {route:'watch',label:'관심종목',ready:()=>Boolean(document.querySelector('#watch-rich-list'))&&document.querySelectorAll('#watch-rich-list .skeleton').length===0},
  {route:'valuation',label:'밸류에이션',ready:()=>Boolean(document.querySelector('#valuation-list'))&&document.querySelectorAll('#valuation-list .skeleton').length===0},
  {route:'macro',label:'경제지표',ready:()=>Boolean(document.querySelector('#macro-groups'))&&document.querySelectorAll('#macro-groups .skeleton').length===0&&Boolean(document.querySelector('#macro-groups .macro-group,#macro-groups .empty'))},
  {route:'discover',label:'조건별 종목 찾기',ready:()=>Boolean(document.querySelector('#analysis-body'))&&document.querySelectorAll('#analysis-body .skeleton').length===0&&Boolean(document.querySelector('#analysis-body .analysis-list,#analysis-body .empty'))},
  {route:'news',label:'관심종목 뉴스',ready:()=>Boolean(document.querySelector('#news-list'))&&document.querySelectorAll('#news-list .skeleton').length===0},
  {route:'heatmap',label:'시장 히트맵',ready:()=>document.querySelectorAll('#analysis-body .market-map-stock').length>=18||Boolean(document.querySelector('#analysis-body .empty'))},
  {route:'consensus',label:'실적 전망',ready:()=>Boolean(document.querySelector('#analysis-body'))&&document.querySelectorAll('#analysis-body [role="status"]').length===0&&document.querySelectorAll('#analysis-body .skeleton').length===0},
  {route:'bands',label:'역사적 밸류에이션',ready:()=>Boolean(document.querySelector('#analysis-body .analysis-metrics,#analysis-body .empty'))},
  {route:'detail/005930.KS',label:'종목 상세',ready:()=>Boolean(document.querySelector('#detail-price'))&&!document.querySelector('#detail-price')?.classList.contains('skeleton')},
  {route:'tools',label:'투자 도구',ready:()=>Boolean(document.querySelector('#analysis-body .investment-tool-card,#analysis-body .empty'))},
  {route:'info',label:'데이터·이용 안내',ready:()=>Boolean(document.querySelector('.info-stack'))},
  {route:'exports',label:'수출 데이터',ready:()=>Boolean(document.querySelector('[data-export-panel]:not([hidden])[data-load-state="ready"],[data-export-panel]:not([hidden])[data-load-state="error"],[data-export-panel]:not([hidden])[data-load-state="empty"]'))},
  {route:'gurus',label:'거장 투자법',ready:()=>Boolean(document.querySelector('#guru-data .guru-coverage,#guru-data .guru-empty'))},
  {route:'picks',label:'선정 기록',ready:()=>Boolean(document.querySelector('[data-testid="pick-performance"],#pick-ledger-summary .empty'))},
  {route:'memory',label:'반도체 가격',ready:()=>Boolean(document.querySelector('.dram-spot-price,.memory-price-page .empty'))},
  {route:'more',label:'전체 메뉴',ready:()=>Boolean(document.querySelector('.menu-group'))},
];

const round=n=>Math.round(Number(n)||0);

function apiCollector(page){
  const starts=new WeakMap();
  const rows=[];
  let generation=0;
  const onRequest=req=>{
    if(dataRequestPath(req.url()))starts.set(req,{started:performance.now(),generation});
  };
  const onResponse=async res=>{
    const req=res.request();
    const marker=starts.get(req);
    if(!marker||marker.generation!==generation)return;
    const start=marker.started;
    const headersMs=round(performance.now()-start);
    // Closing a context can reject an in-flight optional response body.
    const bodyError=await res.finished().catch(()=>true);
    if(marker.generation!==generation)return;
    const url=new URL(req.url());
    let meta=null;
    if(url.pathname==='/api/compare'||url.pathname==='/api/valuation'){
      try{
        const body=await res.json();
        meta={cacheHits:Number(body?.cacheHits??-1),providerFetches:Number(body?.providerFetches??-1)};
      }catch{}
    }
    if(marker.generation!==generation)return;
    rows.push({path:url.pathname,ms:bodyError?null:round(performance.now()-start),headersMs,bodyComplete:!bodyError,status:res.status(),meta});
  };
  page.on('request',onRequest);
  page.on('response',onResponse);
  return {
    rows,
    reset(){generation++;rows.length=0;},
    stop(){generation++;page.off('request',onRequest);page.off('response',onResponse);}
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
    await page.waitForFunction(cfg.ready,null,{timeout:TIMEOUT,polling:50});
  }catch{
    state='timeout';
  }
  if(state==='ready')state=await page.evaluate(performanceOutcome,cfg.route);
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
    ms:list.some(x=>x.bodyComplete)?Math.max(...list.filter(x=>x.bodyComplete).map(x=>x.ms)):null,
    completedBodies:list.filter(x=>x.bodyComplete).length,
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
  const result={browserColdMs:totalMs,usableDataMs:ready.state==='ready'?totalMs:null,coldMs:totalMs,coldShellMs:shellMs,coldReadyState:ready.state,navTtfbMs:round(nav?.ttfb),apiCold:apiSummary(api.rows)};
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
  '| 화면 | 새 브라우저 완료 / 상태 | SPA 완료 / 상태 | 앱 Shell | Navigation TTFB | Cold 최장 API (body) | SPA 최장 API (body) |',
  '|---|---:|---:|---:|---:|---|---|',
  ...results.map(r=>{
    const coldApi=(r.apiCold||[])[0];
    const spaApi=(r.apiSpa||[])[0];
    return `| ${r.label} | ${r.coldMs}ms / ${r.coldReadyState} | ${r.spaMs}ms / ${r.spaReadyState} | ${r.coldShellMs}ms | ${r.navTtfbMs}ms | ${apiCell(coldApi)} | ${apiCell(spaApi)} |`;
  })
].join('\n');
console.log('\nPERF_TABLE\n'+table);
if(process.env.GITHUB_STEP_SUMMARY){
  const fs=await import('node:fs');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Chart View Toss route performance\n\n'+table+'\n');
}
