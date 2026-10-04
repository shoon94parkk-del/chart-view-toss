import { loadExportItemDetail, loadExportMomentumSnapshot, loadExportProvisionalRadar, loadSemiconductorCountryMatrix } from './exportMomentumData.js';
import {memoryMovements} from './insightModel.js';
import { memorySpotPlaceholder, mountMemorySpot } from './memorySpotView.js';
import {
  balanceTone,
  chartExtent,
  chartPct,
  checkpointProgress,
  exportDriverLabel,
  formatPp,
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

function provisionalPlaceholder(){
  return `
    <section id="export-provisional-radar" class="export-section export-provisional-shell">
      <div class="export-section-head"><div><span>수출 속보</span><h3>10일 단위 잠정 수출 레이더</h3></div><small>관세청 · 별도 로딩</small></div>
      <div class="export-provisional-loading" role="status"><span></span><strong>1~10일 · 1~20일 · 월말 잠정치를 확인하고 있어요.</strong></div>
    </section>
  `;
}

function renderLandingProjection(landing){
  if(!landing)return '';
  const metricCard=(title,metric)=>{
    if(!metric)return `
      <article class="export-landing-card is-empty">
        <span>${esc(title)}</span>
        <strong>추정 대기</strong>
        <small>과거 비교 표본이 충분하지 않습니다.</small>
      </article>
    `;
    const isReview=landing.status==='final-review';
    const backtest=metric.backtest||{};
    return `
      <article class="export-landing-card">
        <div class="export-landing-card-head">
          <span>${esc(title)}</span>
          <em>${esc(landing.stageLabel)} 기준</em>
        </div>
        <div class="export-landing-main">
          <small>${isReview?'당시 월말 중앙 추정':'월말 중앙 추정'}</small>
          <strong>${esc(formatUsdBillion(metric.estimateUsdBillion,{digits:1}))}</strong>
          <span>${esc(formatUsdBillion(metric.rangeLowUsdBillion,{digits:1}))} ~ ${esc(formatUsdBillion(metric.rangeHighUsdBillion,{digits:1}))}</span>
        </div>
        <div class="export-landing-stats">
          ${isReview&&metric.actualUsdBillion!==null?`
            <div><span>실제 마감</span><strong>${esc(formatUsdBillion(metric.actualUsdBillion,{digits:1}))}</strong></div>
            <div><span>추정 오차</span><strong class="${yoyTone(-Math.abs(metric.actualErrorPct||0))}">${metric.actualErrorPct===null?'-':esc((metric.actualErrorPct>0?'+':'')+metric.actualErrorPct.toFixed(1)+'%')}</strong></div>
          `:`
            <div><span>예상 YoY</span><strong class="${yoyTone(metric.projectedYoY)}">${esc(formatSignedPct(metric.projectedYoY))}</strong></div>
            <div><span>YoY 범위</span><strong>${esc(formatSignedPct(metric.rangeYoYLow))} ~ ${esc(formatSignedPct(metric.rangeYoYHigh))}</strong></div>
          `}
          <div><span>과거 완성률 중앙값</span><strong>${metric.medianCompletionPct===null?'-':esc(metric.medianCompletionPct.toFixed(1)+'%')}</strong></div>
          <div><span>과거 표본</span><strong>${metric.historySampleCount===null?'-':esc(String(metric.historySampleCount)+'개월')}</strong></div>
        </div>
        <div class="export-landing-backtest">
          <span>최근 백테스트</span>
          <b>중앙 절대오차 ${backtest.medianAbsErrorPct===null?'-':esc(backtest.medianAbsErrorPct.toFixed(1)+'%')}</b>
          <b>범위 적중 ${backtest.rangeHitPct===null?'-':esc(backtest.rangeHitPct.toFixed(1)+'%')}</b>
          <small>${backtest.sampleCount===null?'-':esc(String(backtest.sampleCount))}개월</small>
        </div>
      </article>
    `;
  };
  if(landing.status==='final'&&!landing.total&&!landing.semiconductor){
    return `
      <div class="export-landing">
        <div class="export-landing-head">
          <div><span>월말 착지 범위</span><strong>마감 완료</strong></div>
          <small>실제 월말 잠정치가 발표됐습니다.</small>
        </div>
      </div>
    `;
  }
  return `
    <div class="export-landing">
      <div class="export-landing-head">
        <div>
          <span>월말 착지 범위</span>
          <strong>${landing.status==='final-review'?'추정 vs 실제 마감':'현재 속도로 월말은 어디쯤?'}</strong>
        </div>
        <small>${esc(landing.stageLabel)} · 과거 완성률 기반</small>
      </div>
      <p>${esc(landing.message)}</p>
      <div class="export-landing-grid">
        ${metricCard('전체 수출',landing.total)}
        ${metricCard('반도체',landing.semiconductor)}
      </div>
      <div class="export-landing-method">
        <strong>계산 방식</strong>
        <span>최근 최대 60개월의 같은 단계 완성률 중앙값으로 중앙 추정을 계산하고, 25~75% 분위수로 범위를 만듭니다. 최근 최대 24개월은 과거 시점 기준으로 다시 계산해 오차와 범위 적중률을 검증합니다.</span>
      </div>
    </div>
  `;
}

function renderProvisionalRadar(radar){
  const latest=radar.checkpoints.at(-1)||{};
  const latestSemi=latest.semiconductor||{};
  const latestTotal=latest.total||{};
  const maxItem=Math.max(...radar.items.map(row=>row.exportsUsdBillion||0),1);
  const stageWidth=stage=>stage===10?33.3:stage===20?66.7:100;
  return `
    <section id="export-provisional-radar" class="export-section export-provisional-shell">
      <div class="export-section-head">
        <div><span>수출 속보</span><h3>10일 단위 잠정 수출 레이더</h3></div>
        <small>${esc(radar.periodLabel)} · ${esc(radar.latestStageLabel)}</small>
      </div>
      <div class="export-provisional-hero">
        <div>
          <span>전체 수출 · ${esc(radar.latestStageLabel)}</span>
          <strong>${esc(formatUsdBillion(latestTotal.exportsUsdBillion,{digits:1}))}</strong>
          <small class="${yoyTone(latestTotal.exportYoY)}">전년 같은 구간 ${esc(formatSignedPct(latestTotal.exportYoY))}</small>
        </div>
        <div>
          <span>반도체 · ${esc(radar.latestStageLabel)}</span>
          <strong>${esc(formatUsdBillion(latestSemi.exportsUsdBillion,{digits:1}))}</strong>
          <small class="${yoyTone(latestSemi.exportYoY)}">전년 같은 구간 ${esc(formatSignedPct(latestSemi.exportYoY))}</small>
        </div>
      </div>
      <div class="export-provisional-summary">
        <div><span>반도체 비중</span><strong>${latest.semiconductorSharePct===null?'-':esc(latest.semiconductorSharePct.toFixed(1)+'%')}</strong><small>같은 구간 전체 수출 대비</small></div>
        <div><span>전월 같은 구간</span><strong class="${yoyTone(latestSemi.exportMoM)}">${esc(formatSignedPct(latestSemi.exportMoM))}</strong><small>반도체 수출액 비교</small></div>
        <div><span>증가율 가속</span><strong class="${yoyTone(latest.semiconductorYoYAccelerationPp)}">${esc(formatPp(latest.semiconductorYoYAccelerationPp))}</strong><small>직전 체크포인트 YoY 대비</small></div>
        <div><span>증가액 기여</span><strong>${latest.semiconductorContributionPct===null?'-':esc(latest.semiconductorContributionPct.toFixed(1)+'%')}</strong><small>전체 수출 YoY 증가액 중 반도체</small></div>
      </div>
      ${renderLandingProjection(radar.landingProjection)}
      <div class="export-provisional-flow">
        ${radar.checkpoints.map((row,index)=>`
          <article class="export-provisional-stage ${index===radar.checkpoints.length-1?'is-latest':''}">
            <div class="export-provisional-stage-head"><strong>${esc(row.label)}</strong><span>${esc(formatUsdBillion(row.semiconductor.exportsUsdBillion,{digits:1}))}</span></div>
            <div class="export-provisional-progress"><i style="width:${stageWidth(row.stage).toFixed(1)}%"></i></div>
            <div class="export-provisional-stage-metrics">
              <span class="${yoyTone(row.semiconductor.exportYoY)}">YoY ${esc(formatSignedPct(row.semiconductor.exportYoY))}</span>
              <span class="${yoyTone(row.semiconductor.exportMoM)}">전월동기 ${esc(formatSignedPct(row.semiconductor.exportMoM))}</span>
              <span>비중 ${row.semiconductorSharePct===null?'-':esc(row.semiconductorSharePct.toFixed(1)+'%')}</span>
              ${row.semiconductorYoYAccelerationPp===null?'':`<span class="${yoyTone(row.semiconductorYoYAccelerationPp)}">가속 ${esc(formatPp(row.semiconductorYoYAccelerationPp))}</span>`}
            </div>
          </article>
        `).join('')}
      </div>
      <div class="export-provisional-items">
        <div class="export-detail-country-head"><strong>주요 품목 · ${esc(radar.latestStageLabel)}</strong><small>관세청 10대 품목 자체 분류</small></div>
        ${radar.items.map((row,index)=>`
          <div class="export-provisional-item">
            <div><span>${String(index+1).padStart(2,'0')}</span><strong>${esc(row.name)}</strong><em>${esc(formatUsdBillion(row.exportsUsdBillion,{digits:1}))}</em></div>
            <div class="export-provisional-item-track"><i style="width:${Math.max(2,(row.exportsUsdBillion/maxItem)*100).toFixed(1)}%"></i></div>
            <small><b class="${yoyTone(row.exportYoY)}">YoY ${esc(formatSignedPct(row.exportYoY))}</b><b class="${yoyTone(row.exportMoM)}">전월동기 ${esc(formatSignedPct(row.exportMoM))}</b></small>
          </div>
        `).join('')}
      </div>
      <p class="export-chart-note">이 속보는 관세청의 10대 품목 자체 분류입니다. 아래 월간 HS 품목 통계와 분류 범위가 달라 절대금액을 서로 이어 붙이지 않습니다. 1~10일·1~20일은 누적 잠정치입니다.</p>
    </section>
  `;
}

function provisionalError(message){
  return `
    <section id="export-provisional-radar" class="export-section export-provisional-shell">
      <div class="export-section-head"><div><span>수출 속보</span><h3>10일 단위 잠정 수출 레이더</h3></div><small>잠정치</small></div>
      <div class="export-provisional-error"><strong>10일 단위 속보를 불러오지 못했어요.</strong><span>${esc(message||'월간 수출 데이터는 계속 이용할 수 있습니다.')}</span><button type="button" data-export-provisional-retry>잠정치 다시 시도</button></div>
    </section>
  `;
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
          <p>${apiBacked?'관세청 월간 실적에서 품목과 국가별 흐름을 살펴보세요.':'공식 발표 스냅샷으로 수출 흐름을 확인합니다.'}</p>
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

function semiconductorReport(snapshot){
  const wanted=['memory-total','dram','flash','mcp-memory','dram-module'];
  const rows=wanted.map(key=>(snapshot.semiconductorBreakdown||[]).find(row=>row.key===key)).filter(Boolean);
  if(rows.length<3)return '';
  const maxExport=Math.max(...rows.map(row=>row.exportsUsdBillion||0),1);
  const {increase:strongest,decrease:weakest}=memoryMovements(rows);
  const unitRows=rows.filter(row=>Number.isFinite(row.unitValueMoM));
  const weakestUnit=unitRows.length?[...unitRows].sort((a,b)=>a.unitValueMoM-b.unitValueMoM)[0]:null;
  const label=row=>row.key==='flash'?'Flash memory':row.name;
  return `
    <section id="export-memory" tabindex="-1" class="export-section export-semi-report">
      <div class="export-section-head">
        <div><span>반도체 리포트</span><h3>메모리 세부 수출 한눈에 보기</h3></div>
        <small>${esc(monthLabel(snapshot.itemPeriod||snapshot.period))} · 관세청 HSK</small>
      </div>
      <div class="export-semi-report-intro">
        <div>
          <strong>증권사 수출통계처럼 금액·YoY·MoM·단위가치를 함께 봅니다.</strong>
          <span>HBM은 독립 HSK가 없어 별도 수출액으로 만들지 않으며, Flash memory는 NAND/NOR 등을 함께 포함합니다.</span>
        </div>
        <button type="button" data-export-item="semiconductor">반도체 12개월 상세</button>
      </div>
      <div class="export-semi-report-cards">
        ${rows.map(row=>`
          <article class="export-semi-report-card">
            <div class="export-semi-report-head">
              <div><span>HS ${esc(row.code)}</span><strong>${esc(label(row))}</strong></div>
              <em class="${yoyTone(row.exportMoM)}">MoM ${esc(formatSignedPct(row.exportMoM))}</em>
            </div>
            <div class="export-semi-report-amount">${esc(formatUsdBillion(row.exportsUsdBillion,{digits:1}))}</div>
            <div class="export-semi-report-pills">
              <span class="${yoyTone(row.exportYoY)}">YoY ${esc(formatSignedPct(row.exportYoY))}</span>
              <span class="${yoyTone(row.exportMoM)}">MoM ${esc(formatSignedPct(row.exportMoM))}</span>
            </div>
            <div class="export-semi-report-unit">
              <span>kg당 평균 신고금액</span>
              <strong>${esc(formatUnitValue(row.unitValueUsdPerKg,{digits:0}))}</strong>
              <small class="${yoyTone(row.unitValueYoY)}">YoY ${esc(formatSignedPct(row.unitValueYoY))}</small>
              <small class="${yoyTone(row.unitValueMoM)}">MoM ${esc(formatSignedPct(row.unitValueMoM))}</small>
            </div>
          </article>
        `).join('')}
      </div>
      <div class="export-semi-report-chart">
        <div class="export-detail-country-head"><strong>세부 품목 수출액 비교</strong><small>막대 · 억달러</small></div>
        ${rows.map(row=>`
          <div class="export-semi-report-row">
            <div><strong>${esc(label(row))}</strong><span>${esc(formatUsdBillion(row.exportsUsdBillion,{digits:1}))}</span></div>
            <div class="export-semi-report-track"><i style="width:${Math.max(3,(row.exportsUsdBillion/maxExport)*100).toFixed(1)}%"></i></div>
            <div class="export-semi-report-change">
              <span class="${yoyTone(row.exportYoY)}">YoY ${esc(formatSignedPct(row.exportYoY))}</span>
              <span class="${yoyTone(row.exportMoM)}">MoM ${esc(formatSignedPct(row.exportMoM))}</span>
              <span class="${yoyTone(row.unitValueMoM)}">단위가치 MoM ${esc(formatSignedPct(row.unitValueMoM))}</span>
            </div>
          </div>
        `).join('')}
      </div>
      ${strongest||weakest||weakestUnit?`
        <div class="export-semi-report-brief">
          <strong>이번 달 읽을 포인트</strong>
          ${strongest?`<span>수출액 MoM 증가율이 가장 높은 항목은 <b>${esc(label(strongest))}</b> ${esc(formatSignedPct(strongest.exportMoM))}입니다.</span>`:''}
          ${weakest?`<span>수출액 MoM 감소율이 가장 큰 항목은 <b>${esc(label(weakest))}</b> ${esc(formatSignedPct(weakest.exportMoM))}입니다.</span>`:''}
          <span>메모리 IC는 DRAM·Flash·MCP를 포함하는 상위 분류예요. 이 카드들을 서로 합산하지 않아요. DRAM 모듈은 별도 HSK 분류예요.</span>
          ${weakestUnit?`<span>단위가치 MoM이 가장 낮은 항목은 <b>${esc(label(weakestUnit))}</b> ${esc(formatSignedPct(weakestUnit.unitValueMoM))}입니다.</span>`:''}
        </div>`:''}
      <p class="export-chart-note">MCP는 HSK 8542323000 복합구조칩 메모리, DRAM 모듈은 HSK 8473304060 기준입니다. 이 통계는 TRASS 분류와 집계시점이 달라 증권사 잠정치와 숫자가 다를 수 있습니다.</p>
    </section>
  `;
}

function breadth(snapshot){
  const data=snapshot.breadth;
  if(!data||!Number.isFinite(data.comparableCount)||data.comparableCount<=0)return '';
  const risingPct=Number.isFinite(data.risingBreadthPct)?Math.max(0,Math.min(100,data.risingBreadthPct)):0;
  const fallingPct=100-risingPct;
  const moverRows=(rows,tone)=>rows.map(row=>`
    <div class="export-breadth-mover">
      <div><span>HS ${esc(row.code)}</span><strong>${esc(row.name)}</strong></div>
      <div><b class="${tone}">${esc(formatUsdBillion(row.deltaUsdBillion,{digits:1}))}</b><small class="${yoyTone(row.exportYoY)}">${esc(formatSignedPct(row.exportYoY))}</small></div>
    </div>
  `).join('');
  return `
    <section class="export-section">
      <div class="export-section-head"><div><span>수출 확산도</span><h3>몇 개 품목이 같이 좋아졌나</h3></div><small>${esc(monthLabel(data.period||snapshot.itemPeriod))} · HS2</small></div>
      <div class="export-breadth-card">
        <div class="export-breadth-summary">
          <div><span>증가 품목</span><strong>${esc(data.risingCount)} / ${esc(data.comparableCount)}</strong><small>전년동월 비교 가능 HS2</small></div>
          <div><span>상승 확산도</span><strong>${esc(formatSignedPct(data.risingBreadthPct,{digits:1}).replace('+',''))}</strong><small>증가 품목 비율</small></div>
          <div><span>증가 품목 수출 비중</span><strong>${data.risingExportSharePct===null?'-':esc(data.risingExportSharePct.toFixed(1)+'%')}</strong><small>현재 HS2 수출액 기준</small></div>
          <div><span>HS2 순증감</span><strong class="${balanceTone(data.netChangeUsdBillion)}">${esc(formatUsdBillion(data.netChangeUsdBillion,{digits:1}))}</strong><small>전년동월 대비</small></div>
        </div>
        <div class="export-breadth-track" aria-label="증가 품목 ${esc(data.risingCount)}개, 감소 품목 ${esc(data.fallingCount)}개">
          <i class="up" style="width:${risingPct.toFixed(1)}%"></i><i class="down" style="width:${fallingPct.toFixed(1)}%"></i>
        </div>
        <div class="export-breadth-legend"><span>증가 ${esc(data.risingCount)}개</span><span>보합 ${esc(data.flatCount)}개</span><span>감소 ${esc(data.fallingCount)}개</span></div>
        <div class="export-breadth-movers">
          <div><h4>수출 증가 기여액 상위</h4>${moverRows(data.topPositive,'up')}</div>
          <div><h4>수출 감소 기여액 상위</h4>${moverRows(data.topNegative,'down')}</div>
        </div>
        <p class="export-chart-note">‘기여액’은 해당 HS2 품목의 전년동월 대비 수출금액 증감액입니다. 기업 실적 기여나 투자 순위가 아닙니다.</p>
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
    <section id="export-items" tabindex="-1" class="export-section">
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
      <p class="export-chart-note">kg당 신고금액은 개별 제품 판매가격이 아닙니다. 같은 HS 그룹 안의 제품 구성·고부가가치 비중 변화가 함께 반영되는 ‘평균 단위가치’로 해석해야 합니다.</p>
    </section>
  `;
}

function detailMetricBars(history,field,title,unit,formatter){
  const rows=history.filter(row=>Number.isFinite(row[field]));
  if(!rows.length)return '';
  const maxRaw=Math.max(...rows.map(row=>Math.max(0,row[field])),1);
  const max=maxRaw;
  const mid=max/2;
  return `
    <div class="export-detail-chart">
      <div class="export-detail-chart-head"><strong>${esc(title)}</strong><span>${esc(unit)}</span></div>
      <div class="export-detail-axis-layout">
        <div class="export-detail-y-axis">
          <span>${esc(formatter(max))}</span>
          <span>${esc(formatter(mid))}</span>
          <span>${esc(formatter(0))}</span>
        </div>
        <div class="export-detail-bars" role="img" aria-label="${esc(title)} 최근 12개월 추이">
          <i class="grid g-top"></i><i class="grid g-mid"></i><i class="grid g-bottom"></i>
          ${history.map(row=>{
            const value=Number(row[field]);
            const height=Number.isFinite(value)?Math.max(3,Math.min(100,value/max*100)):0;
            return `<div class="export-detail-bar" aria-label="${esc(row.period)} ${esc(formatter(row[field]))}"><i class="bar" style="height:${height.toFixed(1)}%"></i><small>${esc(row.period.slice(5))}</small></div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function momentumCard(label,metric){
  return `<div><span>${esc(label)}</span><strong>${esc(formatSignedPct(metric?.avg3mYoY))}</strong><small>${esc(metric?.label||'데이터 부족')}</small><em class="${yoyTone(metric?.accelerationPp)}">직전 3개월 대비 ${esc(formatPp(metric?.accelerationPp))}</em></div>`;
}

function semiconductorBreakdown(detail){
  const rows=detail.semiconductorBreakdown||[];
  if(detail.key!=='semiconductor'||!rows.length)return '';
  const memory=rows.filter(row=>row.group==='memory');
  const logic=rows.filter(row=>row.group==='logic');
  const moduleRows=rows.filter(row=>row.group==='module');
  const card=row=>`
    <article class="export-semi-card">
      <div class="export-semi-head">
        <div><span>HS ${esc(row.code)}</span><strong>${esc(row.name)}</strong></div>
        <em class="${yoyTone(row.exportYoY)}">${esc(formatSignedPct(row.exportYoY))}</em>
      </div>
      <div class="export-semi-main">${esc(formatUsdBillion(row.exportsUsdBillion,{digits:1}))}</div>
      <div class="export-semi-meta">
        <span>수출 MoM ${esc(formatSignedPct(row.exportMoM))}</span>
        <span>물량 YoY ${esc(formatSignedPct(row.exportWeightYoY))}</span>
        <span>단위가치 YoY ${esc(formatSignedPct(row.unitValueYoY))}</span>
        <span>단위가치 MoM ${esc(formatSignedPct(row.unitValueMoM))}</span>
      </div>
      <small>${esc(row.note)}</small>
    </article>
  `;
  return `
    <div class="export-semi-section">
      <div class="export-detail-country-head"><strong>반도체 세부 HSK</strong><small>2026 관세청 품목분류 기준</small></div>
      <div class="export-semi-notice">
        <strong>HBM은 별도 수출코드가 없습니다.</strong>
        <span>HBM을 독립 수출액으로 만들지 않습니다. DRAM·복합구조 메모리 등의 신고 분류에 포함될 수 있습니다. Flash memory도 NAND만이 아니라 NOR 등을 함께 포함합니다.</span>
      </div>
      ${memory.length?`<div class="export-semi-group"><h5>메모리</h5><div class="export-semi-grid">${memory.map(card).join('')}</div></div>`:''}
      ${moduleRows.length?`<div class="export-semi-group"><h5>모듈</h5><div class="export-semi-grid">${moduleRows.map(card).join('')}</div></div>`:''}
      ${logic.length?`<div class="export-semi-group"><h5>기타 IC</h5><div class="export-semi-grid">${logic.map(card).join('')}</div></div>`:''}
    </div>
  `;
}

function renderSemiconductorCountryMatrix(matrix){
  const segmentCard=(segment)=>{
    const max=Math.max(...segment.countries.map(row=>row.exportsUsdBillion||0),1);
    return `
      <article class="export-semi-country-card">
        <div class="export-semi-country-head">
          <div><span>HS ${esc(segment.code)}</span><strong>${esc(segment.name)}</strong></div>
          <em>${segment.coveredSharePct===null?'-':esc(segment.coveredSharePct.toFixed(1)+'%')} 커버</em>
        </div>
        <div class="export-semi-country-summary">
          <span>최대 시장 <b>${esc(segment.leaderCountry||'-')}</b></span>
          <span>증가 기여 <b>${esc(segment.growthLeaderCountry||'-')}</b></span>
          <span>감소 기여 <b>${esc(segment.declineLeaderCountry||'-')}</b></span>
        </div>
        <div class="export-semi-country-rows">
          ${segment.countries.map(row=>`
            <div class="export-semi-country-row">
              <div class="export-semi-country-line">
                <strong>${esc(row.name)}</strong>
                <span>${esc(formatUsdBillion(row.exportsUsdBillion,{digits:1}))}</span>
              </div>
              <div class="export-semi-country-track"><i style="width:${Math.max(2,(row.exportsUsdBillion/max)*100).toFixed(1)}%"></i></div>
              <div class="export-semi-country-metrics">
                <span>비중 ${row.sharePct===null?'-':esc(row.sharePct.toFixed(1)+'%')}</span>
                <span class="${yoyTone(row.exportYoY)}">YoY ${esc(formatSignedPct(row.exportYoY))}</span>
                <span class="${yoyTone(row.deltaUsdBillion)}">증감 ${esc(formatUsdBillion(row.deltaUsdBillion,{digits:1}))}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </article>
    `;
  };
  return `
    <div class="export-semi-country-section">
      <div class="export-detail-country-head">
        <strong>세부 품목 × 국가</strong>
        <small>${esc(monthLabel(matrix.period))} · 중국·홍콩·베트남·대만·미국·일본</small>
      </div>
      <div class="export-semi-country-note">
        <strong>어느 시장이 증가를 끌고 있나</strong>
        <span>막대는 해당 세부 품목의 국가별 수출액입니다. 비중은 그 품목의 전세계 총수출 대비이며, ‘증감’은 전년동월 대비 수출액 차이입니다.</span>
      </div>
      <div class="export-semi-country-grid">${matrix.segments.map(segmentCard).join('')}</div>
      <p class="export-chart-note">관세청 품목별 국가별 API는 국가코드가 필수라 6개 지정시장을 비교합니다. 전세계 국가 순위가 아니며, 수출은 최종목적국 기준입니다.</p>
    </div>
  `;
}

function semiconductorCountryPlaceholder(detail){
  if(detail.key!=='semiconductor')return '';
  return '<div id="export-semi-country-matrix" class="export-semi-country-section export-semi-country-loading" role="status"><span></span><strong>DRAM·Flash·MCP·DRAM 모듈의 국가별 수출을 분석하고 있어요.</strong><small>반도체 상세과 별도로 불러와 다른 그래프 로딩을 막지 않습니다.</small></div>';
}

function renderItemDetail(detail){
  const latest=detail.history.at(-1)||{};
  const maxCountry=Math.max(...detail.countries.map(row=>row.exportsUsdBillion||0),1);
  const phaseRows=(detail.momentum?.phaseHistory||[]).slice(-12);
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
    <button type="button" class="export-research-jump" data-export-research-jump>기업 실적으로 확인하기 →</button>
    <section class="export-research" tabindex="-1"></section>
    <div class="export-momentum-summary">
      ${momentumCard('수출액 3개월 YoY',detail.momentum?.exports)}
      ${momentumCard('물량 3개월 YoY',detail.momentum?.volume)}
      ${momentumCard('단위가치 3개월 YoY',detail.momentum?.unitValue)}
    </div>
    ${phaseRows.length?`<div class="export-phase-card"><div><strong>12개월 국면 변화</strong><span>현재 · ${esc(detail.momentum.latestPhase||'-')}</span></div><div class="export-phase-strip">${phaseRows.map(row=>`<span class="phase ${row.phase.includes('↑·단위가치↑')?'both-up':row.phase.includes('↓·단위가치↓')?'both-down':row.phase.includes('물량↓')?'price-up':'volume-up'}" title="${esc(row.period+' '+row.phase)}"><i></i><small>${esc(row.period.slice(5))}</small></span>`).join('')}</div></div>`:''}
    <div class="export-detail-chart-stack">
      ${detailMetricBars(detail.history,'exportsUsdBillion','수출액 추이','억달러',value=>formatUsdBillion(value,{digits:1}))}
      ${detailMetricBars(detail.history,'exportWeightKg','수출 물량 추이','순중량',value=>formatWeightKg(value))}
      ${detailMetricBars(detail.history,'unitValueUsdPerKg','kg당 평균 신고금액','$ / kg',value=>formatUnitValue(value))}
    </div>
    ${detail.key==='semiconductor'?`<details class="export-data-details"><summary>반도체 세부 HS·국가 비교 보기</summary>${semiconductorBreakdown(detail)}${semiconductorCountryPlaceholder(detail)}</details>`:''}
    <details class="export-data-details"><summary>주요 5개 국가 수출액 보기 · 지정 시장</summary><div class="export-detail-country">
      <div class="export-detail-country-head"><strong>주요 5개 국가 × ${esc(detail.name)}</strong><small>전세계 순위가 아닌 지정 시장 비교</small></div>
      ${detail.countries.map(row=>`
        <div class="export-detail-country-row">
          <div><strong>${esc(row.name)}</strong><span>${esc(formatUsdBillion(row.exportsUsdBillion,{digits:1}))}</span></div>
          <div class="export-detail-country-track"><i style="width:${Math.max(2,(row.exportsUsdBillion/maxCountry)*100).toFixed(1)}%"></i></div>
          <small>${row.sharePct===null?'-':esc(row.sharePct.toFixed(1)+'%')} · 해당 품목 총수출 대비</small>
        </div>
      `).join('')}
    </div></details>
    <p class="export-chart-note">국가 비교는 미국·중국·베트남·일본·대만 5개 지정 시장입니다. kg당 신고금액은 품목 믹스가 반영된 평균 단위가치입니다.</p>
  `;
}

function regions(snapshot){
  if(!snapshot.regions.length)return '';
  const max=Math.max(...snapshot.regions.map(row=>Math.max(0,row.exportYoY||0)),1);
  return `
    <section id="export-countries" tabindex="-1" class="export-section">
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

export function history(snapshot){
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
  const yoyMid=(yoyMax+yoyMin)/2;
  const yoySpan=yoyMax-yoyMin;
  const yoyPct=value=>Math.max(0,Math.min(100,((Number(value)-yoyMin)/yoySpan)*100));
  const lineSegments=[];
  let segment=[];
  rows.forEach((row,index)=>{
    if(!Number.isFinite(row.exportYoY)){
      if(segment.length)lineSegments.push(segment.join(' '));
      segment=[];
      return;
    }
    const x=((index+0.5)/rows.length*1200).toFixed(1);
    const y=(100-yoyPct(row.exportYoY)).toFixed(1);
    segment.push(`${x},${y}`);
  });
  if(segment.length)lineSegments.push(segment.join(' '));

  return `
    <section id="export-history" tabindex="-1" class="export-section">
      <div class="export-section-head"><div><span>최근 추이</span><h3>월별 수출액과 증가율</h3></div><small>최근 12개월 · 이중 Y축</small></div>
      <div class="export-chart-card export-history-card export-combo-card">
        <div class="export-combo-legend">
          <span><i class="bar"></i>수출액 · 왼쪽축</span>
          <span><i class="line"></i>YoY · 오른쪽축</span>
        </div>
        <div class="export-combo-layout">
          <div class="export-combo-axis left-axis">
            <span>${esc(amountAxisLabel(amountTop))}</span>
            <span>${esc(amountAxisLabel(amountMid))}</span>
            <span>0</span>
          </div>
          <div class="export-combo-plot" role="img" aria-label="최근 12개월 수출액은 막대와 왼쪽 억달러 축, 전년동월 증가율은 선과 오른쪽 퍼센트 축">
            <i class="grid g-top"></i><i class="grid g-mid"></i><i class="grid g-bottom"></i>
            <div class="export-combo-bars">
              ${rows.map(row=>`
                <div class="export-combo-column" aria-label="${esc(row.period)} 수출 ${esc(formatUsdBillion(row.exportsUsdBillion,{digits:1}))}, 전년 대비 ${esc(formatSignedPct(row.exportYoY))}">
                  <i class="bar" style="height:${Math.max(3,(row.exportsUsdBillion/amountTop)*100).toFixed(1)}%"></i>
                  <small>${esc(row.period.slice(5))}월</small>
                </div>
              `).join('')}
            </div>
            <svg class="export-combo-line" viewBox="0 0 1200 100" preserveAspectRatio="none" aria-hidden="true">
              ${lineSegments.map(points=>`<polyline points="${points}"></polyline>`).join('')}
            </svg>
            ${rows.map((row,index)=>Number.isFinite(row.exportYoY)?`
              <span class="export-combo-dot ${yoyTone(row.exportYoY)}" style="left:${((index+0.5)/rows.length*100).toFixed(2)}%;bottom:${yoyPct(row.exportYoY).toFixed(1)}%" title="${esc(row.period+' '+formatSignedPct(row.exportYoY))}"></span>
            `:'').join('')}
          </div>
          <div class="export-combo-axis right-axis">
            <span>${esc(pctAxisLabel(yoyMax))}</span>
            <span>${esc(pctAxisLabel(yoyMid))}</span>
            <span>${esc(pctAxisLabel(yoyMin))}</span>
          </div>
        </div>
        <p class="export-chart-note">막대는 왼쪽 Y축의 수출액(억달러), 선·점은 오른쪽 보조 Y축의 전년동월 대비 증가율(%)입니다.${yoyValues.length<rows.length?' 증가율 미제공 월은 점을 표시하지 않고 선을 끊습니다.':''}</p>
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

function exportPanel(key,content){
  return `<div class="export-tab-panel" data-export-panel="${key}" hidden>${content}</div>`;
}

function paint(host,snapshot,bindNav,onItemOpen){
  host.innerHTML=[
    exportPanel('overview',summary(snapshot)+facts(snapshot)+sources(snapshot)),
    exportPanel('products',items(snapshot)+breadth(snapshot)+quadrant(snapshot)),
    exportPanel('countries',regions(snapshot)),
    exportPanel('semiconductor',memorySpotPlaceholder()+semiconductorReport(snapshot)),
    exportPanel('trend',provisionalPlaceholder()+history(snapshot)+checkpoints(snapshot)),
    '<div id="export-item-detail" class="export-item-detail" hidden></div>',
  ].join('');
  bindNav();
  host.querySelectorAll('[data-export-item]').forEach(button=>button.addEventListener('click',()=>onItemOpen(button.dataset.exportItem)));
}

export function renderExportMomentumView({shell,bindNav,focus=null,state={}}){
  const app=document.querySelector('#app');
  const tabs=[['overview','전체 요약'],['products','품목'],['countries','국가'],['semiconductor','반도체'],['trend','속보·추세']];
  const panelForFocus=key=>({
    history:'trend',provisional:'trend',
    items:'products',breadth:'products',quadrant:'products',
    countries:'countries',memory:'semiconductor',
  }[key]||'overview');
  app.innerHTML=shell(`<nav class="export-topic-nav" role="tablist" aria-label="수출 데이터 분류">${tabs.map(([key,label])=>`<button type="button" role="tab" data-export-topic="${key}" aria-selected="false" disabled>${label}</button>`).join('')}</nav><div id="export-momentum-root" class="export-momentum-view">${loading()}</div>`,'수출 데이터');
  bindNav();
  const host=app.querySelector('#export-momentum-root');
  let seq=0;
  let detailSeq=0;
  let provisionalSeq=0;
  let provisionalLoaded=false;
  let memorySpotCleanup=null;

  const openItemDetail=async(key,{force=false,restore=false}={})=>{
    const panel=host.querySelector('#export-item-detail');
    if(!panel||!key)return;
    const token=++detailSeq;
    if(state.itemKey!==key)state.countryName='';state.itemKey=key;
    panel.hidden=false;
    panel.innerHTML='<div class="export-detail-loading" role="status"><span></span><strong>12개월 품목 상세를 불러오고 있어요.</strong><small>첫 조회는 관세청 상세 통계를 수집해 조금 더 걸릴 수 있습니다.</small><button type="button" data-export-detail-close>닫기</button></div>';
    panel.querySelector('[data-export-detail-close]')?.addEventListener('click',()=>{
      detailSeq+=1;
      state.itemKey=null;
      panel.hidden=true;
      panel.innerHTML='';
    });
    if(!restore)panel.scrollIntoView({behavior:'smooth',block:'start'});
    try{
      const detail=await loadExportItemDetail(key,{force});
      if(token!==detailSeq||!panel.isConnected)return;
      panel.innerHTML=renderItemDetail(detail);
      const researchHost=panel.querySelector('.export-research');
      panel.querySelector('[data-export-research-jump]').onclick=()=>{researchHost.scrollIntoView({block:'start'});researchHost.focus({preventScroll:true});};
      void import('./exportResearchView.js').then(({mountExportResearch})=>{if(token===detailSeq&&researchHost.isConnected)void mountExportResearch(researchHost,detail,{state,alive:()=>token===detailSeq&&researchHost.isConnected});}).catch(()=>{if(researchHost.isConnected)researchHost.textContent='기업 연결을 열지 못했어요. 주요제품과 공시를 직접 확인해주세요.';});
      window.__chartviewRestoreScroll?.();
      panel.querySelector('[data-export-detail-close]')?.addEventListener('click',()=>{
        detailSeq+=1;
        state.itemKey=null;
        panel.hidden=true;
        panel.innerHTML='';
      });
      if(detail.key==='semiconductor'){
        const countryHost=panel.querySelector('#export-semi-country-matrix');
        const loadCountries=async(force=false)=>{
          if(token!==detailSeq||!countryHost?.isConnected)return;
          countryHost.classList.remove('is-error');
          countryHost.innerHTML='<strong role="status">국가별 수출을 불러오고 있어요.</strong>';
          try{
            const matrix=await loadSemiconductorCountryMatrix({force});
            if(token!==detailSeq||!countryHost.isConnected)return;
            countryHost.classList.remove('export-semi-country-loading');
            countryHost.innerHTML=renderSemiconductorCountryMatrix(matrix);
          }catch(error){
            if(token!==detailSeq||!countryHost.isConnected)return;
            countryHost.innerHTML=`<strong>국가별 세부 분석을 불러오지 못했어요.</strong><small>${esc(error?.message||'잠시 후 다시 시도해주세요.')}</small><button type="button" data-export-country-retry>국가별 분석 다시 시도</button>`;
            countryHost.classList.add('is-error');
            countryHost.querySelector('[data-export-country-retry]')?.addEventListener('click',()=>void loadCountries(true));
          }
        };
        void loadCountries();
      }
    }catch(error){
      if(token!==detailSeq||!panel.isConnected)return;
      panel.innerHTML=`<div class="export-detail-error"><strong>품목 상세를 불러오지 못했어요.</strong><p>${esc(error?.message||'잠시 후 다시 시도해주세요.')}</p><button type="button" data-export-item-retry>품목 상세 다시 시도</button><button type="button" data-export-detail-close>닫기</button></div>`;
      panel.querySelector('[data-export-item-retry]')?.addEventListener('click',()=>void openItemDetail(key,{force:true}));
      panel.querySelector('[data-export-detail-close]')?.addEventListener('click',()=>{
        detailSeq+=1;
        state.itemKey=null;
        panel.hidden=true;
        panel.innerHTML='';
      });
    }
  };

  const loadProvisional=async(parentToken,force=false)=>{
    const node=host.querySelector('#export-provisional-radar');
    if(parentToken!==seq||!node?.isConnected)return;
    const token=++provisionalSeq;
    node.outerHTML=provisionalPlaceholder();
    try{
      const radar=await loadExportProvisionalRadar({force});
      const current=host.querySelector('#export-provisional-radar');
      if(parentToken!==seq||token!==provisionalSeq||!current?.isConnected)return;
      current.outerHTML=renderProvisionalRadar(radar);
    }catch(error){
      const current=host.querySelector('#export-provisional-radar');
      if(parentToken!==seq||token!==provisionalSeq||!current?.isConnected)return;
      current.outerHTML=provisionalError(error?.message);
      host.querySelector('[data-export-provisional-retry]')?.addEventListener('click',()=>void loadProvisional(parentToken,true));
    }
  };

  const load=async(force=false)=>{
    const token=++seq;
    app.querySelectorAll('[data-export-topic]').forEach(button=>{button.disabled=true;});
    memorySpotCleanup?.();memorySpotCleanup=null;
    provisionalLoaded=false;
    host.innerHTML=loading();
    try{
      const snapshot=await loadExportMomentumSnapshot({force});
      if(token!==seq||!host.isConnected)return;
      paint(host,snapshot,bindNav,openItemDetail);

      const focusTarget=key=>{
        const selector={
          history:'#export-history',
          provisional:'#export-provisional-radar',
          items:'#export-items',
          countries:'#export-countries',
          memory:'#export-memory-spot',
          breadth:'.export-breadth-card',
          quadrant:'.export-quadrant-point',
        }[key];
        return selector?host.querySelector(selector)?.closest('section'):null;
      };

      const activatePanel=(panelKey,{scroll=false}={})=>{
        const panel=host.querySelector('[data-export-panel="'+panelKey+'"]');
        if(!panel)return;
        state.exportSection=panelKey;
        host.querySelectorAll('[data-export-panel]').forEach(node=>{node.hidden=node!==panel;});
        app.querySelectorAll('[data-export-topic]').forEach(button=>{
          const selected=button.dataset.exportTopic===panelKey;
          button.disabled=false;
          button.setAttribute('aria-selected',String(selected));
          button.classList.toggle('is-active',selected);
        });
        if(panelKey==='semiconductor'&&!memorySpotCleanup){
          memorySpotCleanup=mountMemorySpot(host.querySelector('#export-memory-spot'),{bindNav});
        }
        if(panelKey==='trend'&&!provisionalLoaded){
          provisionalLoaded=true;
          void loadProvisional(token,force);
        }
        if(scroll)panel.scrollIntoView({behavior:'smooth',block:'start'});
      };

      app.querySelectorAll('[data-export-topic]').forEach(button=>{
        button.onclick=()=>activatePanel(button.dataset.exportTopic,{scroll:true});
      });

      const requestedFocus=focus;
      const initialPanel=requestedFocus?panelForFocus(requestedFocus):(state.exportSection||'overview');
      activatePanel(initialPanel);
      if(requestedFocus){
        const target=focusTarget(requestedFocus);
        if(target){
          target.tabIndex=-1;
          target.scrollIntoView({block:'start'});
          target.focus({preventScroll:true});
        }
        focus=null;
      }
      if(state.itemKey)void openItemDetail(state.itemKey,{restore:true});
      window.__chartviewRestoreScroll?.();
    }catch(error){
      if(token!==seq||!host.isConnected)return;
      host.innerHTML=errorView(error?.message);
      host.querySelector('[data-export-retry]')?.addEventListener('click',()=>void load(true));
    }
  };

  void load();
  return ()=>{seq+=1;detailSeq+=1;provisionalSeq+=1;memorySpotCleanup?.();memorySpotCleanup=null;};
}
