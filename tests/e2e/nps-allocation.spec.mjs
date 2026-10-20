import {readFileSync} from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import {test,expect,noOverflow,touchable} from './fixtures.mjs';
import {calculateNpsScenario} from '../../src/npsAllocationModel.js';
const summary=JSON.parse(readFileSync(new URL('../fixtures/nps/summary.json',import.meta.url),'utf8'));
const holdings=JSON.parse(readFileSync(new URL('../fixtures/nps/holdings.json',import.meta.url),'utf8'));
const path='/static/data/nps/summary.json';
const detailPath='/static/data/nps/'+summary.filing.detailsFile;
async function install(qa){qa.overrides.set(path,route=>route.fulfill({json:summary}));qa.overrides.set(detailPath,route=>route.fulfill({json:holdings}));}
async function enter(page,qa){await install(qa);await page.clock.setFixedTime(new Date('2026-10-18T22:30:00Z'));await page.goto('/#pension');await expect(page.locator('[data-nps-weight]')).toContainText('22.78');}
test('NPS summary matches actual calculation and loads holdings only on demand',async({page,qa})=>{
 await enter(page,qa);const result=calculateNpsScenario(summary);
 await expect(page.locator('[data-nps-gap]')).toContainText(Math.abs(result.gap).toFixed(2));await expect(page.locator('[data-nps-adjustment]')).toContainText('31.2');
 await expect(page.locator('[data-nps-price-date]')).toContainText(summary.marketDate);
 await expect(page.locator('[data-nps-target-kospi]')).toContainText(Math.round(result.targetKospi).toLocaleString('ko-KR'));
 await expect(page.locator('[data-nps-target-range]')).toContainText('pt');
 expect(qa.calls.filter(c=>c.path===detailPath)).toHaveLength(0);
 await touchable(page.getByText('13F 보유 내역', {exact:true}));await page.getByText('13F 보유 내역',{exact:true}).click();
 await expect(page.locator('[data-nps-holdings]')).toContainText('NVDA');expect(qa.calls.filter(c=>c.path===detailPath)).toHaveLength(1);
 await page.getByRole('searchbox',{name:'13F 종목 검색'}).fill('AAPL');await expect(page.locator('[data-nps-holding-row]')).toHaveCount(1);
 await page.getByRole('searchbox',{name:'13F 종목 검색'}).fill('unknown-xyz');await expect(page.locator('[data-nps-holdings]')).toContainText('검색 결과가 없어요');await noOverflow(page);
});
test('NPS details explain allocation and FX and scenario preserves original summary',async({page,qa})=>{
 await enter(page,qa);await page.getByText('자산별 평가 근거',{exact:true}).click();await expect(page.locator('[data-nps-assets]')).toContainText('해외주식');await expect(page.locator('[data-nps-assets]')).toContainText('환율');
 await page.getByText('시장 가정 바꾸기',{exact:true}).click();await page.getByLabel('시나리오 코스피',{exact:true}).fill('4500');
 const result=calculateNpsScenario(summary,{kospi:4500});await expect(page.locator('[data-nps-scenario-result]')).toContainText(result.weight.toFixed(2));await expect(page.locator('[data-nps-weight]')).toContainText('22.78');
 await expect(page.locator('[data-nps-scenario-result]')).toContainText(Math.round(result.targetKospi).toLocaleString('ko-KR'));
 await page.getByText('추정 전제와 출처',{exact:true}).click();await expect(page.locator('[data-nps-method]')).toContainText('2026-06-30');await noOverflow(page);
});
test('NPS failed revalidation retains dated result and explicit retry recovers',async({page,qa})=>{
 await enter(page,qa);qa.overrides.set(path,route=>route.fulfill({status:503,json:{detail:'not available'}}));
 await page.getByRole('button',{name:'게시 자료 새로 확인'}).click();await expect(page.locator('[data-nps-status]')).toContainText('이전');await expect(page.locator('[data-nps-weight]')).toContainText('22.78');
 qa.overrides.set(path,route=>route.fulfill({json:summary}));await page.getByRole('button',{name:'게시 자료 새로 확인'}).click();await expect(page.locator('[data-nps-status]')).toContainText('확인');
});
test('NPS version-mismatched details remain retryable without changing summary',async({page,qa})=>{
 await enter(page,qa);qa.overrides.set(detailPath,route=>route.fulfill({json:{...holdings,snapshotVersion:'other-version'}}));await page.getByText('13F 보유 내역',{exact:true}).click();await expect(page.locator('[data-nps-holdings]')).toContainText('다시');await expect(page.locator('[data-nps-weight]')).toContainText('22.78');
 qa.overrides.set(detailPath,route=>route.fulfill({json:holdings}));await page.getByRole('button',{name:'13F 내역 다시 시도'}).click();await expect(page.locator('[data-nps-holdings]')).toContainText('NVDA');
});
test('NPS analysis entry, direct path and back use existing app navigation',async({page,qa})=>{
 await install(qa);await page.goto('/#more');await page.getByRole('button',{name:/국민연금.*국내주식/}).click();await expect(page.locator('[data-nps-weight]')).toBeVisible();await page.getByRole('button',{name:'뒤로가기',exact:true}).click();await expect(page.locator('[data-surface="more"]')).toBeVisible();
 await page.goto('/pension/');await expect(page.locator('[data-nps-weight]')).toContainText('22.78');
});
test('NPS main and expanded evidence stay accessible on small devices',async({page,qa},info)=>{
 await enter(page,qa);for(const label of ['자산별 평가 근거','13F 보유 내역','추정 전제와 출처'])await page.getByText(label,{exact:true}).click();await expect(page.locator('[data-nps-holding-row]').first()).toBeVisible();await page.evaluate(()=>scrollTo(0,0));
 const audit=await new AxeBuilder({page}).options({runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']},rules:{'meta-viewport':{enabled:false}}}).analyze();expect(audit.violations).toEqual([]);await noOverflow(page);await touchable(page.getByRole('button',{name:'게시 자료 새로 확인'}));await page.screenshot({path:info.outputPath('nps-expanded.png'),fullPage:true});
});

test('NPS never adds a request to Home and late result cannot overwrite another route',async({page,qa})=>{
 await install(qa);await page.goto('/#home');await expect(page.locator('#market-card [data-stock-detail="^KS11"]')).toBeVisible();expect(qa.calls.filter(c=>c.path.includes('/nps/'))).toHaveLength(0);
 let release;const held=new Promise(resolve=>release=resolve);qa.overrides.set(path,async route=>{await held;await route.fulfill({json:summary}).catch(()=>{});});
 await page.goto('/#pension');await expect(page.locator('[data-surface="pension"]')).toBeVisible();await page.getByRole('navigation',{name:'주요 메뉴'}).getByRole('button',{name:'관심',exact:true}).click();release();await expect(page.locator('[data-surface="watch"]')).toBeVisible();await expect(page.locator('[data-nps-weight]')).toHaveCount(0);
});
test('NPS refresh uses a newer verified publication and refuses an older response',async({page,qa})=>{
 await enter(page,qa);const changed=structuredClone(summary);changed.snapshotVersion='c'.repeat(16);changed.marketDate='2026-10-19';changed.generatedAt='2026-10-20T02:00:00Z';changed.inputs.kospi=6000;changed.result=calculateNpsScenario(changed);
 qa.overrides.set(path,route=>route.fulfill({json:changed}));await page.getByRole('button',{name:'게시 자료 새로 확인'}).click();await expect(page.locator('[data-nps-weight]')).toContainText(changed.result.weight.toFixed(2));await expect(page.locator('[data-nps-price-date]')).toContainText('2026-10-19');
 qa.overrides.set(path,route=>route.fulfill({json:summary}));await page.getByRole('button',{name:'게시 자료 새로 확인'}).click();await expect(page.locator('[data-nps-weight]')).toContainText(changed.result.weight.toFixed(2));await expect(page.locator('[data-nps-price-date]')).toContainText('2026-10-19');
});
test('NPS same-price publication updates filing warnings without reloading holdings',async({page,qa})=>{
 await enter(page,qa);await page.getByText('추정 전제와 출처',{exact:true}).click();await page.getByText('13F 보유 내역',{exact:true}).click();await expect(page.locator('[data-nps-holding-row]').first()).toBeVisible();const before=qa.calls.filter(c=>c.path===detailPath).length;
 const revised=structuredClone(summary);revised.generatedAt='2026-10-18T23:40:00Z';revised.warnings.push('새 SEC 보고 수량 검증 대기');revised.market.latestFilingCheck.status='review-required';
 qa.overrides.set(path,route=>route.fulfill({json:revised}));await page.getByRole('button',{name:'게시 자료 새로 확인'}).click();await expect(page.locator('[data-nps-method]')).toContainText('새 SEC 보고 수량 검증 대기');await expect(page.locator('[data-nps-status]')).toContainText('검증 대기');expect(qa.calls.filter(c=>c.path===detailPath)).toHaveLength(before);
});
