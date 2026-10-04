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
    if(path==='/static/data/pick_monitor.json') return json(route,{
      generatedAt:'2026-10-02T09:00:00+09:00',
      picks:[{
        pickId:'2026-09-18:005930',symbol:'005930.KS',code:'005930',name:'삼성전자',pickDate:'2026-09-18',status:'KEEP',
        monitor:{lastReviewedTradeDate:'2026-10-02',reason:'펀더멘털 근거는 유지되지만 단기 가격 과열을 함께 확인하세요.'},
        technical:{tradeDate:'2026-10-02',signal:'TECH_SELL_REVIEW',signalLabel:'단기 매도 검토',rsi14:81.7,ret20:39.9,reasons:['RSI 81.7 과열권','20일 수익률 +39.9% 급등']},
      }],
    });
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
      schemaVersion:6,status:'official_api',period:'2026-09',periodLabel:'2026년 9월',basis:'관세청 통관기준 월간 실적',
      updatedAt:'2026-10-02T14:00:00+09:00',itemPeriod:'2026-08',regionPeriod:'2026-08',
      summary:{exportsUsdBillion:65.9,importsUsdBillion:58.2,balanceUsdBillion:7.7,exportYoY:7.2,importYoY:2.3,cumulativeExportsUsdBillion:540.1,cumulativeBalanceUsdBillion:52.4},
      history:Array.from({length:12},(_,i)=>({period:`${i<3?'2025':'2026'}-${String(((i+9)%12)+1).padStart(2,'0')}`,exportsUsdBillion:55+i,exportYoY:(i-4)*1.8})),
      checkpoints:[],
      items:[
        {key:'semiconductor',name:'반도체',exportsUsdBillion:14.2,exportYoY:18.4,exportWeightKg:5200000,exportWeightYoY:5.0,unitValueUsdPerKg:2730.8,unitValueYoY:12.8,importsUsdBillion:8.2,importYoY:9.1,importWeightKg:1900000,tradeBalanceUsdBillion:6.0,note:'HS 8541+8542 합산'},
        {key:'passenger-car',name:'승용차',exportsUsdBillion:5.8,exportYoY:4.1,exportWeightKg:165000000,exportWeightYoY:6.2,unitValueUsdPerKg:35.2,unitValueYoY:-2.0,importsUsdBillion:1.1,importYoY:2.0,importWeightKg:31000000,tradeBalanceUsdBillion:4.7,note:'HS 8703 기준'},
        {key:'petroleum',name:'석유제품',exportsUsdBillion:4.1,exportYoY:-3.2,exportWeightKg:5100000000,exportWeightYoY:8.1,unitValueUsdPerKg:0.8,unitValueYoY:-10.4,importsUsdBillion:0.9,importYoY:-4.5,importWeightKg:900000000,tradeBalanceUsdBillion:3.2,note:'HS 2710 기준'},
        {key:'cosmetics',name:'화장품',exportsUsdBillion:1.0,exportYoY:11.3,exportWeightKg:21000000,exportWeightYoY:2.3,unitValueUsdPerKg:47.6,unitValueYoY:8.8,importsUsdBillion:0.22,importYoY:6.2,importWeightKg:6500000,tradeBalanceUsdBillion:0.78,note:'HS 3304 기준'},
        {key:'ships',name:'선박',exportsUsdBillion:2.9,exportYoY:8.7,exportWeightKg:89000000,exportWeightYoY:-4.0,unitValueUsdPerKg:32.6,unitValueYoY:13.2,importsUsdBillion:0.4,importYoY:3.1,importWeightKg:12000000,tradeBalanceUsdBillion:2.5,note:'HS 89 기준'},
        {key:'steel',name:'철강',exportsUsdBillion:3.6,exportYoY:-1.5,exportWeightKg:4300000000,exportWeightYoY:3.5,unitValueUsdPerKg:0.84,unitValueYoY:-4.8,importsUsdBillion:2.8,importYoY:4.0,importWeightKg:3500000000,tradeBalanceUsdBillion:0.8,note:'HS 72 기준'},
      ],
      semiconductorBreakdown:[
        {key:'memory-total',name:'메모리 IC',code:'854232',group:'memory',note:'HS 854232 메모리 전체',period:'2026-08',exportsUsdBillion:20.5,exportYoY:120.0,exportMoM:12.0,exportWeightKg:3800000,exportWeightYoY:9.0,exportWeightMoM:3.0,unitValueUsdPerKg:5394.7,unitValueYoY:101.0,unitValueMoM:8.7},
        {key:'dram',name:'DRAM',code:'8542321010',group:'memory',note:'HSK 8542321010 · HBM은 별도 HSK 코드가 없어 독립 집계 불가',period:'2026-08',exportsUsdBillion:11.4,exportYoY:180.0,exportMoM:6.5,exportWeightKg:1700000,exportWeightYoY:30.0,exportWeightMoM:8.0,unitValueUsdPerKg:6705.9,unitValueYoY:115.0,unitValueMoM:-1.4},
        {key:'flash',name:'Flash memory',code:'8542321030',group:'memory',note:'HSK 8542321030 · NAND/NOR 등을 포함하는 Flash memory 분류',period:'2026-08',exportsUsdBillion:3.8,exportYoY:80.0,exportMoM:15.2,exportWeightKg:800000,exportWeightYoY:12.0,exportWeightMoM:6.0,unitValueUsdPerKg:4750,unitValueYoY:60.7,unitValueMoM:8.7},
        {key:'sram',name:'SRAM',code:'8542321020',group:'memory',note:'HSK 8542321020',period:'2026-08',exportsUsdBillion:.3,exportYoY:5.0,exportMoM:1.0,exportWeightKg:70000,exportWeightYoY:2.0,exportWeightMoM:1.0,unitValueUsdPerKg:4285.7,unitValueYoY:3.0,unitValueMoM:0.1},
        {key:'mcp-memory',name:'MCP',code:'8542323000',group:'memory',note:'HSK 8542323000 · 복합구조칩 메모리(Multichip integrated circuits)',period:'2026-08',exportsUsdBillion:7.1,exportYoY:90.0,exportMoM:22.8,exportWeightKg:650000,exportWeightYoY:20.0,exportWeightMoM:10.0,unitValueUsdPerKg:10923.1,unitValueYoY:58.3,unitValueMoM:11.6},
        {key:'dram-module',name:'DRAM 모듈',code:'8473304060',group:'module',note:'HSK 8473304060 · DRAM modules',period:'2026-08',exportsUsdBillion:4.0,exportYoY:140.0,exportMoM:35.0,exportWeightKg:500000,exportWeightYoY:15.0,exportWeightMoM:5.0,unitValueUsdPerKg:8000,unitValueYoY:108.7,unitValueMoM:28.6},
        {key:'processor-controller',name:'프로세서·컨트롤러',code:'854231',group:'logic',note:'HS 854231',period:'2026-08',exportsUsdBillion:2.4,exportYoY:11.0,exportMoM:2.0,exportWeightKg:500000,exportWeightYoY:3.2,exportWeightMoM:1.0,unitValueUsdPerKg:4800,unitValueYoY:7.5,unitValueMoM:1.0},
        {key:'other-ic',name:'기타 IC',code:'854239',group:'logic',note:'HS 854239',period:'2026-08',exportsUsdBillion:1.2,exportYoY:5.5,exportMoM:-1.0,exportWeightKg:240000,exportWeightYoY:1.1,exportWeightMoM:0.5,unitValueUsdPerKg:5000,unitValueYoY:4.3,unitValueMoM:-1.5},
      ],
      breadth:{
        period:'2026-08',level:'HS2',comparableCount:80,risingCount:52,fallingCount:26,flatCount:2,
        risingBreadthPct:65.0,risingExportSharePct:72.4,netChangeUsdBillion:6.2,
        topPositive:[
          {code:'85',name:'전기기기·전자부품',exportsUsdBillion:20,priorExportsUsdBillion:15,deltaUsdBillion:5,exportYoY:33.3,sharePct:30.0},
          {code:'89',name:'선박·보트',exportsUsdBillion:4,priorExportsUsdBillion:2.8,deltaUsdBillion:1.2,exportYoY:42.9,sharePct:6.0},
        ],
        topNegative:[
          {code:'87',name:'자동차·차량',exportsUsdBillion:5,priorExportsUsdBillion:6,deltaUsdBillion:-1,exportYoY:-16.7,sharePct:7.5},
          {code:'72',name:'철강',exportsUsdBillion:3,priorExportsUsdBillion:3.4,deltaUsdBillion:-0.4,exportYoY:-11.8,sharePct:4.5},
        ],
      },
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
    if(path==='/api/export-momentum/semiconductor-countries') return json(route,{
      schemaVersion:1,period:'2026-08',
      markets:[
        {name:'중국',code:'CN'},{name:'홍콩',code:'HK'},{name:'베트남',code:'VN'},
        {name:'대만',code:'TW'},{name:'미국',code:'US'},{name:'일본',code:'JP'},
      ],
      segments:[
        {
          key:'dram',name:'DRAM',code:'8542321010',period:'2026-08',exportsUsdBillion:15.7,coveredSharePct:72.0,
          leaderCountry:'중국',growthLeaderCountry:'홍콩',declineLeaderCountry:'대만',
          countries:[
            {name:'중국',code:'CN',exportsUsdBillion:5.2,priorExportsUsdBillion:3.8,exportYoY:36.8,deltaUsdBillion:1.4,sharePct:33.1},
            {name:'홍콩',code:'HK',exportsUsdBillion:3.8,priorExportsUsdBillion:2.0,exportYoY:90.0,deltaUsdBillion:1.8,sharePct:24.2},
            {name:'베트남',code:'VN',exportsUsdBillion:1.0,priorExportsUsdBillion:.7,exportYoY:42.9,deltaUsdBillion:.3,sharePct:6.4},
            {name:'대만',code:'TW',exportsUsdBillion:.5,priorExportsUsdBillion:.8,exportYoY:-37.5,deltaUsdBillion:-.3,sharePct:3.2},
            {name:'미국',code:'US',exportsUsdBillion:.45,priorExportsUsdBillion:.35,exportYoY:28.6,deltaUsdBillion:.1,sharePct:2.9},
            {name:'일본',code:'JP',exportsUsdBillion:.35,priorExportsUsdBillion:.32,exportYoY:9.4,deltaUsdBillion:.03,sharePct:2.2},
          ],
        },
        {
          key:'flash',name:'Flash memory',code:'8542321030',period:'2026-08',exportsUsdBillion:2.86,coveredSharePct:68.5,
          leaderCountry:'중국',growthLeaderCountry:'베트남',declineLeaderCountry:'대만',
          countries:[
            {name:'중국',code:'CN',exportsUsdBillion:.8,priorExportsUsdBillion:.6,exportYoY:33.3,deltaUsdBillion:.2,sharePct:28.0},
            {name:'홍콩',code:'HK',exportsUsdBillion:.45,priorExportsUsdBillion:.3,exportYoY:50.0,deltaUsdBillion:.15,sharePct:15.7},
            {name:'베트남',code:'VN',exportsUsdBillion:.36,priorExportsUsdBillion:.12,exportYoY:200.0,deltaUsdBillion:.24,sharePct:12.6},
            {name:'대만',code:'TW',exportsUsdBillion:.15,priorExportsUsdBillion:.2,exportYoY:-25.0,deltaUsdBillion:-.05,sharePct:5.2},
            {name:'미국',code:'US',exportsUsdBillion:.11,priorExportsUsdBillion:.09,exportYoY:22.2,deltaUsdBillion:.02,sharePct:3.8},
            {name:'일본',code:'JP',exportsUsdBillion:.09,priorExportsUsdBillion:.08,exportYoY:12.5,deltaUsdBillion:.01,sharePct:3.1},
          ],
        },
        {
          key:'mcp-memory',name:'MCP',code:'8542323000',period:'2026-08',exportsUsdBillion:12.22,coveredSharePct:76.1,
          leaderCountry:'중국',growthLeaderCountry:'중국',declineLeaderCountry:'',
          countries:[
            {name:'중국',code:'CN',exportsUsdBillion:4.4,priorExportsUsdBillion:2.7,exportYoY:63.0,deltaUsdBillion:1.7,sharePct:36.0},
            {name:'홍콩',code:'HK',exportsUsdBillion:2.0,priorExportsUsdBillion:1.4,exportYoY:42.9,deltaUsdBillion:.6,sharePct:16.4},
            {name:'베트남',code:'VN',exportsUsdBillion:1.1,priorExportsUsdBillion:.8,exportYoY:37.5,deltaUsdBillion:.3,sharePct:9.0},
            {name:'대만',code:'TW',exportsUsdBillion:.8,priorExportsUsdBillion:.6,exportYoY:33.3,deltaUsdBillion:.2,sharePct:6.5},
            {name:'미국',code:'US',exportsUsdBillion:.6,priorExportsUsdBillion:.5,exportYoY:20.0,deltaUsdBillion:.1,sharePct:4.9},
            {name:'일본',code:'JP',exportsUsdBillion:.4,priorExportsUsdBillion:.3,exportYoY:33.3,deltaUsdBillion:.1,sharePct:3.3},
          ],
        },
        {
          key:'dram-module',name:'DRAM 모듈',code:'8473304060',period:'2026-08',exportsUsdBillion:7.84,coveredSharePct:61.0,
          leaderCountry:'미국',growthLeaderCountry:'미국',declineLeaderCountry:'일본',
          countries:[
            {name:'중국',code:'CN',exportsUsdBillion:1.0,priorExportsUsdBillion:.8,exportYoY:25.0,deltaUsdBillion:.2,sharePct:12.8},
            {name:'홍콩',code:'HK',exportsUsdBillion:.7,priorExportsUsdBillion:.5,exportYoY:40.0,deltaUsdBillion:.2,sharePct:8.9},
            {name:'베트남',code:'VN',exportsUsdBillion:.6,priorExportsUsdBillion:.4,exportYoY:50.0,deltaUsdBillion:.2,sharePct:7.7},
            {name:'대만',code:'TW',exportsUsdBillion:.4,priorExportsUsdBillion:.3,exportYoY:33.3,deltaUsdBillion:.1,sharePct:5.1},
            {name:'미국',code:'US',exportsUsdBillion:1.7,priorExportsUsdBillion:.8,exportYoY:112.5,deltaUsdBillion:.9,sharePct:21.7},
            {name:'일본',code:'JP',exportsUsdBillion:.38,priorExportsUsdBillion:.42,exportYoY:-9.5,deltaUsdBillion:-.04,sharePct:4.8},
          ],
        },
      ],
      meta:{scope:'CN, HK, VN, TW, US, JP configured semiconductor markets; not a global ranking',cacheStatus:'fresh'},
    });
    if(path==='/api/export-momentum/provisional') return json(route,{
      schemaVersion:2,status:'official_preliminary_api',period:'2026-09',periodLabel:'2026년 9월',latestStage:30,latestStageLabel:'월 전체',
      checkpoints:[
        {stage:10,label:'1~10일',periodRaw:'01~10',
          total:{exportsUsdBillion:34.9,exportYoY:18.2,exportMoM:12.3,deltaYoYUsdBillion:5.4},
          semiconductor:{exportsUsdBillion:16.48,exportYoY:270.1,exportMoM:65.6,deltaYoYUsdBillion:12.03},
          semiconductorSharePct:47.1,semiconductorContributionPct:222.8,semiconductorYoYAccelerationPp:null,totalYoYAccelerationPp:null},
        {stage:20,label:'1~20일',periodRaw:'01~20',
          total:{exportsUsdBillion:71.4,exportYoY:21.5,exportMoM:14.2,deltaYoYUsdBillion:12.6},
          semiconductor:{exportsUsdBillion:34.13,exportYoY:210.0,exportMoM:31.1,deltaYoYUsdBillion:23.12},
          semiconductorSharePct:47.8,semiconductorContributionPct:183.5,semiconductorYoYAccelerationPp:-60.1,totalYoYAccelerationPp:3.3},
        {stage:30,label:'월 전체',periodRaw:'01~30',
          total:{exportsUsdBillion:120.94,exportYoY:83.5,exportMoM:40.0,deltaYoYUsdBillion:55.0},
          semiconductor:{exportsUsdBillion:60.5,exportYoY:200.0,exportMoM:29.2,deltaYoYUsdBillion:40.3},
          semiconductorSharePct:50.0,semiconductorContributionPct:73.3,semiconductorYoYAccelerationPp:-10.0,totalYoYAccelerationPp:62.0},
      ],
      items:[
        {key:'semiconductor',name:'반도체',exportsUsdBillion:60.5,exportYoY:200,exportMoM:29.2,deltaYoYUsdBillion:40.3},
        {key:'passenger-car',name:'승용차',exportsUsdBillion:6.1,exportYoY:-5,exportMoM:4.0,deltaYoYUsdBillion:-.3},
        {key:'petroleum',name:'석유제품',exportsUsdBillion:5.2,exportYoY:15,exportMoM:8,deltaYoYUsdBillion:.7},
        {key:'steel',name:'철강제품',exportsUsdBillion:4.4,exportYoY:3,exportMoM:1,deltaYoYUsdBillion:.1},
        {key:'wireless',name:'무선통신기기',exportsUsdBillion:3.8,exportYoY:12,exportMoM:5,deltaYoYUsdBillion:.4},
        {key:'ships',name:'선박',exportsUsdBillion:3.2,exportYoY:30,exportMoM:18,deltaYoYUsdBillion:.8},
        {key:'auto-parts',name:'자동차부품',exportsUsdBillion:2.7,exportYoY:7,exportMoM:2,deltaYoYUsdBillion:.2},
        {key:'computer-peripherals',name:'컴퓨터주변기기',exportsUsdBillion:2.4,exportYoY:25,exportMoM:15,deltaYoYUsdBillion:.5},
        {key:'precision',name:'정밀기기',exportsUsdBillion:1.9,exportYoY:8,exportMoM:3,deltaYoYUsdBillion:.1},
        {key:'appliances',name:'가전제품',exportsUsdBillion:1.2,exportYoY:4,exportMoM:-1,deltaYoYUsdBillion:.05},
      ],
      landingProjection:{
        status:'final-review',stage:20,stageLabel:'1~20일',message:'월말 잠정치가 발표되어 당시 체크포인트 추정과 실제 마감값을 비교합니다.',
        total:{
          currentUsdBillion:71.4,estimateUsdBillion:112.8,rangeLowUsdBillion:104.2,rangeHighUsdBillion:123.7,
          medianCompletionPct:63.3,completionQ25Pct:57.7,completionQ75Pct:68.5,
          projectedYoY:71.0,rangeYoYLow:58.0,rangeYoYHigh:87.5,historySampleCount:60,
          actualUsdBillion:120.94,actualErrorPct:-6.7,
          backtest:{sampleCount:24,medianAbsErrorPct:6.1,rangeHitPct:70.8},
        },
        semiconductor:{
          currentUsdBillion:34.13,estimateUsdBillion:55.8,rangeLowUsdBillion:50.2,rangeHighUsdBillion:62.7,
          medianCompletionPct:61.2,completionQ25Pct:54.4,completionQ75Pct:68.0,
          projectedYoY:235.0,rangeYoYLow:201.0,rangeYoYHigh:277.0,historySampleCount:60,
          actualUsdBillion:60.5,actualErrorPct:-7.8,
          backtest:{sampleCount:24,medianAbsErrorPct:7.3,rangeHitPct:75.0},
        },
        model:{historyWindowMonths:60,range:'completion ratio 25th–75th percentile',backtestWindowMonths:24,minimumHistorySamples:12},
      },
      meta:{classification:'Korea Customs 10 major export product categories; not HS monthly classification',cacheStatus:'fresh'},
      source:{name:'관세청 수출 주요품목별 10일 단위 잠정치 통계',url:'https://www.data.go.kr/data/15157908/openapi.do'},
    });
    if(path==='/api/export-momentum/item-detail') return json(route,{
      schemaVersion:2,key:url.searchParams.get('key')||'semiconductor',name:'반도체',note:'HS 8541+8542 합산',period:'2026-08',
      history:Array.from({length:12},(_,i)=>({
        period:`2025-${String(i+9).padStart(2,'0')}`.replace('13','01').replace('14','02').replace('15','03').replace('16','04').replace('17','05').replace('18','06').replace('19','07').replace('20','08'),
        exportsUsdBillion:9+i*0.45,exportYoY:5+i,
        exportWeightKg:4000000+i*90000,exportWeightYoY:-2+i*0.8,
        unitValueUsdPerKg:2200+i*45,unitValueYoY:6+i*0.5,
        importsUsdBillion:5+i*0.2,importYoY:2+i*0.4,importWeightKg:1500000+i*25000,
        tradeBalanceUsdBillion:4+i*0.25,
      })),
      momentum:{
        exports:{avg3mYoY:18,previous3mYoY:11,accelerationPp:7,label:'증가세 강화'},
        volume:{avg3mYoY:5,previous3mYoY:2,accelerationPp:3,label:'증가세 강화'},
        unitValue:{avg3mYoY:12,previous3mYoY:9,accelerationPp:3,label:'증가세 강화'},
        latestPhase:'물량↑·단위가치↑',
        phaseHistory:Array.from({length:12},(_,i)=>({
          period:`2026-${String(i+1).padStart(2,'0')}`,
          phase:i%3===0?'물량↓·단위가치↑':'물량↑·단위가치↑',
          volumeYoY:i%3===0?-2:5,
          unitValueYoY:10,
        })),
      },
      semiconductorBreakdown:[
        {key:'memory-total',name:'메모리 IC',code:'854232',group:'memory',note:'HS 854232 메모리 전체',period:'2026-08',exportsUsdBillion:9.8,exportYoY:24.1,exportMoM:12.0,exportWeightKg:3300000,exportWeightYoY:5.2,exportWeightMoM:3.0,unitValueUsdPerKg:2969.7,unitValueYoY:18.0,unitValueMoM:8.0,history:Array.from({length:12},(_,i)=>({period:`2026-${String(i+1).padStart(2,'0')}`,exportsUsdBillion:7+i*.25,exportYoY:10+i,exportWeightKg:3000000+i*25000,exportWeightYoY:2+i*.3,unitValueUsdPerKg:2300+i*55,unitValueYoY:8+i*.4}))},
        {key:'dram',name:'DRAM',code:'8542321010',group:'memory',note:'HSK 8542321010 · HBM은 별도 HSK 코드가 없어 독립 집계 불가',period:'2026-08',exportsUsdBillion:6.1,exportYoY:31.0,exportMoM:6.6,exportWeightKg:1900000,exportWeightYoY:4.0,exportWeightMoM:8.0,unitValueUsdPerKg:3210.5,unitValueYoY:26.0,unitValueMoM:-4.0,history:Array.from({length:12},(_,i)=>({period:`2026-${String(i+1).padStart(2,'0')}`,exportsUsdBillion:4+i*.2,exportYoY:12+i}))},
        {key:'flash',name:'Flash memory',code:'8542321030',group:'memory',note:'HSK 8542321030 · NAND/NOR 등을 포함하는 Flash memory 분류',period:'2026-08',exportsUsdBillion:2.7,exportYoY:13.2,exportMoM:15.2,exportWeightKg:1200000,exportWeightYoY:3.0,exportWeightMoM:6.0,unitValueUsdPerKg:2250,unitValueYoY:9.9,unitValueMoM:8.7,history:Array.from({length:12},(_,i)=>({period:`2026-${String(i+1).padStart(2,'0')}`,exportsUsdBillion:2+i*.08,exportYoY:5+i*.5}))},
        {key:'sram',name:'SRAM',code:'8542321020',group:'memory',note:'HSK 8542321020',period:'2026-08',exportsUsdBillion:.2,exportYoY:2.0,exportMoM:1.0,exportWeightKg:80000,exportWeightYoY:1.0,exportWeightMoM:.5,unitValueUsdPerKg:2500,unitValueYoY:1.0,unitValueMoM:.5,history:[]},
        {key:'mcp-memory',name:'MCP',code:'8542323000',group:'memory',note:'HSK 8542323000 · 복합구조칩 메모리(Multichip integrated circuits)',period:'2026-08',exportsUsdBillion:7.1,exportYoY:90.0,exportMoM:22.8,exportWeightKg:650000,exportWeightYoY:20.0,exportWeightMoM:10.0,unitValueUsdPerKg:10923.1,unitValueYoY:58.3,unitValueMoM:11.6,history:[]},
        {key:'dram-module',name:'DRAM 모듈',code:'8473304060',group:'module',note:'HSK 8473304060 · DRAM modules',period:'2026-08',exportsUsdBillion:4.0,exportYoY:140.0,exportMoM:35.0,exportWeightKg:500000,exportWeightYoY:15.0,exportWeightMoM:5.0,unitValueUsdPerKg:8000,unitValueYoY:108.7,unitValueMoM:28.6,history:[]},
        {key:'processor-controller',name:'프로세서·컨트롤러',code:'854231',group:'logic',note:'HS 854231',period:'2026-08',exportsUsdBillion:2.4,exportYoY:11.0,exportMoM:2.0,exportWeightKg:500000,exportWeightYoY:3.2,exportWeightMoM:1.0,unitValueUsdPerKg:4800,unitValueYoY:7.5,unitValueMoM:1.0,history:[]},
        {key:'other-ic',name:'기타 IC',code:'854239',group:'logic',note:'HS 854239',period:'2026-08',exportsUsdBillion:1.2,exportYoY:5.5,exportWeightKg:240000,exportWeightYoY:1.1,unitValueUsdPerKg:5000,unitValueYoY:4.3,history:[]},
      ],
      countries:[
        {name:'미국',code:'US',exportsUsdBillion:3.1,sharePct:21.8},
        {name:'중국',code:'CN',exportsUsdBillion:2.8,sharePct:19.7},
        {name:'베트남',code:'VN',exportsUsdBillion:1.6,sharePct:11.3},
        {name:'일본',code:'JP',exportsUsdBillion:1.2,sharePct:8.5},
        {name:'대만',code:'TW',exportsUsdBillion:1.0,sharePct:7.0},
      ],
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
        if(!(homePriority.market<homePriority.watch)) throw new Error(`${width}px Home must show market context before the watchlist: ${JSON.stringify(homePriority)}`);
        await page.waitForSelector('#home-top-picks-section');
        const pickMarketOrder=await page.evaluate(()=>({pick:document.querySelector('#home-top-picks-section')?.getBoundingClientRect().top,market:document.querySelector('.market-section.home-primary')?.getBoundingClientRect().top}));
        if(!(pickMarketOrder.market<pickMarketOrder.pick)) throw new Error(`${width}px market context must precede historical records: ${JSON.stringify(pickMarketOrder)}`);
        if(await page.locator('.compact-tools').count()) throw new Error(`${width}px duplicate Home analysis shortcuts should be removed`);
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
        if(await page.locator('#home-top-picks .home-pick-row').count()!==2) throw new Error(`${width}px spotlight selection missing`);
        if(!(await page.locator('#home-top-picks-section').innerText()).includes('선정 기록·성과')) throw new Error(`${width}px spotlight title missing`);
        await page.waitForSelector('#home-daily-heatmap .home-heatmap-cell');
        if(await page.locator('#home-daily-heatmap .home-heatmap-cell:visible').count()!==6) throw new Error(`${width}px home heatmap representative set mismatch`);
        if(await page.locator('#home-daily-heatmap .home-heatmap-logo').count()<3) throw new Error(`${width}px heatmap logos missing`);
        if(await page.locator('#home-daily-heatmap img').count()!==0) throw new Error(`${width}px heatmap must not fetch external image assets`);
        const geometry=await page.locator('#home-daily-heatmap .home-heatmap-treemap:visible').evaluateAll(boards=>boards.map(board=>{
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
        if(geometry.some(board=>board.count!==6||board.topBands<2||board.bottomGap>2||board.rightGap>2||board.transparent>0)) throw new Error(`${width}px heatmap geometry regression: ${JSON.stringify(geometry)}`);
        const clipped=await page.locator('#home-daily-heatmap .home-heatmap-cell:visible').evaluateAll(cells=>cells.filter(cell=>{
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
          const visibleSmallChanges=await page.locator('#home-daily-heatmap .home-heatmap-cell.is-small:visible .home-heatmap-change').evaluateAll(nodes=>nodes.filter(node=>{
            const style=getComputedStyle(node);
            return style.display!=='none'&&style.visibility!=='hidden';
          }).length);
          if(visibleSmallChanges) throw new Error(`${width}px small Home heatmap changes must be hidden; visible=${visibleSmallChanges}`);
        }
        if(width===390){
          await page.waitForFunction(()=>{
            const text=document.querySelector('#home-daily-heatmap')?.innerText||'';
            return text.includes('+4.44%');
          },{timeout:6_500});
          const liveText=await page.locator('#home-daily-heatmap').innerText();
          await page.locator('[data-preview-market=US]').click();
          const usLiveText=await page.locator('#home-daily-heatmap').innerText();
          if(!liveText.includes('+4.44%')||!usLiveText.includes('+2.22%')) throw new Error(`Home live shared-cache update missing: ${liveText}`);
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
      await page.waitForSelector('.export-combo-plot');
      await page.waitForSelector('.export-provisional-hero');
      if(await page.locator('.export-provisional-stage').count()!==3) throw new Error('10-day radar must show 10d 20d and month-end checkpoints');
      if(await page.locator('.export-provisional-item').count()!==10) throw new Error('10-day radar must show ten official product groups');
      const provisionalText=await page.locator('#export-provisional-radar').innerText();
      for(const label of ['10일 단위 잠정 수출 레이더','1~10일','1~20일','월 전체','전년 같은 구간','전월 같은 구간','증가율 가속','증가액 기여','반도체','컴퓨터주변기기']) if(!provisionalText.includes(label)) throw new Error(`10-day radar label missing: ${label}`);

      if(await page.locator('.export-landing-card').count()!==2) throw new Error('month-end landing must show total and semiconductor cards');
      const landingText=await page.locator('.export-landing').innerText();
      for(const label of ['월말 착지 범위','추정 vs 실제 마감','전체 수출','반도체','당시 월말 중앙 추정','실제 마감','추정 오차','과거 완성률 중앙값','최근 백테스트','중앙 절대오차','범위 적중']) if(!landingText.includes(label)) throw new Error(`month-end landing label missing: ${label}`);

      if(await page.locator('.export-combo-column').count()!==12) throw new Error('export dual-axis chart must show 12 official monthly observations');
      if(await page.locator('.export-combo-dot').count()!==12) throw new Error('export dual-axis YoY overlay must show 12 points');
      if(await page.locator('.export-combo-line polyline').count()!==1) throw new Error('export dual-axis YoY line missing');
      const chartText=await page.locator('.export-section').filter({hasText:'월별 수출액과 증가율'}).innerText();
      for(const label of ['수출액 · 왼쪽축','YoY · 오른쪽축','이중 Y축']) if(!chartText.includes(label)) throw new Error(`export dual-axis label missing: ${label}`);
      if(await page.locator('.export-semi-report-card').count()!==5) throw new Error('semiconductor report must show five core segments');
      const semiReportText=await page.locator('.export-semi-report').innerText();
      for(const label of ['메모리 IC','DRAM','Flash memory','MCP','DRAM 모듈','YoY','MoM','kg당 평균 신고금액']) if(!semiReportText.includes(label)) throw new Error(`semiconductor report label missing: ${label}`);
      if(await page.locator('.export-semi-report-row').count()!==5) throw new Error('semiconductor report comparison chart must show five rows');
      if(await page.locator('.export-driver-card').count()<5) throw new Error('export value-volume-unit-value cards are missing major HS groups');
      const itemText=await page.locator('.export-driver-card').first().innerText();
      for(const label of ['수출액','물량 · 순중량','kg당 신고금액','수입','무역수지']) if(!itemText.includes(label)) throw new Error(`export decomposition metric missing: ${label}`);
      if(await page.locator('.export-breadth-card').count()!==1) throw new Error('export HS2 breadth card missing');
      const breadthText=await page.locator('.export-breadth-card').innerText();
      for(const label of ['증가 품목','상승 확산도','수출 증가 기여액 상위','수출 감소 기여액 상위']) if(!breadthText.includes(label)) throw new Error(`export breadth label missing: ${label}`);
      if(await page.locator('.export-quadrant-point').count()<5) throw new Error('export volume-unit-value quadrant is missing');
      await page.locator('.export-driver-open').first().click();
      await page.waitForSelector('#export-item-detail .export-detail-chart');
      if(await page.locator('#export-item-detail .export-detail-chart').count()!==3) throw new Error('export item detail must show amount, volume and unit-value history');
      if(await page.locator('#export-item-detail .export-detail-bar').count()!==36) throw new Error('export item detail must keep all 12 months across three charts');
      if(await page.locator('#export-item-detail .export-detail-y-axis').count()!==3) throw new Error('export item detail charts must expose three Y axes');
      if(await page.locator('#export-item-detail .export-semi-card').count()<8) throw new Error('semiconductor HSK breakdown cards missing');
      await page.getByText('반도체 세부 HS·국가 비교 보기',{exact:true}).click();
      await page.waitForSelector('#export-item-detail .export-semi-country-card');
      if(await page.locator('#export-item-detail .export-semi-country-card').count()!==4) throw new Error('semiconductor country matrix must show four segment cards');
      if(await page.locator('#export-item-detail .export-semi-country-row').count()!==24) throw new Error('semiconductor country matrix must show six configured markets per segment');
      const countryMatrixText=await page.locator('#export-item-detail .export-semi-country-section').last().innerText();
      for(const label of ['세부 품목 × 국가','중국','홍콩','베트남','대만','미국','일본','최대 시장','증가 기여','감소 기여','전세계 국가 순위가 아니며']) if(!countryMatrixText.includes(label)) throw new Error(`semiconductor country matrix label missing: ${label}`);

      const semiText=await page.locator('#export-item-detail .export-semi-section').innerText();
      for(const label of ['DRAM','Flash memory','SRAM','MCP','DRAM 모듈','HBM은 별도 수출코드가 없습니다.','NAND']) if(!semiText.includes(label)) throw new Error(`semiconductor detail label missing: ${label}`);
      if(await page.locator('#export-item-detail .export-detail-country-row').count()!==5) throw new Error('export item country breakdown must show five configured markets');
      if(await page.locator('#export-item-detail .export-momentum-summary>div').count()!==3) throw new Error('export item momentum summary must show amount, volume and unit-value metrics');
      if(await page.locator('#export-item-detail .export-phase-strip .phase').count()!==12) throw new Error('export item phase history must show 12 months');
      await assertNoHorizontalOverflow(page,'390px export item detail');
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
      // Optional industry data removes both its block and jump when unavailable.
      await page.waitForFunction(()=>!document.querySelector('#detail-industry-context .loading-indicator'));
      const jumpControls=await page.locator('.detail-jump-nav button').evaluateAll(nodes=>nodes.map(node=>({label:node.textContent.trim(),height:node.getBoundingClientRect().height})));
      const coreJumpLabels=['가격','공시 실적','뉴스','공시 비교'];
      if(coreJumpLabels.some(label=>!jumpControls.some(control=>control.label===label))||jumpControls.some(control=>control.height<44)) {
        throw new Error(`detail jump controls are missing or too small: ${JSON.stringify(jumpControls)}`);
      }
      await page.waitForSelector('#detail-price strong');
      const detailPrice=await page.locator('#detail-price').innerText();
      if((detailPrice.match(/원/g)||[]).length!==1||!detailPrice.includes('84,200원')) throw new Error(`KRW detail price should show its unit exactly once: ${detailPrice}`);
      const changeStock=page.locator('#detail-change');
      if(await changeStock.count()!==1||!(await changeStock.innerText()).includes('다른 종목')) throw new Error('detail direct stock switch missing');
      const changeStockBox=await changeStock.boundingBox();
      if(!changeStockBox||changeStockBox.height<44) throw new Error('detail direct stock switch target is too small');
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
      if(!(await page.locator('[data-tab="picks"]').innerText()).includes('선정 기록·성과')) throw new Error('Spotlight entry missing from menu');
      const groups=await page.locator('.menu-group>h3').allInnerTexts();
      if(!groups.includes('종목 찾기')||!groups.includes('종목 비교하기')||!groups.includes('근거와 시장 환경 확인')) throw new Error(`task-based menu groups missing: ${groups}`);
      if(await page.locator('.feature-menu [data-tab="tools"]').count()) throw new Error('redundant external investment-tools row should not remain in More');
      const versionText=await page.locator('.version-card').innerText();
      if(!versionText.includes('토스/토스증권 공식 서비스 아님')) throw new Error('independent-service notice missing from More');
      const infoRow=page.locator('.feature-menu [data-tab="info"]');
      await infoRow.scrollIntoViewIfNeeded();
      const [infoBox,navBox]=await Promise.all([infoRow.boundingBox(),page.locator('.bottom-nav').boundingBox()]);
      if(!infoBox||!navBox||infoBox.y+infoBox.height>navBox.y-2) throw new Error(`data guide row is obscured by bottom nav: ${JSON.stringify({infoBox,navBox})}`);
    }
    if(tab==='info'){
      const infoText=await page.locator('body').innerText();
      if(!infoText.includes('토스·토스증권의 공식 서비스가 아닌 개인 프로젝트')) throw new Error('independent-service disclosure missing from data guide');
    }
    if(tab==='picks'){
      await page.waitForSelector('.pick-ledger-item');
      const body=await page.locator('body').innerText();
      if(!body.includes('선정 기록·성과')||!body.includes('추천 81,000원')||!body.includes('점검가 87,480원')||!body.includes('+8.00%')) throw new Error('Restored spotlight history missing');
      await page.locator('.pick-ledger-row').first().click();
      if(await page.locator('.pick-ledger-detail').first().isHidden()) throw new Error('Spotlight detail did not expand');
    }
    if(tab==='heatmap'){
      await page.waitForSelector('#analysis-body .home-heatmap-cell');
      if(await page.locator('#analysis-body .home-heatmap-cell').count()!==60) throw new Error('full heatmap must show expanded 60-stock set');
      const krFullText=await page.locator('#analysis-body').innerText();
      await page.locator('[data-full-market=US]').click();
      const fullText=krFullText+' '+await page.locator('#analysis-body').innerText();
      if(!fullText.includes('한국 주요 20종목')||!fullText.includes('미국 시총 상위 40종목')) throw new Error('full heatmap market counts missing');
      if(fullText.includes('+99.99%')||fullText.includes('-88.88%')) throw new Error('full heatmap leaked stale server values instead of Home parity values');
      if(!fullText.includes('엔비디아')||!fullText.includes('+0.22%')||!fullText.includes('삼성전자')||!fullText.includes('+3.62%')) throw new Error('full heatmap did not align overlapping symbols to Home snapshot');
      const fullGeometry=await page.locator('#analysis-body .home-heatmap-treemap:visible').evaluateAll(boards=>boards.map(board=>{
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
      const denseLabels=await page.locator('#analysis-body .home-heatmap-cell:visible').evaluateAll(cells=>{
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
      const krVisible=krFullText;
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
  const monitorBadge=ideaPage.locator('[data-idea-symbol="005930.KS"] .idea-monitor-status.sell').first();
  await monitorBadge.waitFor();
  const monitorText=await monitorBadge.innerText();
  if(!monitorText.includes('사후점검 · 단기 매도 검토')||!monitorText.includes('RSI 81.7')) throw new Error(`idea/pick monitor conflict was not reconciled: ${monitorText}`);
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
  if(!(await page.locator('h2').first().innerText()).includes('선정 기록·성과')) throw new Error('PICK hash entry did not restore spotlight');
  await page.goto(`${BASE}/picks`,{waitUntil:'networkidle'});
  await page.waitForSelector('.pick-ledger-item');
  if(!(await page.locator('h2').first().innerText()).includes('선정 기록·성과')) throw new Error('PICK path entry did not restore spotlight');
  await context.close();

  const auditContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const notFoundPage=await auditContext.newPage();await seed(notFoundPage);await installMocks(notFoundPage);
  await notFoundPage.goto(`${BASE}/#definitely-missing`,{waitUntil:'networkidle'});
  await notFoundPage.waitForSelector('.not-found-card');
  if(!(await notFoundPage.locator('.not-found-card').innerText()).includes('이 주소의 화면을 찾을 수 없어요')) throw new Error('unknown route did not show not-found guidance');
  await notFoundPage.close();

  const shortMenu=await auditContext.newPage();await seed(shortMenu);await installMocks(shortMenu);
  await shortMenu.setViewportSize({width:360,height:560});
  await shortMenu.goto(`${BASE}/#more`,{waitUntil:'networkidle'});
  const shortInfo=shortMenu.locator('.feature-menu [data-tab="info"]');
  await shortInfo.scrollIntoViewIfNeeded();
  const [shortInfoBox,shortNavBox]=await Promise.all([shortInfo.boundingBox(),shortMenu.locator('.bottom-nav').boundingBox()]);
  if(!shortInfoBox||!shortNavBox||shortInfoBox.y+shortInfoBox.height>shortNavBox.y-2) throw new Error(`short viewport data guide is obscured: ${JSON.stringify({shortInfoBox,shortNavBox})}`);
  await shortMenu.close();
  await auditContext.close();

  const desktopContext=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const desktopPage=await desktopContext.newPage();await seed(desktopPage);await installMocks(desktopPage);
  await desktopPage.goto(`${BASE}/#more`,{waitUntil:'networkidle'});
  const desktopShell=await desktopPage.locator('.app-shell').boundingBox();
  if(!desktopShell||desktopShell.width<=600||desktopShell.width>780) throw new Error(`desktop web shell did not widen appropriately: ${JSON.stringify(desktopShell)}`);
  await desktopContext.close();

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
