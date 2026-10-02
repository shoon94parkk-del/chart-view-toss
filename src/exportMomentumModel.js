const finite=(value)=>{
  const number=Number(value);
  return Number.isFinite(number)?number:null;
};

const text=(value)=>String(value??'').trim();

const normalizeMetric=(raw={})=>({
  exportsUsdBillion:finite(raw.exportsUsdBillion),
  importsUsdBillion:finite(raw.importsUsdBillion),
  balanceUsdBillion:finite(raw.balanceUsdBillion),
  exportYoY:finite(raw.exportYoY),
  importYoY:finite(raw.importYoY),
});

export function normalizeExportSnapshot(raw={}){
  const summary=normalizeMetric(raw.summary);
  summary.cumulativeExportsUsdBillion=finite(raw.summary?.cumulativeExportsUsdBillion);
  summary.cumulativeBalanceUsdBillion=finite(raw.summary?.cumulativeBalanceUsdBillion);
  summary.nonSemiconductorYoY=finite(raw.summary?.nonSemiconductorYoY);
  summary.nonSemiconductorAndComputerYoY=finite(raw.summary?.nonSemiconductorAndComputerYoY);
  summary.risingMajorItems=finite(raw.summary?.risingMajorItems);
  summary.majorItemCount=finite(raw.summary?.majorItemCount);

  const checkpoints=(Array.isArray(raw.checkpoints)?raw.checkpoints:[])
    .map(row=>({
      label:text(row?.label),
      endDate:text(row?.endDate),
      ...normalizeMetric(row),
      semiconductorUsdBillion:finite(row?.semiconductorUsdBillion),
    }))
    .filter(row=>row.label&&row.exportsUsdBillion!==null);

  const items=(Array.isArray(raw.items)?raw.items:[])
    .map(row=>({
      name:text(row?.name),
      exportsUsdBillion:finite(row?.exportsUsdBillion),
      exportYoY:finite(row?.exportYoY),
      note:text(row?.note),
    }))
    .filter(row=>row.name&&row.exportYoY!==null);

  const regions=(Array.isArray(raw.regions)?raw.regions:[])
    .map(row=>({
      name:text(row?.name),
      exportsUsdBillion:finite(row?.exportsUsdBillion),
      exportYoY:finite(row?.exportYoY),
      note:text(row?.note),
    }))
    .filter(row=>row.name&&row.exportYoY!==null);

  const sources=(Array.isArray(raw.sources)?raw.sources:[])
    .map(row=>({name:text(row?.name),url:text(row?.url),role:text(row?.role)}))
    .filter(row=>row.name&&/^https:\/\//.test(row.url));

  return {
    schemaVersion:Number(raw.schemaVersion)||1,
    status:text(raw.status)||'unknown',
    period:text(raw.period),
    periodLabel:text(raw.periodLabel)||text(raw.period),
    publishedAt:text(raw.publishedAt),
    updatedAt:text(raw.updatedAt),
    basis:text(raw.basis)||'통관기준 잠정치',
    summary,
    checkpoints,
    items,
    regions,
    sources,
  };
}

export function formatUsdBillion(value,{digits=1}={}){
  const number=finite(value);
  if(number===null)return '-';
  const hundredMillion=number*10;
  return hundredMillion.toLocaleString('ko-KR',{
    maximumFractionDigits:digits,
    minimumFractionDigits:Number.isInteger(hundredMillion)?0:Math.min(1,digits),
  })+'억달러';
}

export function formatSignedPct(value,{digits=1}={}){
  const number=finite(value);
  if(number===null)return '-';
  return `${number>0?'+':''}${number.toFixed(digits)}%`;
}

export function yoyTone(value){
  const number=finite(value);
  if(number===null||number===0)return 'flat';
  return number>0?'up':'down';
}

export function yoyLabel(value){
  const number=finite(value);
  if(number===null)return '증감률 미제공';
  if(number>=50)return '전년비 급증';
  if(number>=10)return '전년비 강세';
  if(number>0)return '전년비 증가';
  if(number<=-10)return '전년비 감소';
  return '전년비 약세';
}

export function semiconductorShare(snapshot){
  const total=finite(snapshot?.summary?.exportsUsdBillion);
  const semiconductor=(snapshot?.items||[]).find(row=>row.name==='반도체');
  const semi=finite(semiconductor?.exportsUsdBillion);
  if(total===null||semi===null||total<=0)return null;
  return semi/total*100;
}

export function checkpointProgress(snapshot){
  const checkpoints=Array.isArray(snapshot?.checkpoints)?snapshot.checkpoints:[];
  const finalValue=checkpoints.at(-1)?.exportsUsdBillion;
  if(!Number.isFinite(finalValue)||finalValue<=0)return checkpoints.map(row=>({...row,progress:null}));
  return checkpoints.map(row=>({...row,progress:Math.max(0,Math.min(100,row.exportsUsdBillion/finalValue*100))}));
}
