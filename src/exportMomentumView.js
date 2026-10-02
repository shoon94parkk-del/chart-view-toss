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

function loading(){
  return `<section class="export-loading" role="status"><span></span><strong>최신 수출 스냅샷을 확인하고 있어요.</strong></section>`;
}

function errorView(message){
  return `<section class="export-error"><strong>수출 데이터를 표시하지 못했어요.</strong><p>${esc(message||'잠시 후 다시 시도해주세요.')}</p><button type="button" data-export-retry>다시 시도</button></section>`;
}

function summary(snapshot){
  const data=snapshot.summary;
  const semiShare=semiconductorShare(snapshot);
  return `
    <section class="export-hero">
      <div class="export-hero-top">
        <div>
          <span class="export-kicker">대한민국 수출 · ${esc(snapshot.basis)}</span>
          <h2>${esc(snapshot.periodLabel)}</h2>
          <p>관세청·산업통상부 공식 발표를 같은 형식으로 누적해 흐름을 비교합니다.</p>
        </div>
        <span class="export-status">공식 잠정치</span>
      </div>
      <div class="export-main-number">
        <span>총수출</span>
        <strong>${esc(formatUsdBillion(data.exportsUsdBillion))}</strong>
        <em class="${yoyTone(data.exportYoY)}">${esc(formatSignedPct(data.exportYoY))} YoY</em>
      </div>
      <div class="export-summary-grid">
        <div><span>수입</span><strong>${esc(formatUsdBillion(data.importsUsdBillion))}</strong><small>${esc(formatSignedPct(data.importYoY))} YoY</small></div>
        <div><span>무역수지</span><strong>${esc(formatUsdBillion(data.balanceUsdBillion))}</strong><small>${esc(tradeBalanceLabel(data.balanceUsdBillion))}</small></div>
        <div><span>1~9월 누적 수출</span><strong>${esc(formatUsdBillion(data.cumulativeExportsUsdBillion))}</strong><small>누적 기준</small></div>
        <div><span>반도체 비중</span><strong>${semiShare===null?'-':semiShare.toFixed(1)+'%'}</strong><small>당월 총수출 대비</small></div>
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
      <div class="export-section-head"><div><span>품목별</span><h3>어떤 품목이 움직였나</h3></div><small>전년 동월 대비</small></div>
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
      <div class="export-section-head"><div><span>지역별</span><h3>어디로 수출이 늘었나</h3></div><small>전년 동월 대비</small></div>
      <div class="export-chart-card">
        <div class="export-horizontal-chart" role="img" aria-label="주요 수출 지역 전년 동월 대비 증가율 그래프">
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
  return `
    <section class="export-source">
      <div><strong>데이터 기준</strong><p>현재 버전은 API 연결 전 단계로, 공식 발표 수치를 정규화한 정적 스냅샷을 사용합니다. 향후 같은 데이터 계약에 관세청 API를 연결하면 화면 구조는 그대로 유지됩니다.</p></div>
      <div class="export-source-links">
        ${snapshot.sources.map(source=>`<button type="button" data-external-url="${esc(source.url)}"><span>${esc(source.name)}</span><small>${esc(source.role)}</small></button>`).join('')}
      </div>
      <small>발표일 ${esc(dateLabel(snapshot.publishedAt))} · 스냅샷 갱신 ${esc(dateLabel(snapshot.updatedAt))}</small>
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
