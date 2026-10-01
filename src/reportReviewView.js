import './investmentReview.css';
import {financialHistoryData} from './api.js';
import {filingSnapshot,filingChanges,evaluateCondition} from './investmentReview.js';
import {readReview,updateReview} from './reviewStorage.js';
import {loadingIndicator} from './loadingView.js';
import {esc,money,sources,bindSources} from './quarterView.js';
const statusLabels={first:'처음 확인하는 공시',same:'마지막 확인한 공시와 같아요',new:'새 기간의 공시가 있어요',corrected:'같은 기간의 공시 수치·원문이 달라졌어요',incompatible:'재무제표·통화 기준이 달라졌어요',older:'마지막 확인보다 과거 자료예요',unavailable:'공시를 확인할 수 없어요'};
function conditionHtml(condition,i,observed,{pending=false}={}){
 const baseline=condition.baseline||{};
 const same=observed.matched!==null&&observed.label===baseline.label&&JSON.stringify(observed.sourceUrls)===JSON.stringify(baseline.sourceUrls)&&observed.value===baseline.value&&observed.reference===baseline.reference;
 const status=pending?'공시 확인 중':observed.matched===null?'확인 불가':same?'저장한 비교와 같아요':observed.matched!==baseline.matched?'달라짐':observed.matched?'조건 유지':'조건 미충족 유지';
 const value=(n,currency=observed.currency)=>n==null?'확인 불가':condition.key==='operatingCashFlow'?money(n,currency):Number(n).toFixed(1)+'%';
 return `<article class="tracked-condition"><strong>${esc(condition.label)}</strong>${condition.peer?`<p>비교 회사 · ${esc(condition.peer.name)}</p>`:''}<span class="review-status">${status}</span><p>${pending?loadingIndicator('최신 공시와 비교하고 있어요'):`${esc(observed.label||'기간 확인 불가')} · ${observed.matched===null?esc(observed.reason):`현재 조건 ${observed.matched?'충족':'미충족'} · ${value(observed.value)} / ${condition.peer?'비교 회사':'기준'} ${value(observed.reference)}`}`}</p><p>저장 당시 ${esc(baseline.label||'')} · ${value(baseline.value,baseline.currency)} / ${value(baseline.reference,baseline.currency)} · ${baseline.matched?'충족':'미충족'}</p>${sources(pending?baseline.sourceUrls:observed.sourceUrls)}${pending?'':`<button type="button" class="review-remove" data-remove-condition="${i}">근거 삭제</button>`}</article>`;
}
export function mountReportReview(host,{symbol,data,onNotice}){
 if(!host)return;
 let run=0;
 const paint=()=>{
  if(!host.isConnected)return;
  let saved;try{saved=readReview(symbol);}catch{saved={conditions:[],readError:true};}
  const snapshot=filingSnapshot(data),change=filingChanges(saved.filing,snapshot);
  const previous=change.previous,keys=[['revenue','매출액'],['operatingProfit','영업이익'],['netIncome','순이익'],['operatingCashFlow','영업현금흐름'],['inventories','재고자산'],['receivables','매출채권 등']];
  host.innerHTML=`<div class="report-review"><h3>공시에서 달라진 점</h3><span class="review-status">${data?.pending?'최근 공시 확인 중':statusLabels[change.kind]}</span>${snapshot?`<p class="review-note">${esc(snapshot.label)} · ${esc(snapshot.basis)} · ${esc(snapshot.currency)}</p>`:''}
   ${['incompatible','older'].includes(change.kind)?'<p class="review-note">마지막으로 확인한 수치와 직접 비교하지 않아요. 두 보고서의 기준을 먼저 확인해주세요.</p>':snapshot?`<details class="review-change-details" ${['new','corrected'].includes(change.kind)?'open':''}><summary>${change.kind==='corrected'?'마지막 확인한 수치와 비교':'전년 같은 기간·전년 말과 비교'}</summary>${keys.map(([key,label])=>{
    const a=snapshot.current[key],b=previous?.[key],balance=['inventories','receivables'].includes(key);
    const valid=typeof a==='number'&&typeof b==='number';
    return `<div class="review-value"><span>${label}${change.kind!=='corrected'&&balance?' · 전년 말 대비':''}</span><div><b>${money(a,snapshot.currency)}</b><small>${change.kind==='corrected'?'마지막 확인':'이전'} ${money(b,snapshot.currency)} · ${valid?(a===b?'같은 수준':a>b?'증가':'감소'):'변화 확인 불가'}</small></div></div>`;
   }).join('')}</details>`:''}
   ${change.priorChanged?.length?`<div class="review-note"><strong>이전 비교기간 수치도 달라졌어요</strong>${change.priorChanged.map(key=>`<p>${esc(keys.find(([k])=>k===key)?.[1]||key)} · 마지막 확인 ${money(saved.filing.previous?.[key],snapshot.currency)} → 이번 공시 ${money(snapshot.previous[key],snapshot.currency)}</p>`).join('')}</div>`:''}
   ${sources([snapshot?.sourceUrl,...(['corrected','incompatible','older'].includes(change.kind)?[saved.filing?.sourceUrl]:[])])}
   ${snapshot&&!['same','older'].includes(change.kind)&&!saved.readError?'<button type="button" class="review-ack" data-review-ack>이 공시 확인 완료</button>':''}<p class="review-note">확인 완료를 누르면 이 기기에 기준 보고서가 저장돼요. 새 기간은 전년 같은 기간과, 정정은 마지막 확인한 같은 기간과 비교해요. 원인과 전망을 추정하지 않아요.</p></div>
   <div class="tracked-conditions"><h3>내 투자 근거 다시 확인</h3><p class="review-note">공시 비교 결과에서 근거를 골라 최대 3개까지 저장할 수 있어요. 저장한 질문과 별도로 이 기기에만 보관해요.</p><div data-tracked-results>${(saved.conditions||[]).length?loadingIndicator('저장한 근거의 공시를 확인하고 있어요'):'아직 저장한 근거가 없어요. 아래 공시 비교를 해보세요.'}</div><button type="button" class="review-check" data-tracked-check>공시로 다시 확인</button><div class="review-announce" role="status" data-review-announce>${saved.readError?'저장한 근거를 읽지 못했어요. 기기 저장 상태를 확인해주세요.':''}</div></div>`;
  bindSources(host);
  host.querySelector('[data-review-ack]')?.addEventListener('click',()=>{try{updateReview(symbol,{filing:snapshot,reviewedAt:new Date().toISOString()});onNotice?.('이 공시를 확인한 기준으로 저장했어요.');paint();}catch{host.querySelector('[data-review-announce]').textContent='기준 보고서를 저장하지 못했어요.';}});
  host.querySelector('[data-tracked-check]').onclick=()=>check(saved.conditions||[],true);
  void check(saved.conditions||[]);
 };
 const check=async(conditions,force=false)=>{
  const seq=++run,target=host.querySelector('[data-tracked-results]');
  if(!conditions.length){target.textContent='아직 저장한 근거가 없어요. 아래 공시 비교에서 선택해주세요.';return;}
  target.setAttribute('aria-busy','true');target.innerHTML=conditions.map((c,i)=>conditionHtml(c,i,{matched:null},{pending:true})).join('');bindSources(target);
  const button=host.querySelector('[data-tracked-check]');button.disabled=true;
  if(data?.pending)return;
  try{
   const symbols=[symbol,...new Set(conditions.map(c=>c.peer?.symbol).filter(Boolean))];
   const reports=await Promise.all(symbols.map(s=>s===symbol&&!force?Promise.resolve(data):financialHistoryData(s,{force}).catch(()=>({available:false,loadError:true}))));
   if(seq!==run||!host.isConnected)return;
   target.innerHTML=conditions.map((condition,i)=>{
    const observed=evaluateCondition(condition,[reports[0],condition.peer?reports[symbols.indexOf(condition.peer.symbol)]:null]);
    return conditionHtml(condition,i,observed);
   }).join('')+'<p class="review-note">조건 충족은 매수·매도 판단이나 투자 성과를 뜻하지 않아요. 저장 이후의 공시 수치와 비교 기준을 확인하는 기능이에요.</p>';
   bindSources(target);
   target.querySelectorAll('[data-remove-condition]').forEach(b=>b.onclick=()=>{
    if(b.dataset.confirm!=='true'){b.dataset.confirm='true';b.textContent='한 번 더 누르면 삭제';return;}
    try{updateReview(symbol,{conditions:conditions.filter((_,i)=>i!==Number(b.dataset.removeCondition))});paint();}catch{host.querySelector('[data-review-announce]').textContent='근거를 삭제하지 못했어요.';}
   });
  }catch{if(seq===run&&host.isConnected)target.innerHTML='<p class="review-note">저장한 근거를 확인하지 못했어요. 공시로 다시 확인을 눌러주세요.</p>';}
  finally{if(seq===run&&host.isConnected){target.setAttribute('aria-busy','false');button.disabled=false;}}
 };
 paint();
 if(host.reviewListener)document.removeEventListener('chartview:review-changed',host.reviewListener);
 const changed=()=>{if(host.isConnected)paint();else document.removeEventListener('chartview:review-changed',changed);};
 host.reviewListener=changed;
 document.addEventListener('chartview:review-changed',changed);
}
