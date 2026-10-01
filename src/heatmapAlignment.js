import {rememberLiveQuotes,mergeRowsWithLive} from './liveQuoteStore.js';
export function alignHeatmapQuotes(full,home){
 rememberLiveQuotes(full?.results||[],{priority:10});
 rememberLiveQuotes(home?.heatmap?.results||[],{priority:20});
 return {...full,results:mergeRowsWithLive(full?.results||[])};
}
