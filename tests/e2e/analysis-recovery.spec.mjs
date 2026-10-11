import {test,expect,noOverflow,touchable} from './fixtures.mjs';
import {quotes} from './data.mjs';

const bandPayload=(years,symbol='005930.KS',value=years*10)=>({
 ticker:symbol,years,source:`Period QA ${years} source`,generatedAt:'2026-10-07T06:30:00Z',method:'공시 재무자료 시차 적용',
 per:{points:[{time:`${2026-years}-10-07`,value:value-5},{time:'2026-10-07',value}],stats:{current:value,median:value-2,p20:value-4,p80:value-1,observations:2,start:`${2026-years}-10-07`,end:'2026-10-07'}},
 pbr:{points:[{time:`${2026-years}-10-07`,value:1},{time:'2026-10-07',value:2}],stats:{current:2,median:1.5,p20:1.2,p80:1.8,observations:2,start:`${2026-years}-10-07`,end:'2026-10-07'}},
});
const currentMetric=page=>page.locator('.analysis-metrics div').filter({has:page.locator('dt',{hasText:'최근값'})}).locator('dd');
const bandCalls=qa=>qa.calls.filter(row=>row.path==='/api/valuation-band');

test('bands retain the actual previous period during a failed refresh and retry only that period',async({page,qa},testInfo)=>{
 let release,allowRetry=false;
 qa.overrides.set('/api/valuation-band',async(route,url)=>{
  const years=Number(url.searchParams.get('years'));
  if(years===5&&!allowRetry){await new Promise(resolve=>{release=resolve;});return route.fulfill({status:429,json:{detail:'retry later'}});}
  return route.fulfill({json:bandPayload(years)});
 });
 await page.goto('/#bands');await expect(page.locator('#band-chart canvas').first()).toBeVisible();
 await expect(currentMetric(page)).toHaveText('30배');
 const canvas=await page.locator('#band-chart').elementHandle();
 await page.locator('#band-years').selectOption('5');
 await expect.poll(()=>!!release).toBe(true);
 await expect(page.locator('#band-chart canvas').first()).toBeVisible();
 await expect(page.locator('[data-band-basis]')).toContainText('3년 요청');
 await expect(page.locator('[data-band-feedback]')).toContainText('5년');
 await expect(page.locator('[data-band-coverage]')).toContainText('3년 요청');
 await expect(page.locator('#analysis-body')).toContainText('Period QA 3 source');
 expect(await canvas.evaluate(el=>el.isConnected)).toBe(true);
 release();await expect(page.locator('[data-band-retry]')).toBeVisible();
 await expect(currentMetric(page)).toHaveText('30배');
 await page.screenshot({path:testInfo.outputPath('retained-band-period.png'),fullPage:true});
 await page.locator('#band-metric').selectOption('pbr');
 await expect(currentMetric(page)).toHaveText('2배');
 await expect(page.locator('[data-band-basis]')).toContainText('3년 요청 · PBR');
 const unrelated=qa.calls.filter(row=>row.path!=='/api/activity'&&row.path!=='/api/valuation-band').length;
 allowRetry=true;await page.locator('[data-band-retry]').click();
 await expect(page.locator('[data-band-basis]')).toContainText('5년 요청 · PBR');
 await expect(page.locator('#analysis-body')).toContainText('Period QA 5 source');
 await expect(page.locator('[data-band-retry]')).toHaveCount(0);
 expect(bandCalls(qa).filter(row=>row.query.includes('years=5'))).toHaveLength(2);
 expect(qa.calls.filter(row=>row.path!=='/api/activity'&&row.path!=='/api/valuation-band')).toHaveLength(unrelated);
 await noOverflow(page);
});

test('a successful empty band period replaces the previous observations without relabelling them',async({page,qa})=>{
 qa.overrides.set('/api/valuation-band',async(route,url)=>{
  const years=Number(url.searchParams.get('years')),payload=bandPayload(years);
  if(years===5){payload.per={points:[],stats:null};payload.pbr={points:[],stats:null};}
  return route.fulfill({json:payload});
 });
 await page.goto('/#bands');await expect(currentMetric(page)).toHaveText('30배');
 await page.locator('#band-years').selectOption('5');
 await expect(page.locator('[data-band-basis]')).toContainText('5년 요청 · PER');
 await expect(page.locator('#band-chart canvas')).toHaveCount(0);
 await expect(currentMetric(page)).toHaveCount(0);
 await expect(page.locator('#analysis-body')).toContainText('해당 지표 이력이 제공되지 않아요.');
 await expect(page.locator('#analysis-body')).toContainText('Period QA 5 source');
 await expect(page.locator('[data-band-coverage]')).toContainText('관측 기간 미제공');
 await expect(page.locator('[data-band-retry]')).toHaveCount(0);
 await page.locator('#band-metric').selectOption('pbr');
 await expect(page.locator('[data-band-basis]')).toContainText('5년 요청 · PBR');
 expect(bandCalls(qa)).toHaveLength(2);
 await noOverflow(page);
});

test('a missing band metric stays explicit through a failed period refresh without claiming a chart',async({page,qa})=>{
 qa.overrides.set('/api/valuation-band',async(route,url)=>{
  const years=Number(url.searchParams.get('years'));
  if(years===5)return route.fulfill({status:429,json:{detail:'retry later'}});
  const payload=bandPayload(years);payload.pbr={points:[],stats:null};
  return route.fulfill({json:payload});
 });
 await page.goto('/#bands');await expect(currentMetric(page)).toHaveText('30배');
 await page.locator('#band-metric').selectOption('pbr');
 await expect(page.locator('#band-chart canvas')).toHaveCount(0);
 await page.locator('#band-years').selectOption('5');
 await expect(page.locator('[data-band-retry]')).toBeVisible();
 await expect(page.locator('[data-band-feedback]')).toContainText('현재 표시 자료는 3년 요청 자료예요.');
 await expect(page.locator('[data-band-basis]')).toContainText('3년 요청 · PBR');
 await expect(page.locator('#analysis-body')).toContainText('해당 지표 이력이 제공되지 않아요.');
 await expect(currentMetric(page)).toHaveCount(0);
});

test('rapid band period changes ignore a late failed period and do not duplicate a pending request',async({page,qa})=>{
 let release;
 qa.overrides.set('/api/valuation-band',async(route,url)=>{
  const years=Number(url.searchParams.get('years'));
  if(years===5){await new Promise(resolve=>{release=resolve;});return route.fulfill({status:429,json:{detail:'late failure'}});}
  return route.fulfill({json:bandPayload(years)});
 });
 await page.goto('/#bands');await expect(currentMetric(page)).toHaveText('30배');
 await page.locator('#band-years').selectOption('5');await expect.poll(()=>!!release).toBe(true);
 await page.locator('#band-years').dispatchEvent('change');
 await page.locator('#band-metric').selectOption('pbr');
 expect(bandCalls(qa).filter(row=>row.query.includes('years=5'))).toHaveLength(1);
 await page.locator('#band-years').selectOption('10');
 await expect(page.locator('[data-band-basis]')).toContainText('10년 요청 · PBR');
 const oldDone=page.waitForResponse(response=>response.url().includes('/api/valuation-band')&&response.url().includes('years=5'));
 release();await oldDone;
 await expect(page.locator('[data-band-basis]')).toContainText('10년 요청 · PBR');
 await expect(page.locator('[data-band-coverage]')).toContainText('10년 요청');
 await expect(page.locator('#analysis-body')).toContainText('Period QA 10 source');
 await expect(page.locator('[data-band-feedback]')).toBeEmpty();
 await page.locator('#band-metric').selectOption('per');await expect(currentMetric(page)).toHaveText('100배');
 expect(bandCalls(qa)).toHaveLength(3);
});

test('initial band failure retries the same selection without duplicate pending requests',async({page,qa})=>{
 let release,attempts=0;
 qa.overrides.set('/api/valuation-band',async(route,url)=>{
  attempts++;
  if(attempts===1)return route.fulfill({status:429,json:{detail:'initial failure'}});
  await new Promise(resolve=>{release=resolve;});
  return route.fulfill({json:bandPayload(Number(url.searchParams.get('years')))});
 });
 await page.goto('/#bands');await expect(page.locator('#analysis-retry')).toBeVisible();
 await expect(page.locator('#band-chart')).toHaveCount(0);
 await page.locator('#analysis-retry').click();await expect.poll(()=>!!release).toBe(true);
 await page.locator('#band-years').dispatchEvent('change');
 await page.locator('#band-metric').selectOption('pbr');
 expect(bandCalls(qa)).toHaveLength(2);
 release();await expect(currentMetric(page)).toHaveText('2배');
 await expect(page.locator('[data-band-basis]')).toContainText('3년 요청 · PBR');
 await expect(page.locator('#analysis-retry')).toHaveCount(0);
 await expect(page.locator('[data-band-feedback]')).toBeEmpty();
 expect(bandCalls(qa).every(row=>row.query.includes('years=3'))).toBe(true);
});

test('a band response after route exit cannot modify the new screen or its restored period',async({page,qa})=>{
 let release;
 // Tool logos are optional; explicitly exercise their existing offline fallback.
 await page.route('https://www.google.com/s2/favicons**',route=>route.abort());
 qa.overrides.set('/api/valuation-band',async(route,url)=>{
  const years=Number(url.searchParams.get('years'));
  if(years===5)await new Promise(resolve=>{release=resolve;});
  return route.fulfill({json:bandPayload(years)});
 });
 await page.goto('/#bands');await expect(currentMetric(page)).toHaveText('30배');
 await page.locator('#band-years').selectOption('5');await expect.poll(()=>!!release).toBe(true);
 await page.evaluate(()=>{location.hash='tools';});
 await expect(page.locator('.investment-tool-card')).toHaveCount(12);
 const oldDone=page.waitForResponse(response=>response.url().includes('/api/valuation-band')&&response.url().includes('years=5'));
 release();await oldDone;
 await expect(page.locator('.investment-tool-card')).toHaveCount(12);
 await expect(page.locator('[data-band-basis]')).toHaveCount(0);
 await page.goBack();
 await expect(page.locator('#band-years')).toHaveValue('5');
 await expect(page.locator('[data-band-basis]')).toContainText('5년 요청');
 await expect(currentMetric(page)).toHaveText('50배');
 expect(bandCalls(qa).filter(row=>row.query.includes('years=5'))).toHaveLength(1);
});

test.describe('band lifecycle',()=>{
 test.use({storedLists:{watchlist:quotes.map(row=>({symbol:row.ticker,name:row.name})),selected:['005930.KS','000660.KS']}});
 test('a different symbol clears the old graph and late period responses cannot replace current data',async({page,qa})=>{
  let releaseOld,releaseSymbol;
  qa.overrides.set('/api/valuation-band',async(route,url)=>{
   const years=Number(url.searchParams.get('years')),symbol=url.searchParams.get('ticker');
   if(years===5&&symbol==='005930.KS')await new Promise(resolve=>{releaseOld=resolve;});
   if(symbol==='000660.KS')await new Promise(resolve=>{releaseSymbol=resolve;});
   return route.fulfill({json:bandPayload(years,symbol,symbol==='000660.KS'?66:years*10)});
  });
  await page.goto('/#bands');await expect(currentMetric(page)).toHaveText('30배');
  await page.locator('#band-years').selectOption('5');await expect.poll(()=>!!releaseOld).toBe(true);
  await page.locator('#band-symbol').selectOption('000660.KS');await expect.poll(()=>!!releaseSymbol).toBe(true);
  await expect(page.locator('#band-chart')).toHaveCount(0);
  releaseSymbol();await expect(currentMetric(page)).toHaveText('66배');
  await expect(page.locator('[data-band-basis]')).toContainText('SK하이닉스');
  const oldDone=page.waitForResponse(response=>response.url().includes('/api/valuation-band')&&response.url().includes('005930')&&response.url().includes('years=5'));
  releaseOld();await oldDone;await expect(currentMetric(page)).toHaveText('66배');
  await expect(page.locator('[data-band-basis]')).toContainText('SK하이닉스');
 });
});

test('collapsed screener values and local RSI errors preserve query and return focus to the input',async({page},testInfo)=>{
 await page.goto('/#discover');await expect(page.locator('.analysis-stock').first()).toBeVisible();
 const advanced=page.locator('.screener-advanced'),summary=advanced.locator(':scope > summary');
 await summary.click();await page.locator('[name="query"]').fill('삼성전자');
 await page.locator('.screener-extra > summary').click();
 await page.locator('[name="rsiMin"]').fill('70');await page.locator('[name="rsiMax"]').fill('30');
 for(const name of ['rsiMin','rsiMax']){
  const field=page.locator(`[name="${name}"]`);
  await expect(field).toHaveAttribute('aria-invalid','true');
  await expect(field).toHaveAttribute('aria-describedby',`screener-error-${name}`);
  await expect(page.locator(`#screener-error-${name}`)).toBeVisible();
 }
 await summary.click();await expect(summary).toContainText('3개 적용');
 await expect(summary).toContainText('삼성전자');await expect(summary).toContainText('RSI 70~30');
 await page.locator('[data-screener-fix]').click();
 await expect(page.locator('[name="rsiMin"]')).toBeFocused();
 await page.locator('[name="rsiMin"]').fill('0');await page.locator('[name="rsiMax"]').fill('60');
 await expect(page.locator('[name="rsiMin"]')).not.toHaveAttribute('aria-invalid','true');
 await expect(page.locator('[data-screener-fix]')).toHaveCount(0);
 await expect(page.locator('.analysis-stock')).toHaveCount(1);
 await summary.click();await expect(summary).toContainText('RSI 0~60');
 await expect(summary.locator('.screener-condition-values')).toHaveCSS('font-size','12px');
 await page.screenshot({path:testInfo.outputPath('collapsed-filter-values.png'),fullPage:true});
 await page.locator('.analysis-stock').click();await expect(page).toHaveURL(/#detail\/005930.KS/);
 await page.goBack();await expect(page.locator('.screener-advanced > summary')).toContainText('RSI 0~60');
 await expect(page.locator('[name="query"]')).toHaveValue('삼성전자');
 await expect(page.locator('.analysis-stock')).toBeFocused();
 await noOverflow(page);
});

test('preset, reset, and technical clear summaries follow the actual restored form values',async({page,qa},testInfo)=>{
 await page.goto('/#discover');await expect(page.locator('.analysis-stock')).toHaveCount(3);
 const summary=page.locator('.screener-advanced > summary');
 await page.locator('[data-screener-preset="volume-surge"]').click();
 await expect(summary).toContainText('1개 적용');await expect(summary).toContainText('거래량 ≥2배');
 await summary.click();await page.locator('[name="query"]').fill('삼성전자');
 await page.locator('.screener-extra > summary').click();
 await page.locator('[name="rsiMin"]').fill('0');
 await page.locator('[name="ret20Min"]').fill('-10');
 await expect(summary).toContainText('4개 적용');
 await expect(summary).toContainText('RSI ≥0 · 거래량 ≥2배 · 20일 ≥-10%');
 await expect(page.locator('.screener-extra > summary')).toContainText('3개 적용');
 await expect(page.locator('.analysis-stock')).toHaveCount(1);
 await summary.click();
 await page.reload();
 await expect(summary).toContainText('삼성전자 · RSI ≥0 · 거래량 ≥2배 · 20일 ≥-10%');
 await expect(page.locator('[name="rsiMin"]')).toHaveValue('0');
 await expect(page.locator('[name="ret20Min"]')).toHaveValue('-10');
 await expect(page.locator('.analysis-stock')).toHaveCount(1);
 await touchable(page.locator('[data-clear-preset]'));await page.locator('[data-clear-preset]').click();
 await expect(summary).toContainText('1개 적용');await expect(summary).toContainText('삼성전자');
 await expect(summary).not.toContainText('RSI');await expect(page.locator('[name="query"]')).toHaveValue('삼성전자');
 await expect(page.locator('.analysis-stock')).toHaveCount(1);
 await summary.click();await page.getByRole('button',{name:'초기화',exact:true}).click();
 await expect(summary.locator('.screener-condition-values')).toHaveCount(0);
 await expect(summary).not.toContainText('개 적용');
 await expect(page.locator('.analysis-stock')).toHaveCount(3);
 await page.screenshot({path:testInfo.outputPath('filter-reset.png'),fullPage:true});
 expect(qa.calls.filter(row=>row.path==='/static/data/screener.json')).toHaveLength(2);
 await noOverflow(page);
});

test('clearing a native numeric entry error restores valid filters even when its submitted value stays empty',async({page})=>{
 await page.goto('/#discover');await expect(page.locator('.analysis-stock')).toHaveCount(3);
 await page.locator('.screener-advanced > summary').click();
 const field=page.locator('[name="valueMin"]');
 await field.pressSequentially('1e');
 await expect.poll(()=>field.evaluate(el=>el.validity.badInput)).toBe(true);
 await expect(field).toHaveValue('');
 await expect(field).toHaveAttribute('aria-invalid','true');
 await expect(page.locator('#screener-error-valueMin')).toBeVisible();
 await field.fill('');
 await expect.poll(()=>field.evaluate(el=>el.validity.badInput)).toBe(false);
 await expect(field).not.toHaveAttribute('aria-invalid','true');
 await expect(page.locator('#screener-error-valueMin')).toBeHidden();
 await expect(page.locator('[data-screener-fix]')).toHaveCount(0);
 await expect(page.locator('.analysis-stock')).toHaveCount(3);
 // A fresh incomplete entry also has an empty submitted value.
 await field.pressSequentially('-');
 await expect.poll(()=>field.evaluate(el=>el.validity.badInput)).toBe(true);
 await expect(field).toHaveAttribute('aria-invalid','true');
 await field.fill('');await expect(page.locator('.analysis-stock')).toHaveCount(3);
 await noOverflow(page);
});
