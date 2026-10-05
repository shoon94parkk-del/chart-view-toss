import {GURU_STRATEGIES} from './guruInvestingModel.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,unit='')=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('ko-KR',{maximumFractionDigits:1})+unit:'—';
const guides={
 oneil:{source:'https://shop.investors.com/images/promotional/20-Rules_102808.pdf',rows:[['연간','4년 양수 기본 EPS · 최근3년 각각 ≥25% 성장 · 최근 ROE ≥17%'],['분기','최근 대상 단일 분기 EPS·매출 각각 전년 동기 ≥25%'],['돌파','최근5거래일 내 이전55일 고가 돌파 · 거래량 ≥이전50일 평균의1.4배'],['위치','현재 종가가 돌파선 위0~5% · 상대강도 ≥80백분위']],basis:'누적 EPS를 빼서 분기 EPS를 만들지 않아요. 분기 원공시의 3개월 EPS·매출을 사용해요. 돌파 기간·거래량·가격 범위는 차트뷰 기준이에요.'},
 minervini:{source:'https://www.minervini.com/1MTPreview.pdf',rows:[['정렬','종가 >50일선 >150일선 >200일선'],['상승','200일선이20거래일 전보다 상승'],['위치','52주 저가 대비 ≥30% · 고가에서 하락 ≤25%'],['강도','252거래일 수익률이 한국 비교시장 ≥70백분위']],basis:'253거래일 이상의 Yahoo 일봉을 사용해요. 상대강도는 같은 기준일 종가가 검증된 한국 일반기업의 단순 수익률 백분위예요. 이 비교 대상의 일봉 자료90% 미만이면 결과를 표시하지 않아요. 종가·이력 부족 기업은 전체 검증 범위에서 따로 표시해요. 차트뷰가 정한 수치 기준이에요.'},
 greenblatt:{source:'https://www.aaii.com/journal/article/the-magic-formula-approach-to-stockpicking',rows:[['대안','EV 대신 검증 가능한 연간 ROA·PER 활용'],['수익성','최근 연간 순이익 / 기말 총자산 ≥25%'],['가격','기준일 종가 / 연간 기본 EPS · PER5~20배'],['정렬','금융·유틸리티 제외 · 낮은 PER 순 최대30개']],basis:'공개 자료에 소개된 ROA·PER 대안을 참고했어요. PER 상한20배·최대30개는 차트뷰 기준이에요. EBIT/EV·투하자본수익률을 계산한 매직포뮬러와 구분해요.'},
};
export function extensionCriteria(strategy){
 const g=guides[strategy];
 return `<details class="guru-guide"><summary>선정 기준 · 투자 원칙 보기</summary><div><p>투자 원칙을 참고해 <b>차트뷰가 정한 수치 기준</b>이에요. 해당 투자자가 선정한 종목이 아니에요.</p><dl>${g.rows.map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl><p>${g.basis}</p><p>${GURU_STRATEGIES[strategy].limits}</p><button class="guru-text-action" data-external-url="${esc(g.source)}">투자 원칙 출처 확인 ↗</button></div></details>`;
}
function table(head,rows){return `<div class="guru-table-wrap"><table><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((v,i)=>`<${i?'td':'th'}>${esc(v)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
export function extensionEvidence(evidence,strategy,row){
 const selected=evidence.strategies?.[strategy];if(!selected||selected.status!=='matched')throw new Error('같은 선정 기준의 근거를 확인하지 못했어요.');
 const sources=new Map();
 if(strategy!=='minervini')for(const accounts of Object.values(evidence.sources||{}))for(const s of Object.values(accounts||{}))if(/^https:\/\/dart\.fss\.or\.kr\/dsaf001\/main\.do\?rcpNo=\d{14}$/.test(s.sourceUrl||''))sources.set(s.receiptNo,s);
 let details='';
 if(strategy==='greenblatt'){
  details=`<p class="guru-evidence-basis">${evidence.basis==='CFS'?'연결':'별도'}재무제표 · ROA/PER 대안 · EV 매직포뮬러 아님</p><p>낮은 PER 순 ${num(selected.metrics.valueRank||row.metrics.valueRank)}위 · 기준일 종가 ÷ 최근 연간 EPS</p>`+table(['연도','순이익(억원)','자산(억원)','EPS(원)'],(evidence.annual||[]).map(r=>[r.year,num(r.netIncome/1e8),num(r.assets/1e8),num(r.basicEps)]));
 }else{
  const t=evidence.technical;if(!t||t.tradeDate!==evidence.tradeDate)throw new Error('같은 기준일의 일봉 근거를 확인하지 못했어요.');
  details=`<p class="guru-evidence-basis">${esc(t.tradeDate)} 종가 · ${t.barCount}거래일 · Yahoo 종가(분할 반영·배당 미조정)</p>`;
  if(strategy==='oneil'){
   const q=evidence.quarter;if(!q?.sourceUrl)throw new Error('같은 선정의 분기 공시를 확인하지 못했어요.');
   sources.set(q.receiptNo,{...q,reportYear:`${q.year}년 ${q.quarter}분기`});
   details+=`<p>${q.year}년 ${q.quarter}분기 · 단일3개월 비교 · ${esc(q.filingDate)} 공시</p>`+table(['구분','당기','전년 동기'],[['기본 EPS(원)',num(q.basicEps),num(q.priorBasicEps)],['매출(억원)',num(q.revenue/1e8),num(q.priorRevenue/1e8)]])+`<p>돌파일 ${esc(t.breakoutDate)} · 돌파선 ${num(t.breakoutLevel,'원')} · 돌파 후 ${num(t.breakoutExtensionPct,'%')}</p>`;
   details+=table(['연도','기본 EPS(원)','자본(억원)'],(evidence.annual||[]).map(r=>[r.year,num(r.basicEps),num(r.equity/1e8)]));
  }
  details+=table(['일봉 항목','확인값'],[['종가',num(t.price,'원')],['50일 평균',num(t.sma50,'원')],['150일 평균',num(t.sma150,'원')],['200일 평균',num(t.sma200,'원')],['20일 전 200일 평균',num(t.sma200Prior20,'원')],['52주 고가 / 저가',`${num(t.high52)} / ${num(t.low52)}원`],['252거래일 수익률',num(t.return252,'%')],['상대강도',num(t.relativeStrengthPercentile,'백분위')],['비교 자료',`${t.rsObservedCount} / ${t.rsUniverseCount}기업`]]);
  details+=`<button class="guru-text-action" data-external-url="https://finance.yahoo.com/quote/${esc(row.symbol)}/history/">일봉 원자료 확인 ↗</button>`;
 }
 return `<ul class="guru-checks">${selected.checks.map(c=>`<li><b>${esc(c.label)}</b><span>${esc(c.threshold)}<em>확인 ${num(c.value,c.unit||'%')}</em></span></li>`).join('')}</ul>${details}<div class="guru-source-links">${[...sources.values()].sort((a,b)=>b.receiptNo.localeCompare(a.receiptNo)).map(s=>`<button data-external-url="${esc(s.sourceUrl)}">${esc(s.reportYear)} 보고서 · ${esc(s.filingDate)} ↗</button>`).join('')}</div><details class="guru-next"><summary>추가로 생각해볼 질문</summary><ul>${GURU_STRATEGIES[strategy].questions.map(q=>`<li>${esc(q)}</li>`).join('')}</ul><p>${GURU_STRATEGIES[strategy].limits}</p></details><div class="guru-evidence-actions"><button data-stock-detail="${esc(row.symbol)}" data-stock-name="${esc(row.name)}">종목 상세</button><button data-tab="discover">기술적 조건 검색</button></div><p class="guru-footnote">기술 검색은 별도의 조건과 기준일이에요. 이 거장 조건이 함께 적용되지는 않아요.</p>`;
}
