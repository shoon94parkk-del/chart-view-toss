import { finiteNumber } from './analysisData.js';

const norm=value=>String(value||'').toLowerCase().replace(/\s+/g,' ');
const rowText=row=>norm([row?.industry,row?.mainProducts,row?.name].filter(Boolean).join(' '));
const n=(row,key)=>finiteNumber(row?.[key]);

const CHAIN_DEFS=[
  {
    id:'semiconductor', label:'반도체',
    match:/반도체|웨이퍼|wafer|dram|nand|hbm|메모리|집적회로|ic\b|프로브|burn.?in|테스터|test socket|패키징/,
    stages:[
      ['소재·부품',/포토레지스트|감광|케미칼|특수가스|실리콘|쿼츠|세라믹|부품|밸브|펌프|필터|소켓|probe|프로브|기판|pcb|substrate|lead.?frame/],
      ['장비',/장비|equipment|세정|식각|증착|노광|본더|bonder|검사|측정|tester|테스터|handler|핸들러|burn.?in|prober|프로버/],
      ['칩·소자',/dram|nand|hbm|메모리|반도체 소자|집적회로|system.?ic|파운드리|foundry|칩/],
      ['패키징·테스트',/패키징|package|패키지|후공정|테스트 서비스|test service|osat/],
    ],
  },
  {
    id:'display', label:'디스플레이',
    match:/디스플레이|oled|lcd|amoled|패널|유기발광/,
    stages:[
      ['소재·부품',/소재|필름|glass|유리|마스크|mask|편광|봉지|encapsulation|부품/],
      ['장비',/장비|equipment|증착|세정|검사|측정|레이저|laser/],
      ['패널·모듈',/패널|panel|모듈|module|oled|lcd|amoled/],
    ],
  },
  {
    id:'battery', label:'2차전지',
    match:/2차전지|이차전지|배터리|battery|양극재|음극재|전해액|분리막|동박/,
    stages:[
      ['원재료',/리튬|니켈|코발트|망간|광물|원재료/],
      ['소재',/양극재|음극재|전해액|분리막|동박|바인더|전구체|소재/],
      ['장비',/장비|equipment|코터|롤프레스|조립|검사|formation|포메이션/],
      ['셀·팩',/셀|cell|배터리|battery|팩|pack|ess/],
    ],
  },
  {
    id:'telecom', label:'통신장비',
    match:/통신장비|이동통신|5g|6g|기지국|중계기|광트랜시버|광통신|안테나|rf\b|open ran/,
    stages:[
      ['RF·광부품',/광트랜시버|광모듈|rf\b|필터|안테나|증폭기|부품/],
      ['네트워크 장비',/중계기|기지국|통신장비|open ran|전송장비|라우터|스위치/],
      ['서비스·운영',/통신서비스|이동전화|초고속인터넷|통신업/],
    ],
  },
  {
    id:'auto', label:'자동차',
    match:/자동차|차량|전기차|ev\b|모빌리티|차체|파워트레인|타이어/,
    stages:[
      ['소재·부품',/부품|타이어|시트|램프|모터|전장|센서|브레이크|샤시|차체/],
      ['완성차',/완성차|승용차|상용차|자동차 제조/],
      ['서비스',/렌터카|자동차 판매|모빌리티 서비스/],
    ],
  },
  {
    id:'shipbuilding', label:'조선·LNG',
    match:/조선|선박|lng|해양플랜트|선박엔진|조선기자재/,
    stages:[
      ['소재·기자재',/강관|후판|보냉|밸브|펌프|기자재|엔진|케이블/],
      ['조선·플랜트',/선박|조선|해양플랜트|ship/],
      ['운송',/해운|shipping|운송/],
    ],
  },
  {
    id:'pharma', label:'바이오·제약',
    match:/의약|제약|바이오|신약|의료|cro\b|cdmo\b|원료의약/,
    stages:[
      ['원료·소재',/원료의약|원료|배지|시약|소재/],
      ['연구·개발',/신약|바이오|연구|개발|진단/],
      ['생산·CDMO',/cdmo|위탁생산|생산|의약품 제조/],
      ['임상·서비스',/cro|임상|의료서비스|병원/],
    ],
  },
  {
    id:'power', label:'전력기기·전선',
    match:/변압기|차단기|전력기기|배전|송전|전선|케이블|스위치기어|초고압/,
    stages:[
      ['소재·부품',/구리|동|소재|부품|절연|코어/],
      ['전력기기',/변압기|차단기|스위치기어|배전|전력기기/],
      ['전선·케이블',/전선|케이블|cable/],
      ['전력망·서비스',/송전|전력망|발전|전기공급/],
    ],
  },
];

export function classifySupplyChain(row){
  const text=rowText(row);
  for(const chain of CHAIN_DEFS){
    if(!chain.match.test(text))continue;
    let stage='관련기업';
    for(const [label,pattern] of chain.stages){
      if(pattern.test(text)){stage=label;break;}
    }
    return {chain:chain.id,chainLabel:chain.label,stage};
  }
  return null;
}

function sectorTone({peerCount,upRatio,avgChange,trendRatio}){
  if(peerCount<3)return {label:'표본 부족',tone:'neutral'};
  if(upRatio>=0.65&&avgChange>=0.5)return {label:'강함',tone:'strong'};
  if((upRatio>=0.55&&avgChange>=0)||(trendRatio>=0.6&&avgChange>=-0.2))return {label:'양호',tone:'good'};
  if(upRatio<0.4&&avgChange<0)return {label:'약함',tone:'weak'};
  return {label:'혼조',tone:'mixed'};
}

export function buildSectorContext(row,rows){
  const industry=String(row?.industry||'').trim();
  if(!industry)return null;
  const peers=(Array.isArray(rows)?rows:[]).filter(x=>String(x?.industry||'').trim()===industry);
  const changes=peers.map(x=>n(x,'change1d')).filter(v=>v!==null);
  if(!peers.length||!changes.length)return null;
  const upCount=changes.filter(v=>v>0).length;
  const trendKnown=peers.filter(x=>typeof x?.trend2060==='boolean');
  const trendCount=trendKnown.filter(x=>x.trend2060===true).length;
  const volumeKnown=peers.map(x=>n(x,'volumeRatio')).filter(v=>v!==null);
  const avgChange=changes.reduce((a,b)=>a+b,0)/changes.length;
  const upRatio=upCount/changes.length;
  const trendRatio=trendKnown.length?trendCount/trendKnown.length:0;
  const volumeSurgeRatio=volumeKnown.length?volumeKnown.filter(v=>v>=2).length/volumeKnown.length:0;
  const leaders=peers.filter(x=>x.symbol!==row.symbol&&n(x,'change1d')!==null)
    .sort((a,b)=>(n(b,'change1d')||0)-(n(a,'change1d')||0))
    .slice(0,3)
    .map(x=>({symbol:x.symbol,name:x.name||x.symbol,change1d:n(x,'change1d')}));
  return {
    industry,
    peerCount:peers.length,
    avgChange,
    upRatio,
    trendRatio,
    volumeSurgeRatio,
    leaders,
    ...sectorTone({peerCount:peers.length,upRatio,avgChange,trendRatio}),
  };
}

const peerScore=(row,baseStage)=>{
  const technical=n(row,'technicalScore')||0;
  const value=Math.log10(Math.max(n(row,'avgValue20')||1,1));
  const chain=classifySupplyChain(row);
  const adjacency=chain&&chain.stage!==baseStage?8:3;
  return adjacency+technical/10+value/10;
};

export function findSupplyChainPeers(row,rows,{limit=4}={}){
  const universe=Array.isArray(rows)?rows:[];
  const base=classifySupplyChain(row);
  if(base){
    return universe.filter(x=>x.symbol!==row.symbol).map(x=>({row:x,cls:classifySupplyChain(x)}))
      .filter(x=>x.cls?.chain===base.chain)
      .sort((a,b)=>peerScore(b.row,base.stage)-peerScore(a.row,base.stage))
      .slice(0,limit)
      .map(({row:x,cls})=>({
        symbol:x.symbol,
        name:x.name||x.symbol,
        industry:x.industry||'',
        mainProducts:x.mainProducts||'',
        stage:cls.stage,
        relation:cls.stage===base.stage?'같은 산업 단계':'인접 산업 단계',
        change1d:n(x,'change1d'),
      }));
  }
  const industry=String(row?.industry||'').trim();
  if(!industry)return [];
  return universe.filter(x=>x.symbol!==row.symbol&&String(x?.industry||'').trim()===industry)
    .sort((a,b)=>(n(b,'technicalScore')||0)-(n(a,'technicalScore')||0))
    .slice(0,limit)
    .map(x=>({symbol:x.symbol,name:x.name||x.symbol,industry:x.industry||'',mainProducts:x.mainProducts||'',stage:'동일 업종',relation:'동일 업종',change1d:n(x,'change1d')}));
}

export function companyContext(row,rows){
  const supply=classifySupplyChain(row);
  return {
    industry:String(row?.industry||'').trim(),
    mainProducts:String(row?.mainProducts||'').trim(),
    sector:buildSectorContext(row,rows),
    supply:supply?{...supply,peers:findSupplyChainPeers(row,rows)}:{chain:null,chainLabel:null,stage:null,peers:findSupplyChainPeers(row,rows)},
  };
}
