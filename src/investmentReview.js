import {compareReports,number} from './researchAnalysis.js';
import {qualitySlice} from './financialQuality.js';
const period=s=>s.year*4+(s.type==='annual'?4:s.quarter||0);
const receipt=url=>{try{const u=new URL(url),id=u.searchParams.get('rcpNo');return u.protocol==='https:'&&u.hostname==='dart.fss.or.kr'&&/^\d{14}$/.test(id||'')?id:null;}catch{return null;}};
export function filingSnapshot(data){
 const comparison=compareReports(data);
 if(!comparison.available)return null;
 const s=qualitySlice(data,comparison.selection,comparison.slices[0]);
 const values=row=>Object.fromEntries(['revenue','operatingProfit','netIncome','operatingCashFlow','inventories','receivables'].map(key=>[key,number(row[key])]));
 return {type:comparison.selection.type,year:s.year,quarter:s.type==='interim'?data.interim.quarter:null,label:comparison.selection.label,basis:s.basis,currency:s.currency,sourceUrl:s.sourceUrl,current:values(s.current),previous:values(s.previous)};
}
export function filingChanges(old,current){
 if(!current)return {kind:'unavailable'};
 if(!old)return {kind:'first',previous:current.previous};
 if(old.currency!==current.currency||old.basis!==current.basis)return {kind:'incompatible'};
 if(period(current)<period(old))return {kind:'older'};
 if(old.type!==current.type||old.year!==current.year||old.quarter!==current.quarter)return {kind:'new',previous:current.previous};
 if(receipt(old.sourceUrl)&&receipt(current.sourceUrl)&&receipt(current.sourceUrl)<receipt(old.sourceUrl))return {kind:'older'};
 const priorChanged=Object.keys(current.previous||{}).filter(key=>(old.previous||{})[key]!==current.previous[key]);
 if(old.sourceUrl===current.sourceUrl&&JSON.stringify(old.current)===JSON.stringify(current.current)&&!priorChanged.length)return {kind:'same',previous:current.previous};
 return {kind:'corrected',previous:old.current,priorChanged};
}
export function evaluateCondition(condition,reports){
 const comparison=compareReports(reports[0],condition.peer?reports[1]||{available:false}:null);
 if(!comparison.available)return {matched:null,reason:comparison.reason};
 const slices=comparison.slices.map((s,i)=>qualitySlice(reports[i],comparison.selection,s)),s=slices[0];
 const observed={type:comparison.selection.type,year:s.year,quarter:s.type==='interim'?reports[0].interim.quarter:null,label:comparison.selection.label,basis:s.basis,currency:s.currency,sourceUrls:slices.map(s=>s.sourceUrl)};
 const baseline=condition.baseline;
 if(!observed.basis||!observed.currency||observed.sourceUrls.some(url=>!receipt(url)))return {...observed,matched:null,reason:'공시 기준 또는 원문 출처가 없어 근거를 확인할 수 없어요.'};
 if(baseline&&(baseline.type!==observed.type||baseline.basis!==observed.basis||baseline.currency!==observed.currency||period(observed)<period(baseline)))return {...observed,matched:null,reason:'저장한 근거보다 과거 자료이거나 재무제표·기간 기준이 달라 확인할 수 없어요.'};
 if(baseline&&period(observed)===period(baseline)&&observed.sourceUrls.some((url,i)=>receipt(baseline.sourceUrls?.[i])&&receipt(url)<receipt(baseline.sourceUrls[i])))return {...observed,matched:null,reason:'저장한 근거의 정정 공시보다 과거 원문이어서 확인할 수 없어요.'};
 const valueFor=(slice,key)=>key==='margin'?number(slice.margin):key==='operatingCashFlow'?number(slice.current.operatingCashFlow):number(slice[key]?.value);
 const value=valueFor(s,condition.key),reference=condition.peer?valueFor(slices[1],condition.key):condition.key==='margin'?number(s.priorMargin):0;
 if(value===null||reference===null)return {...observed,matched:null,value,reference,reason:'비교에 필요한 수치가 없거나 증감률을 계산할 수 없어요.'};
 return {...observed,value,reference,matched:condition.key==='margin'?value>=reference:value>reference};
}
export function conditionChoices(companies,reports){
 const peer=companies[1]||null;
 return [['revenueGrowth',peer?'매출 증가율이 비교 회사보다 높다':'매출이 전년 같은 기간보다 증가한다'],['profitGrowth',peer?'영업이익 증가율이 비교 회사보다 높다':'영업이익이 전년 같은 기간보다 증가한다'],['margin',peer?'영업이익률이 비교 회사 이상이다':'영업이익률이 전년 같은 기간 이상이다'],...(!peer?[['operatingCashFlow','영업현금흐름이 양수다']]:[])].map(([key,label])=>{
  const rule={key,label,peer};return {...rule,baseline:evaluateCondition(rule,reports)};
 });
}
