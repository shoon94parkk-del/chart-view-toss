import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:4173';
const OUT = 'artifacts/mobile-qa';
await fs.mkdir(OUT, { recursive: true });

const marketRows = [
  ['^KS11','코스피',3501.2,0.42,'KRW'],
  ['^KQ11','코스닥',912.4,-0.18,'KRW'],
  ['^GSPC','S&P 500',6812.3,0.31,'USD'],
  ['^IXIC','나스닥',22814.6,0.55,'USD'],
].map(([ticker,name,price,change,currency])=>({ticker,name,price,change,currency,asOf:'2026-09-21T03:00:00Z'}));

const compareStocks = [
  ['005930.KS','삼성전자','KRW',4.25],
  ['NVDA','엔비디아','USD',7.18],
  ['AAPL','애플','USD',-1.22],
].map(([ticker,name,currency,ret],i)=>({
  ticker,name,currency,return:ret,startDate:'2026-08-21',endDate:'2026-09-20',priceBasis:'adjusted_close',
  data:[
    {time:'2026-08-21',value:0},
    {time:'2026-09-01',value:(i+1)*0.7},
    {time:'2026-09-10',value:ret/2},
    {time:'2026-09-20',value:ret},
  ],
}));

const valuationStocks = [
  {ticker:'005930.KS',name:'삼성전자',price:84200,currency:'KRW',forwardPE:13.4,trailingPE:15.1,pbr:1.4,roe:11.8,operatingMargin:13.7,dividendYield:2.1,generatedAt:'2026-09-21T03:01:00Z',dataSource:'Yahoo',fieldMeta:{forwardPE:{period:'FY+1 추정',source:'Yahoo'},trailingPE:{period:'TTM',source:'Yahoo'},pbr:{period:'최근 분기',source:'Yahoo'},roe:{period:'TTM',source:'Yahoo'},operatingMargin:{period:'TTM',source:'Yahoo'},dividendYield:{period:'최근 표시값',source:'Yahoo'}}},
  {ticker:'NVDA',name:'엔비디아',price:188.3,currency:'USD',forwardPE:30.2,trailingPE:38.9,pbr:31.2,roe:92.1,operatingMargin:58.4,dividendYield:0.03,generatedAt:'2026-09-21T03:01:00Z',dataSource:'Yahoo',fieldMeta:{forwardPE:{period:'FY+1 추정',source:'Yahoo'},trailingPE:{period:'TTM',source:'Yahoo'},pbr:{period:'최근 분기',source:'Yahoo'},roe:{period:'TTM',source:'Yahoo'},operatingMargin:{period:'TTM',source:'Yahoo'},dividendYield:{period:'최근 표시값',source:'Yahoo'}}},
  {ticker:'AAPL',name:'애플',price:241.7,currency:'USD',forwardPE:27.8,trailingPE:31.4,pbr:45.2,roe:151.0,operatingMargin:31.2,dividendYield:0.42,generatedAt:'2026-09-21T03:01:00Z',dataSource:'Yahoo',fieldMeta:{forwardPE:{period:'FY+1 추정',source:'Yahoo'},trailingPE:{period:'TTM',source:'Yahoo'},pbr:{period:'최근 분기',source:'Yahoo'},roe:{period:'TTM',source:'Yahoo'},operatingMargin:{period:'TTM',source:'Yahoo'},dividendYield:{period:'최근 표시값',source:'Yahoo'}}},
];

const macroRows = [
  {symbol:'T10Y2Y',original_symbol:'T10Y2Y',name:'10Y-2Y 금리차',value:0.62,delta:0.02,displayChange:2,unit:'%p',changeUnit:'bp',changeBasis:'previous observation',asOf:'2026-09-19',observedAt:'2026-09-19',status:'current',stale:false,source:'FRED',desc:'장단기 금리차'},
  {symbol:'PCEPI',original_symbol:'PCEPI',name:'PCE 물가',value:2.7,delta:0.1,displayChange:10,unit:'% YoY',changeUnit:'bp',changeBasis:'previous monthly observation',asOf:'2026-08-01',observedAt:'2026-08-01',status:'current',stale:false,source:'FRED',desc:'개인소비지출 물가지수'},
  {symbol:'PCETRIM12M159SFRBDAL',original_symbol:'PCETRIM12M159SFRBDAL',name:'절사평균 PCE',value:2.5,delta:-0.05,displayChange:-5,unit:'% YoY',changeUnit:'bp',changeBasis:'previous monthly observation',asOf:'2026-08-01',observedAt:'2026-08-01',status:'current',stale:false,source:'Dallas Fed',desc:'절사평균 PCE'},
  {symbol:'^VIX',original_symbol:'^VIX',name:'VIX',value:16.8,delta:-0.4,displayChange:-0.4,unit:'index point',changeUnit:'pt',changeBasis:'previous observation',asOf:'2026-09-20',observedAt:'2026-09-20',status:'current',stale:false,source:'Yahoo',desc:'시장 변동성 지수'},
];

const newsItems = [
  {symbol:'NVDA',name:'엔비디아',title:'Nvidia announces new AI platform update',url:'https://example.com/nvda',source:'Example News',publishedAt:'2026-09-21T02:20:00Z',publishedTs:1790000000,score:83,relationType:'direct',relationBasis:'제목에 기업명 확인',investmentTags:['ai','product']},
  {symbol:'005930.KS',name:'삼성전자',title:'반도체 업종 HBM 공급망 동향',url:'https://example.com/semis',source:'Example News',publishedAt:'2026-09-21T01:20:00Z',publishedTs:1789990000,score:72,relationType:'related',relationBasis:'관련 업종 키워드 확인: hbm',investmentTags:['semiconductor']},
];

function json(route, body, status=200) {
  return route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
}

async function installMocks(page, mode='ok') {
  await page.route('https://chart-view-pkv8.onrender.com/**', async (route) => {
    const url = new URL(route.request().url());
    if (mode === 'server-error') return json(route,{detail:'temporary'},503);
    if (mode === 'slow') {
      await new Promise(r=>setTimeout(r,900));
      return json(route,{results:[]});
    }
    const path=url.pathname;
    if(path==='/api/market-now') return json(route,{results:marketRows,timestamp:'2026-09-21 12:00:00'});
    if(path==='/api/home-snapshot') return json(route,{generatedAt:'2026-09-21T03:02:00Z',macro:{summary:{level:'yellow',text:'금리·물가·위험 신호가 함께 나타납니다.',latestBasisDate:'2026-09-20',notice:'시장 환경 설명용 요약입니다.'}}});
    if(path==='/api/quotes') return json(route,{results:[
      {ticker:'005930.KS',name:'삼성전자',price:84200,change:1.14,currency:'KRW',asOf:'2026-09-21T03:00:00Z',source:'Yahoo Chart 5m'},
      {ticker:'NVDA',name:'엔비디아',price:188.3,change:0.84,currency:'USD',asOf:'2026-09-21T03:00:00Z',source:'Yahoo Chart 5m'},
      {ticker:'AAPL',name:'애플',price:241.7,change:-0.31,currency:'USD',asOf:'2026-09-21T03:00:00Z',source:'Yahoo Chart 5m'},
    ],dataContract:{currency:'provider currency'}});
    if(path==='/api/compare') return json(route,{stocks:compareStocks,errors:[],fetchedAt:'2026-09-21T03:03:00Z',comparisonBasis:{currencyMode:'local currency per symbol; no FX conversion',missingObservationPolicy:'missing observations are omitted; no interpolation'}});
    if(path==='/api/valuation') return json(route,{stocks:valuationStocks});
    if(path==='/api/macro') return json(route,{generatedAt:'2026-09-21T03:04:00Z',freshCount:4,staleCount:0,summary:{level:'yellow',text:'현재 집계에서는 긍정·부정 신호가 함께 나타납니다.',notice:'시장 환경을 설명하기 위한 요약이며 투자 행동을 권유하지 않습니다.'},results:macroRows});
    if(path==='/api/personalized-news') return json(route,{items:newsItems});
    if(path==='/api/search') return json(route,{results:[{symbol:'MSFT',name:'마이크로소프트',market:'US'}]});
    if(path==='/api/home-insights') return json(route,{screener:{tradeDate:'2026-09-20',stocks:[]}});
    return json(route,{});
  });
}

async function assertNoHorizontalOverflow(page,label) {
  const result=await page.evaluate(()=>({innerWidth:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth}));
  if(result.scrollWidth>result.innerWidth+2||result.bodyWidth>result.innerWidth+2) throw new Error(`${label}: horizontal overflow ${JSON.stringify(result)}`);
}

async function seed(page) {
  await page.addInitScript(() => {
    localStorage.setItem('chartview-toss-watchlist-v1',JSON.stringify([
      {symbol:'005930.KS',name:'삼성전자'},{symbol:'NVDA',name:'엔비디아'},{symbol:'AAPL',name:'애플'}
    ]));
    localStorage.setItem('chartview-toss-selected-v1',JSON.stringify(['005930.KS','NVDA','AAPL']));
  });
}

const browser=await chromium.launch({headless:true});
try{
  for(const width of [320,360,390,430]){
    const context=await browser.newContext({viewport:{width,height:820},deviceScaleFactor:1});
    const page=await context.newPage();
    await seed(page);await installMocks(page);
    for(const tab of ['home','chart']){
      await page.goto(`${BASE}/#${tab}`,{waitUntil:'networkidle'});
      await page.waitForTimeout(120);
      await assertNoHorizontalOverflow(page,`${width}px ${tab}`);
      await page.screenshot({path:`${OUT}/${width}-${tab}.png`,fullPage:true});
    }
    await context.close();
  }

  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const page=await context.newPage();await seed(page);await installMocks(page);
  for(const tab of ['valuation','macro','watch','news','detail/005930.KS','more','info']){
    await page.goto(`${BASE}/#${tab}`,{waitUntil:'networkidle'});
    await page.waitForTimeout(120);
    await assertNoHorizontalOverflow(page,`390px ${tab}`);
    await page.screenshot({path:`${OUT}/390-${tab.replaceAll('/','-')}.png`,fullPage:true});
  }

  await page.goto(`${BASE}/#chart`,{waitUntil:'networkidle'});
  await page.click('#open-compare-selector');
  await page.fill('#selector-search-input','MSFT');
  await page.waitForSelector('[data-selector-symbol="MSFT"]');
  await page.click('[data-selector-symbol="MSFT"]');
  const sheetFooter=await page.locator('.selector-footer').boundingBox();
  if(!sheetFooter||sheetFooter.y+sheetFooter.height>844) throw new Error('selector footer is outside viewport');
  await page.screenshot({path:`${OUT}/390-selector.png`,fullPage:true});

  await page.setViewportSize({width:360,height:560});
  const shortFooter=await page.locator('.selector-footer').boundingBox();
  if(!shortFooter||shortFooter.y+shortFooter.height>560) throw new Error('selector footer is outside reduced viewport');
  await page.screenshot({path:`${OUT}/360-selector-short-viewport.png`});
  await context.close();

  const errorContext=await browser.newContext({viewport:{width:390,height:844}});
  const errorPage=await errorContext.newPage();await seed(errorPage);await installMocks(errorPage,'server-error');
  await errorPage.goto(`${BASE}/#chart`,{waitUntil:'networkidle'});
  await errorPage.waitForSelector('#retry-chart');
  if(!(await errorPage.locator('body').innerText()).includes('데이터 서버 연결이 불안정해요')) throw new Error('5xx friendly error message missing');
  await errorPage.screenshot({path:`${OUT}/390-5xx.png`,fullPage:true});
  await errorContext.close();

  const slowContext=await browser.newContext({viewport:{width:390,height:844}});
  const slowPage=await slowContext.newPage();await seed(slowPage);await installMocks(slowPage,'slow');
  await slowPage.goto(`${BASE}/#chart`);
  await slowPage.waitForSelector('#retry-chart',{timeout:6000});
  if(!(await slowPage.locator('body').innerText()).includes('데이터 연결이 지연되고 있어요')) throw new Error('timeout friendly error message missing');
  await slowContext.close();

  const offlineContext=await browser.newContext({viewport:{width:390,height:844}});
  const offlinePage=await offlineContext.newPage();await seed(offlinePage);await installMocks(offlinePage);
  await offlinePage.goto(`${BASE}/#home`,{waitUntil:'networkidle'});
  await offlineContext.setOffline(true);
  await offlinePage.reload({waitUntil:'domcontentloaded'});
  await offlinePage.waitForSelector('.network-banner');
  if(!(await offlinePage.locator('.network-banner').innerText()).includes('인터넷 연결이 끊어졌어요')) throw new Error('offline banner missing');
  await offlineContext.close();

  console.log('Mobile release QA passed: responsive widths, selector viewport, 5xx, timeout, offline');
} finally {
  await browser.close();
}
