import { api } from './api.js';
import { normalizeExportItemDetail, normalizeExportSnapshot } from './exportMomentumModel.js';

export async function loadExportMomentumSnapshot({force=false}={}){
  const raw=await api('/api/export-momentum',{
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
  const raw=await api('/api/export-momentum/item-detail?key='+encoded,{
    ttlMs:600000,
    timeoutMs:45000,
    retries:0,
    force,
  });
  const payload=normalizeExportItemDetail(raw);
  if(!payload.key||!payload.history.length)throw new Error('품목 상세 데이터가 아직 준비되지 않았어요.');
  return payload;
}
