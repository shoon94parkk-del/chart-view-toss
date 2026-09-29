import { finiteNumber } from './analysisData.js';
import { companyContext } from './industryContext.js';

const num=(row,key)=>finiteNumber(row?.[key]);
const has=(v)=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
const isTrend2060=row=>{
  if(typeof row?.trend2060==='boolean') return row.trend2060;
  const price=num(row,'price'),ma20=num(row,'ma20'),ma60=num(row,'ma60');
  return price!==null&&ma20!==null&&ma60!==null&&price>ma20&&ma20>ma60;
};
const isAbove20=row=>{
  if(typeof row?.above20==='boolean') return row.above20;
  const price=num(row,'price'),ma20=num(row,'ma20');
  return price!==null&&ma20!==null&&price>ma20;
};
const isMacdBullish=row=>{
  if(typeof row?.macdBullish==='boolean') return row.macdBullish;
  const macd=num(row,'macd'),signal=num(row,'macdSignal');
  return macd!==null&&signal!==null&&macd>signal;
};
const near52High=row=>{
  if(typeof row?.near52High==='boolean') return row.near52High;
  const distance=num(row,'distance52HighPct');
  return distance!==null&&distance>=-3;
};
const labelPct=value=>{
  const n=finiteNumber(value);
  return n===null?null:`${n>0?'+':''}${n.toFixed(1)}%`;
};
const candidate=(row,reasons,score,rows)=>({
  symbol:row.symbol,
  name:row.name||row.symbol,
  market:row.market||'',
  date:row.date||'',
  price:num(row,'price'),
  change1d:num(row,'change1d'),
  rsi14:num(row,'rsi14'),
  volumeRatio:num(row,'volumeRatio'),
  ret20:num(row,'ret20'),
  distance52HighPct:num(row,'distance52HighPct'),
  reasons:reasons.filter(Boolean).slice(0,4),
  score:Number.isFinite(score)?score:0,
  context:companyContext(row,rows),
});
const defs=[
  {
    id:'volume-rise',
    icon:'🔥',
    title:'거래량이 붙은 상승 종목',
    summary:'20일 평균 대비 거래량이 크게 늘면서 당일 주가도 오른 종목을 모았어요.',
    match:row=>{
      const volume=num(row,'volumeRatio'),change=num(row,'change1d');
      return volume!==null&&volume>=2&&change!==null&&change>0;
    },
    score:row=>(num(row,'volumeRatio')||0)*2+(num(row,'change1d')||0),
    reasons:row=>[
      has(row.volumeRatio)?`거래량 ${Number(row.volumeRatio).toFixed(1)}배`:null,
      labelPct(row.change1d)?`당일 ${labelPct(row.change1d)}`:null,
      labelPct(row.ret20)?`20일 ${labelPct(row.ret20)}`:null,
    ],
    confirm:'다음 거래일에도 거래량이 유지되는지와 상승분을 지키는지 확인해보세요.',
    invalidate:'거래량이 급감하거나 단기 상승분을 빠르게 반납하면 신호가 약해질 수 있어요.',
  },
  {
    id:'pullback',
    icon:'🟢',
    title:'상승추세 속 숨 고르기',
    summary:'주가가 20일선·60일선 위의 상승추세를 유지하면서 RSI가 과열 구간 아래인 종목이에요.',
    match:row=>{
      const rsi=num(row,'rsi14');
      return isTrend2060(row)&&rsi!==null&&rsi>=40&&rsi<=55;
    },
    score:row=>{
      const rsi=num(row,'rsi14')||50,volume=num(row,'volumeRatio')||1,ret=num(row,'ret20')||0;
      return 8-Math.abs(rsi-48)/5+Math.min(volume,3)+Math.max(Math.min(ret,15),-15)/10;
    },
    reasons:row=>[
      '주가 > 20일선 > 60일선',
      has(row.rsi14)?`RSI ${Number(row.rsi14).toFixed(1)}`:null,
      labelPct(row.ret20)?`20일 ${labelPct(row.ret20)}`:null,
    ],
    confirm:'20일선 부근에서 지지가 이어지는지, 거래량이 다시 붙는지 확인해보세요.',
    invalidate:'20일선과 60일선 추세가 무너지거나 약세 거래량이 커지면 다시 점검할 필요가 있어요.',
  },
  {
    id:'near-high',
    icon:'📈',
    title:'52주 고점 근접',
    summary:'52주 고점과의 거리가 3% 이내이고 최근 20일 흐름이 플러스인 종목이에요.',
    match:row=>near52High(row)&&(num(row,'ret20')??-Infinity)>0,
    score:row=>{
      const distance=num(row,'distance52HighPct')??-100,volume=num(row,'volumeRatio')||1,ret=num(row,'ret20')||0;
      return 10+distance+Math.min(volume,3)+Math.min(ret,20)/5;
    },
    reasons:row=>[
      has(row.distance52HighPct)?`52주 고점 ${Math.abs(Number(row.distance52HighPct)).toFixed(1)}% 이내`:'52주 고점 근접',
      labelPct(row.ret20)?`20일 ${labelPct(row.ret20)}`:null,
      has(row.volumeRatio)?`거래량 ${Number(row.volumeRatio).toFixed(1)}배`:null,
    ],
    confirm:'고점 돌파 시 거래량이 동반되는지와 돌파 후 가격이 고점 위에서 유지되는지 확인해보세요.',
    invalidate:'고점 부근에서 반복적으로 밀리거나 거래량 없이 가격만 오르면 돌파 신뢰도가 낮아질 수 있어요.',
  },
  {
    id:'momentum',
    icon:'⚡',
    title:'모멘텀 강화',
    summary:'MACD가 시그널선 위에 있고 주가가 20일선 위, RSI가 55~70인 종목이에요.',
    match:row=>{
      const rsi=num(row,'rsi14'),ret=num(row,'ret20');
      return isMacdBullish(row)&&isAbove20(row)&&rsi!==null&&rsi>=55&&rsi<=70&&(ret===null||ret>0);
    },
    score:row=>(num(row,'ret20')||0)/3+(num(row,'volumeRatio')||1)+(num(row,'rsi14')||55)/20,
    reasons:row=>[
      'MACD 강세',
      '20일선 위',
      has(row.rsi14)?`RSI ${Number(row.rsi14).toFixed(1)}`:null,
      labelPct(row.ret20)?`20일 ${labelPct(row.ret20)}`:null,
    ],
    confirm:'모멘텀이 유지되면서 거래량과 20일 수익률이 함께 개선되는지 확인해보세요.',
    invalidate:'MACD가 다시 시그널선 아래로 내려가거나 20일선을 이탈하면 모멘텀 약화를 의심할 수 있어요.',
  },
  {
    id:'oversold',
    icon:'💎',
    title:'과매도 반등 관찰',
    summary:'RSI(14)가 30 이하인 종목 중 거래가 지나치게 메마르지 않은 종목을 모았어요.',
    match:row=>{
      const rsi=num(row,'rsi14'),volume=num(row,'volumeRatio');
      return rsi!==null&&rsi<=30&&(volume===null||volume>=0.8);
    },
    score:row=>30-(num(row,'rsi14')||30)+(num(row,'volumeRatio')||1),
    reasons:row=>[
      has(row.rsi14)?`RSI ${Number(row.rsi14).toFixed(1)}`:null,
      has(row.volumeRatio)?`거래량 ${Number(row.volumeRatio).toFixed(1)}배`:null,
      labelPct(row.change1d)?`당일 ${labelPct(row.change1d)}`:null,
    ],
    confirm:'RSI가 저점에서 돌아서는지와 단기 저점·거래량이 함께 개선되는지 확인해보세요.',
    invalidate:'과매도는 하락 추세에서도 오래 지속될 수 있어요. 저점 갱신이 이어지면 반등 가설을 보수적으로 봐야 해요.',
  },
];

export function buildInvestmentIdeas(data,{limit=4,perIdea=4}={}){
  const rows=(Array.isArray(data?.stocks)?data.stocks:[]).filter(row=>row?.symbol&&row?.name);
  return defs.map(def=>{
    const candidates=rows.filter(def.match).map(row=>candidate(row,def.reasons(row),def.score(row),rows)).sort((a,b)=>b.score-a.score).slice(0,perIdea);
    if(!candidates.length)return null;
    return {
      id:def.id,
      icon:def.icon,
      title:def.title,
      summary:def.summary,
      confirm:def.confirm,
      invalidate:def.invalidate,
      candidates,
      strength:candidates.length>=3?'후보 다수':candidates.length===2?'후보 2개':'후보 1개',
    };
  }).filter(Boolean).slice(0,limit);
}

export function ideaCoverage(data){
  const rows=Array.isArray(data?.stocks)?data.stocks:[];
  const usable=rows.filter(row=>finiteNumber(row?.rsi14)!==null||finiteNumber(row?.volumeRatio)!==null||finiteNumber(row?.ret20)!==null);
  return {total:rows.length,usable:usable.length,tradeDate:data?.tradeDate||data?.updated||null};
}
