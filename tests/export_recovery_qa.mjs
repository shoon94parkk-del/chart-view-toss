import assert from 'node:assert/strict';
const {chromium}=await import(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.QA_BROWSER_CHANNEL?{channel:process.env.QA_BROWSER_CHANNEL}:{})});
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
const snapshot={period:'2026-09',summary:{exportsUsdBillion:60,exportYoY:10},items:[{key:'semiconductor',name:'반도체',exportsUsdBillion:20,exportYoY:15},{key:'passenger-car',name:'승용차',exportsUsdBillion:5,exportYoY:10}],history:[{period:'2026-08',exportsUsdBillion:50,exportYoY:null},{period:'2026-09',exportsUsdBillion:60,exportYoY:10}]};
const radar={period:'2026-09',latestStage:20,checkpoints:[{stage:20,label:'1~20일',total:{exportsUsdBillion:40},semiconductor:{exportsUsdBillion:10}}]};
const detail={key:'semiconductor',name:'반도체',period:'2026-09',history:[{period:'2026-09',exportsUsdBillion:20,exportYoY:15}],countries:[]};
const matrix={period:'2026-09',segments:[{key:'dram',code:'8542321010',name:'DRAM',exportsUsdBillion:10,countries:[{code:'CN',name:'중국',exportsUsdBillion:5,sharePct:50}]}]};
try{
 for(const width of [320,390,430]){
  const context=await browser.newContext({viewport:{width,height:844}});
  const page=await context.newPage();
  const calls={monthly:0,radar:0,item:0,country:0};
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // Match monthly and child endpoints explicitly across Playwright versions.
  await page.route(/\/api\/export-momentum(?:[/?]|$)/,async route=>{
    const path=new URL(route.request().url()).pathname;
    let body;
    if(path.endsWith('/provisional'))body=++calls.radar===1?{period:'2026-09',checkpoints:[]}:radar;
    else if(path.endsWith('/item-detail'))body=++calls.item===1?{key:'semiconductor',history:[]}:detail;
    else if(path.endsWith('/semiconductor-countries'))body=++calls.country===1?{period:'2026-09',segments:[]}:matrix;
    else {calls.monthly++;body=snapshot;}
    const failed503=(width===390&&path.endsWith('/semiconductor-countries')&&calls.country===1)||(width===430&&path.endsWith('/provisional')&&calls.radar===1);
    await route.fulfill({status:failed503?503:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(base+'/#exports',{waitUntil:'domcontentloaded'});
  await page.locator('[data-export-provisional-retry]').waitFor();
  assert.equal(calls.radar,1,'initial unavailable radar response must be intercepted');
  await page.locator('[data-export-provisional-retry]').click();
  await page.locator('#export-provisional-radar .export-provisional-error').waitFor({state:'detached'});
  await page.getByText('1~20일',{exact:true}).first().waitFor().catch(async error=>{
    console.error(JSON.stringify({width,calls,errors,radar:await page.locator('#export-provisional-radar').innerText(),url:page.url()}));
    throw error;
  });
  assert.equal(calls.radar,2,'retry bypasses cached empty HTTP200');
  assert.equal(calls.monthly,1,'radar retry preserves monthly request');
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
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...detail,key:'passenger-car',name:'승용차'})});
  });
  await page.locator('[data-export-item="passenger-car"]').first().click();
  await page.locator('[data-export-detail-close]').click();
  const response=page.waitForResponse(response=>response.url().includes('key=passenger-car'));
  release();
  await response;
  assert.equal(await page.locator('#export-item-detail').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log(`${width}px: independent radar/item/country recovery, empty-cache bypass, preserved charts, no overflow/errors`);
  await context.close();
 }
}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,2000))]);}
process.exit(0);
