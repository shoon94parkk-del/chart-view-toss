import { homeBootstrap, pickMonitor, screenerData } from './api.js';
import { actionStatus, statusMeta, monitorFor, technicalMarkup } from './pickLedger.js';
import { formatKst } from './dataPresentation.js';
import { finiteNumber } from './analysisData.js';
import { loadingIndicator } from './loadingView.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>{const n=finiteNumber(v);return n===null?'확인 불가':`${n>0?'+':''}${n.toFixed(2)}%`;};

export function detailReviewHtml(symbol, bootstrap, monitor, screener, {monitorFailed=false}={}) {
 const rows=(Array.isArray(bootstrap?.recommendations)?bootstrap.recommendations:[]).filter(row=>String(row.symbol||row.ticker).toUpperCase()===symbol.toUpperCase()).sort((a,b)=>String(b.recommendedDate).localeCompare(String(a.recommendedDate)));
 const row=rows[0];
 const pick=row?monitorFor(row,Array.isArray(monitor?.picks)?monitor.picks:[]):null;
 const meta=statusMeta(actionStatus({monitor:pick}));
 const technical=(Array.isArray(screener?.stocks)?screener.stocks:[]).find(row=>String(row.symbol).toUpperCase()===symbol.toUpperCase());
 return `${row?`<p><strong>${esc(meta.icon)} ${esc(meta.label)}</strong> · 최근 선정 ${esc(row.recommendedDate)}</p><p>선정 이후 수익률 ${pct(row.returnPct)} · ${esc(row.lastUpdatedTradeDate||'기준일 미제공')} 종가 기준</p>${monitorFailed?'<p>사후점검을 불러오지 못했어요. 신호는 검토 대기로 표시해요.</p>':pick?`<p>${esc(pick.monitor?.reason||'점검 근거 확인 필요')}</p><small>마지막 근거 점검 ${esc(pick.monitor?.lastReviewedTradeDate||'미제공')} · 사후점검 수집 ${esc(formatKst(monitor?.generatedAt))}</small>${technicalMarkup(pick)}`:'<p>이 선정 기록에 대응하는 사후점검은 검토 대기 중이에요.</p>'}`:'<p>선정 기록이 없는 종목이에요. 매매 신호를 새로 만들지 않아요.</p>'}
 ${technical?`<p><strong>장마감 기술 지표</strong> · ${esc(technical.date||screener.tradeDate||'기준일 미제공')}</p><p>RSI(14) ${finiteNumber(technical.rsi14)===null?'확인 불가':Number(technical.rsi14).toFixed(1)} · 5거래일 ${pct(technical.ret5)} · 20거래일 ${pct(technical.ret20)}</p>`:'<p>이 종목의 장마감 기술 지표는 현재 수집 범위에 없어요.</p>'}
 <p class="muted-copy">선정 기록의 기존 신호등을 사용해요. 기술 지표와 펀더멘털 근거는 서로 다른 기준이며, 자동 주문이나 매매 확정이 아니에요.</p><button type="button" class="text-button" data-tab="picks">전체 선정 기록 보기</button>`;
}

export async function mountDetailReview(host,symbol,{alive,bindNav}) {
 host.innerHTML=loadingIndicator('선정 기록과 기술 지표를 확인하고 있어요');
 const [bootstrap,monitor,screener]=await Promise.allSettled([homeBootstrap(),pickMonitor(),/\.(KS|KQ)$/i.test(symbol)?screenerData():Promise.resolve(null)]);
 if(!alive()||!host.isConnected)return;
 const bootstrapFailed=bootstrap.status==='rejected'||!Array.isArray(bootstrap.value?.recommendations);
 host.innerHTML=detailReviewHtml(symbol,bootstrap.value,monitor.value,screener.value,{monitorFailed:monitor.status==='rejected'});
 if(bootstrapFailed)host.querySelector('p').textContent='선정 기록을 확인하지 못했어요. 기록이 없는 종목으로 판정하지 않아요.';
 if(bootstrapFailed||monitor.status==='rejected'||screener.status==='rejected'){
   host.insertAdjacentHTML('afterbegin','<p role="status">일부 자료를 불러오지 못했어요. 확인된 자료만 표시해요. <button type="button" class="retry" data-review-retry>다시 시도</button></p>');
   host.querySelector('[data-review-retry]').onclick=()=>mountDetailReview(host,symbol,{alive,bindNav});
 }
 bindNav();
}
