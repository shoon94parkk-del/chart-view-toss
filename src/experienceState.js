// Only public view conditions belong in links. Device notes and watchlists never do.
const symbolPattern=/^[A-Z0-9^][A-Z0-9.^=\-]{0,29}$/;
const periods=new Set(['1mo','3mo','6mo','1y','5y','max']);
const shareTabs=new Set(['chart','detail','discover','valuation','consensus','bands','news']);
const filterKeys=['query','market','rsiMin','rsiMax','volumeMin','ret20Min','valueMin','trend','signal','sort','priceBasis'];
export function encodeSharedView(state){
 if(!shareTabs.has(state.tab))return '';
 const view={tab:state.tab};
 if(['chart','valuation','consensus','bands'].includes(state.tab))view.selected=state.selected||[];
 if(state.tab==='chart'){view.period=state.period;view.customRange=state.customRange||null;}
 if(state.tab==='detail'){view.detailSymbol=state.detailSymbol;view.detailPeriod=state.detailPeriod;view.researchPeer=state.researchPeer||null;}
 if(state.tab==='discover')view.screener=state.screener||{};
 if(state.tab==='valuation')view.valuationMetric=state.valuationMetric;
 if(state.tab==='consensus')view.consensusPeriod=state.consensusPeriod;
 if(state.tab==='bands')view.band=state.band;
 if(state.tab==='news'){view.newsSymbol=state.newsSymbol;view.newsSort=state.newsSort;}
 return JSON.stringify(view);
}
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export function decodeSharedView(raw){
 try{
  if(!raw||raw.length>3000)return null;
  const x=JSON.parse(raw);if(!shareTabs.has(x?.tab))return null;
  const view={tab:x.tab};
  if(x.selected!==undefined){if(!Array.isArray(x.selected)||x.selected.length>6||x.selected.some(s=>typeof s!=='string'||!symbolPattern.test(s)))return null;view.selected=[...new Set(x.selected)];}
  for(const key of ['detailSymbol','newsSymbol'])if(x[key]){if(typeof x[key]!=='string'||!symbolPattern.test(x[key]))return null;view[key]=x[key];}
  for(const key of ['period','detailPeriod'])if(x[key]){if(!periods.has(x[key]))return null;view[key]=x[key];}
  if(x.customRange){const r=x.customRange;if(!validDate(r.start)||!validDate(r.end)||r.start>r.end)return null;view.customRange={start:r.start,end:r.end};}
  else if(x.tab==='chart')view.customRange=null;
  if(x.researchPeer){if(typeof x.researchPeer.symbol!=='string'||!symbolPattern.test(x.researchPeer.symbol))return null;view.researchPeer={symbol:x.researchPeer.symbol,name:String(x.researchPeer.name||x.researchPeer.symbol).slice(0,80)};}
  if(x.screener){view.screener={filters:{}};for(const k of filterKeys)if(x.screener.filters?.[k]!=null)view.screener.filters[k]=String(x.screener.filters[k]).slice(0,100);view.screener.count=Math.min(300,Math.max(30,Number(x.screener.count)||30));view.screener.activePreset=String(x.screener.activePreset||'').slice(0,40);}
  if(['forwardPE','trailingPE','pbr','roe','dividendYield'].includes(x.valuationMetric))view.valuationMetric=x.valuationMetric;
  if(['0y','+1y','0q','+1q'].includes(x.consensusPeriod))view.consensusPeriod=x.consensusPeriod;
  if(x.band&&symbolPattern.test(x.band.symbol||'')&&[3,5,10].includes(x.band.years)&&['per','pbr'].includes(x.band.metric))view.band={symbol:x.band.symbol,years:x.band.years,metric:x.band.metric};
  if(['major','latest'].includes(x.newsSort))view.newsSort=x.newsSort;
  return view;
 }catch{return null;}
}
export function homeBriefState(home,{pending=false,failed=false}={}){
 if(home?.macro?.summary?.text)return {status:'ready'};
 if(pending)return {status:'loading',text:'시장 요약을 확인하고 있어요'};
 return failed?{status:'error',text:'시장 요약을 불러오지 못했어요'}:{status:'empty',text:'현재 제공되는 시장 요약이 없어요'};
}
export function revenueMixBasis(report={}){
 const shareSum=Math.round((report.items||[]).reduce((sum,item)=>sum+(Number(item.share)||0),0)*100)/100;
 const basis=report.revenueBasis;
 const verified=basis?.reconciled===true&&Number.isFinite(basis.totalAmount)&&basis.totalAmount>0&&Number.isFinite(basis.positiveSegmentTotal)&&Number.isFinite(basis.adjustmentAmount)&&Math.abs(basis.positiveSegmentTotal+basis.adjustmentAmount-basis.totalAmount)<=basis.totalAmount*.01;
 return {shareSum,basis,status:verified?(basis.adjustmentAmount?'adjusted':'verified'):shareSum>101?'unverified':'unspecified'};
}
export function quoteBasisLabel(quote={}){
 if(!quote)return '시세 확인 필요';
 if(quote.priceBasis==='regular_close')return '정규장 종가';
 if(quote.sessionType==='after_hours')return '시간외 시세';
 if(quote.sessionType==='regular')return '정규장 시세';
 return '제공처 최신 시세';
}
