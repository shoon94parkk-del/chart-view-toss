import {test,expect,noOverflow,touchable} from './fixtures.mjs';
import {industryDetails,exportSnapshot,trends} from './data.mjs';
import {companyContext,matrix} from '../fixtures/export-recovery.mjs';

const companyPath='/static/data/company_context.json';
const calls=(qa,path)=>qa.calls.filter(row=>row.path===path).length;
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {resolve,promise};};

for(const [route,selector,candidate] of [
 ['memory','.export-semi-company-inline','삼성전자'],
 ['cosmetics','.export-industry-research','화장품A'],
]){
 for(const failure of ['503','malformed','malformed-rows'])test(`export company ${route}: ${failure} stays distinct from empty and retries locally`,async({page,qa})=>{
  let recover=false;
  qa.overrides.set(companyPath,request=>recover?request.fulfill({json:companyContext}):failure==='503'?request.fulfill({status:503,json:{detail:'unavailable'}}):request.fulfill({json:failure==='malformed-rows'?{companies:[{}]}:{error:'unavailable'}}));
  await page.goto(`/#exports/${route}`);
  const host=page.locator(selector),chart=route==='memory'?page.getByTestId('semiconductor-month'):page.locator('[data-export-panel="cosmetics"]').getByTestId('export-month');
  await expect(chart).toHaveCount(route==='memory'?12:36);
  await expect(host).toContainText('기업 근거 자료 확인 실패');
  await expect(host).not.toContainText('후보가 없어요');
  const before=await chart.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')));
  const counts={monthly:calls(qa,'/api/export-momentum'),detail:calls(qa,'/api/export-momentum/item-detail'),trends:calls(qa,'/api/export-momentum/semiconductor-trends'),company:calls(qa,companyPath)};
  recover=true;
  const retry=host.getByRole('button',{name:'기업 근거 다시 시도'});
  await touchable(retry);await retry.click();
  await expect(host.getByRole('button').filter({hasText:candidate}).first()).toBeVisible();
  expect(calls(qa,companyPath)).toBe(counts.company+1);
  expect(calls(qa,'/api/export-momentum')).toBe(counts.monthly);
  expect(calls(qa,'/api/export-momentum/item-detail')).toBe(counts.detail);
  expect(calls(qa,'/api/export-momentum/semiconductor-trends')).toBe(counts.trends);
  expect(await chart.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')))).toEqual(before);
  await noOverflow(page);
 });
 test(`export company ${route}: genuine empty dataset stays an empty state`,async({page,qa})=>{
  qa.overrides.set(companyPath,request=>request.fulfill({json:{source:'KRX',companies:[]}}));
  await page.goto(`/#exports/${route}`);
  const host=page.locator(selector);
  await expect(host).toContainText(route==='memory'?'기업 후보를 찾지 못했어요':'검증된 연결 후보가 없어요');
  await expect(host).not.toContainText('확인 실패');
  await expect(host.getByRole('button',{name:'기업 근거 다시 시도'})).toHaveCount(0);
 });
}

for(const period of ['2026-09','2026-08',''])test(`semiconductor country ${period||'unknown'} month governs visible and saved research evidence`,async({page,qa})=>{
 qa.overrides.set('/api/export-momentum/semiconductor-countries',request=>request.fulfill({json:{...matrix,period,segments:matrix.segments.map(row=>({...row,countries:row.countries.map(country=>({...country,deltaUsdBillion:1.25}))}))}}));
 await page.goto('/#exports/memory');
 await expect(page.getByTestId('semiconductor-month')).toHaveCount(12);
 const region=page.locator('.export-semi-country-inline');
 if(period==='2026-09')await expect(region).toContainText('+12.5억달러');
 else {await expect(region).toContainText(`추이 2026-09 · 국가 ${period||'기준월 미제공'}`);await expect(region.locator('.export-semi-country-mini')).toHaveCount(0);}
 await page.evaluate(()=>{window.__chartviewInvestigate=(symbol,name,evidence)=>{window.__capturedExportEvidence=evidence;};});
 await page.locator('[data-export-semi-company]').first().click();
 const evidence=await page.evaluate(()=>window.__capturedExportEvidence);
 expect(evidence.basisDate).toBe(trends.period);
 expect(evidence.observations.join(' ')).toContain(period==='2026-09'?'중국 지정시장 증감 +12.5억달러':'국가별 지정시장 근거 미제공');
 if(period!=='2026-09')expect(evidence.observations.join(' ')).not.toContain('12.5');
});

test('direct independent industry sources survive monthly failure without extra source requests',async({page,qa})=>{
 qa.overrides.set('/api/export-momentum',request=>request.fulfill({status:503,json:{detail:'unavailable'}}));
 const source={name:'관세청 원자료',url:'https://example.org/customs'};
 qa.overrides.set('/api/export-momentum/item-detail',(request,url)=>request.fulfill({json:{...industryDetails[url.searchParams.get('key')],source,updatedAt:'2026-10-07T01:02:03Z'}}));
 await page.goto('/#exports/cosmetics');
 const panel=page.locator('[data-export-panel="cosmetics"]');
 await expect(panel.getByTestId('export-month')).toHaveCount(36);
 const sourceToggle=panel.getByText('데이터 기준·원자료',{exact:true});
 await touchable(sourceToggle.locator('..'));await sourceToggle.click();
 const sourceBody=panel.locator('.export-source-body');
 await expect(sourceBody).toContainText('2026-09');await expect(sourceBody).toContainText('HS 3304');
 await expect(sourceBody).toContainText('관세청 원자료');await expect(sourceBody).toContainText('2026-10-07T01:02:03Z');
 await expect(sourceBody).toContainText('순중량');
 expect(calls(qa,'/api/export-momentum')).toBe(1);expect(calls(qa,'/api/export-momentum/item-detail')).toBe(1);
 await noOverflow(page);
});

for(const route of ['memory','cosmetics'])test(`independent ${route} source disclosure preserves the existing meta provider`,async({page,qa})=>{
 const provider='Korea Customs Service / data.go.kr';
 qa.overrides.set('/api/export-momentum',request=>request.fulfill({status:503,json:{detail:'unavailable'}}));
 qa.overrides.set('/api/export-momentum/semiconductor-trends',request=>request.fulfill({json:{...trends,meta:{provider}}}));
 qa.overrides.set('/api/export-momentum/item-detail',(request,url)=>request.fulfill({json:{...industryDetails[url.searchParams.get('key')],meta:{provider}}}));
 await page.goto(`/#exports/${route}`);
 const panel=page.locator(`[data-export-panel="${route==='memory'?'semiconductor':route}"]`);
 await expect(panel.getByTestId(route==='memory'?'semiconductor-month':'export-month')).toHaveCount(route==='memory'?12:36);
 await panel.getByText('데이터 기준·원자료',{exact:true}).click();
 const sourceBody=panel.locator('.export-industry-source .export-source-body');
 await expect(sourceBody).toContainText(provider);
 await expect(sourceBody).toContainText('갱신 시각 미제공');
 await expect(sourceBody).not.toContainText('출처 미제공');
 expect(calls(qa,'/api/export-momentum')).toBe(1);
 expect(calls(qa,route==='memory'?'/api/export-momentum/semiconductor-trends':'/api/export-momentum/item-detail')).toBe(1);
 await noOverflow(page);
});

for(const route of ['memory','cosmetics'])test(`independent ${route} source controls open the supplied URL after asynchronous renders`,async({page,qa})=>{
 const source={name:'관세청 원자료',url:'https://example.org/customs'};
 qa.overrides.set('/api/export-momentum',request=>request.fulfill({status:503,json:{detail:'unavailable'}}));
 qa.overrides.set('/api/export-momentum/semiconductor-trends',request=>request.fulfill({json:{...trends,source}}));
 qa.overrides.set('/api/export-momentum/item-detail',(request,url)=>request.fulfill({json:{...industryDetails[url.searchParams.get('key')],source}}));
 await page.addInitScript(()=>{window.__exportOpenedUrls=[];window.open=url=>{window.__exportOpenedUrls.push(url);return null;};});
 await page.goto(`/#exports/${route}`);
 const panel=page.locator(`[data-export-panel="${route==='memory'?'semiconductor':route}"]`);
 await expect(panel.getByTestId(route==='memory'?'semiconductor-month':'export-month')).toHaveCount(route==='memory'?12:36);
 const openSource=async()=>{
  await panel.getByText('데이터 기준·원자료',{exact:true}).click();
  const button=panel.locator('.export-industry-source [data-external-url]');
  await touchable(button);await button.click();
 };
 await openSource();
 await expect.poll(()=>page.evaluate(()=>window.__exportOpenedUrls)).toEqual([source.url]);
 if(route==='memory'){
  await panel.locator('[data-export-semi-segment="flash"]').click();
  await expect(panel.locator('#export-semi-chart-focus')).toContainText('Flash');
  await openSource();
  await expect.poll(()=>page.evaluate(()=>window.__exportOpenedUrls)).toEqual([source.url,source.url]);
 }
});

test('breadth neutral segment represents flat count in the actual accessible chart',async({page,qa})=>{
 qa.overrides.set('/api/export-momentum',request=>request.fulfill({json:{...exportSnapshot,breadth:{period:'2026-09',comparableCount:80,risingCount:52,fallingCount:26,flatCount:2,risingBreadthPct:65}}}));
 await page.goto('/#exports/items');
 const chart=page.locator('.export-breadth-track');
 await expect(chart).toHaveAttribute('aria-label',/증가 52개 · 65.0%.*감소 26개 · 32.5%.*보합 2개 · 2.5%/);
 expect(await chart.locator('i').evaluateAll(nodes=>nodes.map(node=>parseFloat(node.style.width)))).toEqual([65,32.5,2.5]);
});

test('late company retry cannot overwrite another industry or trigger duplicate requests',async({page,qa})=>{
 let recover=false;const gate=deferred(),arrived=deferred();
 qa.overrides.set(companyPath,async request=>{if(!recover)return request.fulfill({json:{}});arrived.resolve();await gate.promise;return request.fulfill({json:companyContext});});
 try{
  await page.goto('/#exports/cosmetics');
  const retry=page.locator('.export-industry-research').getByRole('button',{name:'기업 근거 다시 시도'});
  await expect(retry).toBeVisible();recover=true;
  await retry.evaluate(button=>{button.click();button.click();});await arrived.promise;
  expect(calls(qa,companyPath)).toBe(2);
  await page.getByRole('tab',{name:'철강',exact:true}).click();
  await expect(page.locator('[data-export-panel="steel"]').getByTestId('export-month')).toHaveCount(36);
  gate.resolve();
  await expect(page.locator('[data-export-panel="steel"] .export-industry-research')).toContainText('철강A');
  await expect(page.getByRole('tab',{name:'철강',exact:true})).toHaveAttribute('aria-selected','true');
 }finally{gate.resolve();}
});
