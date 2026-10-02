import { api } from './api.js';
import { normalizeExportSnapshot } from './exportMomentumModel.js';

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
