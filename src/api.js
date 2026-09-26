import { createRequestClient } from './requestClient.js';
import { recordMetric } from './diagnostics.js';
import { staticData } from './staticData.js';
import { earlyHome } from './homeFastCache.js';
export { ApiError } from './requestClient.js';
export const API_BASE=(import.meta.env.VITE_CHARTVIEW_API_BASE||'https://chart-view-pkv8.onrender.com').replace(/\/$/,'');
const DEFAULT_TIMEOUT_MS=Number(import.meta.env.VITE_CHARTVIEW_API_TIMEOUT_MS||12000);
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
export const quoteSnapshots=tickers=>api(`/api/quotes?tickers=${list(tickers)}`,{ttlMs:15000});
export const compareStocks=(tickers,period='1mo',range={})=>api(`/api/compare?tickers=${list(tickers)}&period=${encodeURIComponent(period)}${range.start&&range.end?`&start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`:''}`,{ttlMs:60000});
export const searchStocks=query=>api(`/api/search?q=${encodeURIComponent(query)}`,{timeoutMs:8000,retries:0,ttlMs:60000});
export const marketNow=()=>earlyHome('market',()=>api('/api/market-now',{ttlMs:15000}));
export const homeSnapshot=()=>earlyHome('snapshot',()=>api('/api/home-snapshot',{ttlMs:60000}));
export const homeBootstrap=()=>earlyHome('bootstrap',()=>api('/api/home-bootstrap',{ttlMs:60000}));
export const homeHeatmap=()=>api('/api/heatmap',{ttlMs:60000});
export const fullHeatmap=({force=false}={})=>api('/api/heatmap/full',{ttlMs:15000,force});
export const valuationStocks=tickers=>api(`/api/valuation?tickers=${list(tickers)}`,{ttlMs:300000});
export const macroData=()=>api('/api/macro',{ttlMs:300000});
export const homeInsights=(tickers=[])=>api(`/api/home-insights?tickers=${list(tickers)}`,{ttlMs:60000});
export const personalizedNews=(tickers=[],names=[])=>api(`/api/personalized-news?tickers=${list(tickers)}&names=${encodeURIComponent(names.join('|'))}`,{timeoutMs:10000,retries:0,ttlMs:60000});
export const screenerData=()=>staticData('screener.json',()=>api('/static/data/screener.json',{ttlMs:60000}));
export const heatmapData=()=>staticData('heatmap.json',()=>api('/static/data/heatmap.json',{ttlMs:60000}));
export const consensusData=ticker=>api(`/api/consensus?ticker=${encodeURIComponent(ticker)}`,{ttlMs:300000});
export const valuationBandData=(ticker,years=3)=>api(`/api/valuation-band?ticker=${encodeURIComponent(ticker)}&years=${years}`,{ttlMs:300000});
