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

const heatmapRows = [
  ['005930.KS','삼성전자',520e12,84200,3.62],
  ['000660.KS','SK하이닉스',210e12,295000,1.25],
  ['207940.KS','삼성바이오로직스',78e12,1120000,-1.29],
  ['005380.KS','현대차',63e12,298000,-0.97],
  ['000270.KS','기아',52e12,131000,-1.94],
  ['373220.KS','LG에너지솔루션',47e12,423000,0.43],
  ['035420.KS','NAVER',39e12,236000,-2.49],
  ['068270.KS','셀트리온',36e12,187000,-0.22],
  ['NVDA','엔비디아',4.5e12,188.3,0.22],
  ['AAPL','애플',3.8e12,241.7,1.53],
  ['MSFT','마이크로소프트',3.7e12,522.4,3.66],
  ['GOOGL','알파벳',3.0e12,212.1,0.46],
  ['AMZN','아마존',2.6e12,228.2,0.12],
  ['TSM','TSMC',1.7e12,312.8,-0.12],
  ['META','메타',1.6e12,738.1,-3.33],
  ['AVGO','브로드컴',1.5e12,354.0,0.71],
  ['TSLA','테슬라',1.4e12,438.0,-1.50],
  ['AMD','AMD',0.45e12,209.0,1.08],
].map(([ticker,name,marketCap,price,change])=>({ticker,name,marketCap,price,change,asOf:'2026-09-21T03:02:00Z'}));

const fullHeatmapRows = [
  ...heatmapRows.map(row=>({...row,market:/\.(KS|KQ)$/.test(row.ticker)?'KR':'US'})),
  ...[
    ['051910.KS','LG화학'],['006400.KS','삼성SDI'],['055550.KS','신한지주'],['105560.KS','KB금융'],
    ['035720.KS','카카오'],['086790.KS','하나금융지주'],['066570.KS','LG전자'],['003550.KS','LG'],
    ['003670.KS','포스코퓨처엠'],['009150.KS','삼성전기'],['018260.KS','삼성SDS'],['028260.KS','삼성물산'],
  ].map(([ticker,name],i)=>({
    ticker,name,market:'KR',
    marketCap:30e12-i*1.1e12,
    price:50000+i*1000,
    change:(i%2?1:-1)*(0.2+i*0.11),
    asOf:'2026-09-21T03:02:00Z',
  })),
  ...Array.from({length:30},(_,i)=>({
    ticker:`US${String(i+1).padStart(2,'0')}`,
    name:`US Extra ${i+1}`,
    market:'US',
    marketCap:1.3e12-i*0.035e12,
    price:100+i,
    change:(i%2?1:-1)*(0.15+i*0.07),
    asOf:'2026-09-21T03:02:00Z',
  })),
];

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

const currentMacroDate = new Date().toISOString().slice(0,10);
const macroRows = [
  {symbol:'T10Y2Y',original_symbol:'T10Y2Y',name:'10Y-2Y 금리차',value:0.62,delta:0.02,displayChange:2,unit:'%p',changeUnit:'bp',changeBasis:'previous observation',asOf:currentMacroDate,observedAt:currentMacroDate,status:'current',stale:false,source:'FRED',desc:'장단기 금리차',chart_data:[{time:'2026-06',value:0.18},{time:'2026-07',value:0.31},{time:'2026-08',value:0.46},{time:'2026-09',value:0.62}]},
  {symbol:'PCEPI',original_symbol:'PCEPI',name:'PCE 물가',value:2.7,delta:0.1,displayChange:10,unit:'% YoY',changeUnit:'bp',changeBasis:'previous monthly observation',asOf:'2026-08-01',observedAt:'2026-08-01',status:'current',stale:false,source:'FRED',desc:'개인소비지출 물가지수',chart_data:[{time:'2026-05',value:2.5},{time:'2026-06',value:2.6},{time:'2026-07',value:2.6},{time:'2026-08',value:2.7}]},
  {symbol:'PCETRIM12M159SFRBDAL',original_symbol:'PCETRIM12M159SFRBDAL',name:'절사평균 PCE',value:2.5,delta:-0.05,displayChange:-5,unit:'% YoY',changeUnit:'bp',changeBasis:'previous monthly observation',asOf:'2026-08-01',observedAt:'2026-08-01',status:'current',stale:false,source:'Dallas Fed',desc:'절사평균 PCE',chart_data:[{time:'2026-05',value:2.7},{time:'2026-06',value:2.65},{time:'2026-07',value:2.55},{time:'2026-08',value:2.5}]},
  {symbol:'^VIX',original_symbol:'^VIX',name:'VIX',value:16.8,delta:-0.4,displayChange:-0.4,unit:'index point',changeUnit:'pt',changeBasis:'previous observation',asOf:'2026-09-20',observedAt:'2026-09-20',status:'current',stale:false,source:'Yahoo',desc:'시장 변동성 지수',chart_data:[{time:'09-17',value:18.2},{time:'09-18',value:17.6},{time:'09-19',value:17.2},{time:'09-20',value:16.8}]},
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
    const path=url.pathname;
    if (mode === 'slow' && path==='/api/compare') {
      await new Promise(r=>setTimeout(r,9_000));
      return json(route,{stocks:[]});
    }
    if(path==='/api/activity') return json(route,{ok:true,heartbeatSec:20});
    if(path==='/api/home-live') return json(route,{updatedAt:'2026-09-21T03:05:00Z',cacheAgeSec:1.2,refreshing:false,results:heatmapRows.map(row=>row.ticker==='005930.KS'?{...row,change:4.44}:row.ticker==='NVDA'?{...row,change:2.22}:row)});
    if(path==='/api/market-now') return json(route,{results:marketRows,timestamp:'2026-09-21 12:00:00'});
    if(path==='/api/home-snapshot') return json(route,{generatedAt:'2026-09-21T03:02:00Z',macro:{summary:{level:'yellow',text:'금리·물가·위험 신호가 함께 나타납니다.',latestBasisDate:'2026-09-20',notice:'시장 환경 설명용 요약입니다.'},results:macroRows},heatmap:{results:heatmapRows}});
    if(path==='/api/home-bootstrap') return json(route,{day:{tradeDate:'2026-09-21',top3:[{symbol:'005930.KS',name:'삼성전자'},{symbol:'000660.KS',name:'SK하이닉스'},{symbol:'NVDA',name:'엔비디아'}]},recommendations:[
      {rank:1,symbol:'005930.KS',name:'삼성전자',recommendedDate:'2026-09-18',recommendedPrice:81000,currentPrice:87480,returnPct:8,bestReturnPct:11.2,score:88,grade:'A',statusLabel:'성과 추적 중',reason:'거래량과 추세 조건이 함께 개선되었습니다.',lastUpdatedTradeDate:'2026-09-20'},
      {rank:2,symbol:'000660.KS',name:'SK하이닉스',recommendedDate:'2026-09-18',recommendedPrice:300000,currentPrice:294000,returnPct:-2,bestReturnPct:3.4,score:81,grade:'B+',statusLabel:'성과 추적 중',reason:'중기 모멘텀 조건을 충족했습니다.',lastUpdatedTradeDate:'2026-09-20'},
      {rank:3,symbol:'NVDA',name:'엔비디아',recommendedDate:'2026-09-17',recommendedPrice:180,currentPrice:190.8,returnPct:6,bestReturnPct:9.1,score:79,grade:'B+',statusLabel:'성과 추적 중',reason:'가격 추세와 거래량이 개선되었습니다.',lastUpdatedTradeDate:'2026-09-20'}
    ]});
    if(path==='/api/heatmap/full') return json(route,{
      generatedAt:'2026-09-21T03:02:00Z',
      results:fullHeatmapRows.map(row=>row.ticker==='NVDA'?{...row,change:99.99}:row.ticker==='005930.KS'?{...row,change:-88.88}:row),
      counts:{KR:20,US:40},
      complete:true,
      refreshing:false,
    });
    if(path==='/api/heatmap') return json(route,{generatedAt:'2026-09-21T03:02:00Z',results:[]});
    if(path==='/api/quotes') return json(route,{results:[
      {ticker:'005930.KS',name:'삼성전자',price:84200,change:1.14,currency:'KRW',asOf:'2026-09-21T03:00:00Z',source:'Yahoo Chart 5m'},
      {ticker:'NVDA',name:'엔비디아',price:188.3,change:0.84,currency:'USD',asOf:'2026-09-21T03:00:00Z',source:'Yahoo Chart 5m'},
      {ticker:'AAPL',name:'애플',price:241.7,change:-0.31,currency:'USD',asOf:'2026-09-21T03:00:00Z',source:'Yahoo Chart 5m'},
      {ticker:'^TNX',name:'미국 10년물',price:4.12,change:0.24,currency:'USD',asOf:'2026-09-21T03:00:00Z',source:'Yahoo Chart 5m'},
      {ticker:'^VIX',name:'VIX',price:16.8,change:-2.33,currency:'USD',asOf:'2026-09-21T03:00:00Z',source:'Yahoo Chart 5m'},
      {ticker:'CL=F',name:'WTI',price:67.42,change:1.18,currency:'USD',asOf:'2026-09-21T03:00:00Z',source:'Yahoo Chart 5m'},
      {ticker:'KRW=X',name:'원/달러',price:1392.4,change:-0.36,currency:'KRW',asOf:'2026-09-21T03:00:00Z',source:'Yahoo Chart 5m'},
    ],dataContract:{currency:'provider currency'}});
    if(path==='/api/compare') return json(route,{stocks:compareStocks,errors:[],fetchedAt:'2026-09-21T03:03:00Z',comparisonBasis:{currencyMode:'local currency per symbol; no FX conversion',missingObservationPolicy:'missing observations are omitted; no interpolation'}});
    if(path==='/api/valuation') return json(route,{stocks:valuationStocks});
    if(path==='/api/macro') return json(route,{generatedAt:'2026-09-21T03:04:00Z',freshCount:4,staleCount:0,summary:{level:'yellow',text:'현재 집계에서는 긍정·부정 신호가 함께 나타납니다.',notice:'시장 환경을 설명하기 위한 요약이며 투자 행동을 권유하지 않습니다.'},results:macroRows});
    if(path==='/api/export-momentum') return json(route,{
      schemaVersion:3,status:'official_api',period:'2026-09',periodLabel:'2026년 9월',basis:'관세청 통관기준 월간 실적',
      updatedAt:'2026-10-02T14:00:00+09:00',itemPeriod:'2026-08',regionPeriod:'2026-08',
      summary:{exportsUsdBillion:65.9,importsUsdBillion:58.2,balanceUsdBillion:7.7,exportYoY:7.2,importYoY:2.3,cumulativeExportsUsdBillion:540.1,cumulativeBalanceUsdBillion:52.4},
      history:Array.from({length:12},(_,i)=>({period:`${i<3?'2025':'2026'}-${String(((i+9)%12)+1).padStart(2,'0')}`,exportsUsdBillion:55+i,exportYoY:(i-4)*1.8})),
      checkpoints:[],
      items:[
        {name:'반도체',exportsUsdBillion:14.2,exportYoY:18.4,exportWeightKg:5200000,exportWeightYoY:5.0,unitValueUsdPerKg:2730.8,unitValueYoY:12.8,note:'HS 8541+8542 합산'},
        {name:'승용차',exportsUsdBillion:5.8,exportYoY:4.1,exportWeightKg:165000000,exportWeightYoY:6.2,unitValueUsdPerKg:35.2,unitValueYoY:-2.0,note:'HS 8703 기준'},
        {name:'석유제품',exportsUsdBillion:4.1,exportYoY:-3.2,exportWeightKg:5100000000,exportWeightYoY:8.1,unitValueUsdPerKg:0.8,unitValueYoY:-10.4,note:'HS 2710 기준'},
        {name:'화장품',exportsUsdBillion:1.0,exportYoY:11.3,exportWeightKg:21000000,exportWeightYoY:2.3,unitValueUsdPerKg:47.6,unitValueYoY:8.8,note:'HS 3304 기준'},
        {name:'선박',exportsUsdBillion:2.9,exportYoY:8.7,exportWeightKg:89000000,exportWeightYoY:-4.0,unitValueUsdPerKg:32.6,unitValueYoY:13.2,note:'HS 89 기준'},
        {name:'철강',exportsUsdBillion:3.6,exportYoY:-1.5,exportWeightKg:4300000000,exportWeightYoY:3.5,unitValueUsdPerKg:0.84,unitValueYoY:-4.8,note:'HS 72 기준'},
      ],
      regions:[
        {name:'미국',exportsUsdBillion:11.2,exportYoY:5.1,note:'관세청 국가코드 US 기준'},
        {name:'중국',exportsUsdBillion:10.4,exportYoY:-2.2,note:'관세청 국가코드 CN 기준'},
        {name:'베트남',exportsUsdBillion:5.3,exportYoY:7.8,note:'관세청 국가코드 VN 기준'},
        {name:'일본',exportsUsdBillion:2.7,exportYoY:1.2,note:'관세청 국가코드 JP 기준'},
        {name:'대만',exportsUsdBillion:2.5,exportYoY:9.4,note:'관세청 국가코드 TW 기준'},
      ],
      sources:[{name:'관세청 수출입총괄',role:'월별 총수출·수입·무역수지',url:'https://www.data.go.kr/data/15102108/openapi.do'}],
      meta:{cacheStatus:'fresh'},
    });
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
      if(tab==='home'){
        await page.waitForSelector('#market-card .quote-card');
        const homePriority=await page.evaluate(()=>({watch:document.querySelector('.watch-section.home-primary')?.getBoundingClientRect().top,market:document.querySelector('.market-section.home-primary')?.getBoundingClientRect().top}));
        if(!(homePriority.watch<homePriority.market&&homePriority.watch<820)) throw new Error(`${width}px Home must surface the watchlist before market cards: ${JSON.stringify(homePriority)}`);
        const initialMarketCards=await page.locator('#market-card .quote-card').count();
        if(initialMarketCards!==4) throw new Error(`${width}px Home market should stay compact before expand: ${initialMarketCards}`);
        const marketButton=page.locator('#market-expand');
        if(await marketButton.isHidden()) throw new Error(`${width}px Home market expand button missing`);
        await marketButton.click();
        await page.waitForSelector('#market-card .market-extra-card:not(.market-card-loading)');
        const expandedMarketCards=await page.locator('#market-card .quote-card').count();
        if(expandedMarketCards!==8) throw new Error(`${width}px Home market expanded card count mismatch: ${expandedMarketCards}`);
        const expandedText=await page.locator('#market-card').innerText();
        for(const label of ['미 10년물','VIX','WTI 유가','원/달러']){
          if(!expandedText.includes(label)) throw new Error(`${width}px Home market extra missing: ${label}`);
        }
        await assertNoHorizontalOverflow(page,`${width}px expanded Home market`);
        await marketButton.click();
        if(await page.locator('#market-card .market-extra-card').count()) throw new Error(`${width}px Home market did not collapse`);

        await page.waitForSelector('#home-top-picks .home-pick-row');
        if(await page.locator('#home-top-picks .home-pick-row').count()!==3) throw new Error(`${width}px spotlight selection missing`);
        if(!(await page.locator('#home-top-picks-section').innerText()).includes('최근 주목받는 종목')) throw new Error(`${width}px spotlight title missing`);
        await page.waitForSelector('#home-daily-heatmap .home-heatmap-cell');
        if(await page.locator('#home-daily-heatmap .home-heatmap-cell').count()!==18) throw new Error(`${width}px home heatmap representative set mismatch`);
        if(await page.locator('#home-daily-heatmap .home-heatmap-logo').count()<3) throw new Error(`${width}px heatmap logos missing`);
        if(await page.locator('#home-daily-heatmap img').count()!==0) throw new Error(`${width}px heatmap must not fetch external image assets`);
        const geometry=await page.locator('#home-daily-heatmap .home-heatmap-treemap').evaluateAll(boards=>boards.map(board=>{
          const cells=[...board.querySelectorAll('.home-heatmap-cell')];
          const box=board.getBoundingClientRect();
          const rects=cells.map(cell=>cell.getBoundingClientRect());
          return {
            count:cells.length,
            topBands:new Set(cells.map(cell=>Math.round(cell.offsetTop))).size,
            bottomGap:Math.abs(box.bottom-Math.max(...rects.map(rect=>rect.bottom))),
            rightGap:Math.abs(box.right-Math.max(...rects.map(rect=>rect.right))),
            transparent:cells.filter(cell=>{
              const color=getComputedStyle(cell).backgroundColor;
              return color==='rgba(0, 0, 0, 0)'||color==='transparent';
            }).length,
          };
        }));
        if(geometry.some(board=>board.count<8||board.topBands<2||board.bottomGap>2||board.rightGap>2||board.transparent>0)) throw new Error(`${width}px heatmap geometry regression: ${JSON.stringify(geometry)}`);
        const clipped=await page.locator('#home-daily-heatmap .home-heatmap-cell').evaluateAll(cells=>cells.filter(cell=>{
          const name=cell.querySelector('.home-heatmap-name strong,.home-heatmap-ticker');
          const change=cell.querySelector('.home-heatmap-change');
          return [name,change].filter(Boolean).some(node=>{
            const style=getComputedStyle(node);
            if(style.display==='none'||style.visibility==='hidden') return false;
            return node.scrollWidth>node.clientWidth+1||node.scrollHeight>node.clientHeight+1;
          });
        }).map(cell=>cell.getAttribute('aria-label')));
        if(clipped.length) throw new Error(`${width}px heatmap text clipped: ${clipped.join(", ")}`);
        if(width<=360){
          const visibleSmallChanges=await page.locator('#home-daily-heatmap .home-heatmap-cell.is-small .home-heatmap-change').evaluateAll(nodes=>nodes.filter(node=>{
            const style=getComputedStyle(node);
            return style.display!=='none'&&style.visibility!=='hidden';
          }).length);
          if(visibleSmallChanges) throw new Error(`${width}px small Home heatmap changes must be hidden; visible=${visibleSmallChanges}`);
        }
        if(width===390){
          await page.waitForFunction(()=>{
            const text=document.querySelector('#home-daily-heatmap')?.innerText||'';
            return text.includes('+4.44%')&&text.includes('+2.22%');
          },{timeout:6_500});
          const liveText=await page.locator('#home-daily-heatmap').innerText();
          if(!liveText.includes('+4.44%')||!liveText.includes('+2.22%')) throw new Error(`Home live shared-cache update missing: ${liveText}`);
        }
      }
      if(tab==='chart'&&width===390){
        await page.locator('#chart-loading').waitFor({state:'detached'});
        const initialCanvasCount=await page.locator('#chart-canvas canvas').count();
        if(!initialCanvasCount) throw new Error('initial comparison chart did not render');
        await page.route(/\/api\/compare\?/,async route=>{
          if(new URL(route.request().url()).searchParams.get('period')==='3mo') await new Promise(resolve=>setTimeout(resolve,650));
          await route.fallback();
        });
        await page.locator('[data-period="3mo"]').click();
        await page.locator('#chart-loading.is-refresh').waitFor();
        if(await page.locator('#chart-canvas canvas').count()!==initialCanvasCount) throw new Error('period refresh blanked the previous comparison chart');
        await page.locator('#chart-loading').waitFor({state:'detached'});
        if(await page.locator('[data-period="3mo"]').getAttribute('aria-pressed')!=='true') throw new Error('period change did not finish');
      }
      const smallTargets=await page.locator(tab==='home'?'.topbar .icon-button, #market-expand':'.topbar .icon-button, .period-tabs button').evaluateAll(nodes=>nodes.filter(node=>{
        const rect=node.getBoundingClientRect();return rect.width<44||rect.height<44;
      }).map(node=>({label:node.getAttribute('aria-label')||node.textContent.trim(),width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height})));
      if(smallTargets.length) throw new Error(`${width}px ${tab} has undersized primary controls: ${JSON.stringify(smallTargets)}`);
      await assertNoHorizontalOverflow(page,`${width}px ${tab}`);
      await page.screenshot({path:`${OUT}/${width}-${tab}.png`,fullPage:true});
    }
    await context.close();
  }

  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const page=await context.newPage();await seed(page);await installMocks(page);
  for(const tab of ['valuation','macro','exports','watch','news','picks','heatmap','detail/005930.KS','more','info']){
    await page.goto(`${BASE}/#${tab}`,{waitUntil:'networkidle'});
    await page.waitForTimeout(120);
    if(tab==='exports'){
      await page.waitForSelector('.export-amount-plot');
      if(await page.locator('.export-amount-column').count()!==12) throw new Error('export amount chart must show 12 official monthly observations');
      if(await page.locator('.export-yoy-column').count()!==12) throw new Error('export YoY chart must show 12 official monthly observations');
      const chartText=await page.locator('.export-section').filter({hasText:'월별 수출액과 증가율'}).innerText();
      if(!chartText.includes('Y축 · 억달러')||!chartText.includes('Y축 · %')) throw new Error(`export chart units must be explicit: ${chartText}`);
      if(await page.locator('.export-driver-card').count()<5) throw new Error('export value-volume-unit-value cards are missing major HS groups');
      const itemText=await page.locator('.export-driver-card').first().innerText();
      for(const label of ['수출액','물량 · 순중량','kg당 신고금액']) if(!itemText.includes(label)) throw new Error(`export decomposition metric missing: ${label}`);
      if(await page.locator('.export-horizontal-row').count()<5) throw new Error('export country chart is missing major destinations');
      if(await page.locator('.export-column-chart').count()) throw new Error('monthly API must not fabricate 10-day/20-day checkpoint bars');
      const periodText=await page.locator('.export-period-split').innerText();
      for(const label of ['총괄 9월','품목 8월','국가 8월']) if(!periodText.includes(label)) throw new Error(`export source-period label missing: ${label}`);
      await assertNoHorizontalOverflow(page,'390px exports');
    }
    if(tab==='macro'){
      await page.waitForSelector('.macro-mini-chart .macro-sparkline');
      const sparkCount=await page.locator('.macro-mini-chart .macro-sparkline').count();
      if(sparkCount!==macroRows.length) throw new Error(`macro mini chart count mismatch: ${sparkCount}`);
      const clippedMacro=await page.locator('.macro-mini-chart').evaluateAll(nodes=>nodes.filter(node=>node.scrollWidth>node.clientWidth+1).length);
      if(clippedMacro) throw new Error(`macro mini chart overflow: ${clippedMacro}`);
      const macroText=await page.locator('#macro-freshness').innerText();
      if(!macroText.includes('확인 필요 3개')||await page.locator('.macro-tile .stale-text').count()!==3) throw new Error(`macro freshness must be derived from each observation date: ${macroText}`);
      if(!await page.locator('.macro-tile').filter({hasText:'VIX'}).getByText('관측일 확인 필요').count()) throw new Error('stale VIX observation date warning missing');
      const macroDates=await page.locator('.macro-mini-dates').first().innerText();
      if(macroDates.includes('2026-06')) throw new Error(`macro mini chart dates should use Korean date formatting: ${macroDates}`);
    }
    if(tab==='detail/005930.KS'){
      if(await page.locator('#detail-watch-quick').count()) throw new Error('detail has a duplicate interest action');
      const jumpControls=await page.locator('.detail-jump-nav button').evaluateAll(nodes=>nodes.map(node=>({label:node.textContent.trim(),height:node.getBoundingClientRect().height})));
      const coreJumpLabels=['가격','공시 실적','뉴스','공시 비교'];
      if(coreJumpLabels.some(label=>!jumpControls.some(control=>control.label===label))||jumpControls.some(control=>control.height<44)) {
        throw new Error(`detail jump controls are missing or too small: ${JSON.stringify(jumpControls)}`);
      }
      await page.waitForSelector('#detail-price strong');
      const detailPrice=await page.locator('#detail-price').innerText();
      if((detailPrice.match(/원/g)||[]).length!==1||!detailPrice.includes('84,200원')) throw new Error(`KRW detail price should show its unit exactly once: ${detailPrice}`);
      const priceStyle=await page.locator('.quote-main>div:first-child strong').evaluate(node=>getComputedStyle(node).whiteSpace);
      if(priceStyle!=='nowrap') throw new Error(`detail price should not wrap on mobile: ${priceStyle}`);
      const periodText=await page.locator('#detail-metrics').innerText();
      if(periodText.includes('FY+1 추정')||!periodText.includes('다음 회계연도 예상')) throw new Error(`valuation period label not translated: ${periodText}`);
      await page.locator('#detail-chart-loading').waitFor({state:'detached'});
      const beforePrice=await page.locator('#detail-price').innerText();
      await page.route(/\/api\/compare\?/,async route=>{
        if(new URL(route.request().url()).searchParams.get('period')==='6mo') await new Promise(resolve=>setTimeout(resolve,650));
        await route.fallback();
      });
      await page.locator('[data-detail-period="6mo"]').click();
      await page.locator('#detail-chart-loading.is-refresh').waitFor();
      if(await page.locator('#detail-price').innerText()!==beforePrice) throw new Error('period refresh unnecessarily reset the detail price');
      await page.locator('#detail-chart-loading').waitFor({state:'detached'});
      const beforeJump=await page.evaluate(()=>window.scrollY);
      await page.locator('[data-detail-jump="detail-news-section"]').click();
      await page.waitForFunction(previous=>window.scrollY>previous+200&&document.querySelector('#detail-news-section')?.getBoundingClientRect().top<window.innerHeight-140,beforeJump);
    }
    if(tab==='news'){
      const relationText=await page.locator('.news-context').first().innerText();
      if(relationText.includes('title entity match')) throw new Error(`news relation basis leaked English metadata: ${relationText}`);
    }
    if(tab==='more'){
      if(!(await page.locator('[data-tab="picks"]').innerText()).includes('최근 주목받는 종목')) throw new Error('Spotlight entry missing from menu');
      const groups=await page.locator('.menu-group>h3').allInnerTexts();
      if(!groups.includes('종목 찾기')||!groups.includes('종목 비교하기')||!groups.includes('근거와 시장 환경 확인')) throw new Error(`task-based menu groups missing: ${groups}`);
    }
    if(tab==='picks'){
      await page.waitForSelector('.pick-ledger-item');
      const body=await page.locator('body').innerText();
      if(!body.includes('최근 주목받는 종목')||!body.includes('추천 81,000원')||!body.includes('점검가 87,480원')||!body.includes('+8.00%')) throw new Error('Restored spotlight history missing');
      await page.locator('.pick-ledger-row').first().click();
      if(await page.locator('.pick-ledger-detail').first().isHidden()) throw new Error('Spotlight detail did not expand');
    }
    if(tab==='heatmap'){
      await page.waitForSelector('#analysis-body .home-heatmap-cell');
      if(await page.locator('#analysis-body .home-heatmap-cell').count()!==60) throw new Error('full heatmap must show expanded 60-stock set');
      const fullText=await page.locator('#analysis-body').innerText();
      if(!fullText.includes('한국 주요 20종목')||!fullText.includes('미국 시총 상위 40종목')) throw new Error('full heatmap market counts missing');
      if(fullText.includes('+99.99%')||fullText.includes('-88.88%')) throw new Error('full heatmap leaked stale server values instead of Home parity values');
      if(!fullText.includes('엔비디아')||!fullText.includes('+0.22%')||!fullText.includes('삼성전자')||!fullText.includes('+3.62%')) throw new Error('full heatmap did not align overlapping symbols to Home snapshot');
      const fullGeometry=await page.locator('#analysis-body .home-heatmap-treemap').evaluateAll(boards=>boards.map(board=>{
        const cells=[...board.querySelectorAll('.home-heatmap-cell')];
        const box=board.getBoundingClientRect();
        const rects=cells.map(cell=>cell.getBoundingClientRect());
        return {
          topBands:new Set(cells.map(cell=>Math.round(cell.offsetTop))).size,
          bottomGap:Math.abs(box.bottom-Math.max(...rects.map(rect=>rect.bottom))),
          rightGap:Math.abs(box.right-Math.max(...rects.map(rect=>rect.right))),
        };
      }));
      if(fullGeometry.some(board=>board.topBands<2||board.bottomGap>2||board.rightGap>2)) throw new Error(`full heatmap geometry regression: ${JSON.stringify(fullGeometry)}`);
      const denseLabels=await page.locator('#analysis-body .home-heatmap-cell').evaluateAll(cells=>{
        const tiny=cells.filter(cell=>cell.clientWidth<52||cell.clientHeight<34);
        const oversized=tiny.filter(cell=>{
          const label=cell.querySelector('.home-heatmap-ticker,.home-heatmap-name strong');
          return label&&parseFloat(getComputedStyle(label).fontSize)>8;
        }).map(cell=>({label:cell.getAttribute('aria-label'),width:cell.clientWidth,height:cell.clientHeight,font:parseFloat(getComputedStyle(cell.querySelector('.home-heatmap-ticker,.home-heatmap-name strong')).fontSize)}));
        return {
          tiny:tiny.length,
          reduced:tiny.filter(cell=>cell.classList.contains('is-micro')||cell.classList.contains('is-label-hidden')||cell.classList.contains('is-ticker-only')).length,
          oversized,
        };
      });
      if(denseLabels.tiny&&!denseLabels.reduced) throw new Error(`full heatmap tiny labels were not reduced: ${JSON.stringify(denseLabels)}`);
      if(denseLabels.oversized.length) throw new Error(`full heatmap tiny labels oversized: ${JSON.stringify(denseLabels.oversized)}`);
      const krVisible=await page.locator('#analysis-body .market-kr').innerText();
      if(/\b\d{6}\b/.test(krVisible)) throw new Error(`Korean heatmap must show company names instead of numeric ticker labels: ${krVisible}`);
      const usReturns=await page.locator('#analysis-body .market-us .home-heatmap-change').count();
      if(usReturns<24) throw new Error(`US heatmap should keep return percentages visible on most readable cells; found ${usReturns}`);
    }
    await assertNoHorizontalOverflow(page,`390px ${tab}`);
    await page.screenshot({path:`${OUT}/390-${tab.replaceAll('/','-')}.png`,fullPage:true});
  }

  const ideaPage=await context.newPage();
  await seed(ideaPage);await installMocks(ideaPage);
  await ideaPage.route(/\/static\/data\/screener\.json/,route=>json(route,{tradeDate:'2026-09-21',stocks:[
    {symbol:'005930.KS',name:'삼성전자',market:'KOSPI',price:84200,change1d:3.62,volumeRatio:3.2,rsi14:61,ret20:14,avgValue20:2_000_000_000,ma20:80000,ma60:75000,macd:3,macdSignal:2,distance52HighPct:-1,industry:'반도체 제조',mainProducts:'메모리 반도체'},
    {symbol:'000660.KS',name:'SK하이닉스',market:'KOSPI',price:295000,change1d:1.25,volumeRatio:2.4,rsi14:64,ret20:9,avgValue20:2_000_000_000,ma20:280000,ma60:250000,macd:2,macdSignal:1,distance52HighPct:-2,industry:'반도체 제조',mainProducts:'메모리 반도체'},
  ]}));
  await ideaPage.route(/\/static\/data\/company_context\.json/,route=>json(route,{companies:[]}));
  await ideaPage.goto(`${BASE}/#ideas`,{waitUntil:'networkidle'});
  await ideaPage.locator('.idea-card .idea-candidate').first().waitFor();
  if(await ideaPage.locator('#idea-body').getAttribute('aria-busy')!=='false') throw new Error('idea results did not leave the loading state');
  if(await ideaPage.locator('.idea-guide').evaluate(node=>node.open)) throw new Error('idea methodology should start collapsed');
  const firstIdea=await ideaPage.locator('.idea-card .idea-candidate').first().boundingBox();
  if(!firstIdea||firstIdea.y>=844) throw new Error(`the first idea candidate is below the first viewport: ${JSON.stringify(firstIdea)}`);
  await assertNoHorizontalOverflow(ideaPage,'390px ideas');
  await ideaPage.screenshot({path:`${OUT}/390-ideas.png`,fullPage:true});
  await ideaPage.close();

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
  await page.goto(`${BASE}/#picks`,{waitUntil:'networkidle'});
  await page.waitForSelector('.pick-ledger-item');
  if(!(await page.locator('h2').first().innerText()).includes('최근 주목받는 종목')) throw new Error('PICK hash entry did not restore spotlight');
  await page.goto(`${BASE}/picks`,{waitUntil:'networkidle'});
  await page.waitForSelector('.pick-ledger-item');
  if(!(await page.locator('h2').first().innerText()).includes('최근 주목받는 종목')) throw new Error('PICK path entry did not restore spotlight');
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
  await slowPage.waitForSelector('#retry-chart',{timeout:10_000});
  if(!(await slowPage.locator('body').innerText()).includes('데이터 연결이 지연되고 있어요')) throw new Error('timeout friendly error message missing');
  await slowContext.close();

  const offlineContext=await browser.newContext({viewport:{width:390,height:844}});
  const offlinePage=await offlineContext.newPage();await seed(offlinePage);await installMocks(offlinePage);
  await offlinePage.goto(`${BASE}/#home`,{waitUntil:'networkidle'});
  await offlineContext.setOffline(true);
  await offlinePage.waitForSelector('.network-banner',{timeout:3000});
  if(!(await offlinePage.locator('.network-banner').innerText()).includes('인터넷 연결이 끊어졌어요')) throw new Error('offline banner missing');
  await offlineContext.close();

  console.log('Mobile release QA passed: responsive widths, selector viewport, 5xx, timeout, offline');
} finally {
  await browser.close();
}
