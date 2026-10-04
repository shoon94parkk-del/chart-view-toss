import {finiteNumber,screenerMatchReasons,screenerDataWarnings} from './analysisData.js';
import {comparisonGroup} from './industryContext.js';

export function marketBrief(macro={}){
 const names={'^VIX':'VIX',DFF:'정책금리',FEDTARGET:'정책금리',T10Y2Y:'장단기 금리차',CPIAUCSL:'물가'};
 const observations=(macro.results||[]).filter(row=>names[row.original_symbol||row.symbol]).map(row=>`${names[row.original_symbol||row.symbol]} 관측 ${String(row.asOf||row.date||'미제공').slice(0,10)}`);
 return {text:String(macro.summary?.text||''),basis:observations.join(' · ')||`최근 원자료 ${macro.summary?.latestBasisDate||'미제공'}`};
}
export function memoryMovements(rows=[]){
 const valid=rows.filter(row=>finiteNumber(row.exportMoM)!==null);
 return {increase:valid.filter(row=>row.exportMoM>0).sort((a,b)=>b.exportMoM-a.exportMoM)[0]||null,decrease:valid.filter(row=>row.exportMoM<0).sort((a,b)=>a.exportMoM-b.exportMoM)[0]||null};
}
export function technicalWarning(rows=[]){
 const reasons=[...new Set(rows.flatMap(row=>row.monitor?.technical?.reasons||[]).filter(reason=>typeof reason==='string'&&reason.trim()))];
 return (reasons.length?`실제 발동 조건: ${reasons.slice(0,5).join(' · ')}.`:'발동 조건 상세 미제공 · 각 기록의 기술 지표를 확인해주세요.')+' 기업 근거 점검과 별도인 단기 보조 신호예요.';
}
export function bandCoverage(stats,years,providedYears){
 const limit=finiteNumber(providedYears);
 const note=limit!==null&&limit>0&&limit<years?` · 현재 제공 범위 최대 ${limit}년`:'';
 const start=Date.parse(stats?.start),end=Date.parse(stats?.end);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)return `${years}년 요청 · 관측 기간 미제공${note}`;
 const span=(end-start)/86400000/365.25;
 return `${years}년 요청 · 실제 약 ${span.toFixed(1)}년 자료 · ${stats.observations??'미제공'}개 관측${note}${span<years-.3?' · 제공 자료의 기간이 요청보다 짧아요.':''}`;
}
// Initial rollout deliberately covers one product family only. KRX products
// establish classification candidates, never issuer export exposure/contracts.
export function exportCompanyCandidates(key,metadata={}){
 if(key!=='semiconductor')return [];
 const candidates=(metadata.companies||[]).filter(row=>/^[A-Z0-9]{6}\.(KS|KQ)$/.test(row.symbol||'')&&String(row.mainProducts||'').split(/[,;\n]/).some(part=>{
  const product=part.trim();
  if(!/(?:반도체|DRAM|NAND|메모리)/i.test(product)||/장비|검사|테스트|캐리어|소재|재료|부품|기판|유통|설계/i.test(product))return false;
  return /제조|제품/.test(product)||(/반도체 제조업/.test(row.industry||'')&&/^(?:반도체|DRAM|NAND)(?:\s+(?:DRAM|NAND))*$/i.test(product));
 }));
 return candidates.sort((a,b)=>Number(b.symbol==='005930.KS'||b.symbol==='000660.KS')-Number(a.symbol==='005930.KS'||a.symbol==='000660.KS')||a.name.localeCompare(b.name,'ko')).slice(0,3).map(row=>({...row,source:metadata.source||'KRX 주요제품',basisDate:String(metadata.updated||metadata.asOf||'기준일 미제공').slice(0,10)}));
}
export function comparisonExample(symbol,rows=[],selected=null){
 if(selected?.symbol!==symbol&&/^[A-Z0-9]{6}\.(KS|KQ)$/.test(selected?.symbol||''))return selected;
 const group=comparisonGroup(rows.find(row=>row.symbol===symbol));
 return group?rows.find(row=>row.symbol!==symbol&&comparisonGroup(row)?.key===group.key)||null:null;
}
const percent=v=>`${v>0?'+':''}${Number(v).toFixed(1)}%`;
export function homeChanges(snapshot={},screener={}){
 const cards=[];
 if(snapshot.period&&finiteNumber(snapshot.summary?.exportYoY)!==null)cards.push({kind:'exports',title:'전체 수출의 전년 대비 변화',value:percent(snapshot.summary.exportYoY),basisDate:snapshot.period,observation:'총수출액 · 전년 동월 대비',next:'품목별 증가와 감소 확인',route:'exports',target:'items'});
 const semi=snapshot.items?.find(row=>row.key==='semiconductor');
 if(snapshot.itemPeriod&&finiteNumber(semi?.exportWeightYoY)!==null)cards.push({kind:'exports',title:'반도체 물량과 단위가치',value:percent(semi.exportWeightYoY),basisDate:snapshot.itemPeriod,observation:`순중량 YoY · 평균 단위가치 ${finiteNumber(semi.unitValueYoY)===null?'미제공':percent(semi.unitValueYoY)} · 기업 ASP와 달라요`,next:'물량·단위가치 함께 확인',route:'exports',target:'quadrant'});
 const matches=(screener.stocks||[]).filter(row=>finiteNumber(row.volumeRatio)!==null&&row.volumeRatio>=2);
 if((screener.tradeDate||screener.updated)&&matches.length)cards.push({kind:'discovery',title:'평균보다 거래량이 늘어난 종목',value:`${matches.length}개`,basisDate:screener.tradeDate||screener.updated,observation:'당일 거래량 / 20일 평균 ≥ 2배 · 실적 개선을 뜻하지 않아요',next:'실제 조건과 종목 확인',route:'discover',target:'volume-surge'});
 return cards.slice(0,3);
}
export function discoveryContext(row,filters={},label='',basisDate=''){
 const labels={query:'검색',market:'시장',rsiMin:'RSI 하한',rsiMax:'RSI 상한',volumeMin:'거래량 배수 하한',ret20Min:'20일 수익률 하한(%)',valueMin:'20일 평균 거래대금 하한(억원)',trend:'추세',signal:'기술 신호'};
 return {kind:'discovery',symbol:row.symbol,title:label||'조건 검색',basisDate:row.date||basisDate||'기준일 미제공',conditions:Object.entries(filters).filter(([key,value])=>labels[key]&&String(value??'').trim()).map(([key,value])=>`${labels[key]} ${value}`),observations:screenerMatchReasons(row,filters),warnings:screenerDataWarnings(row),challenge:'거래량·가격 조건만으로 기업 실적 개선을 확인할 수 없어요. 재고·현금흐름을 함께 보세요.',next:'같은 회계기간의 매출·영업이익과 영업현금흐름을 공시로 확인하기'};
}
