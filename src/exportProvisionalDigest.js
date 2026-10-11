import {businessDayAdjustedGrowth, formatSignedPct, formatUsdBillion, yoyTone} from './exportMomentumModel.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
}[char]));

const diffPct=(current,previous)=>Number.isFinite(current)&&Number.isFinite(previous)&&previous>0
  ?(current/previous-1)*100:null;
const safeDays=value=>Number.isInteger(value)&&value>0?value:null;
const fmtDays=value=>value===null?'확인 중':value+'영업일';

export function renderProvisionalDigest(radar,{adjusted=false}={}){
  const latest=radar.checkpoints.at(-1)||{};
  const stage=radar.latestStage;
  const businessDays=radar.businessDays?.stage===stage?radar.businessDays:null;
  const current=safeDays(businessDays?.current);
  const prev=safeDays(businessDays?.previousMonth);
  const prior=safeDays(businessDays?.priorYear);
  const canAdjust=current!==null&&(prev!==null||prior!==null);
  const isAdjusted=adjusted&&canAdjust;
  const period=/^(\d{4})-(\d{2})$/.exec(radar.period||'');
  const endDay=stage===30&&period?new Date(Date.UTC(Number(period[1]),Number(period[2]),0)).getUTCDate():stage;
  const headline=period&&endDay?period[1]+'년 '+Number(period[2])+'월 '+endDay+'일':'최신 발표';
  const comparisonLabel=isAdjusted?'영업일 보정':'원자료';
  const valueFor=(row,comparison)=>{
    if(!isAdjusted)return comparison==='yoy'?row.exportYoY:row.exportMoM;
    return comparison==='yoy'
      ?businessDayAdjustedGrowth(row.exportsUsdBillion,row.priorYearUsdBillion,current,prior)
      :businessDayAdjustedGrowth(row.exportsUsdBillion,row.previousMonthUsdBillion,current,prev);
  };
  const growth=(value,description)=>'<span class="'+yoyTone(value)+'" aria-label="'+description+' '+esc(formatSignedPct(value))+'">'+esc(formatSignedPct(value))+'</span>';
  const status=radar.meta?.cacheStatus==='stale-error'
    ?'<p class="export-digest-warning" role="status">갱신 실패 · 마지막으로 확인된 잠정치를 표시합니다.</p>':'';
  const dayStats=businessDays?[
    '<div class="export-digest-days" aria-label="같은 구간 영업일 비교">',
    '<div><small>당월</small><strong>'+fmtDays(current)+'</strong></div>',
    '<div><small>전월</small><strong>'+fmtDays(prev)+'</strong><em>'+esc(formatSignedPct(diffPct(current,prev)))+'</em></div>',
    '<div><small>전년동월</small><strong>'+fmtDays(prior)+'</strong><em>'+esc(formatSignedPct(diffPct(current,prior)))+'</em></div>',
    '</div>',
  ].join(''):'<p class="export-digest-warning">영업일 수를 확인할 수 없어 원자료 증가율만 표시합니다.</p>';
  const items=(radar.items||[]).filter(row=>row.exportsUsdBillion!==null);
  const table=items.length
    ?'<div class="export-digest-list" role="table" aria-label="주요 수출 품목별 성장률">'
      +'<div class="export-digest-list-head" role="row"><span role="columnheader">품목</span><span role="columnheader">YoY</span><span role="columnheader">MoM</span></div>'
      +items.map(row=>{
        const yoy=valueFor(row,'yoy');
        const mom=valueFor(row,'mom');
        const canOpenDetail=['semiconductor','passenger-car','petroleum','steel','ships'].includes(row.key);
        const itemName=canOpenDetail
          ?'<button type="button" role="cell" class="export-digest-item-link" data-export-item="'+esc(row.key)+'">'+esc(row.name)+' <span aria-hidden="true">›</span></button>'
          :'<strong role="cell">'+esc(row.name)+'</strong>';
        return '<div class="export-digest-list-row" role="row">'+itemName
          +'<span role="cell">'+growth(yoy,'전년동기 대비')+'</span>'
          +'<span role="cell">'+growth(mom,'전월동기 대비')+'</span></div>';
      }).join('')
      +'</div>'
    :'<p class="export-digest-warning">이번 구간의 주요 품목 자료가 아직 없습니다.</p>';
  const total=latest.total||{};
  const semi=latest.semiconductor||{};
  const largeStats=[
    ['전체 수출',total],
    ['반도체',semi],
  ].map(([name,row])=>'<div><span>'+esc(name)+'</span><strong>'+esc(formatUsdBillion(row.exportsUsdBillion,{digits:1}))+'</strong>'
    +'<small>YoY '+growth(valueFor(row,'yoy'),'YoY')+'</small></div>').join('');
  return [
    '<div class="export-digest" data-export-digest>',
    '<div class="export-digest-header"><div><small>관세청 잠정 수출 · '+esc(radar.latestStageLabel)+'</small>',
    '<h4>'+esc(headline)+' 기준</h4></div>',
    '<button type="button" class="export-digest-refresh" data-export-provisional-refresh aria-label="잠정 수출 새로고침">갱신 ↻</button></div>',
    status,
    dayStats,
    '<div class="export-digest-metrics">'+largeStats+'</div>',
    '<div class="export-digest-list-title"><strong>주요 품목 수출 성장률</strong>',
    '<button type="button" class="export-digest-toggle'+(isAdjusted?' is-active':'')+'" data-export-workday-toggle aria-pressed="'+String(isAdjusted)+'"'+(!canAdjust?' disabled title="영업일 수를 확인할 수 없습니다"':'')+'>영업일 보정 '+(isAdjusted?'ON':'OFF')+'</button></div>',
    '<p class="export-digest-caption">매월 같은 1~'+(stage===30?'말일':stage)+'일 구간 비교 · '+comparisonLabel+'</p>',
    table,
    '<p class="export-chart-note">영업일 보정은 수출액을 해당 구간 영업일 수로 나눠 비교합니다. 원자료와 다른 해석이며 계절성·조업일별 편차를 제거하지 않습니다.</p>',
    '<p class="export-chart-note">이 표는 관세청 10대 대분류 기준입니다. DRAM·NAND·SSD·MCP 등 세부 품목의 10일 잠정치는 이 API에서 제공하지 않아 임의로 합산하지 않습니다.</p>',
    '</div>',
  ].join('');
}
