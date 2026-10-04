import { api } from './api.js';
import { normalizeExportItemDetail, normalizeExportProvisionalRadar, normalizeExportSnapshot, normalizeSemiconductorCountryMatrix } from './exportMomentumModel.js';

export async function loadExportMomentumSnapshot({force=false}={}){
  // Separate corrected signed balances from browser HTTP caches of the old calculation.
  const raw=await api('/api/export-momentum?balanceBasis=signed-v1',{
    ttlMs:300000,
    timeoutMs:30000,
    retries:0,
    force,
  });
  const payload=normalizeExportSnapshot(raw);
  if(!payload.period||payload.summary.exportsUsdBillion===null){
    throw new Error('관세청 수출 데이터가 아직 준비되지 않았어요.');
  }
  return payload;
}

export const exportMomentumApiPath='/api/export-momentum';


export async function loadExportItemDetail(key,{force=false}={}){
  const encoded=encodeURIComponent(String(key||'').trim());
  if(!encoded)throw new Error('조회할 품목이 없어요.');
  const raw=await api('/api/export-momentum/item-detail?key='+encoded+'&balanceBasis=signed-v1',{
    ttlMs:600000,
    timeoutMs:45000,
    retries:0,
    force,
  });
  const payload=normalizeExportItemDetail(raw);
  if(!payload.key||!payload.history.length)throw new Error('품목 상세 데이터가 아직 준비되지 않았어요.');
  return payload;
}


export async function loadSemiconductorCountryMatrix({force=false}={}){
  const raw=await api('/api/export-momentum/semiconductor-countries',{
    ttlMs:900000,
    timeoutMs:45000,
    retries:0,
    force,
  });
  const payload=normalizeSemiconductorCountryMatrix(raw);
  if(!payload.period||!payload.segments.length)throw new Error('반도체 국가별 데이터가 아직 준비되지 않았어요.');
  return payload;
}


export async function loadExportProvisionalRadar({force=false}={}){
  const raw=await api('/api/export-momentum/provisional',{
    ttlMs:300000,
    timeoutMs:30000,
    retries:0,
    force,
  });
  const payload=normalizeExportProvisionalRadar(raw);
  if(!payload.period||!payload.checkpoints.length)throw new Error('10일 단위 잠정 수출 데이터가 아직 준비되지 않았어요.');
  return payload;
}


export async function loadMemorySpot({force=false}={}){
  const raw=await api('/api/memory-prices',{
    ttlMs:900000,
    timeoutMs:12000,
    retries:0,
    force,
  });
  if(!raw||!Array.isArray(raw.items)||!raw.items.length){
    throw new Error('DRAM 현물가 데이터가 아직 준비되지 않았어요.');
  }
  return {
    ...raw,
    history:Array.isArray(raw.history)?raw.history:[],
  };
}
