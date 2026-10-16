import {test,expect,noOverflow,touchable} from './fixtures.mjs';
import {snapshot} from './guru-data.mjs';
import {formatKst} from '../../src/dataPresentation.js';

const ticker='171090.KQ';
const annualRow={symbol:ticker,name:'선익시스템',market:'KOSDAQ',annualReportYear:2025,metrics:{annualROA:26.4,annualPE:6.84,valueRank:1},checks:[]};
function annualSnapshot(){
 const data=snapshot({matched:0});
 data.strategies.greenblatt={universeCount:1,unsupportedCount:0,pendingCount:0,insufficientCount:0,evaluatedCount:1,failedCount:0,matchedCount:1,results:[annualRow]};
 return data;
}
const valuation={ticker,roa:2.48,trailingPE:40.98,forwardPE:null,trailingEPS:1674,generatedAt:'2026-10-09T08:39:01.602944+00:00',dataSource:'Yahoo Chart + Fundamentals',fieldMeta:{roa:{source:'Yahoo Fundamentals',asOf:null,period:'TTM net income / latest reported assets'},trailingPE:{source:'Yahoo Fundamentals',asOf:null,period:'TTM'},forwardPE:{source:'Yahoo QuoteSummary',asOf:null,period:'provider forward period (not independently verified)'}}};
function installAnnual(qa,data=annualSnapshot()){
 qa.overrides.set('/static/data/guru_screening.json',route=>route.fulfill({json:data}));
 qa.overrides.set(`/api/guru-investing/${ticker}`,route=>route.fulfill({json:{snapshotVersion:data.snapshotVersion,symbol:ticker,tradeDate:data.tradeDate,basis:'CFS',annual:[],sources:{},strategies:{greenblatt:{status:'matched',metrics:annualRow.metrics,checks:[]}}}}));
 return data;
}
const count=(qa,path)=>qa.calls.filter(call=>call.path===path).length;

for(const mode of ['HTTP503','malformed200','missing-row200','provider-error200']){
 test(`Greenblatt ${mode} recovers only TTM via one manual retry and preserves annual values, filters and provenance`,async({page,qa})=>{
  installAnnual(qa);let recover=false;
  qa.overrides.set('/api/valuation',route=>route.fulfill(recover?{json:{stocks:[valuation]}}:mode==='HTTP503'?{status:503,json:{detail:'unavailable'}}:{json:mode==='malformed200'?{}:mode==='missing-row200'?{stocks:[]}:{stocks:[{...valuation,error:'provider unavailable'}]}}));
  await page.goto('/#gurus/greenblatt');
  await page.getByRole('searchbox').fill('선익');
  await page.locator(`[data-guru-expand="${ticker}"]`).click();
  await expect(page.locator('.guru-current-summary')).toContainText('TTM 재확인 실패');
  await expect(page.locator('.guru-metrics')).toContainText('26.4%');
  await expect(page.locator('.guru-metrics')).toContainText('6.8배');
  await expect(page.locator('.guru-current-check')).toContainText('확인 실패');
  const retry=page.locator('.guru-retry-ttm');
  await touchable(retry);
  const snapshots=count(qa,'/static/data/guru_screening.json'),proofs=count(qa,`/api/guru-investing/${ticker}`),ttm=count(qa,'/api/valuation');
  recover=true;await retry.click();
  await expect(page.locator('.guru-current-summary')).toContainText('충족 0 · 미충족 1 · 자료 부족 0');
  await expect(page.locator('.guru-current-check')).toContainText('TTM ROA 2.5% · TTM PER 41배');
  await expect(page.getByRole('searchbox')).toHaveValue('선익');
  await expect(page.locator(`[data-guru-expand="${ticker}"]`)).toHaveAttribute('aria-expanded','true');
  const disclosure=page.locator('.guru-current-provenance summary');await touchable(disclosure);await disclosure.click();
  await expect(page.locator('.guru-current-provenance')).toContainText('Yahoo Fundamentals');
  await expect(page.locator('.guru-current-provenance')).toContainText(formatKst(valuation.generatedAt));
  await expect(page.locator('.guru-current-provenance')).toContainText('자료 기준시각 미제공');
  await expect(page.locator('.guru-current-provenance')).not.toContainText('2025');
  expect(count(qa,'/api/valuation')).toBe(ttm+1);
  expect(count(qa,'/static/data/guru_screening.json')).toBe(snapshots);
  expect(count(qa,`/api/guru-investing/${ticker}`)).toBe(proofs);
  await noOverflow(page);
 });
}

test('TTM retry is deduplicated while loading and late responses cannot overwrite another strategy',async({page,qa})=>{
 installAnnual(qa);let release,started;const began=new Promise(resolve=>started=resolve);let attempt=0;
 qa.overrides.set('/api/valuation',async route=>{
  if(++attempt===1)return route.fulfill({json:{error:'provider error'}});
  started();await new Promise(resolve=>release=resolve);await route.fulfill({json:{stocks:[valuation]}});
 });
 await page.goto('/#gurus/greenblatt');
 await expect(page.locator('.guru-current-summary')).toContainText('TTM 재확인 실패');
 await page.locator('.guru-retry-ttm').evaluate(button=>{button.click();button.click();});
 await began;
 await expect(page.locator('.guru-retry-ttm')).toBeDisabled();
 await expect(page.locator('.guru-current-summary')).toContainText('재확인하고 있어요');
 await expect(page.locator('.guru-metrics')).toContainText('26.4%');
 const completed=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/valuation');
 await page.locator('[data-guru-strategy="buffett"]').click();release();await completed;
 await expect(page.locator('[data-guru-strategy="buffett"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.guru-current-summary')).toHaveCount(0);
 await expect(page.locator('.guru-empty')).toContainText('자료가 부족');
 expect(attempt).toBe(2);
});

test('409 publication waiting identifies the last check, deduplicates retry and retains newer results until evidence catches up',async({page,qa})=>{
 const data=installAnnual(qa);let published=data,available=false,release;
 qa.overrides.set('/static/data/guru_screening.json',async route=>{if(release===null)await new Promise(resolve=>release=resolve);await route.fulfill({json:published});});
 qa.overrides.set('/api/valuation',route=>route.fulfill({json:{stocks:[valuation]}}));
 qa.overrides.set(`/api/guru-investing/${ticker}`,route=>route.fulfill(available?{json:{snapshotVersion:data.snapshotVersion,symbol:ticker,tradeDate:data.tradeDate,basis:'CFS',annual:[],strategies:{greenblatt:{status:'matched',metrics:annualRow.metrics,checks:[]}}}}:{status:409,json:{detail:{code:'snapshot_changed'}}}));
 await page.goto('/#gurus/greenblatt');
 await expect(page.locator('.guru-current-summary')).toContainText('미충족 1');
 await page.locator(`[data-guru-expand="${ticker}"]`).click();
 await expect(page.locator('.guru-evidence')).toContainText('선정 근거 게시 대기');
 await expect(page.locator('.guru-evidence')).toContainText('같은 버전의 근거');
 published={...data,snapshotVersion:'older-backend',generatedAt:'2026-10-06T01:00:00Z'};
 release=null;const before=count(qa,'/static/data/guru_screening.json');
 await page.locator('.guru-retry-evidence').evaluate(button=>{button.click();button.click();});
 await expect.poll(()=>typeof release).toBe('function');
 await expect(page.locator('.guru-retry-evidence')).toBeDisabled();
 release();
 await expect(page.locator('.guru-refresh-error')).toContainText('선정 근거 게시 대기');
 await expect(page.locator('.guru-refresh-error')).toContainText('마지막 확인');
 await expect(page.locator('.guru-coverage')).toContainText('연간 조건 충족 1개');
 expect(count(qa,'/static/data/guru_screening.json')).toBe(before+1);
 expect(count(qa,`/api/guru-investing/${ticker}`)).toBe(1);
 available=true;published=data;
 await page.locator('.guru-refresh-error button').click();
 await expect(page.locator('.guru-current-check')).toContainText('TTM ROA 2.5%');
 await expect(page.locator('.guru-refresh-error')).toHaveCount(0);
 expect(qa.calls.filter(call=>call.path===`/api/guru-investing/${ticker}`).map(call=>new URLSearchParams(call.query).get('version'))).toEqual([data.snapshotVersion,data.snapshotVersion]);
 await noOverflow(page);
});

test('same-version published proof opens while deployed evidence API is behind',async({page,qa})=>{
 const data=installAnnual(qa,annualSnapshot());
 qa.overrides.set(`/api/guru-investing/${ticker}`,route=>route.fulfill({status:409,json:{detail:{code:'snapshot_changed',currentVersion:'older-backend'}}}));
 qa.overrides.set(`/static/data/guru_evidence/${data.snapshotVersion}/${ticker}.json`,route=>route.fulfill({json:{snapshotVersion:data.snapshotVersion,criteriaVersion:data.criteriaVersion,symbol:ticker,tradeDate:data.tradeDate,basis:'CFS',annual:[],sources:{},strategies:{greenblatt:{status:'matched',metrics:annualRow.metrics,checks:[]}}}}));
 await page.goto('/#gurus/greenblatt');
 await page.locator(`[data-guru-expand="${ticker}"]`).click();
 await expect(page.locator('.guru-evidence')).toContainText('ROA/PER 대안');
 await expect(page.locator('.guru-evidence')).not.toContainText('게시 대기');
 expect(count(qa,`/api/guru-investing/${ticker}`)).toBe(1);
 expect(count(qa,`/static/data/guru_evidence/${data.snapshotVersion}/${ticker}.json`)).toBe(1);
});
