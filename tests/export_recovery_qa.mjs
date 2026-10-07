import assert from 'node:assert/strict';
const {chromium}=await import(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.QA_BROWSER_CHANNEL?{channel:process.env.QA_BROWSER_CHANNEL}:{})});
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
import {snapshot,radar,momentumMap,semiconductorTrends,companyContext,detail,industryDetails,matrix} from './fixtures/export-recovery.mjs';
try{
 for(const width of [320,390,430]){
  const context=await browser.newContext({viewport:{width,height:844}});
  const page=await context.newPage();
  const calls={monthly:0,momentum:0,radar:0,item:0,country:0,trends:0,company:0};
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // Match monthly and child endpoints explicitly across Playwright versions.
  await page.route(/\/api\/export-momentum(?:[/?]|$)/,async route=>{
    const path=new URL(route.request().url()).pathname;
    let body;
    if(path.endsWith('/momentum-map')){calls.momentum++;body=momentumMap;}
    else if(path.endsWith('/semiconductor-trends')){calls.trends++;body=semiconductorTrends;}
    else if(path.endsWith('/provisional'))body=++calls.radar===1?{period:'2026-09',checkpoints:[]}:radar;
    else if(path.endsWith('/item-detail')){
      const requested=new URL(route.request().url()).searchParams.get('key');
      if(industryDetails[requested]){calls.item++;body=industryDetails[requested];}
      else body=++calls.item===1?{key:'semiconductor',history:[]}:detail;
    }
    else if(path.endsWith('/semiconductor-countries'))body=++calls.country===1?{period:'2026-09',segments:[]}:matrix;
    else {calls.monthly++;body=snapshot;}
    const failed503=(width===390&&path.endsWith('/semiconductor-countries')&&calls.country===1)||(width===430&&path.endsWith('/provisional')&&calls.radar===1);
    await route.fulfill({status:failed503?503:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.route('**/static/data/company_context.json',async route=>{
    calls.company++;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(companyContext)});
  });
  await page.goto(base+'/#exports',{waitUntil:'domcontentloaded'});
  await page.getByText('가속',{exact:true}).first().waitFor();
  assert.equal(calls.momentum,1,'momentum map loads independently from monthly snapshot');
  await page.locator('[data-export-provisional-retry]').waitFor();
  assert.equal(calls.radar,1,'initial unavailable radar response must be intercepted');
  await page.locator('[data-export-provisional-retry]').click();
  await page.locator('#export-provisional-radar .export-provisional-error').waitFor({state:'detached'});
  await page.getByText('반도체 · 1~20일',{exact:true}).first().waitFor().catch(async error=>{
    console.error(JSON.stringify({width,calls,errors,radar:await page.locator('#export-provisional-radar').innerText(),url:page.url()}));
    throw error;
  });
  assert.equal(calls.radar,2,'retry bypasses cached empty HTTP200');
  assert.equal(calls.monthly,1,'radar retry preserves monthly request');
  assert.equal(calls.momentum,1,'radar retry does not reload momentum map');
  await page.getByRole('tab',{name:'품목',exact:true}).click();
  await page.locator('[data-export-item="semiconductor"]').first().click();
  await page.locator('[data-export-item-retry]').click();
  await page.getByText('반도체 세부 HS·국가 비교 보기',{exact:true}).click();
  await page.locator('[data-export-country-retry]').waitFor();
  assert.equal(calls.item,2,'item retry bypasses cached unavailable payload');
  const previous=await page.locator('.export-detail-chart-stack').innerHTML();
  await page.locator('[data-export-country-retry]').click();
  await page.locator('.export-semi-country-row').waitFor();
  assert.equal(calls.country,2);
  assert.equal(calls.item,2,'country retry does not reload item');
  assert.equal(calls.monthly,1);
  assert.equal(await page.locator('.export-detail-chart-stack').innerHTML(),previous);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('[data-export-detail-close]').click();
  assert.equal(await page.locator('#export-item-detail').isVisible(),false);
  // A closed pending detail must not reopen when its response arrives.
  let release;
  const held=new Promise(resolve=>{release=resolve});
  await page.route('**/api/export-momentum/item-detail?key=passenger-car*',async route=>{
    await held;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(industryDetails['passenger-car'])});
  });
  await page.locator('[data-export-item="passenger-car"]').first().click();
  await page.locator('[data-export-detail-close]').click();
  const response=page.waitForResponse(response=>response.url().includes('key=passenger-car'));
  release();
  await response;
  await page.unroute('**/api/export-momentum/item-detail?key=passenger-car*');
  assert.equal(await page.locator('#export-item-detail').isVisible(),false);

  const countriesBeforeSemiconductor=calls.country;
  await page.getByRole('tab',{name:'반도체',exact:true}).click();
  await page.getByRole('heading',{name:'반도체 품목별 수출액 증감',exact:true}).waitFor();
  await page.locator('[data-export-semi-segment="dram"]').waitFor();
  assert.equal(calls.trends,1,'semiconductor trend data loads only after opening semiconductor tab');
  assert.equal(calls.monthly,1,'semiconductor analysis does not reload monthly snapshot');
  assert.equal(await page.locator('[data-export-semi-metric="delta"]').getAttribute('class'),'is-active');
  await page.locator('[data-export-semi-metric="yoy"]').click();
  assert.equal(await page.locator('[data-export-semi-metric="yoy"]').getAttribute('class'),'is-active');
  await page.locator('[data-export-semi-segment="dram"]').click();
  await page.getByText('메모리 IC 증가액 중',{exact:true}).waitFor();
  await page.waitForFunction(()=>{
    const picker=document.querySelector('.export-semi-chart-picker');
    const chart=document.querySelector('.export-semi-trend-history');
    if(!picker||!chart)return false;
    const p=picker.getBoundingClientRect();
    const g=chart.getBoundingClientRect();
    return p.top>=0&&p.bottom<=innerHeight&&g.top<innerHeight-80&&g.bottom>0;
  });
  assert.match(await page.locator('.export-semi-contribution').innerText(),/50\.0%/);
  assert.ok(await page.locator('.export-semi-trend-bar').count()>=2,'selected segment shows recent history');
  assert.equal(await page.locator('[data-export-semi-chart-segment="dram"]').getAttribute('class'),'is-active');
  await page.locator('[data-export-semi-chart-segment="flash"]').click();
  await page.locator('.export-semi-selected-head h4').filter({hasText:'Flash memory'}).waitFor();
  assert.match(await page.locator('.export-semi-trend-bars').getAttribute('aria-label'),/Flash memory/);
  assert.match(await page.locator('[data-export-semi-segment="flash"]').getAttribute('class'),/is-selected/);
  await page.locator('[data-export-semi-chart-segment="dram"]').click();
  await page.locator('.export-semi-selected-head h4').filter({hasText:'DRAM'}).waitFor();
  await page.getByText('중국',{exact:true}).first().waitFor();
  assert.equal(calls.country,countriesBeforeSemiconductor,'semiconductor tab reuses the already-cached country matrix without a duplicate request');
  await page.getByText('삼성전자',{exact:true}).first().waitFor();
  assert.ok(calls.company>=1,'verified KRX product metadata is loaded for company investigation candidates');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'semiconductor drilldown stays inside mobile viewport');

  const industryCallsBefore=calls.item;
  for(const [label,heading,company] of [
    ['화장품','화장품 수출 흐름','화장품A'],
    ['철강','철강 수출 흐름','철강A'],
    ['석유제품','석유제품 수출 흐름','정유A'],
    ['자동차','자동차 수출 흐름','완성차A'],
    ['선박','선박 수출 흐름','조선A'],
  ]){
    await page.getByRole('tab',{name:label,exact:true}).click();
    await page.getByRole('heading',{name:heading,exact:true}).waitFor();
    await page.getByText('12개월 수출액',{exact:true}).waitFor();
    await page.getByText(company,{exact:true}).first().waitFor();
    const industryKey={'화장품':'cosmetics','철강':'steel','석유제품':'petroleum','자동차':'passenger-car','선박':'ships'}[label];
    assert.ok(await page.locator(`[data-export-industry-shell="${industryKey}"]`).isVisible(),label+' industry shell is visible');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' tab stays inside mobile viewport');
  }
  assert.equal(calls.item,industryCallsBefore+4,'four uncached industry tabs fetch once; passenger-car reuses the previously cached item detail');
  assert.equal(calls.monthly,1,'industry tabs do not reload the monthly snapshot');

  assert.deepEqual(errors,[]);
  console.log(`${width}px: export recovery plus semiconductor delta/yoy, contribution, history, country and company drilldown passed`);
  await context.close();
 }
}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,2000))]);}
process.exit(0);
