export function finiteNumber(value){if(value==null||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;}
export function estimateRevision(current,previous){const a=finiteNumber(current),b=finiteNumber(previous);return a>0&&b>0?(a/b-1)*100:null;}

export const SCREENER_PRESETS=[
 {id:'volume-surge',label:'거래량 급증',icon:'🔥',description:'20일 평균 대비 거래량 2배 이상',filters:{volumeMin:'2',sort:'volumeRatio'}},
 {id:'rsi-oversold',label:'RSI 과매도',icon:'💎',description:'RSI(14) 30 이하',filters:{rsiMax:'30',sort:'rsiAsc'}},
 {id:'momentum',label:'강한 모멘텀',icon:'🧲',description:'RSI 55~70 · MACD 강세 · 20일선 위',filters:{rsiMin:'55',rsiMax:'70',trend:'above20',signal:'macdBullish',sort:'rsiDesc'}},
 {id:'golden-cross',label:'골든크로스',icon:'⚡',description:'20일선이 60일선을 상향 돌파',filters:{signal:'goldenCross2060',sort:'change1d'}},
 {id:'uptrend',label:'상승추세',icon:'🚀',description:'주가 > 20일선 > 60일선',filters:{trend:'trend2060',sort:'ret20'}},
 {id:'near-high',label:'52주 신고가 근접',icon:'📈',description:'52주 고점 대비 3% 이내',filters:{signal:'near52High',sort:'distance52HighPct'}},
 {id:'pullback',label:'눌림목 후보',icon:'🟢',description:'상승추세 · RSI 40~55',filters:{rsiMin:'40',rsiMax:'55',trend:'trend2060',sort:'volumeRatio'}},
 {id:'macd-bullish',label:'MACD 강세',icon:'〽️',description:'MACD가 시그널선 위',filters:{signal:'macdBullish',sort:'ret20'}},
];

export function screenerPreset(id){return SCREENER_PRESETS.find(item=>item.id===id)||null;}

// A review threshold, not a diagnosis of a corporate action or a provider error.
export function screenerDataWarnings(row){
 const change=finiteNumber(row?.change1d);
 return change!==null&&Math.abs(change)>=35?['일간 변동 ±35% 이상 · 가격 기준과 기업 공시 등 원자료를 확인해주세요.']:[];
}

export function screenerEmptyState(rows,filters={}){
 const query=String(filters.query||'').trim();
 const matches=filterScreener(rows,{query,market:filters.market});
 if(!matches.length)return {message:'검색어와 시장에 맞는 종목이 없어요. 종목명·코드와 시장을 확인해주세요.',canClearTechnical:false};
 if(query)return {message:`검색어·시장에 맞는 종목 ${matches.length.toLocaleString('ko-KR')}개가 기술 조건에서 제외됐어요. 검색어·시장·기술 조건은 함께 적용돼요.`,canClearTechnical:true};
 return {message:'조건에 맞는 종목이 없어요. 기술 조건을 해제하거나 범위를 넓혀보세요.',canClearTechnical:true};
}

function signalMatch(row,signal){
 if(!signal)return true;
 if(signal==='macdBullish'){
  if(typeof row.macdBullish==='boolean')return row.macdBullish;
  const macd=finiteNumber(row.macd),sig=finiteNumber(row.macdSignal);
  return macd!==null&&sig!==null&&macd>sig;
 }
 if(signal==='macdCrossUp')return row.macdCrossUp===true;
 if(signal==='goldenCross2060')return row.goldenCross2060===true;
 if(signal==='near52High'){
  if(typeof row.near52High==='boolean')return row.near52High;
  const distance=finiteNumber(row.distance52HighPct);
  return distance!==null&&distance>=-3;
 }
 if(signal==='bbBreakout'){
  if(typeof row.bbBreakout==='boolean')return row.bbBreakout;
  const price=finiteNumber(row.price),upper=finiteNumber(row.bbUpper);
  return price!==null&&upper!==null&&price>upper;
 }
 return row[signal]===true;
}

function trendMatch(row,trend){
 if(!trend)return true;
 if(trend==='trend2060'){
  if(typeof row.trend2060==='boolean')return row.trend2060;
  const price=finiteNumber(row.price),ma20=finiteNumber(row.ma20),ma60=finiteNumber(row.ma60);
  return price!==null&&ma20!==null&&ma60!==null&&price>ma20&&ma20>ma60;
 }
 return row[trend]===true;
}

function sortRows(rows,sort){
 return rows.sort((a,b)=>{
  if(sort==='name')return String(a.name).localeCompare(String(b.name),'ko');
  if(sort==='rsiAsc'){
   const av=finiteNumber(a.rsi14),bv=finiteNumber(b.rsi14);
   return av===null?(bv===null?0:1):bv===null?-1:av-bv;
  }
  if(sort==='rsiDesc'){
   const av=finiteNumber(a.rsi14),bv=finiteNumber(b.rsi14);
   return av===null?(bv===null?0:1):bv===null?-1:bv-av;
  }
  if(sort==='distance52HighPct'){
   const av=finiteNumber(a.distance52HighPct),bv=finiteNumber(b.distance52HighPct);
   return av===null?(bv===null?0:1):bv===null?-1:bv-av;
  }
  const av=finiteNumber(a[sort]),bv=finiteNumber(b[sort]);
  return av===null?(bv===null?0:1):bv===null?-1:bv-av;
 });
}

export function filterScreener(rows,{query='',market='',rsiMin='',rsiMax='',volumeMin='',ret20Min='',valueMin='',trend='',signal='',sort='name',priceBasis=''}={}){
 const q=query.trim().toLowerCase(),rsi=finiteNumber(rsiMax),rsiFloor=finiteNumber(rsiMin),volume=finiteNumber(volumeMin),retFloor=finiteNumber(ret20Min),valueFloor=finiteNumber(valueMin);
 const filtered=rows.filter(row=>{
  if(q&&!`${row.name} ${row.symbol} ${row.code}`.toLowerCase().includes(q))return false;
  if(market&&row.market!==market)return false;
  const flagged=screenerDataWarnings(row).length>0;
  if(priceBasis==='exclude'&&flagged||priceBasis==='only'&&!flagged)return false;
  if(!trendMatch(row,trend)||!signalMatch(row,signal))return false;
  const r=finiteNumber(row.rsi14),v=finiteNumber(row.volumeRatio),ret=finiteNumber(row.ret20),value=finiteNumber(row.avgValue20);
  return (rsi===null||(r!==null&&r<=rsi))&&(rsiFloor===null||(r!==null&&r>=rsiFloor))&&(volume===null||(v!==null&&v>=volume))&&(retFloor===null||(ret!==null&&ret>=retFloor))&&(valueFloor===null||(value!==null&&value>=valueFloor*100000000));
 });
 return sortRows(filtered,sort);
}

const TREND_LABELS={above20:'20일선 위',cross20:'20일선 돌파',trend2060:'20일선 > 60일선',aligned:'정배열'};
const SIGNAL_LABELS={macdBullish:'MACD 강세',macdCrossUp:'MACD 상향돌파',goldenCross2060:'20·60 골든크로스',near52High:'52주 고점 근접',bbBreakout:'볼린저 상단 돌파'};

export function screenerMatchReasons(row,filters={}){
 const reasons=[];
 const hasValue=value=>value!==undefined&&value!==null&&String(value).trim()!=='';
 const rsi=finiteNumber(row.rsi14),volume=finiteNumber(row.volumeRatio),ret20=finiteNumber(row.ret20),distance=finiteNumber(row.distance52HighPct);
 if((hasValue(filters.rsiMin)||hasValue(filters.rsiMax))&&rsi!==null)reasons.push(`RSI ${rsi.toFixed(1)}`);
 if(hasValue(filters.volumeMin)&&volume!==null)reasons.push(`거래량 ${volume.toFixed(1)}배`);
 if(filters.trend&&TREND_LABELS[filters.trend])reasons.push(TREND_LABELS[filters.trend]);
 if(filters.signal&&SIGNAL_LABELS[filters.signal])reasons.push(filters.signal==='near52High'&&distance!==null?`52주 고점 ${Math.abs(distance).toFixed(1)}% 이내`:SIGNAL_LABELS[filters.signal]);
 if(hasValue(filters.ret20Min)&&ret20!==null)reasons.push(`20일 ${ret20>=0?'+':''}${ret20.toFixed(1)}%`);
 if(!reasons.length){
  if(rsi!==null)reasons.push(`RSI ${rsi.toFixed(1)}`);
  if(volume!==null)reasons.push(`거래량 ${volume.toFixed(1)}배`);
  if(row.trend2060===true)reasons.push('20일선 > 60일선');
  else if(row.above20===true)reasons.push('20일선 위');
 }
 return reasons.slice(0,4);
}
