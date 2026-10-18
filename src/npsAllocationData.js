import {createRequestClient} from './requestClient.js';
import {API_BASE} from './api.js';
import {STATIC_DATA_BASE} from './staticData.js';
import {chooseNpsPublication,validateNpsHoldings} from './npsAllocationModel.js';
const cdn=createRequestClient({base:STATIC_DATA_BASE});
const backend=createRequestClient({base:API_BASE});
async function readPublished(filename,{signal,force=false}={}) {
 const options={signal,force,ttlMs:0,retries:0,cache:force?'reload':'no-cache'};
 if(STATIC_DATA_BASE){
  try{return await cdn('/'+filename,{...options,timeoutMs:3000});}
  catch(error){if(signal?.aborted||error?.name==='AbortError')throw error;}
 }
 return backend('/static/data/'+filename,{...options,timeoutMs:6000});
}
export function createNpsDataClient({read=readPublished}={}) {
 let last=null;const details=new Map();
 return {
  async summary(options={}) {
   const incoming=await read('nps/summary.json',options);
   last=chooseNpsPublication(last,incoming);return last;
  },
  async holdings(summary,options={}) {
   const key=summary.snapshotVersion;
   if(!options.force&&details.has(key))return details.get(key);
   const data=validateNpsHoldings(await read('nps/'+summary.filing.detailsFile,options),summary);
   details.set(key,data);while(details.size>3)details.delete(details.keys().next().value);
   return data;
  },
 };
}
const client=createNpsDataClient();
export const npsSummaryData=options=>client.summary(options);
export const npsHoldingsData=(summary,options)=>client.holdings(summary,options);
