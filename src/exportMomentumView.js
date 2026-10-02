import { loadExportMomentumSnapshot } from './exportMomentumData.js';
import {
  chartExtent,
  chartPct,
  checkpointProgress,
  formatSignedPct,
  formatUsdBillion,
  semiconductorShare,
  tradeBalanceLabel,
  yoyLabel,
  zeroPct,
  yoyTone,
} from './exportMomentumModel.js';

const esc=(value='')=>String(value).replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));

const dateLabel=(value)=>{
  if(!value)return '';
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return value;
  return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'numeric',day:'numeric'}).format(date);
};

const monthLabel=(period)=>{
  const match=/^(\d{4})-(\d{2})$/.exec(period||'');
  return match?`${Number(match[2])}월`:period||'-';
};

const cumulativeLabel=(period)=>{
  const match=/^(\d{4})-(\d{2})$/.exec(period||'');
  return match?`1~${Number(match[2])}월 누적 수출`:'연간 누적 수출';
};

function loading(){
  return `<section class="export-loading" role="status"><span></span><strong>최신 수출 스냅샷을 확인하고 있어요.</strong></section>`;
}

function errorView(message){
  return `<section class="export-error"><strong>수출 데이터를 표시하지 못했어요.</strong><p>${esc(message||'잠시 후 다시 시도해주세요.')}</p><button type="button" data-export-retry>다시 시도</button></section>`;
}

function summary(snapshot){
  const data=snapshot.summary;
  const semiShare=semiconductorShare(snapshot);
  const apiBacked=snapshot.status==='official_api';
  const itemLag=snapshot.itemPeriod&&snapshot.itemPeriod!==snapshot.period;
  const regionLag=snapshot.regionPeriod&&snapshot.regionPeriod!==snapshot.period;
  return `
    <section class="export-hero">
      <div class="export-hero-top">
        <div>
          <span class="export-kicker">대한민국 수출 · ${esc(snapshot.basis)}</span>
          <h2>${esc(snapshot.periodLabel)}</h2>
          <p>${apiBacked?'관세청 공공데이터를 서버에서 수집·캐시해 월별 흐름을 비교합니다.':'공식 발표 스냅샷으로 수출 흐름을 확인합니다.'}</p>
        </div>
        <span class="export-status">${apiBacked?'관세청 API':'공식 스냅샷'}</span>
      </div>
      ${itemLag||regionLag?`<div class="export-period-split"><strong>기준월 안내</strong><span>총괄 ${esc(monthLabel(snapshot.period))}</span>${snapshot.itemPeriod?`<span>품목 ${esc(monthLabel(snapshot.itemPeriod))}</span>`:''}${snapshot.regionPeriod?`<span>국가 ${esc(monthLabel(snapshot.regionPeriod))}</span>`:''}</div>`:''}
      <div class="export-main-number">
        <span>총수출</span>
        <strong>${esc(formatUsdBillion(data.exportsUsdBillion))}</strong>
        <em class="${yoyTone(data.exportYoY)}">${esc(formatSignedPct(data.exportYoY))} YoY</em>
      </div>
      <div class="export-summary-grid">
        <div><span>수입</span><strong>${esc(formatUsdBillion(data.importsUsdBillion))}</strong><small>${esc(formatSignedPct(data.importYoY))} YoY</small></div>
        <div><span>무역수지</span><strong>${esc(formatUsdBillion(data.balanceUsdBillion))}</strong><small>${esc(tradeBalanceLabel(data.balanceUsdBillion))}</small></div>
        <div><span>${esc(cumulativeLabel(snapshot.period))}</span><strong>${esc(formatUsdBillion(data.cumulativeExportsUsdBillion))}</strong><small>해당 연도 누적</small></div>
        ${semiShare!==null
          ?`<div><span>반도체 비중</span><strong>${semiShare.toFixed(1)}%</strong><small>당월 총수출 대비</small></div>`
          :`<div><span>품목 상세</span><strong>${esc(monthLabel(snapshot.itemPeriod))}</strong><small>${itemLag?'총괄보다 후행':'HS 기준'}</small></div>`}
      </div>
    </section>
  `;
}

function checkpoints(snapshot){
  const rows=checkpointProgress(snapshot);
  if(!rows.length)return '';
  const maxExport=Math.max(...rows.map(row=>row.exportsUsdBillion||0),1);
  return `
    <section class="export-section">
      <div class="export-section-head"><div><span>발표 흐름</span><h3>이번 달 수출 누적 흐름</h3></div><small>1~10일 · 1~20일 · 월 전체</small></div>
      <div class="export-chart-card">
        <div class="export-chart-legend"><span><i class="bar"></i>누적 수출액</span><span>숫자: 전년 동기 대비</span></div>
        <div class="export-column-chart" role="img" aria-label="10일, 20일, 월 전체 누적 수출액 그래프">
          ${rows.map(row=>{
            const height=Math.max(9,(row.exportsUsdBillion/maxExport)*100);
            return `
              <div class="export-column-item" aria-label="${esc(row.label)} 수출 ${esc(formatUsdBillion(row.exportsUsdBillion,{digits:1}))}, 전년 대비 ${esc(formatSignedPct(row.exportYoY))}">
                <em class="${yoyTone(row.exportYoY)}">${esc(formatSignedPct(row.exportYoY))}</em>
                <div class="export-column-track"><i style="height:${height.toFixed(1)}%"></i></div>
                <strong>${esc(row.label)}</strong>
                <small>${esc(formatUsdBillion(row.exportsUsdBillion,{digits:1}))}</small>
              </div>
            `;
          }).join('')}
        </div>
        <p class="export-chart-note">각 값은 같은 달의 누적 통관 실적입니다. 서로 다른 기간의 독립 합계가 아닙니다.</p>
      </div>
    </section>
  `;
}

function items(snapshot){
  if(!snapshot.items.length)return '';
  const maxAbs=Math.max(...snapshot.items.map(row=>Math.abs(row.exportYoY||0)),1);
  return `
    <section class="export-section">
      <div class="export-section-head"><div><span>품목별</span><h3>어떤 품목이 움직였나</h3></div><small>${esc(monthLabel(snapshot.itemPeriod||snapshot.period))} 기준 · 전년 동월 대비</small></div>
      <div class="export-chart-card">
        <div class="export-diverging-chart" role="img" aria-label="주요 수출 품목 전년 동월 대비 증감률 그래프">
          ${snapshot.items.map(row=>{
            const width=Math.min(50,Math.abs(row.exportYoY)/maxAbs*50);
            const positive=row.exportYoY>=0;
            return `
              <div class="export-diverging-row" aria-label="${esc(row.name)} ${esc(formatSignedPct(row.exportYoY))}">
                <div class="export-diverging-label"><strong>${esc(row.name)}</strong><span class="${yoyTone(row.exportYoY)}">${esc(formatSignedPct(row.exportYoY))}</span></div>
                <div class="export-diverging-track">
                  <i class="zero"></i>
                  <b class="${positive?'up':'down'}" style="${positive?'left:50%;':'right:50%;'}width:${width.toFixed(1)}%"></b>
                </div>
                <small>${row.exportsUsdBillion!==null?esc(formatUsdBillion(row.exportsUsdBillion,{digits:1})+' · '):''}${esc(row.note||yoyLabel(row.exportYoY))}</small>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </section>
  `;
}

function regions(snapshot){
  if(!snapshot.regions.length)return '';
  const max=Math.max(...snapshot.regions.map(row=>Math.max(0,row.exportYoY||0)),1);
  return `
    <section class="export-section">
      <div class="export-section-head"><div><span>국가별</span><h3>어디로 수출이 늘었나</h3></div><small>${esc(monthLabel(snapshot.regionPeriod||snapshot.period))} 기준 · 전년 동월 대비</small></div>
      <div class="export-chart-card">
        <div class="export-horizontal-chart" role="img" aria-label="주요 수출 국가 전년 동월 대비 증가율 그래프">
          ${snapshot.regions.map(row=>`
            <div class="export-horizontal-row" aria-label="${esc(row.name)} ${esc(formatSignedPct(row.exportYoY,{digits:0}))}">
              <div><strong>${esc(row.name)}</strong><span class="${yoyTone(row.exportYoY)}">${esc(formatSignedPct(row.exportYoY,{digits:0}))}</span></div>
              <div class="export-horizontal-track"><i style="width:${Math.max(3,Math.max(0,row.exportYoY)/max*100).toFixed(1)}%"></i></div>
              ${row.note?`<small>${esc(row.note)}</small>`:''}
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function history(snapshot){
  if(!snapshot.history||snapshot.history.length<2)return '';
  const rows=snapshot.history.slice(-12);
  const exportMax=Math.max(...rows.map(row=>row.exportsUsdBillion||0),1);
  const yoyExtent=chartExtent(rows.map(row=>row.exportYoY));
  const zero=zeroPct(yoyExtent);
  return `
    <section class="export-section">
      <div class="export-section-head"><div><span>최근 추이</span><h3>월별 수출액과 증가율</h3></div><small>최근 12개월</small></div>
      <div class="export-chart-card export-history-card">
        <div class="export-chart-legend"><span><i class="bar"></i>수출액</span><span><i class="line"></i>전년 동월비</span></div>
        <div class="export-history-chart" role="img" aria-label="최근 월별 수출액과 전년 동월 대비 추이">
          ${rows.map(row=>`
            <div class="export-history-column" aria-label="${esc(row.period)} 수출 ${esc(formatUsdBillion(row.exportsUsdBillion,{digits:1}))}, 전년 대비 ${esc(formatSignedPct(row.exportYoY))}">
              <span class="export-history-yoy ${yoyTone(row.exportYoY)}" style="bottom:${chartPct(row.exportYoY,yoyExtent).toFixed(1)}%"></span>
              <i style="height:${Math.max(4,row.exportsUsdBillion/exportMax*76).toFixed(1)}%"></i>
              <small>${esc(row.period.slice(5))}월</small>
            </div>
          `).join('')}
          <span class="export-history-zero" style="bottom:${zero.toFixed(1)}%"></span>
        </div>
        <p class="export-chart-note">막대는 수출액, 점은 전년 동월 대비 변화입니다.</p>
      </div>
    </section>
  `;
}

function facts(snapshot){
  const data=snapshot.summary;
  const facts=[];
  if(data.risingMajorItems!==null&&data.majorItemCount!==null)facts.push(`20대 주력 품목 중 ${data.risingMajorItems}개 수출 증가`);
  if(data.nonSemiconductorYoY!==null)facts.push(`반도체 제외 수출도 ${formatSignedPct(data.nonSemiconductorYoY)}`);
  if(data.nonSemiconductorAndComputerYoY!==null)facts.push(`반도체·컴퓨터 제외 수출 ${formatSignedPct(data.nonSemiconductorAndComputerYoY)}`);
  if(!facts.length)return '';
  return `
    <section class="export-facts">
      <strong>이번 발표에서 같이 볼 점</strong>
      <div>${facts.map(item=>`<span>${esc(item)}</span>`).join('')}</div>
    </section>
  `;
}

function sources(snapshot){
  const apiBacked=snapshot.status==='official_api';
  const dates=[
    snapshot.publishedAt?`발표일 ${dateLabel(snapshot.publishedAt)}`:'',
    snapshot.updatedAt?`데이터 갱신 ${dateLabel(snapshot.updatedAt)}`:'',
  ].filter(Boolean).join(' · ');
  return `
    <section class="export-source">
      <div><strong>데이터 기준</strong><p>${apiBacked?'관세청 공공데이터 API를 차트뷰 서버에서 수집·캐시해 표시합니다. 인증키는 서버에서만 사용하며 브라우저에는 전달하지 않습니다. 총괄과 HS 상세의 최신 기준월이 다르면 각각의 기준월을 따로 표시합니다.':'공식 발표 수치를 저장한 스냅샷입니다.'}</p></div>
      <div class="export-source-links">
        ${snapshot.sources.map(source=>`<button type="button" data-external-url="${esc(source.url)}"><span>${esc(source.name)}</span><small>${esc(source.role)}</small></button>`).join('')}
      </div>
      ${dates?`<small>${esc(dates)}</small>`:''}
    </section>
  `;
}

function paint(host,snapshot,bindNav){
  host.innerHTML=`${summary(snapshot)}${history(snapshot)}${checkpoints(snapshot)}${facts(snapshot)}${items(snapshot)}${regions(snapshot)}${sources(snapshot)}`;
  bindNav();
}

export function renderExportMomentumView({shell,bindNav}){
  const app=document.querySelector('#app');
  app.innerHTML=shell(`<div id="export-momentum-root" class="export-momentum-view">${loading()}</div>`,'수출 모멘텀');
  bindNav();
  const host=app.querySelector('#export-momentum-root');
  let seq=0;

  const load=async(force=false)=>{
    const token=++seq;
    host.innerHTML=loading();
    try{
      const snapshot=await loadExportMomentumSnapshot({force});
      if(token!==seq||!host.isConnected)return;
      paint(host,snapshot,bindNav);
    }catch(error){
      if(token!==seq||!host.isConnected)return;
      host.innerHTML=errorView(error?.message);
      host.querySelector('[data-export-retry]')?.addEventListener('click',()=>void load(true));
    }
  };

  void load();
  return ()=>{seq+=1;};
}
