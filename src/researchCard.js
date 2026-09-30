import './researchCard.css';
import { readResearchNote, saveResearchNote, deleteResearchNote } from './researchNotes.js';
import { financialHistoryData, screenerData } from './api.js';
import { loadingIndicator } from './loadingView.js';
import { openExternal } from './tossBridge.js';
import { questionPlan, compareReports, reportObservations, growthComparison, number } from './researchAnalysis.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(v,currency)=>{
 const n=number(v);if(n===null)return '확인 불가';
 if(currency!=='KRW')return `${n.toLocaleString('ko-KR')} ${esc(currency||'')}`;
 return Math.abs(n)>=1e12?`${(n/1e12).toFixed(2)}조 원`:Math.abs(n)>=1e8?`${(n/1e8).toFixed(1)}억 원`:`${n.toLocaleString('ko-KR')}원`;
};
const sourceUrl=url=>{try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='dart.fss.or.kr'?u.href:null;}catch{return null;}};

export function mountResearchCard(host,{symbol,name,onJump,onNotice,candidates=[]}){
 if(!host)return;
 let saved=null,sequence=0,lastQuestion='',lastTarget=null;
 try{saved=readResearchNote(symbol);}catch{}
 const korean=/\.(KS|KQ)$/i.test(symbol);
 const examplePeer=symbol==='000660.KS'?'삼성전자':'SK하이닉스';
 const examples=[
  {label:'최근 실적 비교',question:'최근 매출과 영업이익은 이전보다 어떻게 달라졌어?'},
  {label:'전년 대비 증가율',question:'매출과 영업이익의 전년 대비 증가율을 비교해줘'},
  {label:`${examplePeer}와 비교`,question:`${examplePeer}와 매출 및 영업이익 증가율을 비교해줘`},
 ];
 host.innerHTML=`<form class="research-form research-ask" id="research-form">
  <div class="research-guide" id="research-guide"><strong>비교할 수 있는 항목</strong><p>국내 종목의 DART 공시에서 확인한 매출액·영업이익·영업이익률·전년 대비 증가율을 비교해요.</p><p class="research-guide-limit">앞으로의 전망, 목표주가, 주가 상승 이유 같은 예측·원인 해석은 지원하지 않아요. 공시 자료가 없으면 확인 불가로 표시해요.</p></div>
  ${korean?`<div class="research-examples" aria-label="질문 예시"><span>질문 예시 · 누르면 입력돼요</span>${examples.map((row,index)=>`<button type="button" data-research-example="${index}">${esc(row.label)}</button>`).join('')}</div>`:''}
  <label for="research-question">${esc(name||symbol)}의 어떤 실적을 비교할까요?</label>
  <textarea id="research-question" name="question" maxlength="180" rows="3" required aria-describedby="research-guide research-help" placeholder="예: 매출과 영업이익의 전년 대비 증가율을 비교해줘">${esc(saved?.question||'')}</textarea>
  <p class="research-form-help" id="research-help">종목명과 항목을 찾아 공시 수치를 조회·계산하는 기능이에요. 다른 회사 하나의 이름을 함께 적으면 같은 기간의 실적을 나란히 비교해요.</p>
  <button type="submit" class="research-analyze">비교 분석하기</button>
 </form><div id="research-result" aria-live="polite"></div>
 <div class="research-foot"><span id="research-save-state" role="status">${saved?'저장한 질문을 불러왔어요.':'질문은 이 기기에서만 처리해요.'}</span><div><button type="button" data-research-save>질문 저장</button><button type="button" data-research-delete ${saved?'':'hidden'}>저장한 질문 삭제</button></div></div>
 ${saved&&(saved.support||saved.challenge||saved.reviewOn)?`<details class="research-legacy"><summary>이전에 적은 메모</summary><p>${esc(saved.support)}</p><p>${esc(saved.challenge)}</p>${saved.reviewOn?`<p>다시 볼 날짜 ${esc(saved.reviewOn)}</p>`:''}</details>`:''}`;
 const form=host.querySelector('form'),input=host.querySelector('textarea'),result=host.querySelector('#research-result'),saveState=host.querySelector('#research-save-state');
 host.querySelectorAll('[data-research-example]').forEach(button=>button.onclick=()=>{
  input.value=examples[Number(button.dataset.researchExample)].question;
  sequence++;result.innerHTML='';result.setAttribute('aria-busy','false');
  saveState.textContent='예시를 입력했어요. 비교 분석하기를 눌러주세요.';
  input.focus({preventScroll:true});
 });
 const bindResults=()=>{
  result.querySelector('[data-research-retry]')?.addEventListener('click',()=>analyze(lastQuestion,lastTarget));
  result.querySelectorAll('[data-research-jump]').forEach(b=>b.onclick=()=>{if(!onJump?.(b.dataset.researchJump))onNotice?.('해당 자료를 아직 표시할 수 없어요.');});
  result.querySelectorAll('[data-research-source]').forEach(b=>b.onclick=()=>openExternal(b.dataset.researchSource));
 };
 const analyze=async (question,chosenTarget=null)=>{
  if(!question.trim()){input.focus();return;}
  const run=++sequence;lastQuestion=question;lastTarget=chosenTarget;
  result.setAttribute('aria-busy','false');
  if(!korean){result.innerHTML='<p class="research-form-error">이 체험판은 국내 종목의 DART 실적을 비교해요. 해외 종목은 상세의 핵심 지표와 가격 차트를 확인해주세요.</p>';return;}
  result.setAttribute('aria-busy','true');result.innerHTML=loadingIndicator('질문에 맞는 공시 비교 자료를 확인하고 있어요');
  try{
   const universe=await screenerData().catch(()=>({stocks:[]}));
   if(run!==sequence||!host.isConnected)return;
   const plan=questionPlan(question,symbol,[...candidates,...(universe.stocks||[])]);
   if(chosenTarget){plan.target=chosenTarget;plan.limits=plan.limits.filter(text=>!text.startsWith('다른 회사 하나와 비교'));}
   if(plan.targets.length>1&&!chosenTarget){
    result.innerHTML=`<div class="research-answer"><h3>비교할 회사를 선택해주세요</h3><p>여러 회사가 확인돼요. 비교할 회사 하나를 선택하면 같은 기간의 공시 수치를 보여드려요.</p>${plan.targets.map((row,index)=>`<button type="button" data-research-target="${index}">${esc(row.name)}</button>`).join('')}</div>`;
    result.querySelectorAll('[data-research-target]').forEach(button=>button.onclick=()=>analyze(question,plan.targets[Number(button.dataset.researchTarget)]));
    return;
   }
   if(plan.target&&!/\.(KS|KQ)$/i.test(plan.target.symbol)){
    if(run===sequence&&host.isConnected)result.innerHTML='<p class="research-form-error">기업 간 공시 비교는 국내 종목끼리 지원해요. 비교할 국내 회사 이름을 적어주세요.</p>';
    return;
   }
   const companies=[{symbol,name:name||symbol},...(plan.target?[plan.target]:[])];
   lastTarget=plan.target;
   const reports=await Promise.all(companies.map(row=>financialHistoryData(row.symbol).catch(()=>({loadError:true}))));
   if(run!==sequence||!host.isConnected)return;
   const comparison=compareReports(reports[0],reports[1]||null);
   const limits=plan.limits.map(text=>`<p>${esc(text)}</p>`).join('');
   const title=plan.focus==='growth'?'매출·영업이익 증가율 비교':plan.focus==='profit'?'영업이익과 수익성 비교':plan.focus==='revenue'?'매출 성장 비교':'매출·영업이익 변화 비교';
   if(!comparison.available){
    result.innerHTML=`<div class="research-answer"><small>입력한 질문</small><p class="research-submitted">${esc(question)}</p><h3>공시 비교를 완료하지 못했어요</h3><p>${esc(comparison.reason)}</p>${limits}<button type="button" data-research-retry>다시 비교하기</button><button type="button" data-research-jump="detail-financial-block">공시 실적 확인</button></div>`;
   }else{
    const {selection,slices}=comparison;
    const metrics=plan.focus==='growth'?['revenueGrowth','profitGrowth','margin']:plan.focus==='profit'?['profit','margin','revenue']:['revenue','profit','margin'];
    const labels={revenueGrowth:'매출 증가율',profitGrowth:'영업이익 증가율',revenue:'매출액',profit:'영업이익',margin:'영업이익률'};
    const cell=(s,key)=>{
     if(key==='revenueGrowth'||key==='profitGrowth'){
      const value=key==='revenueGrowth'?'revenue':'operatingProfit';
      return `<strong>${esc(s[key].label)}</strong><small>현재 ${money(s.current[value],s.currency)}</small><small>이전 ${money(s.previous[value],s.currency)}</small>`;
     }
     if(key==='margin')return `<strong>${s.margin===null?'확인 불가':s.margin.toFixed(1)+'%'}</strong><small>이전 ${s.priorMargin===null?'확인 불가':s.priorMargin.toFixed(1)+'%'}</small>`;
     const value=key==='revenue'?'revenue':'operatingProfit',change=key==='revenue'?s.revenueGrowth:s.profitGrowth;
     return `<strong>${money(s.current[value],s.currency)}</strong><small>이전 ${money(s.previous[value],s.currency)}</small><em>${esc(change.label)}</em>`;
    };
    result.innerHTML=`<div class="research-answer"><small>입력한 질문</small><p class="research-submitted">${esc(question)}</p><h3>${title}</h3><p class="research-period">${esc(selection.label)} · 이전 ${esc(selection.priorLabel)} 대비</p>
     <p class="research-period research-companies">${companies.map(r=>`${esc(r.name)} (${esc(r.symbol)})`).join(' · 비교 · ')}</p>
     <table class="research-table"><caption>${esc(selection.label)} 공시 실적 비교</caption><thead><tr><th scope="col">지표</th>${companies.map(r=>`<th scope="col">${esc(r.name)}</th>`).join('')}</tr></thead><tbody>${metrics.map(key=>`<tr><th scope="row">${labels[key]}</th>${slices.map(s=>`<td>${cell(s,key)}</td>`).join('')}</tr>`).join('')}</tbody></table>
     <div class="research-findings"><h4>공시에서 확인한 변화</h4>${companies.length===2?`<ul class="research-growth-difference">${growthComparison(slices,companies.map(r=>r.name)).map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}${plan.focus==='growth'&&companies.length===2?'':slices.map((s,i)=>`<div><b>${esc(companies[i].name)}</b><ul>${reportObservations(s).map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>`).join('')}</div>
     <div class="research-scope"><strong>확인 범위</strong><p>질문 키워드로 비교 항목을 정리한 결과예요. 공시의 매출·영업이익 수치만 계산하며 자유 질문에 대한 AI 답변은 제공하지 않아요.</p>${limits}<p>영업이익률 = 영업이익 ÷ 매출액 × 100. 증감률은 이전 값이 양수일 때만 계산해요. ${esc(slices[0].basis||'재무제표')} · ${esc(slices[0].currency||'통화 확인 필요')} · 연간과 분기 누적은 서로 섞지 않아요.</p></div>
     <div class="research-sources"><span>비교에 사용한 원자료</span>${slices.map((s,i)=>sourceUrl(s.sourceUrl)?`<button type="button" data-research-source="${esc(sourceUrl(s.sourceUrl))}">${esc(companies[i].name)} 공시 원문</button>`:'').join('')}<button type="button" data-research-jump="detail-financial-block">전체 실적 흐름</button><button type="button" data-research-jump="detail-industry-block">회사·산업</button><button type="button" data-research-jump="detail-news-section">관련 뉴스</button></div>
    </div>`;
   }
   bindResults();
  }catch{
   if(run!==sequence||!host.isConnected)return;
   result.innerHTML='<p class="research-form-error">비교 자료를 불러오지 못했어요. 질문을 유지한 채 다시 시도해주세요.</p><button type="button" data-research-retry>다시 비교하기</button>';bindResults();
  }finally{if(run===sequence&&host.isConnected)result.setAttribute('aria-busy','false');}
 };
 form.onsubmit=e=>{e.preventDefault();analyze(input.value);};
 host.querySelector('[data-research-save]').onclick=()=>{
  try{saved=saveResearchNote(symbol,{...saved,question:input.value});host.querySelector('[data-research-delete]').hidden=false;saveState.textContent='질문을 이 기기에 저장했어요.';onNotice?.('질문을 저장했어요.');}
  catch{saveState.textContent='질문을 저장하지 못했어요. 입력 내용과 기기 저장 공간을 확인해주세요.';}
 };
 const remove=host.querySelector('[data-research-delete]');
 if(remove)remove.onclick=()=>{
  if(remove.dataset.confirm!=='true'){remove.dataset.confirm='true';remove.textContent='한 번 더 누르면 삭제';setTimeout(()=>{if(remove.isConnected){remove.dataset.confirm='false';remove.textContent='저장한 질문 삭제';}},4500);return;}
  try{deleteResearchNote(symbol);saved=null;remove.hidden=true;remove.dataset.confirm='false';remove.textContent='저장한 질문 삭제';host.querySelector('.research-legacy')?.remove();saveState.textContent='저장한 질문을 삭제했어요. 현재 입력은 남아 있어요.';}
  catch{saveState.textContent='저장한 질문을 삭제하지 못했어요.';}
 };
}
