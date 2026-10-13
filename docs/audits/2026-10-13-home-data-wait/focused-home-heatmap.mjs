import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(new URL('../../../package.json',import.meta.url));
const {chromium,devices}=require('@playwright/test');
const out=process.env.FOCUS_OUT||'home-data-wait-browser-evidence';
const base='https://chart-view-toss.onrender.com';
const source=process.env.FOCUS_SOURCE||null;
const mode=process.env.FOCUS_MODE||'normal';
const runCount=Number(process.env.FOCUS_RUNS||3);
const maxSettleMs=30000;
await mkdir(out,{recursive:true});
const results=[],requestRows=[],fullPayloads=[];
let progressivePollObservation=null;
const browser=await chromium.launch({headless:true});
const observer=()=>{
 const audit=window.__focusAudit={segments:[],longTasks:[],errors:[]};
 const visible=el=>Boolean(el&&!el.closest('[hidden]')&&el.getClientRects().length);
 const text=sel=>[...document.querySelectorAll(sel)].filter(visible).map(el=>String(el.textContent||'').trim().slice(0,300));
 const valid=sel=>[...document.querySelectorAll(sel)].filter(visible).filter(el=>/[+-]?\d/.test(el.getAttribute('aria-label')||el.textContent||'')).length;
 const state=()=>({
  surface:document.querySelector('.app-shell')?.dataset.surface||null,
  shell:Boolean(document.querySelector('.app-shell')),
  marketValid:valid('#market-card .quote-card:not(.market-card-loading):not(.market-missing) strong'),
  marketRows:[...document.querySelectorAll('#market-card .quote-card[data-stock-detail]')].map(el=>({ticker:el.dataset.stockDetail,price:el.querySelector('strong')?.textContent,asOf:el.querySelector('.quote-asof')?.textContent,missing:el.classList.contains('market-missing')})),
  watchValid:valid('#home-watchlist .watch-price strong'),
  watchPending:[...document.querySelectorAll('#home-watchlist .watch-rich-row')].filter(el=>/새 시세 확인 중|가격 확인 중/.test(el.textContent)).length,
  watchRows:[...document.querySelectorAll('#home-watchlist .watch-rich-row')].map(el=>({ticker:el.dataset.stockDetail,price:el.querySelector('.watch-price strong')?.textContent,meta:el.querySelector('.stock-copy small')?.textContent})),
  homeHeatmapValid:valid('#home-daily-heatmap .home-heatmap-cell'),
  mapValid:valid('#analysis-body .market-map-stock'),
  marketLabel:text('#market-time'),homeHeatmapLabel:text('#home-daily-heatmap .home-heatmap-meta'),mapLabel:text('.market-map-meta'),
  progress:text('[data-heatmap-progress]'),
  loaders:text('.loading-indicator,[data-load-state="loading"]'),
  viewportLoaders:[...document.querySelectorAll('.loading-indicator,[data-load-state="loading"]')].filter(visible).filter(el=>{const r=el.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}).map(el=>String(el.textContent||'').trim().slice(0,150)),
  watchText:text('#home-watchlist').map(value=>value.slice(0,180)),
  notices:text('.shared-heatmap-analysis .muted-copy,.shared-heatmap-analysis .empty,#home-news .empty,[data-home-change-status]'),
  overflow:(document.documentElement?.scrollWidth||0)>innerWidth,
 });
 audit.sample=()=>{
  const segment=audit.segments.at(-1);if(!segment)return;
  const current=state(),digest=JSON.stringify(current);
  if(digest!==segment.last){segment.last=digest;segment.states.push({ms:performance.now()-segment.started,...current});}
  if(current.shell&&segment.shellMs==null)segment.shellMs=performance.now()-segment.started;
  if(current.marketValid>0&&segment.marketFirstValidMs==null)segment.marketFirstValidMs=performance.now()-segment.started;
  if(current.marketValid>=4&&segment.marketAllFourMs==null)segment.marketAllFourMs=performance.now()-segment.started;
  if(current.watchValid>0&&segment.watchFirstPriceMs==null)segment.watchFirstPriceMs=performance.now()-segment.started;
  if(current.watchValid>=3&&segment.watchAllThreePriceMs==null)segment.watchAllThreePriceMs=performance.now()-segment.started;
  if(current.watchRows.length&&current.watchPending===0&&segment.watchRefreshLabelEndedMs==null)segment.watchRefreshLabelEndedMs=performance.now()-segment.started;
  if(current.homeHeatmapValid>0&&segment.homeHeatmapFirstValidMs==null)segment.homeHeatmapFirstValidMs=performance.now()-segment.started;
  if(current.mapValid>0&&segment.mapFirstValidMs==null)segment.mapFirstValidMs=performance.now()-segment.started;
  if(current.mapValid>=20&&segment.mapTwentyShownMs==null)segment.mapTwentyShownMs=performance.now()-segment.started;
  if(current.progress.some(s=>/20\s*\/\s*20종목 응답/.test(s))&&segment.kr20of20LabelMs==null)segment.kr20of20LabelMs=performance.now()-segment.started;
  const ready=segment.route==='home'?current.surface==='home'&&current.marketValid>0&&current.homeHeatmapValid>0:current.surface==='heatmap'&&current.mapValid>=18;
  if(ready&&segment.primaryFirstObservedMs==null)segment.primaryFirstObservedMs=performance.now()-segment.started;
  const terminal=ready&&!current.loaders.length&&current.watchPending===0&&(segment.route!=='heatmap'||!current.progress.some(value=>/시세를 순차 확인/.test(value)));
  if(terminal&&segment.terminalFirstObservedMs==null)segment.terminalFirstObservedMs=performance.now()-segment.started;
  return current;
 };
 audit.start=(label,started=performance.now(),route)=>{audit.segments.push({label,route,started,states:[],last:null});audit.sample();};
 audit.start('cold',0,location.hash.slice(1).split('/')[0]||location.pathname.split('/')[1]||'home');
 new MutationObserver(()=>audit.sample()).observe(document,{childList:true,subtree:true,attributes:true,characterData:true});
 try{new PerformanceObserver(list=>{for(const entry of list.getEntries())audit.longTasks.push({startMs:entry.startTime,durationMs:entry.duration});}).observe({type:'longtask',buffered:true});}catch{}
 window.addEventListener('error',event=>audit.errors.push({type:'error',message:String(event.message||'error')}));
 window.addEventListener('unhandledrejection',event=>audit.errors.push({type:'unhandledrejection',message:String(event.reason?.message||event.reason)}));
};
async function session(profile,run,scenario='hash'){
 const context=await browser.newContext({...devices['Pixel 5'],viewport:{width:390,height:844},deviceScaleFactor:1,locale:'ko-KR',...(process.env.E2E_PROXY_SERVER?{proxy:{server:process.env.E2E_PROXY_SERVER,bypass:'127.0.0.1,localhost'}}:{})});
 if(profile==='saved3')await context.addInitScript(()=>{
  localStorage.setItem('chartview-toss-watchlist-v1',JSON.stringify([{symbol:'005930.KS',name:'삼성전자'},{symbol:'NVDA',name:'엔비디아'},{symbol:'AAPL',name:'애플'}]));
  localStorage.setItem('chartview-toss-selected-v1',JSON.stringify(['005930.KS','NVDA','AAPL']));
 });
 await context.addInitScript(observer);
 const page=await context.newPage();
 const errors=[],rows=[],requests=new WeakMap();
 let phase='cold',phaseStart=performance.now();
 const label=()=>`${mode}-${profile}-${run}-${scenario}-${phase}`;
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{
  const url=new URL(request.url());if(!/^https?:$/.test(url.protocol))return;
  const row={session:`${mode}-${profile}-${run}-${scenario}`,phase,method:request.method(),path:url.pathname,host:url.hostname,query:url.search,startMs:performance.now()-phaseStart,status:null,state:'pending',headersMs:null,finishedMs:null,decodedBodyBytes:null};
  rows.push(row);requestRows.push(row);requests.set(request,{row,started:performance.now()});
 });
 page.on('requestfailed',request=>{const entry=requests.get(request);if(entry){entry.row.state=/abort|cancel/i.test(request.failure()?.errorText||'')?'canceled':'failed';entry.row.failure=request.failure()?.errorText;entry.row.finishedMs=entry.row.startMs+performance.now()-entry.started;}});
 page.on('response',async response=>{
  const entry=requests.get(response.request());if(!entry)return;
  const {row,started}=entry;row.status=response.status();row.headersMs=performance.now()-started;
  const finished=await response.finished().catch(error=>String(error));
  if(finished){if(row.state==='pending')row.state='failed';row.failure=String(finished);return;}
  row.state='complete';row.finishedMs=row.startMs+performance.now()-started;
  try{row.decodedBodyBytes=(await response.body()).length;}catch{}
  if(['/api/market-now','/api/quotes','/api/home-snapshot','/api/home-bootstrap','/api/home-live'].includes(row.path)){
   try{
    const payload=await response.json();const list=payload.results||payload.heatmap?.results||[];
    row.dataBasis={generatedAt:payload.generatedAt,cacheHits:payload.cacheHits,providerFetches:payload.providerFetches,rows:list.map(row=>({ticker:row.ticker,price:row.price,change:row.change,asOf:row.asOf,source:row.source,stale:row.stale})),errors:payload.errors};
   }catch(error){row.bodyError=String(error);}
  }
  if(row.path==='/api/heatmap/full'){
   try{
    const payload=await response.json();
    const full={session:row.session,phase:row.phase,responseMs:row.finishedMs,complete:payload.complete??null,refreshing:payload.refreshing??null,generatedAt:payload.generatedAt,received:payload.received,coverage:payload.coverage,partialCoverage:payload.partialCoverage,counts:Object.fromEntries(['KR','US'].map(market=>[market,{rows:(payload.results||[]).filter(r=>r.market===market).length,stale:(payload.results||[]).filter(r=>r.market===market&&r.stale).length,retained:(payload.results||[]).filter(r=>r.market===market&&r.retained).length,valid:(payload.results||[]).filter(r=>r.market===market&&r.price>0&&Number.isFinite(r.change)&&r.asOf&&r.source).length}])),observations:(payload.results||[]).map(row=>({ticker:row.ticker,market:row.market,price:row.price,change:row.change,asOf:row.asOf,source:row.source,stale:row.stale,retained:row.retained})),keys:Object.keys(payload)};
    row.heatmap=full;fullPayloads.push(full);
   }catch(error){row.bodyError=String(error);}
  }
 });
 if(process.env.E2E_PROXY_SERVER)await page.route('**/*',async route=>{
  const pathname=new URL(route.request().url()).pathname;
  if(/\/api\/|\/static\/data\//.test(pathname)){try{const response=await route.fetch({timeout:60000});await route.fulfill({response});}catch(error){if(!page.isClosed())await route.abort('failed').catch(()=>{});}return;}
  await route.continue();
 });
 if(mode==='constrained'){
  const cdp=await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750,connectionType:'cellular4g'});
 }
 async function enter(route,newPhase,{direct=false,pathname=false}={}){
  phase=newPhase;phaseStart=performance.now();
  if(direct)await page.goto(base+(pathname?`/${route}/`:`/#${route}`),{waitUntil:'domcontentloaded',timeout:30000});
  else await page.evaluate(({route,phase})=>{window.__focusAudit.start(phase,performance.now(),route);window.__chartviewNavigate(route);},{route,phase:newPhase});
  let primary='ready';
  try{await page.waitForFunction(route=>{const s=window.__focusAudit.sample();return route==='home'?s?.surface==='home'&&s.marketValid>0&&s.homeHeatmapValid>0:s?.surface==='heatmap'&&s.mapValid>=18;},route,{timeout:30000,polling:50});}catch{primary='timeout';}
  const firstMs=performance.now()-phaseStart;
  if(run===0||primary==='timeout')await page.screenshot({path:`${out}/${label()}-first.png`,fullPage:true}).catch(()=>{});
  let settled='settled';
  try{await page.waitForFunction(route=>{const s=window.__focusAudit.sample();if(!s)return false;return route==='home'?s.surface==='home'&&s.marketValid>0&&s.homeHeatmapValid>0&&!s.loaders.length&&s.watchPending===0:s.surface==='heatmap'&&s.mapValid>=18&&!s.progress.some(s=>/시세를 순차 확인/.test(s))&&!s.loaders.length;},route,{timeout:maxSettleMs,polling:100});}catch{settled='observation_limit';}
  const finishMs=performance.now()-phaseStart;
  const state=await page.evaluate(()=>{const a=window.__focusAudit;a.sample();const s=a.segments.at(-1);return {...s,last:undefined,final:s.states.at(-1),longTasks:a.longTasks.filter(row=>row.startMs>=s.started),runtimeErrors:a.errors,resourceTiming:performance.getEntriesByType('resource').filter(row=>row.startTime>=s.started).map(row=>({path:new URL(row.name).pathname,host:new URL(row.name).hostname,initiator:row.initiatorType,startMs:row.startTime-s.started,durationMs:row.duration,transferBytes:row.transferSize,encodedBodyBytes:row.encodedBodySize,decodedBodyBytes:row.decodedBodySize})),paint:performance.getEntriesByType('paint').map(row=>({name:row.name,ms:row.startTime}))};});
  const requests=rows.filter(row=>row.phase===newPhase);
  const grouped=Object.groupBy(requests,row=>`${row.method} ${row.host}${row.path}${row.query}`);
  const row={source,mode,profile,run,route,phase:newPhase,scenario,firstPrimaryMs:firstMs,primary,finishMs,settled,...state,pageErrors:[...errors],requests:requests.map(r=>({...r})),duplicateKeys:Object.entries(grouped).filter(([,r])=>r.length>1).map(([key,r])=>({key,calls:r.length,startMs:r.map(row=>row.startMs),note:key.includes('/api/heatmap/full')?'Could include expected 3-second progressive poll; correlate payloads':'Check app polling/retry/concurrent sources'}))};
  results.push(row);await save();
  console.log(JSON.stringify({profile,run,route,phase:newPhase,mode,firstPrimaryMs:Math.round(firstMs),finishMs:Math.round(finishMs),settled,firstMap:row.mapFirstValidMs,kr20:row.kr20of20LabelMs,final:row.final,fullResponses:requests.filter(r=>r.path==='/api/heatmap/full').map(r=>r.heatmap)}));
  if(run===0||settled!=='settled')await page.screenshot({path:`${out}/${label()}-final.png`,fullPage:true}).catch(()=>{});
 }
 async function away(){await page.evaluate(()=>window.__chartviewNavigate('more'));await page.waitForSelector('#analysis-find',{timeout:30000});}
 return {context,page,enter,away,async observeCanonicalStop(){
  const began=performance.now();let outcome='observation_limit';
  while(performance.now()-began<maxSettleMs){
   if(rows.some(row=>row.path==='/api/heatmap/full'&&row.heatmap?.refreshing===false)){outcome='refresh_stopped';break;}
   try{const response=await page.waitForResponse(response=>new URL(response.url()).pathname==='/api/heatmap/full',{timeout:Math.max(1,maxSettleMs-(performance.now()-began))});const payload=await response.json();if(payload.refreshing===false){outcome='refresh_stopped';break;}}catch{break;}
  }
  progressivePollObservation={outcome,additionalObservationMs:performance.now()-began,states:await page.evaluate(()=>{window.__focusAudit.sample();return window.__focusAudit.segments.at(-1).states;}),responses:rows.filter(row=>row.path==='/api/heatmap/full').map(row=>({...row}))};
  await page.screenshot({path:`${out}/poll-heatmap-final.png`,fullPage:true});
 },async close(){await page.unrouteAll({behavior:'ignoreErrors'});await context.close();}};
}
async function save(){
 await writeFile(`${out}/focused-${mode}.json`,JSON.stringify({schemaVersion:1,base,source,recordedAt:new Date().toISOString(),mode,viewport:{width:390,height:844},device:'Playwright Pixel 5 Chromium; not physical Toss runtime',runs:runCount,proxyRelay:Boolean(process.env.E2E_PROXY_SERVER),browserHttpCacheDisabled:Boolean(process.env.E2E_PROXY_SERVER),TLSVerification:true,maxSettleMs,constrainedMeaning:mode==='constrained'?'CDP CPU ×4 and browser assets 150ms latency/1.6Mbps download/0.75Mbps upload; actual API/static data Node relay is NOT network-throttled. This is not an end-to-end mobile network benchmark.':null,firstPrimaryMeaning:'Home requires valid numeric market and compact heatmap; Heatmap requires >=18 numeric map stocks. Settled means visible document loaders/sequential-check label gone; retained/stale warning is preserved. Watch refresh labels must also end; an API background refresh can still be active.',decodedBodyBytesMeaning:'Decoded response body bytes, not wire transfer size',results,requests:requestRows,heatmapResponses:fullPayloads,progressivePollObservation},null,2));
}
try{
 if(mode==='poll'){
  const poll=await session('empty',0);try{await poll.enter('heatmap','cold',{direct:true});await poll.observeCanonicalStop();}finally{await poll.close();}
 }else{
 for(const profile of ['saved3','empty'])for(let run=0;run<runCount;run++){
  const cold=await session(profile,run);try{await cold.enter('heatmap','cold',{direct:true});}finally{await cold.close();}
  const shared=await session(profile,run);try{
   await shared.enter('home','cold',{direct:true});await shared.away();await shared.enter('home','warm');
   await shared.enter('heatmap','spa');await shared.away();await shared.enter('heatmap','warm');
  }finally{await shared.close();}
 }
 if(mode==='normal'){
  const path=await session('empty',0,'pathname');try{await path.enter('heatmap','cold',{direct:true,pathname:true});}finally{await path.close();}
 }
 }
}finally{await browser.close();await save();}
