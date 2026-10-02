import { loadExportMomentumSnapshot } from './exportMomentumData.js';
import {
  checkpointProgress,
  formatSignedPct,
  formatUsdBillion,
  semiconductorShare,
  tradeBalanceLabel,
  yoyLabel,
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
  return `
    <section class="export-section">
      <div class="export-section-head"><div><span>발표 흐름</span><h3>10일 → 20일 → 월 전체</h3></div><small>같은 달 누적 통관 실적</small></div>
      <div class="export-checkpoints">
        ${rows.map(row=>`
          <article class="export-checkpoint">
            <div><strong>${esc(row.label)}</strong><span>${esc(row.endDate)}</span></div>
            <b>${esc(formatUsdBillion(row.exportsUsdBillion,{digits:1}))}</b>
            <em class="${yoyTone(row.exportYoY)}">${esc(formatSignedPct(row.exportYoY))}</em>
            <div class="export-progress" aria-label="${esc(row.label)} 월 기간 진행"><i style="width:${Number.isFinite(row.progress)?row.progress.toFixed(1):0}%"></i></div>
            ${row.semiconductorUsdBillion!==null?`<small>반도체 ${esc(formatUsdBillion(row.semiconductorUsdBillion,{digits:1}))}</small>`:''}
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function items(snapshot){
  if(!snapshot.items.length)return '';
  return `
    <section class="export-section">
      <div class="export-section-head"><div><span>품목별</span><h3>주요 수출 품목</h3></div><small>전년 동월 대비</small></div>
      <div class="export-item-list">
        ${snapshot.items.map(row=>`
          <article class="export-item">
            <div class="export-item-main">
              <span><strong>${esc(row.name)}</strong><small>${esc(yoyLabel(row.exportYoY))}</small></span>
              <em class="${yoyTone(row.exportYoY)}">${esc(formatSignedPct(row.exportYoY))}</em>
            </div>
            ${row.exportsUsdBillion!==null?`<b>${esc(formatUsdBillion(row.exportsUsdBillion,{digits:1}))}</b>`:''}
            ${row.note?`<p>${esc(row.note)}</p>`:''}
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function regions(snapshot){
  if(!snapshot.regions.length)return '';
  return `
    <section class="export-section">
      <div class="export-section-head"><div><span>지역별</span><h3>주요 수출 지역</h3></div><small>전년 동월 대비</small></div>
      <div class="export-region-grid">
        ${snapshot.regions.map(row=>`
          <article>
            <span>${esc(row.name)}</span>
            <strong class="${yoyTone(row.exportYoY)}">${esc(formatSignedPct(row.exportYoY,{digits:0}))}</strong>
            ${row.exportsUsdBillion!==null?`<small>${esc(formatUsdBillion(row.exportsUsdBillion,{digits:1}))}</small>`:''}
            ${row.note?`<p>${esc(row.note)}</p>`:''}
          </article>
        `).join('')}
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
  host.innerHTML=`${summary(snapshot)}${checkpoints(snapshot)}${facts(snapshot)}${items(snapshot)}${regions(snapshot)}${sources(snapshot)}`;
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
