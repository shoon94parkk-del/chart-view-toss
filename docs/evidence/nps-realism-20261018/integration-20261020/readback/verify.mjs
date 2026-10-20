import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {chromium,webkit,devices,expect} from '/workspace/chart-view-toss/node_modules/@playwright/test/index.mjs';
import {calculateNpsScenario,npsAssumptionCases,validateNpsSummary,validateNpsHoldings} from '/workspace/chart-view-toss/src/npsAllocationModel.js';
const out='/workspace/nps-readback-20261020';
const root='/workspace/chart_View/static/data/nps';
const summaryBody=await fs.readFile(path.join(root,'summary.json'));
const summary=JSON.parse(summaryBody);validateNpsSummary(summary);
const holdingsBody=await fs.readFile(path.join(root,summary.filing.detailsFile));
const holdings=JSON.parse(holdingsBody);validateNpsHoldings(holdings,summary);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fmt=(v,d=2)=>v.toLocaleString('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d});
const signed=(v,d=2)=>(v>0?'+':'')+fmt(v,d);
assert.equal(summary.snapshotVersion,'b28f01645e1db7eb');
assert.equal(summary.marketDate,'2026-10-19');
assert.equal(summary.sensitivity.cases.length,7);
assert.equal(summary.filing.directCount,546);assert.equal(summary.filing.totalCount,552);
const expected=calculateNpsScenario(summary);
for(const key of ['weight','gap','adjustment','targetKospi'])assert.ok(Math.abs(expected[key]-summary.result[key])<1e-9,key);
const distFiles=await fs.readdir('/workspace/chart-view-toss/dist/assets');
const indexAsset=distFiles.find(f=>/^index-.*\.js$/.test(f));
const indexBody=await fs.readFile('/workspace/chart-view-toss/dist/assets/'+indexAsset);
const proof={startedAt:new Date().toISOString(),scope:'Independent latest local published JSON readback against existing localhost:4173 build, not full QA or production deployment',summary:{snapshotVersion:summary.snapshotVersion,marketDate:summary.marketDate,generatedAt:summary.generatedAt,sha256:sha(summaryBody),detailsFile:summary.filing.detailsFile,detailsSha256:sha(holdingsBody)},build:{asset:indexAsset,sha256:sha(indexBody)},expected:{weight:expected.weight,gap:expected.gap,adjustment:expected.adjustment,targetKospi:expected.targetKospi,cashBreakdown:expected.cashBreakdown},devices:[]};
await fs.copyFile(path.join(root,'summary.json'),path.join(out,'summary-used.json'));
await fs.copyFile(path.join(root,summary.filing.detailsFile),path.join(out,summary.filing.detailsFile));
async function overflow(page,label){
 const result=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('.nps-page *')].filter(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0&&(r.left< -1||r.right>innerWidth+1)}).slice(0,12).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,60),left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))}));
 assert.ok(result.scrollWidth-result.viewport<=1,`${label}: document overflow ${JSON.stringify(result)}`);
 assert.deepEqual(result.offenders,[],`${label}: contained NPS elements`);
 return result;
}
async function open(page,key){const detail=page.locator(`[data-nps-detail="${key}"]`);if(!await detail.evaluate(e=>e.open))await detail.locator('summary').click();await expect(detail).toHaveJSProperty('open',true);}
const specs=[{name:'chromium-320',launcher:chromium,options:{viewport:{width:320,height:693},isMobile:true,hasTouch:true}},{name:'chromium-393',launcher:chromium,options:{viewport:{width:393,height:851},isMobile:true,hasTouch:true}},{name:'iphone-se-webkit',launcher:webkit,options:devices['iPhone SE']}];
try {
 for(const spec of specs){
  const item={name:spec.name,checks:[],requests:[],blockedNonNpsExternal:[],browserErrors:[],consoleErrors:[],overflows:{}};proof.devices.push(item);
  const browser=await spec.launcher.launch({headless:true});
  try {
   item.browserVersion=browser.version();
   const context=await browser.newContext({...spec.options,locale:'ko-KR',timezoneId:'Asia/Seoul',serviceWorkers:'block'});
   await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.pathname.startsWith('/static/data/nps/')){
     item.requests.push({path:url.pathname,method:req.method()});
     if(url.pathname==='/static/data/nps/summary.json')return route.fulfill({status:200,contentType:'application/json',body:summaryBody});
     if(url.pathname==='/static/data/nps/'+summary.filing.detailsFile)return route.fulfill({status:200,contentType:'application/json',body:holdingsBody});
     item.browserErrors.push('Unexpected NPS path '+url.pathname);return route.abort('blockedbyclient');
    }
    if(['127.0.0.1','localhost'].includes(url.hostname))return route.continue();
    item.blockedNonNpsExternal.push({origin:url.origin,path:url.pathname,method:req.method()});return route.abort('blockedbyclient');
   });
   const page=await context.newPage();page.setDefaultTimeout(12000);
   page.on('pageerror',error=>item.browserErrors.push(error.message));
   page.on('console',message=>{if(message.type()==='error')item.consoleErrors.push(message.text())});
   await page.goto('http://127.0.0.1:4173/#pension',{waitUntil:'domcontentloaded'});
   await expect(page.locator('[data-nps-weight]')).toHaveText(fmt(expected.weight)+'%');
   await expect(page.locator('[data-nps-gap]')).toHaveText(signed(expected.gap)+'%p');
   await expect(page.locator('[data-nps-adjustment]')).toContainText(fmt(Math.abs(expected.adjustment),1)+'조 원');
   await expect(page.locator('[data-nps-adjustment]')).toContainText('축소');
   await expect(page.locator('[data-nps-target-kospi]')).toHaveText(fmt(expected.targetKospi,0)+'pt');
   await expect(page.locator('[data-nps-price-date]')).toHaveText(summary.marketDate);
   await expect(page.locator('[data-nps-realism-note]')).toContainText('공시 평가시차');
   item.initial={weight:await page.locator('[data-nps-weight]').innerText(),gap:await page.locator('[data-nps-gap]').innerText(),adjustment:await page.locator('[data-nps-adjustment]').innerText(),targetKospi:await page.locator('[data-nps-target-kospi]').innerText(),status:await page.locator('[data-nps-status]').innerText(),details:await page.locator('[data-nps-detail]').evaluateAll(rows=>rows.map(e=>({key:e.dataset.npsDetail,open:e.open,hidden:e.hidden}))),holdingsRequested:item.requests.some(r=>r.path.endsWith(summary.filing.detailsFile))};
   assert.equal(item.initial.details.length,5);assert.ok(item.initial.details.every(d=>!d.open&&!d.hidden));assert.equal(item.initial.holdingsRequested,false);
   item.checks.push('Latest main values match published JSON and current JS recomputation; all five details closed; holdings lazy');
   item.overflows.initial=await overflow(page,spec.name+' initial');
   await page.screenshot({path:path.join(out,spec.name+'-summary.png'),fullPage:true});
   const publishedSummary=await page.locator('[data-nps-summary]').innerText();
   await open(page,'assets');const cash=page.locator('[data-nps-cash-breakdown]');
   for(const [key,label]of [['shortTermBase','단기자금'],['nonFinancialBase','복지·기타'],['reconciliationBase','금융부문 조정 잔액']])await expect(cash).toContainText(label+' '+fmt(expected.cashBreakdown[key],4));
   for(const [key,label]of [['shortTermIncome','단기자금 이자 추정'],['hedgeCarry','환헤지 캐리 추정'],['externalFlowIncome','순유입 이자 추정']])await expect(cash).toContainText(label+' '+signed(expected.cashBreakdown[key],4));
   await expect(cash).toContainText('이자는 단기자금에만');await expect(cash).toContainText('자산에 다시 더하지 않아요');
   await expect(page.locator('[data-nps-net-flow]')).toContainText(fmt(summary.inputs.netFlow,4));
   await expect(page.locator('[data-nps-assets]')).toContainText('가격과 이자·분배금');await expect(page.locator('[data-nps-assets]')).toContainText('다시 빼지 않아요');await expect(page.locator('[data-nps-assets]')).toContainText('새 NAV·분배금 미확인');
   item.cashText=await cash.innerText();item.checks.push('Cash base categories, short-term-only interest, hedge carry, inflow interest, no double principal or bond-price loss, unobserved NAV explained');
   item.overflows.assets=await overflow(page,spec.name+' assets');
   await open(page,'assumptions');await expect(page.locator('[data-nps-assumption]')).toHaveCount(7);
   await expect(page.locator('[data-nps-assumption-unavailable]')).toContainText('AGGG');await expect(page.locator('[data-nps-assumption-unavailable]')).toContainText('동일 기준일');
   await expect(page.locator('[data-nps-assumption="bond-unhedged-proxy"]')).toHaveCount(0);
   for(const row of npsAssumptionCases(summary)){const el=page.locator(`[data-nps-assumption="${row.id}"]`);await expect(el).toContainText(row.label);await expect(el).toContainText(fmt(row.weight)+'%');await expect(el).toContainText(signed(row.deltaWeight)+'%p');}
   item.assumptions={count:await page.locator('[data-nps-assumption]').count(),unavailable:await page.locator('[data-nps-assumption-unavailable]').innerText()};
   await open(page,'method');await expect(page.locator('[data-nps-method]')).toContainText('AGGG 동일 기준일 자료 미확인');await expect(page.locator('[data-nps-method]')).toContainText('메인 추정에는 영향을 주지 않아요');
   item.checks.push('Seven recomputed assumption cases; missing same-date AGGG comparison excluded with explanation; main estimate retained');
   await open(page,'holdings');await expect(page.locator('[data-nps-holding-row]')).toHaveCount(10);
   await expect(page.locator('[data-nps-holdings-intro]')).toContainText('546/552개');
   await expect(page.locator('[data-nps-holdings-intro]')).toContainText(fmt(summary.filing.reportCoveragePct)+'%');
   item.holdings={intro:await page.locator('[data-nps-holdings-intro]').innerText(),renderedRows:await page.locator('[data-nps-holding-row]').count(),firstTicker:await page.locator('[data-nps-holding-row] strong').first().innerText()};
   const residual=holdings.rows.find(r=>r.method==='residual');assert.ok(residual);
   await page.getByRole('searchbox',{name:'13F 종목 검색'}).fill(residual.ticker);
   await expect(page.locator('[data-nps-holdings-list]')).toContainText('직접 평가 제외');
   item.holdings.residualSearch=residual.ticker;
   await page.getByRole('searchbox',{name:'13F 종목 검색'}).fill('');
   item.checks.push('Same-version real 552-row holdings validate; direct 546/552 and coverage displayed; residual record explicitly excluded from direct pricing');
   await open(page,'scenario');
   const kospi=page.getByLabel('시나리오 코스피',{exact:true}),flow=page.getByLabel('국내주식 순매매 가정(조 원)',{exact:true}),mark=page.getByLabel('대체투자를 시장지표로 재평가',{exact:true});
   await kospi.fill('5000');await mark.check();await flow.fill('5');
   const scenario=calculateNpsScenario(summary,{kospi:5000,domesticFlow:5,alternativeReturn:summary.realism.alternatives.economicReturnPct});
   await expect(page.locator('[data-nps-scenario-result]')).toContainText(fmt(scenario.weight)+'%');
   await expect(page.locator('[data-nps-scenario-result]')).toContainText(fmt(scenario.targetKospi,0)+'pt');
   assert.equal(await page.locator('[data-nps-summary]').innerText(),publishedSummary);
   item.scenario={patch:{kospi:5000,domesticFlow:5,alternativeReturn:summary.realism.alternatives.economicReturnPct},weight:scenario.weight,resultText:await page.locator('[data-nps-scenario-result]').innerText(),summaryUnchanged:true};
   const before=item.requests.filter(r=>r.path==='/static/data/nps/summary.json').length;
   await page.getByRole('button',{name:'게시 자료 새로 확인',exact:true}).click();
   await expect.poll(()=>item.requests.filter(r=>r.path==='/static/data/nps/summary.json').length).toBeGreaterThan(before);
   await expect(page.getByRole('button',{name:'게시 자료 새로 확인',exact:true})).toBeEnabled();
   await expect(page.locator('[data-nps-status]')).toContainText('게시 확인');
   await expect(mark).toBeChecked();await expect(kospi).toHaveValue('5000');await expect(flow).toHaveValue('5');
   await expect(page.locator('[data-nps-scenario-result]')).toContainText(fmt(scenario.weight)+'%');
   assert.equal(await page.locator('[data-nps-summary]').innerText(),publishedSummary);
   item.refresh={summaryRequestBefore:before,summaryRequestAfter:item.requests.filter(r=>r.path==='/static/data/nps/summary.json').length,status:await page.locator('[data-nps-status]').innerText(),scenarioPreserved:true,summaryUnchanged:true};
   item.overflows.expandedScenario=await overflow(page,spec.name+' expanded scenario');
   await page.locator('[data-nps-scenario-result]').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(out,spec.name+'-scenario.png')});
   await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,spec.name+'-expanded.png'),fullPage:true});
   await page.getByRole('button',{name:'게시 가정으로 초기화',exact:true}).click();await expect(mark).not.toBeChecked();await expect(flow).toHaveValue(String(summary.inputs.domesticFlow));await expect(page.locator('[data-nps-scenario-result]')).toContainText(fmt(expected.weight)+'%');
   item.checks.push('Mobile scenario edits match current JS, preserve published summary, persist across actual re-fetch, and reset to published assumptions');
   assert.deepEqual(item.browserErrors,[],'No browser runtime errors');
   item.passed=true;
   console.log(spec.name+': passed '+item.checks.length+' grouped checks');
  } finally {await browser.close()}
 }
 proof.passed=true;
} catch(error){proof.passed=false;proof.failure={message:error.message,stack:error.stack};console.error(error);process.exitCode=1;}
finally{proof.completedAt=new Date().toISOString();await fs.writeFile(path.join(out,'proof.json'),JSON.stringify(proof,null,2)+'\n');}
