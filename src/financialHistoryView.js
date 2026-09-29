import './financialHistoryView.css';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(value,currency)=>{
  const n=Number(value);
  if(!Number.isFinite(n))return '—';
  if(currency!=='KRW')return `${n.toLocaleString('ko-KR')} ${esc(currency||'')}`;
  const abs=Math.abs(n);
  return abs>=1e12?`${(n/1e12).toLocaleString('ko-KR',{maximumFractionDigits:2})}조 원`:
    abs>=1e8?`${(n/1e8).toLocaleString('ko-KR',{maximumFractionDigits:1})}억 원`:
    abs>=1e4?`${(n/1e4).toLocaleString('ko-KR',{maximumFractionDigits:0})}만 원`:
    `${n.toLocaleString('ko-KR')}원`;
};
const change=(current,previous)=>{
  if(!Number.isFinite(Number(current))||!Number.isFinite(Number(previous))||previous===null)return '비교 자료 없음';
  if(Number(previous)>0&&Number(current)<0)return '적자전환';
  if(Number(previous)<=0){
    if(Number(previous)<0&&Number(current)>0)return '흑자전환';
    return '증감률 계산 제외';
  }
  const rate=(Number(current)-Number(previous))/Number(previous)*100;
  return `${rate>0?'+':''}${rate.toFixed(1)}%`;
};
const changeTone=(current,previous)=>Number.isFinite(Number(current))&&Number.isFinite(Number(previous))&&previous!==null&&Number(current)<Number(previous)?'down':'up';
const source=(url,label)=>url?`<button type="button" class="financial-source" data-external-url="${esc(url)}">${esc(label)} 원문 보기</button>`:'';

export function financialHistoryHtml(data){
  if(!data?.available)return `<div class="financial-empty">${data?.loadError?'DART 재무제표를 불러오지 못했어요.':'확인 가능한 재무제표가 없어요.'}</div>`;
  const years=Array.isArray(data.annual)?data.annual:[];
  const interim=data.interim;
  return `<div class="financial-history">
    ${interim?`<div class="financial-recent">
      <div class="financial-subhead"><strong>${esc(interim.year)}년 ${interim.quarter===1?'1분기':interim.quarter===2?'반기':'3분기'} 누적</strong><span>전년 같은 기간 대비</span></div>
      <div class="financial-pair"><div><small>매출액</small><strong>${money(interim.revenue,data.currency)}</strong><em class="${changeTone(interim.revenue,interim.priorRevenue)}">${change(interim.revenue,interim.priorRevenue)}</em></div><div><small>영업이익</small><strong>${money(interim.operatingProfit,data.currency)}</strong><em class="${changeTone(interim.operatingProfit,interim.priorOperatingProfit)}">${change(interim.operatingProfit,interim.priorOperatingProfit)}</em></div></div>
      ${source(data.interimSourceUrl,'최근 보고서')}
    </div>`:''}
    ${years.length?`<div class="financial-annual"><div class="financial-subhead"><strong>연간 실적</strong><span>최근 사업보고서 기준</span></div>
      <div class="financial-years">${years.map((row,index)=>{
        const prior=years[index-1];
        return `<div class="financial-year"><b>${esc(row.year)}년</b><div><small>매출액</small><strong>${money(row.revenue,data.currency)}</strong><em class="${prior?changeTone(row.revenue,prior.revenue):''}">${prior?change(row.revenue,prior.revenue):'—'}</em></div><div><small>영업이익</small><strong>${money(row.operatingProfit,data.currency)}</strong><em class="${prior?changeTone(row.operatingProfit,prior.operatingProfit):''}">${prior?change(row.operatingProfit,prior.operatingProfit):'—'}</em></div></div>`;
      }).join('')}</div>${source(data.annualSourceUrl,'사업보고서')}</div>`:''}
    <p class="financial-note">OpenDART ${esc(data.basis||'재무제표')} · ${data.currency==='KRW'?'원 단위':'공시 통화'} 값을 보기 쉽게 반올림했어요. 연간은 동일 사업보고서의 3개 연도, 분기·반기는 누적값끼리 비교해요. 공시 정정 시 수치가 바뀔 수 있어요.</p>
  </div>`;
}
