// Run only after both exact tested revisions have been deployed.
// No API fixtures, synthetic prices, fake success states or native Toss emulation.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
// Run from the frontend checkout, or explicitly point at its installed package.
const packageJson=resolve(process.env.QA_PACKAGE_JSON||resolve(process.env.QA_PACKAGE_ROOT||process.cwd(),'package.json'));
const require=createRequire(packageJson);
const {chromium,webkit,devices}=require('playwright');
const {expect}=require('@playwright/test');
const BASE=(process.env.QA_FRONTEND_BASE||'https://chart-view-toss.onrender.com').replace(/\/+$/,'');
const BACKEND=(process.env.QA_BACKEND_BASE||'https://chart-view-pkv8.onrender.com').replace(/\/+$/,'');
for(const base of [BASE,BACKEND]){
 const url=new URL(base);assert.equal(url.protocol,'https:');assert.equal(url.username,'');assert.equal(url.password,'');
}
const OUT=resolve(process.env.QA_OUT_DIR||resolve(dirname(fileURLToPath(import.meta.url)),'production-smoke'));
const backendSha=process.env.QA_BACKEND_SHA,frontendSha=process.env.QA_FRONTEND_SHA;
const expectedEntry=process.env.QA_FRONTEND_ENTRY;
const expectedAssetSha256=process.env.QA_FRONTEND_ASSET_SHA256||process.env.QA_FRONTEND_ASSET_SHA||process.env.QA_ASSET_SHA;
assert.match(expectedAssetSha256||'',/^[a-f0-9]{64}$/,'QA_FRONTEND_ASSET_SHA256 must match the build reproduced with the existing public Render variables');
assert.match(backendSha||'',/^[a-f0-9]{40}$/,'QA_BACKEND_SHA must identify the tested backend revision');
assert.match(frontendSha||'',/^[a-f0-9]{40}$/,'QA_FRONTEND_SHA must identify the tested frontend revision');
assert.match(expectedEntry||'',/^\/assets\/[^\s"']+\.js$/,'QA_FRONTEND_ENTRY must be the module path from the tested production build');
const seed=[{symbol:'005930.KS',name:'삼성전자'},{symbol:'AAPL',name:'애플'},{symbol:'NVDA',name:'엔비디아'}];
const WATCH='chartview-toss-watchlist-v1',SELECTED='chartview-toss-selected-v1';
const report={startedAt:new Date().toISOString(),base:BASE,backend:BACKEND,
  execution:{packageJson,outDir:OUT},
  expected:{backendSha,frontendSha,entry:expectedEntry,assetSha256:expectedAssetSha256},
  method:'Actual production responses with strict TLS, unmodified route.fetch relay, isolated localStorage. Browser mobile emulation only; native Android/iOS Toss Sandbox remains unverified.',
  frontendShaEvidence:'SHA supplied by the deployment verifier; this script independently checks the reproduced production module filename, exact SHA256 bytes and backend health revision.',results:[]};
const rate=value=>`${Number(value).toLocaleString('ko-KR',{minimumFractionDigits:1,maximumFractionDigits:2})}%`;
const releaseRate=value=>{
 const rounded=Number(new Intl.NumberFormat('en-US',{useGrouping:false,minimumFractionDigits:1,maximumFractionDigits:1,roundingMode:'halfExpand'}).format(value));
 return `${(rounded===0?0:rounded).toLocaleString('ko-KR',{minimumFractionDigits:1,maximumFractionDigits:1})}%`;
};
const kst=value=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value)).replaceAll('-','.')+' KST';
const monthIndex=value=>Number(value.slice(0,4))*12+Number(value.slice(5,7));
const officialIds={
 cpi:{fred:{sa:'CPIAUCSL',nsa:'CPIAUCNS'},bls:{sa:'CUSR0000SA0',nsa:'CUUR0000SA0'}},
 core_cpi:{fred:{sa:'CPILFESL',nsa:'CPILFENS'},bls:{sa:'CUSR0000SA0L1E',nsa:'CUUR0000SA0L1E'}},
 ppi:{fred:{sa:'PPIFIS',nsa:'PPIFID'},bls:{sa:'WPSFD4',nsa:'WPUFD4'}},
 core_ppi:{fred:{sa:'PPIFES',nsa:'PPICOR'},bls:{sa:'WPSFD49104',nsa:'WPUFD49104'}},
};
function assertOfficialSeriesSource(row){
 const source=row.source,root=new URL(source.url);
 assert.equal(root.protocol,'https:');assert.equal(root.username,'');assert.equal(root.password,'');assert.equal(root.port,'');
 const provider=root.hostname==='fred.stlouisfed.org'?'fred':root.hostname==='api.bls.gov'?'bls':null;
 assert.ok(provider,`Unrecognized official provider for ${row.id}: ${source.url}`);
 const ids=officialIds[row.id][provider];
 assert.equal(source.saSeriesId,ids.sa,'SA series identity does not match the displayed indicator');
 assert.equal(source.nsaSeriesId,ids.nsa,'NSA series identity does not match the displayed indicator');
 const base=provider==='fred'?'https://fred.stlouisfed.org/series/':'https://api.bls.gov/publicAPI/v2/timeseries/data/';
 assert.equal(source.saUrl,base+ids.sa,'SA source URL does not belong to the claimed provider and series');
 assert.equal(source.nsaUrl,base+ids.nsa,'NSA source URL does not belong to the claimed provider and series');
 assert.equal(source.url,provider==='fred'?base+ids.nsa:base,'Provider summary source differs from its actual series sources');
 assert.match(source.name,provider==='fred'?/FRED/i:/Bureau of Labor Statistics.*Public Data API/i);
 return provider;
}
function segmentCount(points,field){
 let count=0,last=null;
 for(const point of points){
  if(!Number.isFinite(point[field])){last=null;continue;}
  const index=monthIndex(point.month);
  if(last===null||index!==last+1)count++;
  last=index;
 }
 return count;
}
async function persist(){await writeFile(`${OUT}/results.json`,JSON.stringify(report,null,2));}
await mkdir(OUT,{recursive:true});
for(const config of [
 {name:'chromium-320',type:chromium,width:320},
 {name:'chromium-390',type:chromium,width:390},
 {name:'chromium-430',type:chromium,width:430},
 {name:'iphone-webkit',type:webkit,device:'iPhone 13'},
]){
 const result={device:config.name,startedAt:new Date().toISOString(),checks:[],failures:[],pageErrors:[],networkFailures:[],requests:[],responses:[],screenshots:[],timings:{}};
 report.results.push(result);
 const browser=await config.type.launch({headless:true});
 const context=await browser.newContext({
  ...(config.device?devices[config.device]:{viewport:{width:config.width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}),
  locale:'ko-KR',timezoneId:'Asia/Seoul',ignoreHTTPSErrors:false,serviceWorkers:'block',
  ...(process.env.E2E_PROXY_SERVER?{proxy:{server:process.env.E2E_PROXY_SERVER,bypass:'127.0.0.1,localhost'}}:{}),
 });
 const page=await context.newPage();page.setDefaultTimeout(30000);
 const observedResponses=new Map();
 page.on('pageerror',error=>result.pageErrors.push(error.message));
 page.on('requestfailed',request=>result.networkFailures.push({url:request.url(),error:request.failure()?.errorText}));
 page.on('request',request=>{
  const url=new URL(request.url());
  if(url.pathname.startsWith('/api/'))result.requests.push({method:request.method(),url:request.url()});
 });
 await context.addInitScript(seed=>{
  if(location.protocol!=='https:')return;
  if(!sessionStorage.getItem('release-insights-qa-seeded')){
   localStorage.setItem('chartview-toss-watchlist-v1',JSON.stringify(seed));
   localStorage.setItem('chartview-toss-selected-v1',JSON.stringify(seed.map(row=>row.symbol)));
   sessionStorage.setItem('release-insights-qa-seeded','once');
  }
 },seed);
 // The proxy may reject browser CORS plumbing. Preserve every original status,
 // header and body while Playwright's API transport reaches the same public URL.
 await page.route(/\/(?:api|static\/data)\//,async route=>{
  const started=performance.now();
  try{
   const response=await route.fetch({timeout:60000});
   const url=new URL(route.request().url());
   // Keep the actual API-transport body before handing it to the document.
   // A later page navigation may release Chromium's response resource.
   if(url.origin===BACKEND&&route.request().method()==='GET'&&url.pathname==='/api/export-momentum'){
    const status=response.status(),body=response.json();body.catch(()=>{});
    observedResponses.set(url.pathname,{status:()=>status,json:()=>body});
   }
   result.responses.push({url:route.request().url(),status:response.status(),durationMs:Math.round(performance.now()-started)});await route.fulfill({response});
  }
  catch(error){result.networkFailures.push({url:route.request().url(),relayError:error.message});await route.abort().catch(()=>{});}
 });
 const step=async(name,action)=>{
  const started=performance.now();
  try{const details=await action();result.checks.push({name,status:'passed',durationMs:Math.round(performance.now()-started),...details});}
  catch(error){result.failures.push({name,message:error.message,stack:error.stack});result.checks.push({name,status:'failed',durationMs:Math.round(performance.now()-started)});await page.screenshot({path:`${OUT}/${config.name}-${name}-failure.png`}).catch(()=>{});}
  await persist();
 };
 const screenshot=async(name)=>{
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  const filename=`${config.name}-${name}.png`;
  await page.screenshot({path:`${OUT}/${filename}`});result.screenshots.push(filename);
 };
 const geometry=async()=>{
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  return page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
 };
 const touch=async locator=>{
  await locator.scrollIntoViewIfNeeded();
  await locator.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
  await expect(locator).toBeVisible();await expect(locator).toBeEnabled();
  await expect.poll(()=>locator.evaluate(el=>{
   const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   return r.width>=44&&r.height>=44&&!!hit&&(el===hit||el.contains(hit));
  })).toBe(true);
 };
 const captureData=async(name,payload)=>{await writeFile(`${OUT}/${config.name}-${name}.json`,JSON.stringify(payload,null,2));};
 const nav=name=>page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name,exact:true});
 const pendingResponse=predicate=>{
  const pending=page.waitForResponse(predicate,{timeout:45000});
  // Attach immediately so an earlier navigation failure cannot leave an
  // unhandled timeout promise while other independent checks are recorded.
  pending.catch(()=>{});return pending;
 };
 try{
  await step('deployed-revisions',async()=>{
   const healthResponse=await context.request.get(`${BACKEND}/health`,{timeout:45000});
   assert.equal(healthResponse.status(),200);const health=await healthResponse.json();
   assert.equal(health.revision,backendSha,'Live backend differs from the tested release');
   const htmlResponse=await context.request.get(BASE+'/',{timeout:45000});assert.equal(htmlResponse.status(),200);
   const html=await htmlResponse.text(),entry=html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1];
   assert.equal(entry,expectedEntry,'Live frontend entry differs from the tested production build');
   const asset=await context.request.get(new URL(entry,BASE).href,{timeout:45000});assert.equal(asset.status(),200);
   const assetSha256=createHash('sha256').update(await asset.body()).digest('hex');
   assert.equal(assetSha256,expectedAssetSha256,'Live frontend bytes differ from the reproduced production build');
   await captureData('deployed-revisions',{health,entry,assetSha256});
   return {backendRevision:health.revision,frontendEntry:entry,assetSha256};
  });
  await step('home-watch-detail',async()=>{
   await page.goto(BASE+'/#home',{waitUntil:'domcontentloaded',timeout:45000});
   await expect(page.locator('#home-watchlist .watch-price>strong')).toHaveCount(3);
   for(const price of await page.locator('#home-watchlist .watch-price>strong').all())await expect(price).toContainText(/\d/);
   for(const symbol of seed.map(row=>row.symbol))await expect(page.locator(`#home-watchlist [data-stock-detail="${symbol}"] .stock-copy>small`)).toContainText(/\d{1,2}\.\s*\d{1,2}\..*\d{1,2}:\d{2}\s*KST/);
   assert.equal(result.requests.filter(row=>row.url.includes('/api/earnings-events')).length,0,'Home unexpectedly loads the optional earnings service');
   const homeGeometry=await geometry();await screenshot('home');
   await nav('관심').click();
   await expect(page.locator('#watch-rich-list .watch-main')).toHaveCount(3);
   for(const price of await page.locator('#watch-rich-list .watch-card-price>strong').all())await expect(price).toContainText(/\d/);
   const bytes=await page.evaluate(({WATCH,SELECTED})=>({watch:localStorage.getItem(WATCH),selected:localStorage.getItem(SELECTED)}),{WATCH,SELECTED});
   await page.locator('[data-watch-sort="name"]').click();
   await page.reload({waitUntil:'domcontentloaded',timeout:45000});
   await expect(page.locator('[data-watch-sort="name"]')).toHaveAttribute('aria-pressed','true');
   assert.deepEqual(await page.evaluate(({WATCH,SELECTED})=>({watch:localStorage.getItem(WATCH),selected:localStorage.getItem(SELECTED)}),{WATCH,SELECTED}),bytes);
   await geometry();await screenshot('watch');
   const chartFetched=pendingResponse(response=>{
    const url=new URL(response.url());
    return url.origin===BACKEND&&response.request().method()==='GET'&&url.pathname==='/api/compare'&&url.searchParams.get('tickers')==='005930.KS'&&url.searchParams.get('period')==='3mo';
   });
   const detailStarted=performance.now();
   await page.locator('#watch-rich-list .watch-main[data-stock-detail="005930.KS"]').click();
   await expect(page.locator('#detail-name')).toContainText('삼성전자');
   await expect(page.locator('#detail-price .quote-main>div:first-child>strong')).toContainText(/\d/);
   const chartResponse=await chartFetched;
   result.timings.detailChartHeadersMs=Math.round(performance.now()-detailStarted);
   assert.equal(chartResponse.status(),200);const chartRaw=await chartResponse.json();
   result.timings.detailChartBodyMs=Math.round(performance.now()-detailStarted);
   await captureData('detail-chart',chartRaw);
   const chartStock=chartRaw.stocks.find(row=>row.ticker==='005930.KS'||row.symbol==='005930.KS');
   assert.ok(chartStock?.data?.some(point=>Number.isFinite(point.value)),'Actual chart response has no finite stock observations');
   await expect(page.locator('#detail-chart canvas').first()).toBeVisible();
   result.timings.detailChartVisibleMs=Math.round(performance.now()-detailStarted);
   await expect(page.locator('#research-question')).toBeVisible();
   const savedQuestion='운영 QA: 최근 공시 매출과 영업이익 비교';
   await page.locator('#research-question').fill(savedQuestion);
   await page.locator('.research-peer-picker > summary').click();
   await page.locator('[data-peer-symbol="000660.KS"]').click();
   await page.locator('.research-review-editor > summary').click();
   await page.locator('#research-review-on').fill('2026-10-30');
   await page.locator('[data-research-save]').click();
   await expect(page.locator('#research-save-state')).toContainText('저장');
   await expect(page.locator('[data-research-checkpoint]')).toHaveCount(1);
   const draft=savedQuestion+' · 작성 중';await page.locator('#research-question').fill(draft);
   const before={peer:await page.locator('#research-peer-selection').textContent(),status:await page.locator('#research-save-state').textContent()};
   const continuation=page.locator('[data-return-research]');await touch(continuation);await continuation.click();
   await expect(page.locator('#detail-research-card')).toBeFocused();
   await expect(page.locator('#research-question')).toHaveValue(draft);
   assert.equal(await page.locator('#research-peer-selection').textContent(),before.peer);
   assert.equal(await page.locator('#research-save-state').textContent(),before.status);
   await geometry();await screenshot('research-continuation');
   await page.goBack({waitUntil:'domcontentloaded'});
   await expect(page.locator('#watch-rich-list .watch-main')).toHaveCount(3);
   await expect(page.locator('[data-watch-sort="name"]')).toHaveAttribute('aria-pressed','true');
   await page.goForward({waitUntil:'domcontentloaded'});
   await expect(page.locator('#research-question')).toHaveValue(draft);
   await page.reload({waitUntil:'domcontentloaded',timeout:45000});
   await expect(page.locator('#research-question')).toHaveValue(savedQuestion);
   await expect(page.locator('#research-review-on')).toHaveValue('2026-10-30');
   await page.locator('#research-question').fill('운영 QA: 재실행 후 두 번째 근거 기록');
   await page.locator('[data-research-save]').click();
   await expect(page.locator('[data-research-checkpoint]')).toHaveCount(2);
   await page.reload({waitUntil:'domcontentloaded',timeout:45000});
   await expect(page.locator('[data-research-checkpoint]')).toHaveCount(2);
   await page.locator('[data-research-checkpoints] > summary').click();
   await screenshot('research-checkpoints');
   assert.deepEqual(await page.evaluate(({WATCH,SELECTED})=>({watch:localStorage.getItem(WATCH),selected:localStorage.getItem(SELECTED)}),{WATCH,SELECTED}),bytes);
   await nav('홈').click();await expect(page.locator('#home-search-open')).toBeVisible();
   await geometry();await screenshot('return-home');
   return {homeGeometry,watchStored:true,researchDraftBackPreserved:true,researchSavedReloadPreserved:true};
  });
  await step('news-reader-and-chart-evidence',async()=>{
   // Begin a fresh document: hash-only navigation correctly reuses the
   // app's existing news cache and need not produce another response event.
   await page.goto('about:blank');
   const detailFetched=pendingResponse(response=>{const url=new URL(response.url());return url.pathname==='/api/personalized-news'&&url.searchParams.get('tickers')==='005930.KS';});
   await page.goto(BASE+'/#detail/005930.KS',{waitUntil:'domcontentloaded',timeout:45000});
   const detailResponse=await detailFetched;assert.equal(detailResponse.status(),200);const detailNews=await detailResponse.json();
   await captureData('detail-news',detailNews);
   const evidence=page.getByRole('region',{name:'차트 관련 기사 근거'});
   await expect(evidence).toBeVisible();await expect(evidence).toContainText('주가 변동의 원인을 뜻하지 않아요');
   await expect(evidence).not.toContainText('관련 기사를 불러오는 중이에요');
   const marker=evidence.getByRole('button',{name:'차트에 날짜 표시'});
   await expect(marker).toHaveAttribute('aria-pressed','false');
   let markersEnabled=false;
   if(await marker.isEnabled()){
    await touch(marker);await marker.click();await expect(marker).toHaveAttribute('aria-pressed','true');
    await expect(evidence.locator('.chart-evidence-status')).toContainText('날짜 표시 켜짐');
    await expect(evidence).not.toContainText('차트 표시를 적용하지 못했어요');markersEnabled=true;
    await marker.click();await expect(marker).toHaveAttribute('aria-pressed','false');
    await expect(evidence.locator('.chart-evidence-status')).toContainText('날짜 표시 꺼짐');
    await expect(evidence).not.toContainText('차트 표시를 적용하지 못했어요');
   }
   await geometry();await screenshot('chart-evidence');
   await page.goto('about:blank');
   const fetched=pendingResponse(response=>{const url=new URL(response.url());return url.pathname==='/api/personalized-news'&&url.searchParams.get('tickers')===seed.map(row=>row.symbol).join(',');});
   await page.goto(BASE+'/#news',{waitUntil:'domcontentloaded',timeout:45000});
   const response=await fetched;assert.equal(response.status(),200);const payload=await response.json();await captureData('news-reader',payload);
   await expect(page.locator('.news-reader')).toBeVisible();
   const groups=Array.isArray(payload?.groups)?payload.groups:[];
   const validShape=payload&&(Array.isArray(payload.items)||Array.isArray(payload.groups));
   const hasRows=Boolean((Array.isArray(payload?.items)?payload.items:[]).some(row=>row&&typeof row==='object')||groups.some(group=>Array.isArray(group?.items)&&group.items.some(row=>row&&typeof row==='object')));
   const failed=Boolean(!validShape||payload.loadError||payload.error||payload.status==='error'||payload.errors?.length||groups.some(group=>group?.status==='error'));
   if(hasRows){
    await expect(page.locator('[data-news-reader-card]').first()).toBeVisible();
    if(failed){await expect(page.locator('.news-reader')).toContainText('일부 종목의 뉴스를 불러오지 못했어요');await expect(page.locator('[data-news-retry]')).toBeVisible();}
   }
   else if(failed)await expect(page.locator('[data-news-retry]')).toBeVisible();
   else await expect(page.locator('.news-reader-empty')).toContainText('현재 표시할 관련 뉴스가 없어요');
   await expect(page.locator('[data-news-us-coverage]')).toContainText('4일');
   assert.equal(result.requests.filter(row=>new URL(row.url).pathname==='/api/news-summary').length,0,'Summary must not load before explicit expansion');
   const filters=page.locator('[data-news-source]:not([data-news-source="all"])');
   if(await filters.count()){const first=filters.first();await touch(first);await first.click();await expect(first).toHaveAttribute('aria-pressed','true');}
   await geometry();await screenshot('news-reader');
   return {providerErrors:payload.errors||[],hasRows,markersEnabled,summaryAutoRequests:0};
  });
  await step('privacy-checkpoint-retention',async()=>{
   await page.goto(BASE+'/privacy.html',{waitUntil:'domcontentloaded',timeout:45000});
   await expect(page.locator('main')).toContainText('종목별 최근 20개의 연구 체크포인트');
   await expect(page.locator('main')).toContainText('해당 질문 삭제 또는 기기 데이터 초기화로 함께 삭제');
   await geometry();await screenshot('privacy');
   return {policyStatesLocalRetention:20,policyStatesDeletionWithQuestionOrReset:true};
  });
  await step('official-inflation',async()=>{
   const fetched=pendingResponse(response=>new URL(response.url()).pathname==='/api/macro');
   await page.goto(BASE+'/#macro',{waitUntil:'domcontentloaded',timeout:45000});
   const response=await fetched;assert.equal(response.status(),200);const raw=await response.json();await captureData('macro',raw);
   assert.equal(raw.results.length,16,'Legacy macro coverage changed');
   assert.deepEqual(raw.inflation.series.map(row=>row.id).sort(),['cpi','core_cpi','ppi','core_ppi','pce','core_pce'].sort());
   await expect(page.locator('.macro-tile')).toHaveCount(16);
   await expect(page.locator('[data-inflation-series]')).toHaveCount(6);
   const requestsBefore=result.requests.filter(row=>row.url.includes('/api/macro')).length;
   const reading=page.locator('.inflation-reading');
   for(const row of raw.inflation.series){
    const isPce=['pce','core_pce'].includes(row.id);
    assert.deepEqual(row.basis,{yoy:isPce?'SA':'NSA',mom:'SA'});assert.equal(row.asOf,isPce?'2026-08':'2026-09');
    assert.equal(row.points.length,60);
    if(isPce){
     const workbook='https://apps.bea.gov/national/Release/XLS/Underlying/Section2All_xls.xlsx';
     const account=row.id==='pce'?'DPCERG':'DPCCRG';
     assert.equal(row.source.url,workbook);assert.equal(row.source.saUrl,workbook);
     assert.equal(row.source.saSeriesId,account);assert.equal(row.source.beaAccountCode,account);
     assert.equal(row.source.nsaUrl,undefined);assert.equal(row.source.nsaSeriesId,undefined);
     assert.match(row.source.name,/Bureau of Economic Analysis/);
     assert.equal(row.publishedAt,'2026-09-30T12:30:00Z');
     assert.equal(row.publicationSourceUrl,'https://www.bea.gov/news/2026/personal-income-and-outlays-august-2026');
     assert.deepEqual(Object.keys(row.sourceIndices),['sa']);
    }else assertOfficialSeriesSource(row);
    const point=row.points.find(point=>point.month===row.asOf);assert.ok(point&&Number.isFinite(point.yoy)&&Number.isFinite(point.mom));
    if(isPce){
     assert.equal(point.publishedAt,row.publishedAt);assert.equal(row.publicationPrecision,'second');
     const sa=new Map(row.sourceIndices.sa.map(index=>[index.month,index.value]));
     const current=sa.get(row.asOf);assert.ok(Number.isFinite(current)&&current>0);
     for(const [field,months] of [['yoy',12],['mom',1]]){
      const date=new Date(`${row.asOf}-01T00:00:00Z`);date.setUTCMonth(date.getUTCMonth()-months);
      const prior=sa.get(date.toISOString().slice(0,7));assert.ok(Number.isFinite(prior)&&prior>0);
      assert.ok(Math.abs(point[field]-(current/prior-1)*100)<.0000011,`PCE ${field} is not calculated from the same SA indices`);
     }
    }
    const select=page.locator(`[data-inflation-series="${row.id}"]`);await touch(select);await select.click();
    await page.locator('[data-inflation-rate="yoy"]').click();await page.locator('[data-inflation-years="5"]').click();
    await expect(reading.locator('[data-inflation-value]')).toHaveText(rate(point.yoy));
    await expect(reading.locator('.inflation-chart-basis')).toContainText(isPce?'계절조정 (SA)':'비계절조정 (NSA)');
    await expect(reading.locator('.inflation-source [data-external-url]')).toHaveAttribute('data-external-url',isPce?row.source.saUrl:row.source.nsaUrl);
    await expect(reading.locator('.inflation-observation-publication')).toContainText(isPce?'2026.08 지표 · 09.30 발표':`2026.09 지표 · ${row.id.includes('ppi')?'10.15':'10.14'} 발표`);
    await expect(reading.locator('[data-inflation-comparison]')).toHaveAttribute('data-comparison-level','gray');
    await expect(reading.locator('[data-comparison-expected]')).toHaveText('미제공');
    await expect(reading.locator('[data-comparison-actual]')).toHaveAttribute('data-comparison-actual-kind','index_calculated');
    const assertGrayActual=async value=>{
     const actual=reading.locator('[data-comparison-actual]');
     assert.equal(await actual.evaluate(el=>[...el.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join('').trim()),releaseRate(value));
     await expect(actual.locator('small')).toHaveText('지수 계산값');
     await expect(reading.locator('[data-comparison-label]')).toHaveText('비교 미제공');
     await expect(reading.locator('[data-comparison-label]')).toHaveCSS('color','rgb(83, 98, 115)');
    };
    await assertGrayActual(point.yoy);
    const expectedSegments=segmentCount(row.points,'yoy');
    assert.equal(await reading.locator('.inflation-line,.inflation-dot').count(),expectedSegments,'Chart connects across a missing official observation');
    if(['cpi','core_cpi'].includes(row.id)){
     assert.equal(row.points.find(point=>point.month==='2025-10')?.yoy,null);
     assert.equal(row.points.find(point=>point.month==='2025-10')?.mom,null);
     await expect(reading.locator('.inflation-chart-note')).toContainText('2025.10');
    }
    await touch(page.locator('[data-inflation-rate="mom"]'));await page.locator('[data-inflation-rate="mom"]').click();
    await expect(reading.locator('[data-inflation-value]')).toHaveText(rate(point.mom));
    await expect(reading.locator('.inflation-chart-basis')).toContainText('계절조정 (SA)');
    await expect(reading.locator('.inflation-source [data-external-url]')).toHaveAttribute('data-external-url',row.source.saUrl);
    await expect(reading.locator('[data-inflation-comparison]')).toHaveAttribute('data-comparison-level','gray');
    await expect(reading.locator('[data-comparison-expected]')).toHaveText('미제공');
    await expect(reading.locator('[data-comparison-actual]')).toHaveAttribute('data-comparison-actual-kind','index_calculated');
    await assertGrayActual(point.mom);
    if(row.observationStatus==='preliminary'){
     await expect(reading.locator('.inflation-reading-head')).toContainText('잠정치');
     // A BLS preliminary footnote must not itself become a detected revision.
     if(row.revisionStatus!=='revised'){
      await reading.locator('.inflation-provenance > summary').click();
      await expect(reading.locator('.inflation-provenance')).toContainText('수정 여부 미확인');
      await reading.locator('.inflation-provenance > summary').click();
     }
    }
   }
   const upcoming=raw.releaseCalendar.events.filter(row=>Date.parse(row.scheduledAt)>Date.now()).sort((a,b)=>Date.parse(a.scheduledAt)-Date.parse(b.scheduledAt));assert.ok(upcoming.length>=3);
   assert.equal(upcoming[0].indicator,'pce','The next official PCE release must lead the October 16 release calendar');
   for(const event of upcoming.slice(0,2)){
    assert.equal(event.status,'confirmed');assert.ok(['www.bls.gov','apps.bea.gov'].includes(new URL(event.sourceUrl).hostname));
    await expect(page.locator('.inflation-agenda')).toContainText(kst(event.scheduledAt));
   }
   const agenda=page.locator('.inflation-agenda');
   await expect(agenda.locator(':scope > .inflation-agenda-list > li').first()).toContainText('PCE');
   await expect(agenda.locator(':scope > .inflation-agenda-list > li').first()).toContainText(kst(upcoming[0].scheduledAt));
   await agenda.locator('.inflation-agenda-more > summary').click();
   for(const indicator of ['pce','cpi','ppi']){
    const event=upcoming.find(row=>row.indicator===indicator);assert.ok(event,`No official ${indicator} event`);
    assert.equal(event.status,'confirmed');
    if(indicator==='pce'){
     assert.equal(event.sourceUrl,'https://apps.bea.gov/API/signup/release_dates.json');
     assert.equal(event.observationMonth,null,'BEA schedule did not specify an observation month');
    }else assert.equal(new URL(event.sourceUrl).hostname,'www.bls.gov');
    const calendarRow=agenda.locator('.inflation-agenda-list > li').filter({has:page.locator('.inflation-event-kst',{hasText:kst(event.scheduledAt)})}).filter({hasText:event.name});
    await expect(calendarRow).toBeVisible();
    await expect(calendarRow.locator('[data-external-url]')).toHaveAttribute('data-external-url',event.sourceUrl);
    if(indicator==='pce')await expect(calendarRow).toContainText('대상 관측월 미제공');
   }
   assert.equal(result.requests.filter(row=>row.url.includes('/api/macro')).length,requestsBefore,'Graph controls made extra API calls');
   await touch(reading.locator('.inflation-source [data-external-url]'));
   await geometry();await reading.scrollIntoViewIfNeeded();await screenshot('inflation-chart');
   await page.locator('.inflation-agenda').scrollIntoViewIfNeeded();await screenshot('official-calendar');
   return {legacyCount:raw.results.length,inflation:raw.inflation.series.map(row=>({id:row.id,asOf:row.asOf,basis:row.basis,source:row.source,observationStatus:row.observationStatus||'unknown',revisionStatus:row.revisionStatus,nulls:row.points.filter(point=>point.yoy===null||point.mom===null).map(point=>point.month)})),calendarStatus:raw.releaseCalendar.status,upcomingCount:upcoming.length};
  });
  await step('official-company-calls',async()=>{
   const fetched=pendingResponse(response=>new URL(response.url()).pathname==='/api/earnings-events');
   await page.goto(BASE+'/#consensus',{waitUntil:'domcontentloaded',timeout:45000});
   const response=await fetched;assert.equal(response.status(),200);const raw=await response.json();await captureData('earnings-events',raw);
   const upcoming=raw.events.filter(row=>Date.parse(row.scheduledAt)>Date.now());
   for(const symbol of ['005930.KS','AAPL']){
    const event=upcoming.find(row=>row.symbol===symbol);assert.ok(event,`${symbol} has no verified upcoming call`);
    assert.equal(event.eventType,'earnings_call');assert.equal(event.timingRole,'conference_call');
    const card=page.locator(`[data-earnings-call="${symbol}"]`);await expect(card).toBeVisible();
    const displayedKst=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(event.scheduledAt))+' KST';
    await expect(card.locator(':scope > b')).toHaveText(displayedKst);
    await expect(card.locator('[data-external-url]')).toHaveAttribute('data-external-url',event.source.url);
    await touch(card.locator('[data-external-url]'));
    await card.locator('details > summary').click();await expect(card.locator('details')).toContainText('실적 발표 시각 미제공');
   }
   await expect(page.locator('.earnings-call-note')).toContainText('실적 발표 시각과 다를 수');
   await page.locator('.earnings-comparison-limits > summary').click();
   await expect(page.locator('.earnings-comparison-limits')).toContainText('현재 이 비교 통계는 제공하지 않아요');
   assert.equal(raw.comparison.status,'unavailable');
   for(const i of [0,1,2]){
    const estimate=page.locator(`#estimate-${i}`);
    await expect(estimate.locator('.analysis-metrics')).toBeVisible();
    await expect(estimate).not.toContainText('추정치를 불러오지 못했어요');
   }
   await geometry();await page.locator('.earnings-events').scrollIntoViewIfNeeded();await screenshot('official-company-calls');
   return {calls:upcoming.map(row=>({symbol:row.symbol,scheduledAt:row.scheduledAt,source:row.source.url})),comparison:raw.comparison};
  });
  await step('dram-monthly-consistency',async()=>{
   // Home can already have loaded this same public response into the existing API cache.
   // Reuse the observed real response; do not require a redundant network call.
   const monthly=observedResponses.has('/api/export-momentum')?Promise.resolve(observedResponses.get('/api/export-momentum')):pendingResponse(response=>new URL(response.url()).pathname==='/api/export-momentum');
   await page.goto(BASE+'/#exports',{waitUntil:'domcontentloaded',timeout:45000});
   const monthlyResponse=await monthly;assert.equal(monthlyResponse.status(),200);const raw=await monthlyResponse.json();await captureData('exports',raw);
   const overview=raw.semiconductorBreakdown.find(row=>row.key==='dram');assert.ok(overview);
   assert.equal(Number(overview.exportMoM).toFixed(1),'6.6','DRAM cached MoM still uses the wrong previous-month denominator');
   const fetched=pendingResponse(response=>new URL(response.url()).pathname.endsWith('/semiconductor-trends'));
   await page.getByRole('tab',{name:'반도체',exact:true}).click();
   const trendsResponse=await fetched;assert.equal(trendsResponse.status(),200);const trends=await trendsResponse.json();await captureData('semiconductor-trends',trends);
   const dram=trends.segments.find(row=>row.key==='dram');assert.ok(dram);
   const august=dram.history.find(row=>row.period==='2026-08'),september=dram.history.find(row=>row.period==='2026-09');
   assert.ok(august&&september);assert.ok(Math.abs(august.exportsUsdBillion-15.7331)<.0001);assert.ok(Math.abs(september.exportsUsdBillion-16.777)<.0001);
   const expected=(september.exportsUsdBillion/august.exportsUsdBillion-1)*100;
   assert.ok(Math.abs(overview.exportMoM-expected)<.06,'Overview MoM disagrees with consecutive graph months');
   const reportCard=page.locator('[data-export-panel="semiconductor"] .export-semi-report-card').filter({has:page.locator('strong',{hasText:/^DRAM$/})});
   await expect(reportCard).toContainText('MoM +6.6%');await expect(reportCard).not.toContainText('-46.7%');
   const chart=page.getByRole('img',{name:'DRAM 최근 12개월 수출액 추이',exact:true});
   const bars=await chart.getByTestId('semiconductor-month').evaluateAll(nodes=>nodes.map(node=>({label:node.getAttribute('aria-label'),height:parseFloat(node.querySelector('i').style.height)})));
   const a=bars.find(row=>row.label.startsWith('2026-08 ')),s=bars.find(row=>row.label.startsWith('2026-09 '));assert.ok(a&&s);assert.ok(s.height>a.height);
   for(const [bar,point] of [[a,august],[s,september]]){
    const displayed=Number(bar.label.split(' ')[1].replace('억달러','').replaceAll(',',''))/10;
    assert.ok(Math.abs(displayed-point.exportsUsdBillion)<.0051,'Graph amount is not the live response in billion USD');
   }
   await geometry();await chart.scrollIntoViewIfNeeded();await screenshot('dram-corrected-chart');
   await reportCard.scrollIntoViewIfNeeded();await screenshot('dram-corrected-mom');
   return {period:raw.itemPeriod||raw.period,august:august.exportsUsdBillion,september:september.exportsUsdBillion,overviewMoM:overview.exportMoM,calculatedMoM:expected,bars:[a,s]};
  });
 }finally{
  if(result.pageErrors.length)result.failures.push({name:'runtime',message:JSON.stringify(result.pageErrors)});
  result.finishedAt=new Date().toISOString();
  await page.unrouteAll({behavior:'ignoreErrors'});await context.close();await browser.close();await persist();
  console.log(JSON.stringify({device:config.name,checks:result.checks.map(row=>({name:row.name,status:row.status})),failures:result.failures,pageErrors:result.pageErrors}));
 }
}
report.finishedAt=new Date().toISOString();report.status=report.results.some(row=>row.failures.length)?'failed':'passed';await persist();
if(report.status==='failed')process.exitCode=1;
