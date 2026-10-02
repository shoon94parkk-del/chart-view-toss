const finite=(value)=>{
  if(value===null||value===undefined)return null;
  if(typeof value==='string'&&!value.trim())return null;
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
      exportWeightKg:finite(row?.exportWeightKg),
      exportWeightYoY:finite(row?.exportWeightYoY),
      unitValueUsdPerKg:finite(row?.unitValueUsdPerKg),
      unitValueYoY:finite(row?.unitValueYoY),
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

  const history=(Array.isArray(raw.history)?raw.history:[])
    .map(row=>({
      period:text(row?.period),
      exportsUsdBillion:finite(row?.exportsUsdBillion),
      exportYoY:finite(row?.exportYoY),
    }))
    .filter(row=>row.period&&row.exportsUsdBillion!==null);

  const sources=(Array.isArray(raw.sources)?raw.sources:[])
    .map(row=>({name:text(row?.name),url:text(row?.url),role:text(row?.role)}))
    .filter(row=>row.name&&/^https:\/\//.test(row.url));

  return {
    schemaVersion:Number(raw.schemaVersion)||1,
    status:text(raw.status)||'unknown',
    period:text(raw.period),
    periodLabel:text(raw.periodLabel)||text(raw.period),
    itemPeriod:text(raw.itemPeriod),
    regionPeriod:text(raw.regionPeriod),
    publishedAt:text(raw.publishedAt),
    updatedAt:text(raw.updatedAt),
    basis:text(raw.basis)||'통관기준 잠정치',
    meta:raw.meta&&typeof raw.meta==='object'?raw.meta:{},
    summary,
    checkpoints,
    items,
    regions,
    history,
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

export function formatWeightKg(value,{digits=1}={}){
  const kg=finite(value);
  if(kg===null)return '-';
  const tons=kg/1000;
  if(tons>=1_000_000)return `${(tons/1_000_000).toLocaleString('ko-KR',{maximumFractionDigits:digits})}백만톤`;
  if(tons>=10_000)return `${(tons/10_000).toLocaleString('ko-KR',{maximumFractionDigits:digits})}만톤`;
  if(tons>=1_000)return `${(tons/1_000).toLocaleString('ko-KR',{maximumFractionDigits:digits})}천톤`;
  if(tons>=1)return `${tons.toLocaleString('ko-KR',{maximumFractionDigits:digits})}톤`;
  return `${kg.toLocaleString('ko-KR',{maximumFractionDigits:0})}kg`;
}

export function formatUnitValue(value,{digits=1}={}){
  const number=finite(value);
  if(number===null)return '-';
  return '
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
  if(snapshot?.itemPeriod&&snapshot?.period&&snapshot.itemPeriod!==snapshot.period)return null;
  const total=finite(snapshot?.summary?.exportsUsdBillion);
  const semiconductor=(snapshot?.items||[]).find(row=>row.name==='반도체');
  const semi=finite(semiconductor?.exportsUsdBillion);
  if(total===null||semi===null||total<=0)return null;
  return semi/total*100;
}

export function tradeBalanceLabel(value){
  const number=finite(value);
  if(number===null)return '수지 미제공';
  if(number>0)return '흑자';
  if(number<0)return '적자';
  return '균형';
}

export function checkpointProgress(snapshot){
  const checkpoints=Array.isArray(snapshot?.checkpoints)?snapshot.checkpoints:[];
  return checkpoints.map((row,index)=>{
    const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(row.endDate||'');
    let progress=null;
    if(match){
      const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
      const daysInMonth=new Date(Date.UTC(year,month,0)).getUTCDate();
      if(day>=1&&day<=daysInMonth)progress=day/daysInMonth*100;
    }
    if(progress===null&&checkpoints.length)progress=(index+1)/checkpoints.length*100;
    return {...row,progress:Math.max(0,Math.min(100,progress))};
  });
}


export function chartExtent(values=[]){
  const usable=values.map(finite).filter(value=>value!==null);
  if(!usable.length)return {min:0,max:1,span:1};
  const min=Math.min(0,...usable);
  const max=Math.max(0,...usable);
  const span=Math.max(1,max-min);
  return {min,max,span};
}

export function chartPct(value,extent){
  const number=finite(value);
  if(number===null)return 0;
  return Math.max(0,Math.min(100,(number-extent.min)/extent.span*100));
}

export function zeroPct(extent){
  return Math.max(0,Math.min(100,(0-extent.min)/extent.span*100));
}
+number.toLocaleString('en-US',{maximumFractionDigits:digits,minimumFractionDigits:number<10?Math.min(2,digits):0})+'/kg';
}

export function exportDriverLabel(row={}){
  const amount=finite(row.exportYoY);
  const weight=finite(row.exportWeightYoY);
  const unit=finite(row.unitValueYoY);
  if(weight===null||unit===null)return '금액 기준';
  if(weight>0&&unit>0)return '물량·단가 동반 증가';
  if(weight<0&&unit<0)return '물량·단가 동반 감소';
  if(weight>0&&unit<=0)return amount!==null&&amount>=0?'물량 증가 영향 우세':'단가 하락 영향 우세';
  if(weight<=0&&unit>0)return amount!==null&&amount>=0?'단가 상승 영향 우세':'물량 감소 영향 우세';
  return '물량·단가 혼조';
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
  if(snapshot?.itemPeriod&&snapshot?.period&&snapshot.itemPeriod!==snapshot.period)return null;
  const total=finite(snapshot?.summary?.exportsUsdBillion);
  const semiconductor=(snapshot?.items||[]).find(row=>row.name==='반도체');
  const semi=finite(semiconductor?.exportsUsdBillion);
  if(total===null||semi===null||total<=0)return null;
  return semi/total*100;
}

export function tradeBalanceLabel(value){
  const number=finite(value);
  if(number===null)return '수지 미제공';
  if(number>0)return '흑자';
  if(number<0)return '적자';
  return '균형';
}

export function checkpointProgress(snapshot){
  const checkpoints=Array.isArray(snapshot?.checkpoints)?snapshot.checkpoints:[];
  return checkpoints.map((row,index)=>{
    const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(row.endDate||'');
    let progress=null;
    if(match){
      const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
      const daysInMonth=new Date(Date.UTC(year,month,0)).getUTCDate();
      if(day>=1&&day<=daysInMonth)progress=day/daysInMonth*100;
    }
    if(progress===null&&checkpoints.length)progress=(index+1)/checkpoints.length*100;
    return {...row,progress:Math.max(0,Math.min(100,progress))};
  });
}


export function chartExtent(values=[]){
  const usable=values.map(finite).filter(value=>value!==null);
  if(!usable.length)return {min:0,max:1,span:1};
  const min=Math.min(0,...usable);
  const max=Math.max(0,...usable);
  const span=Math.max(1,max-min);
  return {min,max,span};
}

export function chartPct(value,extent){
  const number=finite(value);
  if(number===null)return 0;
  return Math.max(0,Math.min(100,(number-extent.min)/extent.span*100));
}

export function zeroPct(extent){
  return Math.max(0,Math.min(100,(0-extent.min)/extent.span*100));
}
