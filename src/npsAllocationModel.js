// All monetary portfolio values use KRW trillions; returns use percentage units.
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const positive=value=>finite(value)&&value>0;
const near=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<=Math.max(1e-6,Math.abs(b)*1e-8);
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const required=['baseTotal','baseDomestic','baseKospi','kospi','target','saa','taa','beta','otherReturn','fxReturn','hedgeRatio','netFlow','domesticFlow','equityReturn','bondReturn','domesticBondReturn','alternativeReturn','cashReturn'];
const returns=new Set(['equityReturn','bondReturn','domesticBondReturn','alternativeReturn','cashReturn']);
const fail=()=>{throw new Error('국민연금 자료의 기준·수치를 확인하지 못했어요.');};
function inputsFor(data,patch={}) {
 const s={...data.inputs,...patch};
 if(!required.every(k=>finite(s[k]))||!positive(s.baseTotal)||!positive(s.baseDomestic)||s.baseDomestic>=s.baseTotal||!positive(s.baseKospi)||!positive(s.kospi)||s.kospi>100000||s.target<=0||s.target>=100||s.saa<0||s.taa<0||s.target+s.saa+s.taa>=100||s.beta<.1||s.beta>3||s.fxReturn<=-100||s.otherReturn<=-100||s.hedgeRatio<0||s.hedgeRatio>100||[...returns].some(k=>s[k]<=-100))fail();
 return s;
}
export function calculateNpsScenario(data,patch={}) {
 const s=inputsFor(data,patch),baseOther=s.baseTotal-s.baseDomestic;
 if(!Array.isArray(data.assetBaseline)||!data.assetBaseline.length)fail();
 const originalOther=data.assetBaseline.reduce((sum,a)=>sum+a.base,0);
 if(!positive(originalOther))fail();
 const assets=data.assetBaseline.map(a=>{
  if(!finite(a.base)||a.base<0||!returns.has(a.returnKey)||!finite(a.foreignShare)||a.foreignShare<0||a.foreignShare>1)fail();
  const base=a.base*baseOther/originalOther,returnPercent=s[a.returnKey];
  const marketGain=base*returnPercent/100;
  const fxGain=(base+marketGain)*a.foreignShare*(1-s.hedgeRatio/100)*s.fxReturn/100;
  const overlayGain=(base+marketGain+fxGain)*s.otherReturn/100;
  return {...a,base,returnPercent,marketGain,fxGain,overlayGain,projected:base+marketGain+fxGain+overlayGain};
 });
 const otherBeforeFlows=assets.reduce((sum,a)=>sum+a.projected,0);
 const domestic=s.baseDomestic*Math.pow(s.kospi/s.baseKospi,s.beta)+s.domesticFlow;
 const other=otherBeforeFlows+s.netFlow-s.domesticFlow,total=domestic+other;
 if(![domestic,other,total].every(finite)||domestic<0||other<0||total<=0)fail();
 const threshold=percent=>{
  const needed=(percent/100*(otherBeforeFlows+s.netFlow-s.domesticFlow)/(1-percent/100)-s.domesticFlow)/s.baseDomestic;
  return needed>0?s.baseKospi*Math.pow(needed,1/s.beta):null;
 };
 const weight=domestic/total*100;
 return {domestic,other,total,weight,gap:weight-s.target,adjustment:s.target/100*total-domestic,targetKospi:threshold(s.target),saaKospi:threshold(s.target+s.saa),taaKospi:threshold(s.target+s.saa+s.taa),assets,otherBeforeFlows,marketGain:assets.reduce((sum,a)=>sum+a.marketGain,0),fxGain:assets.reduce((sum,a)=>sum+a.fxGain,0)};
}
export function validateNpsSummary(data) {
 if(!data||data.schemaVersion!==1||!/^[-a-zA-Z0-9]{12,80}$/.test(data.snapshotVersion||'')||!date(data.marketDate)||!date(data.baseline?.date)||data.baseline.date>data.marketDate||!Number.isFinite(Date.parse(data.generatedAt))||data.marketDate>data.generatedAt.slice(0,10))fail();
 const s=inputsFor(data),f=data.filing;
 if(!f||!date(f.reportDate)||!date(f.filedDate)||f.reportDate>f.filedDate||f.filedDate>data.generatedAt.slice(0,10)||!Number.isInteger(f.totalCount)||f.totalCount<1||!Number.isInteger(f.directCount)||f.directCount<0||f.directCount>f.totalCount||![f.reportCoveragePct,f.overseasCoveragePct].every(v=>finite(v)&&v>=0&&v<=100)||!positive(f.totalValueUSD)||!/^holdings-[a-zA-Z0-9-]{12,80}\.json$/.test(f.detailsFile||''))fail();
 if(!near(data.baseline.total,s.baseTotal)||!near(data.baseline.domestic,s.baseDomestic)||!near(data.baseline.kospi,s.baseKospi)||!near(data.assetBaseline.reduce((sum,a)=>sum+a.base,0),s.baseTotal-s.baseDomestic))fail();
 const computed=calculateNpsScenario(data);
 for(const k of ['weight','gap','adjustment','total','domestic','other'])if(!near(data.result?.[k],computed[k]))fail();
 if(!Array.isArray(data.sources)||!Array.isArray(data.warnings)||data.warnings.some(w=>typeof w!=='string'))fail();
 return data;
}
export function chooseNpsPublication(current,incoming) {
 validateNpsSummary(incoming);
 if(current&&(incoming.marketDate<current.marketDate||(incoming.marketDate===current.marketDate&&Date.parse(incoming.generatedAt)<Date.parse(current.generatedAt))))return current;
 return incoming;
}
export function validateNpsHoldings(details,summary) {
 if(!details||details.snapshotVersion!==summary.snapshotVersion||!Array.isArray(details.rows)||details.rows.length!==summary.filing.totalCount)fail();
 const seen=new Set();let reported=0,direct=0;
 for(const r of details.rows){
  if(typeof r.ticker!=='string'||!r.ticker||typeof r.issuer!=='string'||!finite(r.shares)||r.shares<0||!finite(r.reportValueUSD)||r.reportValueUSD<0||!finite(r.weightPct)||r.weightPct<0||!['direct','residual'].includes(r.method)||seen.has(r.cusip||r.ticker))fail();
  seen.add(r.cusip||r.ticker);reported+=r.reportValueUSD;
  if(r.method==='direct'){direct++;if(!finite(r.totalReturnPct)||r.totalReturnPct< -100||!finite(r.currentValueUSD)||r.currentValueUSD<0)fail();}
  else if(r.totalReturnPct!==null||r.currentValueUSD!==null)fail();
 }
 if(!near(reported,summary.filing.totalValueUSD)||direct!==summary.filing.directCount)fail();
 return details;
}
export function npsFreshness(summary,now=Date.now()) {
 const ageDays=Math.floor((now-Date.parse(summary.marketDate+'T00:00:00Z'))/86400000);
 return {ageDays,stale:ageDays>4,priceDate:summary.marketDate};
}
