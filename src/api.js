import { createRequestClient } from './requestClient.js';
import { recordMetric } from './diagnostics.js';
import { staticData } from './staticData.js';
import { earlyHome } from './homeFastCache.js';
import { searchAlias, verifiedSearchRows } from './searchIdentity.js';
export { ApiError } from './requestClient.js';
export const API_BASE=(import.meta.env?.VITE_CHARTVIEW_API_BASE||'https://chart-view-pkv8.onrender.com').replace(/\/$/,'');
const DEFAULT_TIMEOUT_MS=Number(import.meta.env?.VITE_CHARTVIEW_API_TIMEOUT_MS||12000);
const DEFAULT_RETRIES=1;
const request=createRequestClient({base:API_BASE});
export const api=async(path,options={})=>{
 const start=performance.now();
 const label=path.split('?')[0].replace('/api/','api.').replace('/static/data/','data.');
 try { const value=await request(path,{timeoutMs:DEFAULT_TIMEOUT_MS,retries:DEFAULT_RETRIES,...options}); recordMetric(label,start); return value; }
 catch(error){recordMetric(label,start,'error');throw error;}
};
export const clearApiCache=()=>request.clear();
const list=tickers=>encodeURIComponent([...new Set(tickers)].join(','));
export const quoteSnapshots=(tickers,{force=false}={})=>api(`/api/quotes?tickers=${list(tickers)}`,{ttlMs:15000,force});
export const quoteSnapshotsLive=tickers=>api(`/api/quotes?tickers=${list(tickers)}&fresh=true`,{ttlMs:0,force:true,timeoutMs:5000,retries:0});
export const compareStocks=(tickers,period='1mo',range={}, {force=false}={})=>api(`/api/compare?tickers=${list(tickers)}&period=${encodeURIComponent(period)}${range.start&&range.end?`&start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`:''}`,{ttlMs:60000,timeoutMs:8000,retries:0,force});
export const searchStocks=async(query,{force=false,signal}={})=>{
 const options={timeoutMs:8000,retries:0,ttlMs:60000,force,signal};
 const alias=searchAlias(query);
 const requests=[
   api(`/api/search?q=${encodeURIComponent(query)}`,options),
 ];
 if(alias)requests.push(api(`/api/search?q=${alias}`,options));
 const settled=await Promise.allSettled(requests);
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 const failures=settled.filter(result=>result.status==='rejected').map(result=>result.reason);
 const aborted=failures.find(error=>error?.name==='AbortError');
 if(aborted)throw aborted;
 const [original,aliasResult]=settled.map(result=>result.status==='fulfilled'?result.value:null);
 if(settled.every(result=>result.status==='rejected'))throw failures[0];
 let verificationError=null;
 const rows=[...(aliasResult?.results||[]),...(original?.results||[])];
 const results=await verifiedSearchRows(rows,tickers=>api(`/api/quotes?tickers=${list(tickers)}`,{timeoutMs:5000,retries:0,ttlMs:60000,force,signal}),{onVerificationError:error=>{verificationError=error;}});
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 // An empty surviving response cannot establish that the failed source also
 // had no matches. Keep a real retryable error instead of a false empty state.
 if(failures.length&&!results.length)throw failures[0];
 const unverifiedDirect=rows.filter(row=>row.type==='DIRECT'&&!results.some(result=>result.symbol===row.symbol)).map(row=>row.symbol);
 return {...(original||aliasResult),results,unverifiedDirect,...(failures.length||verificationError?{partialFailure:true}:{})};
};
export const marketNow=()=>earlyHome('market',()=>api('/api/market-now',{ttlMs:15000}));
export const marketNowLive=()=>api('/api/market-now',{ttlMs:0,force:true,timeoutMs:5000,retries:0});
export const homeSnapshot=({force=false}={})=>force?api('/api/home-snapshot',{ttlMs:60000,force:true}):earlyHome('snapshot',()=>api('/api/home-snapshot',{ttlMs:60000}));
export const homeBootstrap=()=>earlyHome('bootstrap',()=>api('/api/home-bootstrap',{ttlMs:60000}));
export const pickMonitor=()=>staticData('pick_monitor.json',()=>api('/static/data/pick_monitor.json',{ttlMs:60000,timeoutMs:5000,retries:0}));
export const visitorActivity=(visitorId,surface='other')=>api('/api/activity',{
 method:'POST',
 headers:{'Content-Type':'application/json'},
 body:JSON.stringify({visitorId,surface}),
 timeoutMs:4000,
 retries:0,
});
export const homeLive=()=>api('/api/home-live',{ttlMs:0,force:true,timeoutMs:5000,retries:0});
export const homeHeatmap=()=>api('/api/heatmap',{ttlMs:60000});
export const fullHeatmap=({force=false}={})=>api('/api/heatmap/full',{ttlMs:15000,force});
export const valuationStocks=tickers=>api(`/api/valuation?tickers=${list(tickers)}`,{ttlMs:300000});
export const macroData=({force=false}={})=>api('/api/macro',{ttlMs:300000,force});
export const homeInsights=(tickers=[])=>api(`/api/home-insights?tickers=${list(tickers)}`,{ttlMs:60000});
export const personalizedNews=(tickers=[],names=[])=>api(`/api/personalized-news?tickers=${list(tickers)}&names=${encodeURIComponent(names.join('|'))}`,{timeoutMs:10000,retries:0,ttlMs:60000});
export const screenerData=()=>staticData('screener.json',()=>api('/static/data/screener.json',{ttlMs:60000}));
export const guruScreeningData=({force=false}={})=>force?api('/static/data/guru_screening.json',{ttlMs:60000,force:true}):staticData('guru_screening.json',()=>api('/static/data/guru_screening.json',{ttlMs:60000}));
export const guruEvidenceData=(ticker,version,{force=false}={})=>api(`/api/guru-investing/${encodeURIComponent(ticker)}?version=${encodeURIComponent(version)}`,{ttlMs:300000,force,timeoutMs:8000,retries:0});
export const companyContextData=()=>staticData('company_context.json',()=>api('/static/data/company_context.json',{ttlMs:3600000}));
export const businessReportData=(ticker,name='',{force=false}={})=>api(`/api/business-report?ticker=${encodeURIComponent(ticker)}&name=${encodeURIComponent(name)}`,{ttlMs:300000,timeoutMs:45000,retries:0,force});
export const financialHistoryData=(ticker,{force=false}={})=>api(`/api/financial-history?ticker=${encodeURIComponent(ticker)}`,{ttlMs:300000,timeoutMs:35000,retries:0,force});
export const financialQuartersData=(ticker,{refresh=false}={})=>api(`/api/financial-quarters?ticker=${encodeURIComponent(ticker)}${refresh?'&refresh=true':''}`,{ttlMs:0,force:true,timeoutMs:8000,retries:0});
export const relationshipEvidenceData=(ticker,name='',{force=false}={})=>api(`/api/relationship-evidence?ticker=${encodeURIComponent(ticker)}&name=${encodeURIComponent(name)}${force?'&force=true':''}`,{ttlMs:21600000,timeoutMs:18000,retries:0,force});
export const heatmapData=()=>staticData('heatmap.json',()=>api('/static/data/heatmap.json',{ttlMs:60000}));
export const consensusData=ticker=>api(`/api/consensus?ticker=${encodeURIComponent(ticker)}`,{ttlMs:300000});
export const valuationBandData=(ticker,years=3)=>api(`/api/valuation-band?ticker=${encodeURIComponent(ticker)}&years=${years}`,{ttlMs:300000});
