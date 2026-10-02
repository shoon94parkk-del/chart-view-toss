import { loadExportItemDetail, loadExportMomentumSnapshot } from './exportMomentumData.js';
import {
  balanceTone,
  chartExtent,
  chartPct,
  checkpointProgress,
  exportDriverLabel,
  formatSignedPct,
  formatUnitValue,
  formatUsdBillion,
  formatWeightKg,
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

const amountAxisLabel=(usdBillion)=>{
  const value=Number(usdBillion);
  if(!Number.isFinite(value))return '-';
  return Math.round(value*10).toLocaleString('ko-KR')+'억';
};

const pctAxisLabel=(value)=>{
  const number=Number(value);
  if(!Number.isFinite(number))return '-';
  return `${number>0?'+':''}${Math.round(number)}%`;
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

function quadrant(snapshot){
  const rows=snapshot.items.filter(row=>Number.isFinite(row.exportWeightYoY)&&Number.isFinite(row.unitValueYoY));
  if(rows.length<2)return '';
  const maxAbs=Math.max(10,...rows.flatMap(row=>[Math.abs(row.exportWeightYoY),Math.abs(row.unitValueYoY)]));
  const scale=value=>50+Math.max(-45,Math.min(45,(value/maxAbs)*45));
  return `
    <section class="export-section">
      <div class="export-section-head"><div><span>원인 분해</span><h3>물량 × 단위가치 4분면</h3></div><small>${esc(monthLabel(snapshot.itemPeriod||snapshot.period))} 기준 · YoY</small></div>
      <div class="export-quadrant-card">
        <div class="export-quadrant-axis x-axis"><span>물량 감소</span><strong>물량 YoY</strong><span>물량 증가</span></div>
        <div class="export-quadrant-axis y-axis"><span>단위가치 증가</span><strong>단위가치 YoY</strong><span>단위가치 감소</span></div>
        <div class="export-quadrant" role="img" aria-label="품목별 수출 물량과 kg당 평균 신고금액 전년 동월 대비 4분면">
          <i class="q-v"></i><i class="q-h"></i>
          <span class="q-label q1">물량↑ · 단가↑</span>
          <span class="q-label q2">물량↓ · 단가↑</span>
          <span class="q-label q3">물량↓ · 단가↓</span>
          <span class="q-label q4">물량↑ · 단가↓</span>
          ${rows.map(row=>`
            <button type="button" class="export-quadrant-point" data-export-item="${esc(row.key)}" style="left:${scale(row.exportWeightYoY).toFixed(1)}%;bottom:${scale(row.unitValueYoY).toFixed(1)}%" aria-label="${esc(row.name)} 물량 ${esc(formatSignedPct(row.exportWeightYoY))}, 단위가치 ${esc(formatSignedPct(row.unitValueYoY))}">
              <i></i><span>${esc(row.name)}</span>
            </button>
          `).join('')}
        </div>
        <p class="export-chart-note">오른쪽일수록 물량 증가, 위쪽일수록 kg당 평균 신고금액 증가입니다. 점을 누르면 해당 품목의 12개월 상세를 엽니다.</p>
      </div>
    </section>
  `;
}

function items(snapshot){
  if(!snapshot.items.length)return '';
  return `
    <section class="export-section">
      <div class="export-section-head"><div><span>품목별</span><h3>금액 · 물량 · 단가로 분해</h3></div><small>${esc(monthLabel(snapshot.itemPeriod||snapshot.period))} 기준 · 전년 동월 대비</small></div>
      <div class="export-item-driver-note">
        <strong>어떻게 읽나요?</strong>
        <span>수출액은 신고금액, 물량은 순중량(kg), 단가는 수출금액÷순중량으로 계산한 kg당 평균 신고금액입니다.</span>
      </div>
      <div class="export-driver-list">
        ${snapshot.items.map(row=>`
          <article class="export-driver-card">
            <div class="export-driver-head">
              <div><strong>${esc(row.name)}</strong><small>${esc(row.note)}</small></div>
              <span class="export-driver-tag">${esc(exportDriverLabel(row))}</span>
            </div>
            <div class="export-driver-grid">
              <div>
                <span>수출액</span>
                <strong>${esc(formatUsdBillion(row.exportsUsdBillion,{digits:1}))}</strong>
                <em class="${yoyTone(row.exportYoY)}">${esc(formatSignedPct(row.exportYoY))}</em>
              </div>
              <div>
                <span>물량 · 순중량</span>
                <strong>${esc(formatWeightKg(row.exportWeightKg))}</strong>
                <em class="${yoyTone(row.exportWeightYoY)}">${esc(formatSignedPct(row.exportWeightYoY))}</em>
              </div>
              <div>
                <span>kg당 신고금액</span>
                <strong>${esc(formatUnitValue(row.unitValueUsdPerKg))}</strong>
                <em class="${yoyTone(row.unitValueYoY)}">${esc(formatSignedPct(row.unitValueYoY))}</em>
              </div>
            </div>
            <div class="export-driver-trade">
              <span>수입 <b>${esc(formatUsdBillion(row.importsUsdBillion,{digits:1}))}</b> <em class="${yoyTone(row.importYoY)}">${esc(formatSignedPct(row.importYoY))}</em></span>
              <span>무역수지 <b class="${balanceTone(row.tradeBalanceUsdBillion)}">${esc(formatUsdBillion(row.tradeBalanceUsdBillion,{digits:1}))}</b></span>
            </div>
            ${row.key?`<button type="button" class="export-driver-open" data-export-item="${esc(row.key)}">${esc(row.name)} 12개월 상세 보기</button>`:''}
          </article>
        `).join('')}
      </div>
      <div id="export-item-detail" class="export-item-detail" hidden></div>
      <p class="export-chart-note">kg당 신고금액은 개별 제품 판매가격이 아닙니다. 같은 HS 그룹 안의 제품 구성·고부가가치 비중 변화가 함께 반영되는 ‘평균 단위가치’로 해석해야 합니다.</p>
    </section>
  `;
}

function detailMetricBars(history,field,title,unit,formatter){
  const rows=history.filter(row=>Number.isFinite(row[field]));
  if(!rows.length)return '';
  const max=Math.max(...rows.map(row=>Math.max(0,row[field])),1);
  return `
    <div class="export-detail-chart">
      <div class="export-detail-chart-head"><strong>${esc(title)}</strong><span>${esc(unit)}</span></div>
      <div class="export-detail-bars" role="img" aria-label="${esc(title)} 최근 12개월 추이">
        ${history.map(row=>{
          const value=Number(row[field]);
          const height=Number.isFinite(value)?Math.max(3,Math.min(100,value/max*100)):0;
          return `<div class="export-detail-bar" aria-label="${esc(row.period)} ${esc(formatter(row[field]))}"><i style="height:${height.toFixed(1)}%"></i><small>${esc(row.period.slice(5))}</small></div>`;
        }).join('')}
      </div>
    </div>
  `;
}

function renderItemDetail(detail){
  const latest=detail.history.at(-1)||{};
  const maxCountry=Math.max(...detail.countries.map(row=>row.exportsUsdBillion||0),1);
  return `
    <div class="export-detail-head">
      <div><span>품목 상세 · ${esc(detail.period)}</span><h4>${esc(detail.name)}</h4><small>${esc(detail.note)}</small></div>
      <button type="button" data-export-detail-close aria-label="품목 상세 닫기">닫기</button>
    </div>
    <div class="export-detail-summary">
      <div><span>수출액</span><strong>${esc(formatUsdBillion(latest.exportsUsdBillion,{digits:1}))}</strong><small class="${yoyTone(latest.exportYoY)}">${esc(formatSignedPct(latest.exportYoY))}</small></div>
      <div><span>수입액</span><strong>${esc(formatUsdBillion(latest.importsUsdBillion,{digits:1}))}</strong><small class="${yoyTone(latest.importYoY)}">${esc(formatSignedPct(latest.importYoY))}</small></div>
      <div><span>무역수지</span><strong class="${balanceTone(latest.tradeBalanceUsdBillion)}">${esc(formatUsdBillion(latest.tradeBalanceUsdBillion,{digits:1}))}</strong><small>${esc(tradeBalanceLabel(latest.tradeBalanceUsdBillion))}</small></div>
    </div>
    <div class="export-detail-chart-stack">
      ${detailMetricBars(detail.history,'exportsUsdBillion','수출액 추이','억달러',value=>formatUsdBillion(value,{digits:1}))}
      ${detailMetricBars(detail.history,'exportWeightKg','수출 물량 추이','순중량',value=>formatWeightKg(value))}
      ${detailMetricBars(detail.history,'unitValueUsdPerKg','kg당 평균 신고금액','$ / kg',value=>formatUnitValue(value))}
    </div>
    <div class="export-detail-country">
      <div class="export-detail-country-head"><strong>주요 5개 국가 × ${esc(detail.name)}</strong><small>전세계 순위가 아닌 지정 시장 비교</small></div>
      ${detail.countries.map(row=>`
        <div class="export-detail-country-row">
          <div><strong>${esc(row.name)}</strong><span>${esc(formatUsdBillion(row.exportsUsdBillion,{digits:1}))}</span></div>
          <div class="export-detail-country-track"><i style="width:${Math.max(2,(row.exportsUsdBillion/maxCountry)*100).toFixed(1)}%"></i></div>
          <small>${row.sharePct===null?'-':esc(row.sharePct.toFixed(1)+'%')} · 해당 품목 총수출 대비</small>
        </div>
      `).join('')}
    </div>
    <p class="export-chart-note">국가 비교는 미국·중국·베트남·일본·대만 5개 지정 시장입니다. kg당 신고금액은 품목 믹스가 반영된 평균 단위가치입니다.</p>
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
  const amountTop=Math.ceil(exportMax/10)*10||10;
  const amountMid=amountTop/2;

  const yoyValues=rows.map(row=>row.exportYoY).filter(value=>Number.isFinite(value));
  const rawMin=yoyValues.length?Math.min(0,...yoyValues):0;
  const rawMax=yoyValues.length?Math.max(0,...yoyValues):1;
  let yoyMin=Math.floor(rawMin/10)*10;
  let yoyMax=Math.ceil(rawMax/10)*10;
  if(yoyMax===yoyMin)yoyMax=yoyMin+10;
  const yoySpan=yoyMax-yoyMin;
  const yoyPos=value=>Math.max(0,Math.min(100,((Number(value)-yoyMin)/yoySpan)*100));
  const zero=yoyPos(0);

  return `
    <section class="export-section">
      <div class="export-section-head"><div><span>최근 추이</span><h3>월별 수출액과 증가율</h3></div><small>최근 12개월 · 단위 분리</small></div>

      <div class="export-chart-card export-history-card">
        <div class="export-chart-title"><strong>월별 수출액</strong><span>Y축 · 억달러</span></div>
        <div class="export-axis-layout">
          <div class="export-y-axis amount-axis">
            <span>${esc(amountAxisLabel(amountTop))}</span>
            <span>${esc(amountAxisLabel(amountMid))}</span>
            <span>0</span>
          </div>
          <div class="export-amount-plot" role="img" aria-label="최근 12개월 수출액, 단위 억달러">
            <i class="grid g-top"></i><i class="grid g-mid"></i><i class="grid g-bottom"></i>
            ${rows.map(row=>`
              <div class="export-amount-column" aria-label="${esc(row.period)} 수출 ${esc(formatUsdBillion(row.exportsUsdBillion,{digits:1}))}">
                <i style="height:${Math.max(3,(row.exportsUsdBillion/amountTop)*100).toFixed(1)}%"></i>
                <small>${esc(row.period.slice(5))}월</small>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="export-chart-card export-history-card export-yoy-card">
        <div class="export-chart-title"><strong>전년 동월 대비 증가율</strong><span>Y축 · %</span></div>
        <div class="export-axis-layout">
          <div class="export-y-axis yoy-axis">
            <span>${esc(pctAxisLabel(yoyMax))}</span>
            <span>0%</span>
            <span>${esc(pctAxisLabel(yoyMin))}</span>
          </div>
          <div class="export-yoy-plot" style="--zero:${zero.toFixed(1)}%" role="img" aria-label="최근 12개월 수출 전년 동월 대비 증가율, 단위 퍼센트">
            <i class="grid g-top"></i><i class="grid g-zero" style="bottom:${zero.toFixed(1)}%"></i><i class="grid g-bottom"></i>
            ${rows.map(row=>`
              <div class="export-yoy-column" aria-label="${esc(row.period)} 전년 대비 ${esc(formatSignedPct(row.exportYoY))}">
                <span class="export-yoy-dot ${yoyTone(row.exportYoY)}" style="bottom:${yoyPos(row.exportYoY).toFixed(1)}%"></span>
                <small>${esc(row.period.slice(5))}월</small>
              </div>
            `).join('')}
          </div>
        </div>
        <p class="export-chart-note">위 그래프는 금액(억달러), 아래 그래프는 전년 동월 대비 증감률(%)입니다. 서로 다른 단위를 한 축에 겹치지 않습니다.</p>
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

function paint(host,snapshot,bindNav,onItemOpen){
  host.innerHTML=`${summary(snapshot)}${history(snapshot)}${checkpoints(snapshot)}${facts(snapshot)}${quadrant(snapshot)}${items(snapshot)}${regions(snapshot)}${sources(snapshot)}`;
  bindNav();
  host.querySelectorAll('[data-export-item]').forEach(button=>button.addEventListener('click',()=>onItemOpen(button.dataset.exportItem)));
}

export function renderExportMomentumView({shell,bindNav}){
  const app=document.querySelector('#app');
  app.innerHTML=shell(`<div id="export-momentum-root" class="export-momentum-view">${loading()}</div>`,'수출 모멘텀');
  bindNav();
  const host=app.querySelector('#export-momentum-root');
  let seq=0;
  let detailSeq=0;

  const openItemDetail=async(key)=>{
    const panel=host.querySelector('#export-item-detail');
    if(!panel||!key)return;
    const token=++detailSeq;
    panel.hidden=false;
    panel.innerHTML='<div class="export-detail-loading" role="status"><span></span><strong>12개월 품목 상세를 불러오고 있어요.</strong><small>첫 조회는 관세청 상세 통계를 수집해 조금 더 걸릴 수 있습니다.</small></div>';
    panel.scrollIntoView({behavior:'smooth',block:'start'});
    try{
      const detail=await loadExportItemDetail(key);
      if(token!==detailSeq||!panel.isConnected)return;
      panel.innerHTML=renderItemDetail(detail);
      panel.querySelector('[data-export-detail-close]')?.addEventListener('click',()=>{
        detailSeq+=1;
        panel.hidden=true;
        panel.innerHTML='';
      });
    }catch(error){
      if(token!==detailSeq||!panel.isConnected)return;
      panel.innerHTML=`<div class="export-detail-error"><strong>품목 상세를 불러오지 못했어요.</strong><p>${esc(error?.message||'잠시 후 다시 시도해주세요.')}</p><button type="button" data-export-detail-close>닫기</button></div>`;
      panel.querySelector('[data-export-detail-close]')?.addEventListener('click',()=>{
        detailSeq+=1;
        panel.hidden=true;
        panel.innerHTML='';
      });
    }
  };

  const load=async(force=false)=>{
    const token=++seq;
    host.innerHTML=loading();
    try{
      const snapshot=await loadExportMomentumSnapshot({force});
      if(token!==seq||!host.isConnected)return;
      paint(host,snapshot,bindNav,openItemDetail);
    }catch(error){
      if(token!==seq||!host.isConnected)return;
      host.innerHTML=errorView(error?.message);
      host.querySelector('[data-export-retry]')?.addEventListener('click',()=>void load(true));
    }
  };

  void load();
  return ()=>{seq+=1;detailSeq+=1;};
}
