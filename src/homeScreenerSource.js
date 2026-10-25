import {api} from './api.js';

const valid=value=>value?.schemaVersion===1&&Number.isSafeInteger(value?.counts?.volumeSurge)&&value.counts.volumeSurge>=0;
const ready=value=>valid(value)&&!value.pending&&!value.refreshing&&!value.refreshScheduled&&!value.error&&value.available!==false&&!['pending','loading','error'].includes(value.status);

export async function homeScreenerSummary({force=false}={}){
 const value=await api('/api/home-screener-summary',{ttlMs:30000,force,timeoutMs:9000,retries:0,cacheIf:ready});
 if(!valid(value))throw new Error('Home screener summary has an invalid schema or count');
 if(value.error||value.available===false||value.status==='error')throw new Error('Home screener summary is unavailable');
 return value;
}
