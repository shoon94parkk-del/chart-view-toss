import {createRequestClient} from './requestClient.js';
// Configure only after deploying the data-only CDN and verifying its CORS/freshness.
export const STATIC_DATA_BASE=(import.meta.env.VITE_CHARTVIEW_STATIC_DATA_BASE||'').replace(/\/$/,'');
const request=createRequestClient({base:STATIC_DATA_BASE});
export async function staticData(filename,fallback){
 if(!STATIC_DATA_BASE)return fallback();
 try {
  const data=await request(`/${filename}`,{ttlMs:60000,timeoutMs:2500,retries:0});
  if(filename==='screener.json'&&!Array.isArray(data.stocks))throw new Error('Invalid screener');
  if(filename==='heatmap.json'&&!Array.isArray(data.sectors))throw new Error('Invalid heatmap');
  return data;
 }catch { return fallback(); }
}
