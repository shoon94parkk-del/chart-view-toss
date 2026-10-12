import { chromium } from 'playwright';
import { performanceOutcome, dataRequestPath } from '../scripts/performance-outcome.mjs';
import { performanceOptions, summarizeRequests, summarizeMeasurements } from '../scripts/performance-harness.mjs';
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';

// audit-run: toss-market-hours-20260928-1201kst

// audit-run: default-analysis-prewarm-20260928
const BASE=process.env.PERF_BASE_URL||'https://chart-view-toss.onrender.com';
const options=performanceOptions(process.env);
const TIMEOUT=options.timeoutMs;

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

function routeConfig(route){
  const exact=routes.find(cfg=>cfg.route===route);
  if(exact)return exact;
  if(route.startsWith('detail/'))return {...routes.find(cfg=>cfg.route.startsWith('detail/')),route,label:route};
  if(route.startsWith('exports/'))return {...routes.find(cfg=>cfg.route==='exports'),route,label:route};
  if(route.startsWith('gurus/'))return {...routes.find(cfg=>cfg.route==='gurus'),route,label:route};
  if(route==='ideas')return {route,label:'투자 아이디어 LAB',ready:()=>Boolean(document.querySelector('#idea-body:not([aria-busy="true"]) .idea-card,#idea-body:not([aria-busy="true"]) .empty'))};
  throw new Error(`Unknown performance route: ${route}`);
}
const selectedRoutes=options.routeNames.length?options.routeNames.map(routeConfig):routes;

const round=n=>Math.round(Number(n)||0);

function apiCollector(page){
  const starts=new WeakMap();
  const rows=[];
  let generation=0;
  const onRequest=req=>{
    const path=dataRequestPath(req.url());
    if(!path)return;
    const url=new URL(req.url());
    const row={path,key:url.pathname+url.search,method:req.method?.()||'GET',state:'pending',ms:null,headersMs:null,bodyComplete:false,status:null,decodedBodyBytes:null,meta:null};
    rows.push(row);
    starts.set(req,{started:performance.now(),generation,row});
  };
  const onResponse=async res=>{
    const req=res.request();
    const marker=starts.get(req);
    if(!marker||marker.generation!==generation)return;
    const start=marker.started;
    const headersMs=round(performance.now()-start);
    marker.row.headersMs=headersMs;
    marker.row.status=res.status?.()??null;
    // Closing a context can reject an in-flight optional response body.
    const bodyError=await res.finished().catch(()=>true);
    if(marker.generation!==generation)return;
    const bodyMs=bodyError?null:round(performance.now()-start);
    let decodedBodyBytes=null;
    if(!bodyError&&res.body){try{decodedBodyBytes=(await res.body()).length;}catch{}}
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
    Object.assign(marker.row,{ms:bodyMs,bodyComplete:!bodyError,decodedBodyBytes,meta,
      state:bodyError?(marker.row.state==='canceled'?'canceled':'failed'):'complete'});
  };
  const onFailed=req=>{
    const marker=starts.get(req);
    if(!marker||marker.generation!==generation)return;
    const failure=req.failure?.()?.errorText||'request failed';
    marker.row.state=/abort|cancel/i.test(failure)?'canceled':'failed';
    marker.row.failure=failure;
  };
  page.on('request',onRequest);
  page.on('response',onResponse);
  page.on('requestfailed',onFailed);
  return {
    rows,
    reset(){generation++;rows.length=0;},
    stop(){generation++;rows.length=0;page.off('request',onRequest);page.off('response',onResponse);page.off('requestfailed',onFailed);}
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
  if(state==='ready'&&cfg.route==='ideas')state=await page.evaluate(()=>{
    const notices=[...document.querySelectorAll('#idea-body .empty,#idea-body [role="alert"]')].filter(el=>!el.closest('[hidden]')&&el.getClientRects().length);
    if(notices.some(el=>/불러오지 못|불러올 수 없|연결.*확인|오류|실패/.test(el.textContent)))return 'error';
    if(notices.some(el=>/자료.*부족|제공.*않|아직.*게시|지원.*않/.test(el.textContent)))return 'unavailable';
    return notices.length?'empty':'ready';
  });
  return {ms:round(performance.now()-started),state};
}

function apiSummary(rows){
  return summarizeRequests(rows);
}

async function prepareContext(browser){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,
    ...(options.proxyServer?{proxy:{server:options.proxyServer,bypass:'127.0.0.1,localhost'}}:{})});
  await seed(context);
  await context.addInitScript(()=>{
    window.__performanceAudit={longTasks:[],errors:[]};
    try{new PerformanceObserver(list=>{
      for(const entry of list.getEntries())window.__performanceAudit.longTasks.push({startMs:entry.startTime,durationMs:entry.duration});
    }).observe({type:'longtask',buffered:true});}catch{}
    window.addEventListener('error',event=>window.__performanceAudit.errors.push({type:'error',message:String(event.message||'Runtime error').slice(0,500)}));
    window.addEventListener('unhandledrejection',event=>window.__performanceAudit.errors.push({type:'unhandledrejection',message:String(event.reason?.message||event.reason||'Unhandled rejection').slice(0,500)}));
  });
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error.message).slice(0,500)));
  if(options.proxyServer||options.failure){
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(options.failure&&url.pathname===options.failure.path){
        if(options.failure.mode==='503')return route.fulfill({status:503,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'{"error":"performance audit simulated optional failure"}'});
        return route.abort('failed');
      }
      if(options.proxyServer&&dataRequestPath(url.href)){
        // Same real-response Node relay as live-e2e: configured CA trust remains enabled.
        const response=await route.fetch({timeout:60000});
        return route.fulfill({response});
      }
      return route.continue();
    });
  }
  return {context,page,errors};
}

async function diagnostics(page,errors,since=0){
  const result=await page.evaluate(since=>{
    const runtime=window.__performanceAudit||{longTasks:[],errors:[]};
    const tasks=runtime.longTasks.filter(row=>row.startMs>=since);
    const resources=performance.getEntriesByType('resource').filter(row=>row.startTime>=since&&['script','css','link'].includes(row.initiatorType)).map(row=>({
      path:new URL(row.name).pathname,initiator:row.initiatorType,durationMs:Math.round(row.duration),
      transferBytes:row.transferSize,encodedBodyBytes:row.encodedBodySize,decodedBodyBytes:row.decodedBodySize,
    }));
    return {paint:performance.getEntriesByType('paint').map(row=>({name:row.name,ms:Math.round(row.startTime)})),resources,
      overflow:document.documentElement.scrollWidth>innerWidth,
      runtimeEvents:runtime.errors,
      longTasks:{count:tasks.length,totalMs:Math.round(tasks.reduce((sum,row)=>sum+row.durationMs,0)),maxMs:Math.round(Math.max(0,...tasks.map(row=>row.durationMs)))},
      visibleLoaders:[...document.querySelectorAll('.loading-indicator,[data-load-state="loading"]')].filter(el=>!el.closest('[hidden]')&&el.getClientRects().length).map(el=>String(el.textContent||'').trim().slice(0,140)),
      partialStates:[...document.querySelectorAll('[data-load-state], [data-heatmap-progress]')].filter(el=>!el.closest('[hidden]')&&el.getClientRects().length).map(el=>({state:el.dataset.loadState||'partial',text:String(el.textContent||'').trim().slice(0,140)})),
    };
  },since);
  return {...result,pageErrors:[...errors]};
}

async function dispose(session,collector){
  collector.stop();
  await session.page.unrouteAll({behavior:'ignoreErrors'});
  await session.context.close();
}

async function warmMeasure(session,api,cfg){
  const away=cfg.route==='more'?routes[0]:routes.find(row=>row.route==='more');
  await session.page.evaluate(route=>{location.hash='#'+route},away.route);
  const awayReady=await waitReady(session.page,away);
  api.reset();session.errors.length=0;
  const since=await session.page.evaluate(()=>{window.__performanceAudit.errors.length=0;return performance.now();});
  const start=performance.now();
  await session.page.evaluate(route=>{location.hash='#'+route},cfg.route);
  const ready=await waitReady(session.page,cfg);
  const totalMs=round(performance.now()-start);
  return {warmMs:totalMs,warmUsableDataMs:ready.state==='ready'?totalMs:null,warmReadyState:ready.state,warmAwayReadyState:awayReady.state,
    apiWarm:apiSummary(api.rows),requestsWarm:api.rows.map(row=>({...row})),warmDiagnostics:await diagnostics(session.page,session.errors,since)};
}

async function coldMeasure(browser,cfg){
  const session=await prepareContext(browser);
  const {page}=session;
  const api=apiCollector(page);
  try{
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
  const result={browserColdMs:totalMs,usableDataMs:ready.state==='ready'?totalMs:null,coldMs:totalMs,coldShellMs:shellMs,coldReadyState:ready.state,navTtfbMs:round(nav?.ttfb),apiCold:apiSummary(api.rows),requestsCold:api.rows.map(row=>({...row})),coldDiagnostics:await diagnostics(page,session.errors)};
  if(options.phases.includes('warm'))Object.assign(result,{warmPrimingReadyState:ready.state},await warmMeasure(session,api,cfg));
  return result;
  }finally{await dispose(session,api);}
}

async function spaMeasure(browser,cfg){
  if(cfg.route==='home')return {spaMs:0,spaReadyState:'root',apiSpa:[],requestsSpa:[]};
  const session=await prepareContext(browser);
  const {page}=session;
  const api=apiCollector(page);
  try{
  await page.goto(`${BASE}/#home`,{waitUntil:'domcontentloaded',timeout:30000});
  const homeReady=await waitReady(page,routes[0]);
  api.reset();session.errors.length=0;
  const since=await page.evaluate(()=>{window.__performanceAudit.errors.length=0;return performance.now();});
  const start=performance.now();
  await page.evaluate(route=>{location.hash='#'+route},cfg.route);
  const ready=await waitReady(page,cfg);
  const totalMs=round(performance.now()-start);
  const result={spaMs:totalMs,spaUsableDataMs:ready.state==='ready'?totalMs:null,spaReadyState:ready.state,spaFromHomeReadyState:homeReady.state,apiSpa:apiSummary(api.rows),requestsSpa:api.rows.map(row=>({...row})),spaDiagnostics:await diagnostics(page,session.errors,since)};
  return result;
  }finally{await dispose(session,api);}
}

const browser=await chromium.launch({headless:true});
const results=[];
try{
  for(let run=0;run<options.runs;run++)for(const cfg of selectedRoutes){
    const merged={route:cfg.route,label:cfg.label,run};
    if(options.phases.includes('cold')||options.phases.includes('warm')){
      try{Object.assign(merged,await coldMeasure(browser,cfg));}
      catch(error){merged.coldReadyState='measurement_error';merged.measurementError=String(error.message).slice(0,500);}
    }
    if(options.phases.includes('spa')){
      try{Object.assign(merged,await spaMeasure(browser,cfg));}
      catch(error){merged.spaReadyState='measurement_error';merged.spaMeasurementError=String(error.message).slice(0,500);}
    }
    results.push(merged);
    console.log('PERF_RESULT '+JSON.stringify(merged));
    await saveResults();
  }
} finally {
  await browser.close();
}

async function saveResults(){
  if(!options.output)return;
  await mkdir(path.dirname(options.output),{recursive:true});
  await writeFile(options.output,JSON.stringify({schemaVersion:1,base:BASE,sourceRevision:process.env.PERF_SOURCE_SHA||null,measuredAt:new Date().toISOString(),
    browser:'Chromium',viewport:{width:390,height:844},runs:options.runs,phases:options.phases,
    readiness:'Primary route content; optional loaders, failures and partial coverage reported separately',
    coldMeaning:'New browser context; not a controlled Render server cold start',
    warmMeaning:'Same session route → more → route (more uses home); no fixed settling sleep',
    decodedBodyBytesMeaning:'Decoded response-body bytes, not compressed wire bytes',
    proxyRelay:Boolean(options.proxyServer),browserHttpCacheDisabled:Boolean(options.proxyServer||options.failure),
    scenario:options.failure||{mode:'normal'},summary:summarizeMeasurements(results,options.phases),results},null,2));
}

const apiCell=api=>{
  if(!api)return '없음';
  const meta=api?.meta?` · cache ${api.meta.cacheHits}/fetch ${api.meta.providerFetches}`:'';
  return `${api.path} ${api.ms??'pending'}ms${meta}`;
};
const table=[
  '| 화면 | 새 브라우저 완료 / 상태 | SPA 완료 / 상태 | 재방문 완료 / 상태 | 앱 Shell | Navigation TTFB | Cold 최장 API (body) | SPA 최장 API (body) |',
  '|---|---:|---:|---:|---:|---:|---|---|',
  ...results.map(r=>{
    const coldApi=(r.apiCold||[])[0];
    const spaApi=(r.apiSpa||[])[0];
    return `| ${r.label} (${r.run+1}) | ${r.coldMs??'-'}ms / ${r.coldReadyState??'-'} | ${r.spaMs??'-'}ms / ${r.spaReadyState??'-'} | ${r.warmMs??'-'}ms / ${r.warmReadyState??'-'} | ${r.coldShellMs??'-'}ms | ${r.navTtfbMs??'-'}ms | ${apiCell(coldApi)} | ${apiCell(spaApi)} |`;
  })
].join('\n');
console.log('\nPERF_TABLE\n'+table);
if(process.env.GITHUB_STEP_SUMMARY){
  await appendFile(process.env.GITHUB_STEP_SUMMARY,'## Chart View Toss route performance\n\n'+table+'\n');
}
