import {finiteNumber,screenerMatchReasons,screenerDataWarnings} from './analysisData.js';
import {comparisonGroup} from './industryContext.js';

export function marketBrief(macro={}){
 macro=macro&&typeof macro==='object'?macro:{};
 const names={'^VIX':'VIX',DFF:'정책금리',FEDTARGET:'정책금리',T10Y2Y:'장단기 금리차',CPIAUCSL:'물가'};
 const observations=(Array.isArray(macro.results)?macro.results:[]).filter(row=>row&&names[row.original_symbol||row.symbol]).map(row=>`${names[row.original_symbol||row.symbol]} 관측 ${String(row.asOf||row.date||'미제공').slice(0,10)}`);
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
 const productEvidence=row=>String(row.mainProducts||'').split(/[,;\n]/).find(part=>{
  const product=part.trim();
  if(!/(?:반도체|DRAM|NAND|메모리)/i.test(product)||/장비|검사|테스트|캐리어|소재|재료|부품|기판|유통|설계/i.test(product))return false;
  return /제조|제품/.test(product)||(/반도체 제조업/.test(row.industry||'')&&/^(?:반도체|DRAM|NAND)(?:\s+(?:DRAM|NAND))*$/i.test(product));
 });
 const candidates=(metadata.companies||[]).filter(row=>/^[A-Z0-9]{6}\.(KS|KQ)$/.test(row.symbol||'')&&productEvidence(row));
 return candidates.sort((a,b)=>Number(b.symbol==='005930.KS'||b.symbol==='000660.KS')-Number(a.symbol==='005930.KS'||a.symbol==='000660.KS')||a.name.localeCompare(b.name,'ko')).slice(0,3).map(row=>({...row,productEvidence:productEvidence(row).trim(),source:metadata.source||'KRX 주요제품',basisDate:String(metadata.updated||metadata.asOf||'기준일 미제공').slice(0,10)}));
}
export function comparisonExample(symbol,rows=[],selected=null){
 if(selected?.symbol!==symbol&&/^[A-Z0-9]{6}\.(KS|KQ)$/.test(selected?.symbol||''))return selected;
 const group=comparisonGroup(rows.find(row=>row.symbol===symbol));
 return group?rows.find(row=>row.symbol!==symbol&&comparisonGroup(row)?.key===group.key)||null:null;
}
const percent=v=>`${v>0?'+':''}${Number(v).toFixed(1)}%`;
export function homeChanges(snapshot={},screener={}){
 const cards=[];
 const semi=snapshot.items?.find(row=>row.key==='semiconductor');
 if(snapshot.period&&finiteNumber(snapshot.summary?.exportYoY)!==null)cards.push({
   kind:'exports',title:'전체 수출',value:percent(snapshot.summary.exportYoY),basisDate:snapshot.period,
   observation:`YoY ${percent(snapshot.summary.exportYoY)}${finiteNumber(semi?.exportYoY)!==null?` · 반도체 ${percent(semi.exportYoY)} (${snapshot.itemPeriod||'기준월 미제공'})`:''}`,
   question:'어떤 품목이 전체 변화를 이끌었을까요?',limit:'전체 증가율만으로 개별 기업의 실적을 알 수 없어요.',
   next:'품목별 기여 확인',route:'exports',target:'items'
 });
 if(snapshot.itemPeriod&&finiteNumber(semi?.exportWeightYoY)!==null)cards.push({
   kind:'exports',title:'반도체 물량·단위가치',value:percent(semi.exportWeightYoY),basisDate:snapshot.itemPeriod,
   observation:`물량 ${percent(semi.exportWeightYoY)} · 단위가치 ${finiteNumber(semi.unitValueYoY)===null?'미제공':percent(semi.unitValueYoY)}`,
   question:'물량과 단위가치의 방향이 같나요? 기업 매출·재고에서도 확인될까요?',limit:'kg당 평균 신고금액은 기업 판매가격이 아니며 제품 구성에도 영향을 받아요.',
   next:'반도체 상세 확인',route:'exports',target:'quadrant'
 });
 const matches=(screener.stocks||[]).filter(row=>finiteNumber(row.volumeRatio)!==null&&row.volumeRatio>=2);
 if((screener.tradeDate||screener.updated)&&matches.length)cards.push({
   kind:'discovery',title:'거래량 2배 이상',value:`${matches.length}개`,basisDate:screener.tradeDate||screener.updated,
   observation:'20일 평균 대비 거래량 급증 종목',question:'가격 기준과 기업 공시에서도 달라진 근거를 찾을 수 있을까요?',limit:'거래량 증가는 실적 개선이나 상승 지속을 보장하지 않아요.',next:'해당 종목 보기',route:'discover',target:'volume-surge'
 });
 return cards.slice(0,3);
}
export function discoveryContext(row,filters={},label='',basisDate=''){
 const labels={query:'검색',market:'시장',rsiMin:'RSI 하한',rsiMax:'RSI 상한',volumeMin:'거래량 배수 하한',ret20Min:'20일 수익률 하한(%)',valueMin:'20일 평균 거래대금 하한(억원)',trend:'추세',signal:'기술 신호'};
 return {kind:'discovery',symbol:row.symbol,title:label||'조건 검색',basisDate:row.date||basisDate||'기준일 미제공',conditions:Object.entries(filters).filter(([key,value])=>labels[key]&&String(value??'').trim()).map(([key,value])=>`${labels[key]} ${value}`),observations:screenerMatchReasons(row,filters),warnings:screenerDataWarnings(row),challenge:'거래량·가격 조건만으로 기업 실적 개선을 확인할 수 없어요. 재고·현금흐름을 함께 보세요.',next:'같은 회계기간의 매출·영업이익과 영업현금흐름을 공시로 확인하기'};
}
