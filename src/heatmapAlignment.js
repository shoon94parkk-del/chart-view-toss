import {rememberLiveQuotes,mergeRowsWithLive} from './liveQuoteStore.js';
export function alignHeatmapQuotes(full,home){
 rememberLiveQuotes(full?.results||[],{priority:10});
 rememberLiveQuotes(home?.heatmap?.results||[],{priority:20});
 return {...full,results:mergeRowsWithLive(full?.results||[])};
}

// Retain dated canonical observations while the server fills a partial batch.
// A complete batch replaces the universe; no price or change is synthesized.
export function mergeHeatmapProgress(previous,incoming){
 if(incoming?.complete!==false)return incoming;
 const valid=row=>row&&['KR','US'].includes(row.market)&&typeof row.ticker==='string'&&Number.isFinite(row.price)&&row.price>0&&Number.isFinite(row.change)&&Number.isFinite(row.marketCap)&&row.marketCap>0&&Number.isFinite(Date.parse(row.asOf))&&row.source;
 const fresh=(incoming.results||[]).filter(valid),seen=new Set(fresh.map(row=>row.ticker));
 const retained=(previous?.results||[]).filter(row=>valid(row)&&!seen.has(row.ticker));
 rememberLiveQuotes(previous?.results||[],{priority:10});
 rememberLiveQuotes(fresh,{priority:10});
 const rows=mergeRowsWithLive(fresh.concat(retained)).map(row=>({...row,retained:!seen.has(row.ticker)}));
 const results=['KR','US'].flatMap(market=>rows.filter(row=>row.market===market).slice(0,market==='KR'?20:40));
 return {...incoming,results,partialCoverage:Object.fromEntries(['KR','US'].map(market=>[market,{received:fresh.filter(row=>row.market===market).length,retained:results.filter(row=>row.market===market&&row.retained).length}]))};
}
