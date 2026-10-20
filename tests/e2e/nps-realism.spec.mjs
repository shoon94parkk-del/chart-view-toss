import {readFileSync} from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import {test,expect,noOverflow,touchable} from './fixtures.mjs';
import {calculateNpsScenario,npsAssumptionCases} from '../../src/npsAllocationModel.js';
const summary=JSON.parse(readFileSync(new URL('../fixtures/nps/summary-realism.json',import.meta.url),'utf8'));
const path='/static/data/nps/summary.json';
const formatted=(value,digits=2)=>value.toLocaleString('ko-KR',{minimumFractionDigits:digits,maximumFractionDigits:digits});
async function enter(page,qa){qa.overrides.set(path,route=>route.fulfill({json:summary}));await page.clock.setFixedTime(new Date('2026-10-19T22:30:00Z'));await page.goto('/#pension');await expect(page.locator('[data-nps-weight]')).toContainText(formatted(calculateNpsScenario(summary).weight));}
test('NPS realism shows dated appraisal assumption and cash bridge without inventing NAV',async({page,qa})=>{
 await enter(page,qa);const published=calculateNpsScenario(summary);await expect(page.locator('[data-nps-gap]')).toContainText(formatted(published.gap));await expect(page.locator('[data-nps-adjustment]')).toContainText(formatted(Math.abs(published.adjustment),1));await expect(page.locator('[data-nps-realism-note]')).toContainText('공시 평가시차');
 await page.getByText('자산별 평가 근거',{exact:true}).click();const result=calculateNpsScenario(summary),cash=page.locator('[data-nps-cash-breakdown]');
 for(const [key,label] of [['shortTermBase','단기자금'],['nonFinancialBase','복지·기타'],['reconciliationBase','금융부문 조정 잔액']])await expect(cash).toContainText(label+' '+formatted(result.cashBreakdown[key],4));
 for(const [key,label] of [['shortTermIncome','단기자금 이자 추정'],['hedgeCarry','환헤지 캐리 추정'],['externalFlowIncome','순유입 이자 추정']])await expect(cash).toContainText(label+' '+(result.cashBreakdown[key]>0?'+':'')+formatted(result.cashBreakdown[key],4));
 await expect(page.locator('[data-nps-net-flow]')).toContainText(formatted(summary.inputs.netFlow,4));
 await expect(page.locator('[data-nps-assets]')).toContainText('새 NAV·분배금 미확인');
 await expect(page.locator('[data-nps-assets]')).toContainText('가격과 이자·분배금');await expect(page.locator('[data-nps-assets]')).toContainText('AA-');
 await noOverflow(page);
});
test('NPS economic alternative mark and domestic trades change only user scenario and survive refresh',async({page,qa})=>{
 await enter(page,qa);const original=await page.locator('[data-nps-weight]').innerText();await page.getByText('시장 가정 바꾸기',{exact:true}).click();
 const checkbox=page.getByLabel('대체투자를 시장지표로 재평가',{exact:true});await checkbox.check();await page.getByLabel('국내주식 순매매 가정(조 원)',{exact:true}).fill('5');
 const result=calculateNpsScenario(summary,{alternativeReturn:summary.realism.alternatives.economicReturnPct,domesticFlow:5});await expect(page.locator('[data-nps-scenario-result]')).toContainText(formatted(result.weight));await expect(page.locator('[data-nps-weight]')).toHaveText(original);
 await page.getByRole('button',{name:'게시 자료 새로 확인'}).click();await expect(checkbox).toBeChecked();await expect(page.getByLabel('국내주식 순매매 가정(조 원)',{exact:true})).toHaveValue('5');await expect(page.locator('[data-nps-scenario-result]')).toContainText(formatted(result.weight));
 await page.getByRole('button',{name:'게시 가정으로 초기화'}).click();await expect(checkbox).not.toBeChecked();await expect(page.locator('[data-nps-scenario-result]')).toContainText(formatted(calculateNpsScenario(summary).weight));
});
test('NPS conditional assumption cases are recalculated and described without confidence claims',async({page,qa})=>{
 await enter(page,qa);await page.getByText('가정에 따른 차이',{exact:true}).click();const host=page.locator('[data-nps-assumptions]');await expect(host).toContainText('통계적 신뢰구간');
 for(const item of npsAssumptionCases(summary)){const row=page.locator(`[data-nps-assumption="${item.id}"]`);await expect(row).toContainText(item.label);await expect(row).toContainText(formatted(item.weight));await expect(row).toContainText(formatted(item.deltaWeight));}
 await page.getByText('추정 전제와 출처',{exact:true}).click();await expect(page.locator('[data-nps-method]')).toContainText('2026-06-30');await expect(page.locator('[data-nps-method]')).toContainText('국채');await noOverflow(page);
});
test('NPS same-price metadata refresh warns about an unreviewed monthly disclosure',async({page,qa})=>{
 await enter(page,qa);const revised=structuredClone(summary);revised.generatedAt='2026-10-19T23:40:00Z';revised.market.latestMonthlyCheck={status:'review-required',reportDate:'2026-08-31'};qa.overrides.set(path,route=>route.fulfill({json:revised}));
 await page.getByRole('button',{name:'게시 자료 새로 확인'}).click();await expect(page.locator('[data-nps-status]')).toContainText('새 월별 공시 검증 대기');
});
test('NPS realism disclosures and optional controls stay accessible at every device size',async({page,qa},info)=>{
 await enter(page,qa);for(const label of ['자산별 평가 근거','가정에 따른 차이','추정 전제와 출처','시장 가정 바꾸기'])await page.getByText(label,{exact:true}).click();
 await touchable(page.getByRole('button',{name:'게시 가정으로 초기화'}));await page.getByLabel('대체투자를 시장지표로 재평가',{exact:true}).check();await noOverflow(page);
 const audit=await new AxeBuilder({page}).options({runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']},rules:{'meta-viewport':{enabled:false}}}).analyze();expect(audit.violations).toEqual([]);await page.screenshot({path:info.outputPath('nps-realism-expanded.png'),fullPage:true});
});

test('NPS checked economic proxy follows a newer publication while manual scenario inputs keep focus',async({page,qa})=>{
 await enter(page,qa);await page.getByText('시장 가정 바꾸기',{exact:true}).click();const mark=page.getByLabel('대체투자를 시장지표로 재평가',{exact:true}),flow=page.getByLabel('국내주식 순매매 가정(조 원)',{exact:true});await mark.check();await flow.fill('5');await flow.focus();
 const changed=structuredClone(summary);changed.generatedAt='2026-10-19T23:50:00Z';changed.realism.alternatives.economicReturnPct=summary.realism.alternatives.economicReturnPct+5;const proxyCase=changed.sensitivity.cases.find(row=>row.id==='alternative-economic-proxy');proxyCase.patch.alternativeReturn=changed.realism.alternatives.economicReturnPct;const recomputed=calculateNpsScenario(changed,proxyCase.patch);for(const key of ['weight','gap','adjustment'])proxyCase[key]=recomputed[key];qa.overrides.set(path,route=>route.fulfill({json:changed}));
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));const result=calculateNpsScenario(changed,{alternativeReturn:changed.realism.alternatives.economicReturnPct,domesticFlow:5});
 await expect(page.locator('[data-nps-scenario-result]')).toContainText(formatted(result.weight));await expect(mark).toBeChecked();await expect(flow).toHaveValue('5');await expect(flow).toBeFocused();await expect(page.locator('[data-nps-weight]')).toContainText(formatted(calculateNpsScenario(summary).weight));
});


test('NPS missing optional same-date bond price keeps the main estimate and explains excluded comparison',async({page,qa})=>{
 const missing=structuredClone(summary);Object.assign(missing.realism.overseasBonds,{unhedgedProxyReturnPct:null,unhedgedProxyStatus:'unavailable',unhedgedProxyDate:missing.marketDate});
 missing.sensitivity.cases=missing.sensitivity.cases.filter(row=>row.id!=='bond-unhedged-proxy');
 missing.sensitivity.unavailable=[{id:'bond-unhedged-proxy',label:'해외채권 AGGG 비헤지 대용지표',reason:'동일 기준일의 가격을 확인하지 못해 비교를 제공하지 않아요.'}];
 qa.overrides.set(path,route=>route.fulfill({json:missing}));await page.goto('/#pension');
 await expect(page.locator('[data-nps-weight]')).toContainText(formatted(calculateNpsScenario(summary).weight));
 await page.getByText('가정에 따른 차이',{exact:true}).click();await expect(page.locator('[data-nps-assumption]')).toHaveCount(7);
 await expect(page.locator('[data-nps-assumption-unavailable]')).toContainText('AGGG');await expect(page.locator('[data-nps-assumption-unavailable]')).toContainText('동일');
 await page.getByText('추정 전제와 출처',{exact:true}).click();await expect(page.locator('[data-nps-method]')).toContainText('AGGG 동일 기준일 자료 미확인');await noOverflow(page);
});
