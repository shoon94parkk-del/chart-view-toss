import { normalizeExportSnapshot } from './exportMomentumModel.js';

const SNAPSHOT_URL='/data/export-momentum.json';

export async function loadExportMomentumSnapshot({force=false}={}){
  const response=await fetch(SNAPSHOT_URL,{
    headers:{Accept:'application/json'},
    cache:force?'reload':'no-cache',
  });
  if(!response.ok)throw new Error('수출 데이터를 불러오지 못했어요.');
  const payload=normalizeExportSnapshot(await response.json());
  if(!payload.period||payload.summary.exportsUsdBillion===null){
    throw new Error('표시할 수출 데이터가 아직 준비되지 않았어요.');
  }
  return payload;
}

export const exportMomentumSnapshotUrl=SNAPSHOT_URL;
