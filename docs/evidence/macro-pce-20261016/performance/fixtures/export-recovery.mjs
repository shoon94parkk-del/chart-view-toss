// Shared contracts from the existing export recovery QA. No network or browser startup.
export const snapshot={period:'2026-09',summary:{exportsUsdBillion:60,exportYoY:10},items:[{key:'semiconductor',name:'반도체',exportsUsdBillion:20,exportYoY:15},{key:'passenger-car',name:'승용차',exportsUsdBillion:5,exportYoY:10}],history:[{period:'2026-08',exportsUsdBillion:50,exportYoY:null},{period:'2026-09',exportsUsdBillion:60,exportYoY:10}]};
export const radar={period:'2026-09',latestStage:20,checkpoints:[{stage:20,label:'1~20일',total:{exportsUsdBillion:40},semiconductor:{exportsUsdBillion:10}}]};
export const momentumMap={period:'2026-09',items:[
 {key:'semiconductor',name:'반도체',period:'2026-09',exportYoY:25,previousExportYoY:15,deltaYoYPp:10,avg3mYoY:20,acceleration3mPp:6,signal:'acceleration',signalLabel:'가속'},
 {key:'passenger-car',name:'승용차',period:'2026-09',exportYoY:-4,previousExportYoY:2,deltaYoYPp:-6,avg3mYoY:-1,acceleration3mPp:-4,signal:'weak',signalLabel:'부진'},
]};
export const semiconductorTrends={period:'2026-09',total:{name:'반도체',exportsUsdBillion:30,priorExportsUsdBillion:20,deltaUsdBillion:10,exportYoY:50},memoryTotalDeltaUsdBillion:4,segments:[
 {key:'memory-total',name:'메모리 IC',code:'854232',group:'memory',note:'HS 854232 메모리 전체',exportsUsdBillion:12,priorExportsUsdBillion:8,deltaUsdBillion:4,exportYoY:50,overallContributionPct:40,memoryContributionPct:null,history:[{period:'2026-08',exportsUsdBillion:11,priorExportsUsdBillion:8,deltaUsdBillion:3,exportYoY:37.5},{period:'2026-09',exportsUsdBillion:12,priorExportsUsdBillion:8,deltaUsdBillion:4,exportYoY:50}]},
 {key:'dram',name:'DRAM',code:'8542321010',group:'memory',note:'HBM 별도 HSK 없음',exportsUsdBillion:7,priorExportsUsdBillion:5,deltaUsdBillion:2,exportYoY:40,overallContributionPct:null,memoryContributionPct:50,history:[{period:'2026-08',exportsUsdBillion:6,priorExportsUsdBillion:5,deltaUsdBillion:1,exportYoY:20},{period:'2026-09',exportsUsdBillion:7,priorExportsUsdBillion:5,deltaUsdBillion:2,exportYoY:40}]},
 {key:'flash',name:'Flash memory',code:'8542321030',group:'memory',note:'NAND/NOR 포함',exportsUsdBillion:3,priorExportsUsdBillion:2.5,deltaUsdBillion:.5,exportYoY:20,overallContributionPct:null,memoryContributionPct:12.5,history:[{period:'2026-08',exportsUsdBillion:2.8,priorExportsUsdBillion:2.5,deltaUsdBillion:.3,exportYoY:12},{period:'2026-09',exportsUsdBillion:3,priorExportsUsdBillion:2.5,deltaUsdBillion:.5,exportYoY:20}]},
 {key:'sram',name:'SRAM',code:'8542321020',group:'memory',note:'HSK 8542321020',exportsUsdBillion:.5,priorExportsUsdBillion:.7,deltaUsdBillion:-.2,exportYoY:-28.6,overallContributionPct:null,memoryContributionPct:-5,history:[{period:'2026-08',exportsUsdBillion:.6,priorExportsUsdBillion:.7,deltaUsdBillion:-.1,exportYoY:-14.3},{period:'2026-09',exportsUsdBillion:.5,priorExportsUsdBillion:.7,deltaUsdBillion:-.2,exportYoY:-28.6}]},
 {key:'mcp-memory',name:'MCP',code:'8542323000',group:'memory',note:'복합구조칩 메모리',exportsUsdBillion:4,priorExportsUsdBillion:2.8,deltaUsdBillion:1.2,exportYoY:42.9,overallContributionPct:null,memoryContributionPct:30,history:[{period:'2026-08',exportsUsdBillion:3.5,priorExportsUsdBillion:2.8,deltaUsdBillion:.7,exportYoY:25},{period:'2026-09',exportsUsdBillion:4,priorExportsUsdBillion:2.8,deltaUsdBillion:1.2,exportYoY:42.9}]},
 {key:'processor-controller',name:'프로세서·컨트롤러',code:'854231',group:'logic',note:'HS 854231',exportsUsdBillion:8,priorExportsUsdBillion:6.5,deltaUsdBillion:1.5,exportYoY:23.1,overallContributionPct:15,memoryContributionPct:null,history:[{period:'2026-08',exportsUsdBillion:7.5,priorExportsUsdBillion:6.4,deltaUsdBillion:1.1,exportYoY:17.2},{period:'2026-09',exportsUsdBillion:8,priorExportsUsdBillion:6.5,deltaUsdBillion:1.5,exportYoY:23.1}]},
 {key:'other-ic',name:'기타 IC',code:'854239',group:'logic',note:'HS 854239',exportsUsdBillion:4,priorExportsUsdBillion:3.5,deltaUsdBillion:.5,exportYoY:14.3,overallContributionPct:5,memoryContributionPct:null,history:[{period:'2026-08',exportsUsdBillion:3.8,priorExportsUsdBillion:3.5,deltaUsdBillion:.3,exportYoY:8.6},{period:'2026-09',exportsUsdBillion:4,priorExportsUsdBillion:3.5,deltaUsdBillion:.5,exportYoY:14.3}]},
 {key:'dram-module',name:'DRAM 모듈',code:'8473304060',group:'module',note:'반도체 총계 외 별도 HSK',exportsUsdBillion:3,priorExportsUsdBillion:2.2,deltaUsdBillion:.8,exportYoY:36.4,overallContributionPct:null,memoryContributionPct:null,history:[{period:'2026-08',exportsUsdBillion:2.5,priorExportsUsdBillion:2.1,deltaUsdBillion:.4,exportYoY:19},{period:'2026-09',exportsUsdBillion:3,priorExportsUsdBillion:2.2,deltaUsdBillion:.8,exportYoY:36.4}]},
]};
export const companyContext={source:'KRX 주요제품',updated:'2026-10-05',companies:[
 {symbol:'005930.KS',name:'삼성전자',industry:'반도체 제조업',mainProducts:'DRAM, NAND'},
 {symbol:'000660.KS',name:'SK하이닉스',industry:'반도체 제조업',mainProducts:'DRAM, NAND, MCP'},
 {symbol:'111111.KS',name:'완성차A',industry:'자동차 제조업',mainProducts:'승용차, SUV'},
 {symbol:'222221.KS',name:'정유A',industry:'석유 정제품 제조업',mainProducts:'휘발유, 경유, 항공유'},
 {symbol:'333331.KS',name:'화장품A',industry:'화장품 제조업',mainProducts:'기초화장품, 색조화장품'},
 {symbol:'444441.KS',name:'조선A',industry:'선박 건조업',mainProducts:'LNG선, 컨테이너선'},
 {symbol:'555551.KS',name:'철강A',industry:'제철 및 제강업',mainProducts:'열연강판, 냉연강판, 후판'},
]};
export const detail={key:'semiconductor',name:'반도체',period:'2026-09',history:[{period:'2026-09',exportsUsdBillion:20,exportYoY:15}],countries:[]};
export const makeIndustryDetail=(key,name,note)=>({
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
export const industryDetails={
 'passenger-car':makeIndustryDetail('passenger-car','승용차','HS 8703 기준'),
 petroleum:makeIndustryDetail('petroleum','석유제품','HS 2710 정제 석유제품 기준'),
 cosmetics:makeIndustryDetail('cosmetics','화장품','HS 3304 미용·기초화장품 기준'),
 ships:makeIndustryDetail('ships','선박','HS 89 선박·보트류 기준'),
 steel:makeIndustryDetail('steel','철강','HS 72 철강 기준'),
};
export const matrix={period:'2026-09',segments:[{key:'dram',code:'8542321010',name:'DRAM',exportsUsdBillion:10,countries:[{code:'CN',name:'중국',exportsUsdBillion:5,sharePct:50}]}]};
