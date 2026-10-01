import './financialQualityView.css';
import { compareReports, number } from './researchAnalysis.js';
import { qualitySlice, qualityKeys, qualityLabels, balanceKeys, assessQuality, qualityValue } from './financialQuality.js';

export const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function qualityMoney(v,currency='KRW'){
 const n=number(v);if(n===null)return '확인 불가';
 if(currency!=='KRW')return `${n.toLocaleString('ko-KR')} ${escapeHtml(currency||'')}`;
 return Math.abs(n)>=1e12?`${(n/1e12).toFixed(2)}조 원`:Math.abs(n)>=1e8?`${(n/1e8).toFixed(1)}억 원`:`${n.toLocaleString('ko-KR')}원`;
}
export function qualityCell(slice,key){
 const current=qualityValue(slice,key),previous=qualityValue(slice,key,true),percent=key==='debtRatio'||key==='cashConversion';
 const format=v=>v===null?'확인 불가':percent?`${v.toFixed(1)}%`:qualityMoney(v,slice.currency);
 return `<strong>${format(current)}</strong><small>${balanceKeys.has(key)?'전년 말':'전년 같은 기간'} ${format(previous)}</small>`;
}
export function qualityReviewHtml(slice,{name='',compact=false}={}){
 const review=assessQuality(slice),esc=escapeHtml;
 const items=rows=>rows.map(row=>`<li><strong>${esc(row.title)}</strong><p>${esc(row.detail)}</p><small>확인 항목: ${row.keys.map(key=>esc(qualityLabels[key]||({revenue:'매출액',operatingProfit:'영업이익'})[key])).join(' · ')}</small></li>`).join('');
 return `<section class="financial-quality" aria-label="${esc(name)} 실적의 질과 확인할 변화">
  ${name?`<h4>${esc(name)}</h4>`:''}<div class="quality-section-head"><h3>실적의 질 확인</h3><span>확장 항목 ${review.covered}/${review.total}개 확인</span></div>
  <p class="quality-period">${esc(slice.periodLabel)} · ${esc(slice.basis)} · ${esc(slice.currency)}<br>재무상태 비교 기준: ${esc(slice.year-1)}년 말</p>
  ${review.covered?`<p>이익과 현금흐름, 재무상태를 함께 살펴봐요.</p>${compact?'':`<div class="quality-metrics">${['netIncome','operatingCashFlow','cashConversion','debtRatio'].map(key=>`<div><span>${qualityLabels[key]}</span>${qualityCell(slice,key)}</div>`).join('')}</div>`}`:'<p class="quality-empty">이 보고서에서 확인 가능한 확장 계정이 없어요. 기존 매출·영업이익 비교는 계속 볼 수 있어요.</p>'}
  ${review.observations.length?`<ul class="quality-observations">${items(review.observations)}</ul>`:''}
  <div class="quality-section-head"><h3>함께 확인할 변화</h3><span>원인·매매 판단 아님</span></div>
  ${review.checks.length?`<ul class="quality-checks">${items(review.checks)}</ul>`:`<p class="quality-empty">${review.covered<review.total?'자료가 부족하거나 구현한 조건에 해당하는 변화가 없어요.':'구현한 조건에 해당하는 변화가 없어요.'} 위험이 없다는 뜻은 아니에요.</p>`}
  <details class="quality-raw"><summary>공시 계정과 원자료 보기</summary><table><caption>재고·채권·재무상태 잔액</caption><thead><tr><th>항목</th><th>현재</th><th>전년 말</th></tr></thead><tbody>${qualityKeys.filter(key=>balanceKeys.has(key)).map(key=>`<tr><th scope="row">${qualityLabels[key]}</th><td>${qualityMoney(slice.current[key],slice.currency)}</td><td>${qualityMoney(slice.previous[key],slice.currency)}</td></tr>`).join('')}</tbody></table><ul>${Object.entries(slice.accounts||{}).map(([key,account])=>`<li>${esc(qualityLabels[key])}: ${esc(account.accountName)} · ${esc(account.accountId)} · ${esc(account.statement)} · 접수 ${esc(account.receiptNo)}${account.currentPeriod?`<br>${esc(account.currentPeriod)} / ${esc(account.statement==='BS'?account.previousPeriod:account.previousInterimPeriod||account.previousPeriod)}`:''}</li>`).join('')}</ul></details>
  <p class="quality-method">손익·현금흐름은 ${slice.type==='annual'?'연간':'누적 기간'}끼리 비교하고, 재무상태 잔액은 전년 말과 비교해요. 현금/순이익 = 영업현금흐름 ÷ 순이익, 부채비율 = 부채총계 ÷ 자본총계. 분모가 0 이하이면 비율을 계산하지 않아요. 금융업 등은 업종 특성을 함께 확인하세요. 매출채권 등에 기타채권이 포함된 경우 공시 계정명을 표시해요. 주식수 변화는 이 재무계정 분석 범위에 포함하지 않아요.</p>
 </section>`;
}
export function financialQualityHtml(data){
 const comparison=compareReports(data);if(!comparison.available)return '';
 return qualityReviewHtml(qualitySlice(data,comparison.selection,comparison.slices[0]));
}
