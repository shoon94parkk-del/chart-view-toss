import AxeBuilder from '@axe-core/playwright';
import { test, expect, noOverflow, touchable } from './fixtures.mjs';
import { radar as recoveryRadar } from '../fixtures/export-recovery.mjs';
import { normalizeExportProvisionalRadar, formatUsdBillion } from '../../src/exportMomentumModel.js';

const tenDayRadar={
  period:'2026-10',periodLabel:'2026년 10월',latestStage:10,latestStageLabel:'1~10일',
  businessDays:{stage:10,current:5,previousMonth:8,priorYear:3,basis:'calendar weekdays excluding KR statutory/substitute holidays'},
  checkpoints:[{stage:10,label:'1~10일',
    total:{exportsUsdBillion:20,priorYearUsdBillion:10,previousMonthUsdBillion:25,exportYoY:100,exportMoM:-20},
    semiconductor:{exportsUsdBillion:10,priorYearUsdBillion:5,previousMonthUsdBillion:12.5,exportYoY:100,exportMoM:-20}}],
  items:[{key:'semiconductor',name:'반도체',exportsUsdBillion:10,priorYearUsdBillion:5,previousMonthUsdBillion:12.5,exportYoY:100,exportMoM:-20}],
};
const twentyDayRadar={...recoveryRadar,periodLabel:'2026년 9월',latestStageLabel:'1~20일'};

async function latestSummary(page,raw){
  const model=normalizeExportProvisionalRadar(raw);
  const radar=page.locator('#export-provisional-radar');
  const digest=radar.locator('[data-export-digest]');
  await expect(digest).toBeVisible();
  await expect(digest).toContainText('관세청 잠정 수출 · '+model.latestStageLabel);
  await expect(digest.getByRole('heading')).toHaveText(model.periodLabel+' '+model.latestStage+'일 기준');
  const metrics=digest.locator('.export-digest-metrics');
  await expect(metrics).toContainText(formatUsdBillion(model.checkpoints.at(-1).total.exportsUsdBillion,{digits:1}));
  await expect(metrics).toContainText(formatUsdBillion(model.checkpoints.at(-1).semiconductor.exportsUsdBillion,{digits:1}));
  const disclosure=radar.locator('details.export-provisional-more');
  // Playwright 1.55 has no implicit SUMMARY role mapping. Use the native
  // disclosure action itself, preserving the browser's keyboard behavior.
  const summary=disclosure.locator('summary').filter({hasText:'구간 누적 흐름·원자료 상세'});
  await expect(disclosure).not.toHaveAttribute('open','');
  await expect(disclosure.locator('.export-provisional-hero')).toBeHidden();
  await touchable(summary);
  await summary.click();
  await expect(disclosure).toHaveAttribute('open','');
  await expect(disclosure.locator('.export-provisional-hero').getByText('반도체 · '+model.latestStageLabel,{exact:true})).toBeVisible();
  await noOverflow(page);
  return {radar,digest,disclosure,summary};
}

test('integration 최신 1~10일 잠정치: 요약·원자료 펼침·품목 버튼 접근성',async({page,qa},info)=>{
  qa.overrides.set('/api/export-momentum/provisional',route=>route.fulfill({json:tenDayRadar}));
  await page.goto('/#exports');
  const {digest,disclosure,summary}=await latestSummary(page,tenDayRadar);
  await expect(digest).toContainText('영업일 수 기준: 주말·공휴일 제외 달력 기준');
  await expect(digest).toContainText('관세청 공식 조업일수·일평균 증가율과 다를 수 있습니다.');
  expect(await digest.locator('.export-digest-day-basis').evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(12);
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(disclosure).not.toHaveAttribute('open','');
  await expect(summary).toBeFocused();
  await page.keyboard.press('Space');
  await expect(disclosure).toHaveAttribute('open','');
  await expect(disclosure.locator('.export-provisional-hero')).toBeVisible();
  // A table cell contains the action; it must not replace the button's role.
  const table=digest.getByRole('table',{name:'주요 수출 품목별 성장률'});
  const item=table.getByRole('cell',{name:'반도체',exact:true}).getByRole('button',{name:'반도체',exact:true});
  await expect(item).toBeVisible();
  await touchable(item);
  await page.evaluate(()=>scrollTo(0,0));
  const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).disableRules(['meta-viewport']).analyze();
  await info.attach('axe-provisional',{body:JSON.stringify(audit,null,2),contentType:'application/json'});
  expect(audit.violations).toEqual([]);
  await item.click();
  await expect(page.locator('#export-item-detail')).toBeVisible();
  expect(qa.calls.filter(call=>call.path==='/api/export-momentum/provisional')).toHaveLength(1);
  await noOverflow(page);
});

for(const [name,initial,raw] of [
  ['빈 HTTP200',{status:200,json:{period:'2026-10',checkpoints:[]}},twentyDayRadar],
  ['HTTP503',{status:503,json:{}},tenDayRadar],
]){
  test('잠정치 '+name+' 재시도: 최신 실제 구간 표시·월간 요청 보존',async({page,qa})=>{
    let calls=0;
    qa.overrides.set('/api/export-momentum/provisional',route=>route.fulfill(++calls===1?initial:{json:raw}));
    await page.goto('/#exports');
    const retry=page.getByRole('button',{name:'잠정치 다시 시도',exact:true});
    await expect(retry).toBeVisible();
    await retry.click();
    await latestSummary(page,raw);
    expect(qa.calls.filter(call=>call.path==='/api/export-momentum/provisional')).toHaveLength(2);
    expect(qa.calls.filter(call=>call.path==='/api/export-momentum')).toHaveLength(1);
    expect(qa.calls.filter(call=>call.path.endsWith('/momentum-map'))).toHaveLength(1);
  });
}
