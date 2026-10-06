import assert from 'node:assert/strict';
const {chromium}=await import(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.QA_BROWSER_CHANNEL?{channel:process.env.QA_BROWSER_CHANNEL}:{})});
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
const snapshot={period:'2026-09',summary:{exportsUsdBillion:60,exportYoY:10},items:[{key:'semiconductor',name:'반도체',exportsUsdBillion:20,exportYoY:15},{key:'passenger-car',name:'승용차',exportsUsdBillion:5,exportYoY:10}],history:[{period:'2026-08',exportsUsdBillion:50,exportYoY:null},{period:'2026-09',exportsUsdBillion:60,exportYoY:10}]};
const radar={period:'2026-09',latestStage:20,checkpoints:[{stage:20,label:'1~20일',total:{exportsUsdBillion:40},semiconductor:{exportsUsdBillion:10}}]};
const momentumMap={period:'2026-09',items:[
 {key:'semiconductor',name:'반도체',period:'2026-09',exportYoY:25,previousExportYoY:15,deltaYoYPp:10,avg3mYoY:20,acceleration3mPp:6,signal:'acceleration',signalLabel:'가속'},
 {key:'passenger-car',name:'승용차',period:'2026-09',exportYoY:-4,previousExportYoY:2,deltaYoYPp:-6,avg3mYoY:-1,acceleration3mPp:-4,signal:'weak',signalLabel:'부진'},
]};
const semiconductorTrends={period:'2026-09',total:{name:'반도체',exportsUsdBillion:30,priorExportsUsdBillion:20,deltaUsdBillion:10,exportYoY:50},memoryTotalDeltaUsdBillion:4,segments:[
 {key:'memory-total',name:'메모리 IC',code:'854232',group:'memory',note:'HS 854232 메모리 전체',exportsUsdBillion:12,priorExportsUsdBillion:8,deltaUsdBillion:4,exportYoY:50,overallContributionPct:40,memoryContributionPct:null,history:[{period:'2026-08',exportsUsdBillion:11,priorExportsUsdBillion:8,deltaUsdBillion:3,exportYoY:37.5},{period:'2026-09',exportsUsdBillion:12,priorExportsUsdBillion:8,deltaUsdBillion:4,exportYoY:50}]},
 {key:'dram',name:'DRAM',code:'8542321010',group:'memory',note:'HBM 별도 HSK 없음',exportsUsdBillion:7,priorExportsUsdBillion:5,deltaUsdBillion:2,exportYoY:40,overallContributionPct:null,memoryContributionPct:50,history:[{period:'2026-08',exportsUsdBillion:6,priorExportsUsdBillion:5,deltaUsdBillion:1,exportYoY:20},{period:'2026-09',exportsUsdBillion:7,priorExportsUsdBillion:5,deltaUsdBillion:2,exportYoY:40}]},
 {key:'flash',name:'Flash memory',code:'8542321030',group:'memory',note:'NAND/NOR 포함',exportsUsdBillion:3,priorExportsUsdBillion:2.5,deltaUsdBillion:.5,exportYoY:20,overallContributionPct:null,memoryContributionPct:12.5,history:[{period:'2026-08',exportsUsdBillion:2.8,priorExportsUsdBillion:2.5,deltaUsdBillion:.3,exportYoY:12},{period:'2026-09',exportsUsdBillion:3,priorExportsUsdBillion:2.5,deltaUsdBillion:.5,exportYoY:20}]},
 {key:'sram',name:'SRAM',code:'8542321020',group:'memory',note:'HSK 8542321020',exportsUsdBillion:.5,priorExportsUsdBillion:.7,deltaUsdBillion:-.2,exportYoY:-28.6,overallContributionPct:null,memoryContributionPct:-5,history:[{period:'2026-08',exportsUsdBillion:.6,priorExportsUsdBillion:.7,deltaUsdBillion:-.1,exportYoY:-14.3},{period:'2026-09',exportsUsdBillion:.5,priorExportsUsdBillion:.7,deltaUsdBillion:-.2,exportYoY:-28.6}]},
 {key:'mcp-memory',name:'MCP',code:'8542323000',group:'memory',note:'복합구조칩 메모리',exportsUsdBillion:4,priorExportsUsdBillion:2.8,deltaUsdBillion:1.2,exportYoY:42.9,overallContributionPct:null,memoryContributionPct:30,history:[{period:'2026-08',exportsUsdBillion:3.5,priorExportsUsdBillion:2.8,deltaUsdBillion:.7,exportYoY:25},{period:'2026-09',exportsUsdBillion:4,priorExportsUsdBillion:2.8,deltaUsdBillion:1.2,exportYoY:42.9}]},
 {key:'processor-controller',name:'프로세서·컨트롤러',code:'854231',group:'logic',note:'HS 854231',exportsUsdBillion:8,priorExportsUsdBillion:6.5,deltaUsdBillion:1.5,exportYoY:23.1,overallContributionPct:15,memoryContributionPct:null,history:[{period:'2026-08',exportsUsdBillion:7.5,priorExportsUsdBillion:6.4,deltaUsdBillion:1.1,exportYoY:17.2},{period:'2026-09',exportsUsdBillion:8,priorExportsUsdBillion:6.5,deltaUsdBillion:1.5,exportYoY:23.1}]},
 {key:'other-ic',name:'기타 IC',code:'854239',group:'logic',note:'HS 854239',exportsUsdBillion:4,priorExportsUsdBillion:3.5,deltaUsdBillion:.5,exportYoY:14.3,overallContributionPct:5,memoryContributionPct:null,history:[{period:'2026-08',exportsUsdBillion:3.8,priorExportsUsdBillion:3.5,deltaUsdBillion:.3,exportYoY:8.6},{period:'2026-09',exportsUsdBillion:4,priorExportsUsdBillion:3.5,deltaUsdBillion:.5,exportYoY:14.3}]},
 {key:'dram-module',name:'DRAM 모듈',code:'8473304060',group:'module',note:'반도체 총계 외 별도 HSK',exportsUsdBillion:3,priorExportsUsdBillion:2.2,deltaUsdBillion:.8,exportYoY:36.4,overallContributionPct:null,memoryContributionPct:null,history:[{period:'2026-08',exportsUsdBillion:2.5,priorExportsUsdBillion:2.1,deltaUsdBillion:.4,exportYoY:19},{period:'2026-09',exportsUsdBillion:3,priorExportsUsdBillion:2.2,deltaUsdBillion:.8,exportYoY:36.4}]},
]};
const companyContext={source:'KRX 주요제품',updated:'2026-10-05',companies:[
 {symbol:'005930.KS',name:'삼성전자',industry:'반도체 제조업',mainProducts:'DRAM, NAND'},
 {symbol:'000660.KS',name:'SK하이닉스',industry:'반도체 제조업',mainProducts:'DRAM, NAND, MCP'},
 {symbol:'111111.KS',name:'완성차A',industry:'자동차 제조업',mainProducts:'승용차, SUV'},
 {symbol:'222221.KS',name:'정유A',industry:'석유 정제품 제조업',mainProducts:'휘발유, 경유, 항공유'},
 {symbol:'333331.KS',name:'화장품A',industry:'화장품 제조업',mainProducts:'기초화장품, 색조화장품'},
 {symbol:'444441.KS',name:'조선A',industry:'선박 건조업',mainProducts:'LNG선, 컨테이너선'},
 {symbol:'555551.KS',name:'철강A',industry:'제철 및 제강업',mainProducts:'열연강판, 냉연강판, 후판'},
]};
const detail={key:'semiconductor',name:'반도체',period:'2026-09',history:[{period:'2026-09',exportsUsdBillion:20,exportYoY:15}],countries:[]};
const makeIndustryDetail=(key,name,note)=>({
 key,name,note,period:'2026-09',
 history:[
  {period:'2026-08',exportsUsdBillion:4.2,priorExportsUsdBillion:3.8,deltaUsdBillion:.4,exportYoY:10.5,exportWeightKg:920000000,exportWeightYoY:4,unitValueUsdPerKg:4.6,unitValueYoY:6,importsUsdBillion:1.1,importYoY:2,tradeBalanceUsdBillion:3.1},
  {period:'2026-09',exportsUsdBillion:4.8,priorExportsUsdBillion:4.0,deltaUsdBillion:.8,exportYoY:20,exportWeightKg:980000000,exportWeightYoY:8,unitValueUsdPerKg:4.9,unitValueYoY:11,importsUsdBillion:1.2,importYoY:3,tradeBalanceUsdBillion:3.6},
 ],
 momentum:{
  exports:{avg3mYoY:18,previous3mYoY:12,accelerationPp:6,label:'증가세 강화'},
  volume:{avg3mYoY:7,previous3mYoY:4,accelerationPp:3,label:'증가세 강화'},
  unitValue:{avg3mYoY:9,previous3mYoY:6,accelerationPp:3,label:'증가세 강화'},
  latestPhase:'물량↑·단위가치↑',
  phaseHistory:[
   {period:'2026-08',phase:'물량↑·단위가치↑',volumeYoY:4,unitValueYoY:6},
   {period:'2026-09',phase:'물량↑·단위가치↑',volumeYoY:8,unitValueYoY:11},
  ],
 },
 countries:[
  {code:'US',name:'미국',exportsUsdBillion:1.2,sharePct:25},
  {code:'CN',name:'중국',exportsUsdBillion:1.0,sharePct:20.8},
  {code:'VN',name:'베트남',exportsUsdBillion:.7,sharePct:14.6},
  {code:'JP',name:'일본',exportsUsdBillion:.4,sharePct:8.3},
  {code:'TW',name:'대만',exportsUsdBillion:.3,sharePct:6.3},
 ],
});
const industryDetails={
 'passenger-car':makeIndustryDetail('passenger-car','승용차','HS 8703 기준'),
 petroleum:makeIndustryDetail('petroleum','석유제품','HS 2710 정제 석유제품 기준'),
 cosmetics:makeIndustryDetail('cosmetics','화장품','HS 3304 미용·기초화장품 기준'),
 ships:makeIndustryDetail('ships','선박','HS 89 선박·보트류 기준'),
 steel:makeIndustryDetail('steel','철강','HS 72 철강 기준'),
};
const matrix={period:'2026-09',segments:[{key:'dram',code:'8542321010',name:'DRAM',exportsUsdBillion:10,countries:[{code:'CN',name:'중국',exportsUsdBillion:5,sharePct:50}]}]};
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
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...detail,key:'passenger-car',name:'승용차'})});
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
    assert.ok(await page.locator('[data-export-industry-shell]').isVisible(),label+' industry shell is visible');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' tab stays inside mobile viewport');
  }
  assert.equal(calls.item,industryCallsBefore+5,'each dedicated industry tab lazy-loads its own existing item detail once');
  assert.equal(calls.monthly,1,'industry tabs do not reload the monthly snapshot');

  assert.deepEqual(errors,[]);
  console.log(`${width}px: export recovery plus semiconductor delta/yoy, contribution, history, country and company drilldown passed`);
  await context.close();
 }
}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,2000))]);}
process.exit(0);
