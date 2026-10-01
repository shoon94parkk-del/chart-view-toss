import './investmentReview.css';
import {financialQuartersData} from './api.js';
import {loadingIndicator} from './loadingView.js';
import {openExternal} from './tossBridge.js';
import {number} from './researchAnalysis.js';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money=(v,currency='KRW')=>{const n=number(v);if(n===null)return '확인 불가';return currency==='KRW'?(Math.abs(n)>=1e12?(n/1e12).toLocaleString('ko-KR',{maximumFractionDigits:2})+'조 원':(n/1e8).toLocaleString('ko-KR',{maximumFractionDigits:1})+'억 원'):n.toLocaleString('ko-KR')+' '+esc(currency);};
const pct=v=>number(v)===null?'확인 불가':Number(v).toFixed(1)+'%';
export const sources=urls=>[...new Set(urls||[])].filter(url=>{try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='dart.fss.or.kr';}catch{return false;}}).map((url,i)=>`<button type="button" class="financial-source" data-review-source="${esc(url)}">${i?'계산에 사용한 이전 공시':'공시 원문'}</button>`).join('');
export function bindSources(host){host.querySelectorAll('[data-review-source]').forEach(b=>b.onclick=()=>openExternal(b.dataset.reviewSource));}
export function quarterChart(rows,key){
 const values=rows.map(r=>r.available?number(r[key]):null),valid=values.filter(v=>v!==null);
 if(!valid.length)return '<p>이 항목의 분기 자료를 확인할 수 없어요.</p>';
 const min=Math.min(0,...valid),max=Math.max(0,...valid),span=max-min||1,y=v=>155-(v-min)/span*115;
 const points=values.map((v,i)=>v===null?null:{x:44+i*38,y:y(v),v});
 const segments=[];let current=[];
 for(const p of points){if(p)current.push(p);else if(current.length){segments.push(current);current=[];}}
 if(current.length)segments.push(current);
 return `<svg class="quarter-chart" viewBox="0 0 340 198" role="img" aria-label="최근 8분기 ${key==='revenue'?'매출액':key==='operatingProfit'?'영업이익':'영업이익률'} 추이. 정확한 수치는 아래 표에서 확인하세요."><line x1="38" x2="320" y1="${y(0)}" y2="${y(0)}" stroke="#dbe2ec"/>${segments.map(s=>`<polyline points="${s.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="#3182f6" stroke-width="3"/>`).join('')}${points.map((p,i)=>p?`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#3182f6"><title>${rows[i].year}년 ${rows[i].quarter}분기 · ${key==='margin'?pct(p.v):money(p.v,rows[i].currency)}</title></circle>`:'').join('')}${rows.map((r,i)=>`<text x="${44+i*38}" y="176" text-anchor="middle">${String(r.year).slice(-2)}.${r.quarter}Q</text>`).join('')}<text x="8" y="25">${key==='margin'?pct(max):money(max,rows.find(r=>r.available)?.currency)}</text><text x="8" y="193">${key==='margin'?pct(min):money(min,rows.find(r=>r.available)?.currency)}</text></svg>`;
}
function html(data,key){
 const rows=data.quarters||[],ttm=data.ttm;
 return `<div class="investment-subhead"><div><h3>최근 8분기 흐름</h3><p>누적이 아닌 각 분기의 3개월 실적</p></div><span>${esc(data.basis||'')}</span></div><div class="quarter-tabs" role="group" aria-label="분기 차트 항목">${[['revenue','매출액'],['operatingProfit','영업이익'],['margin','이익률']].map(([k,l])=>`<button type="button" data-quarter-key="${k}" aria-pressed="${key===k}">${l}</button>`).join('')}</div>${quarterChart(rows,key)}
 <div class="review-ttm"><strong>최근 12개월 합계 · TTM</strong>${ttm?`<small>${esc(ttm.start)} → ${esc(ttm.end)}</small><div><span>매출액 <b>${money(ttm.revenue,ttm.currency)}</b></span><span>영업이익 <b>${money(ttm.operatingProfit,ttm.currency)}</b></span></div><p>영업이익률 ${pct(ttm.margin)}</p>`:'<p>연속된 최근 네 분기 자료가 모두 있어야 계산할 수 있어요.</p>'}</div>
 <details class="quarter-table-details"><summary>분기별 수치 · 증가율 · 원문 확인</summary><div class="review-table-scroll"><table class="review-table"><thead><tr><th scope="col">분기</th><th scope="col">매출액</th><th scope="col">영업이익</th><th scope="col">이익률</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${r.year}년 ${r.quarter}Q</th><td>${money(r.revenue,r.currency)}<small>전년 대비 ${pct(r.revenueGrowth)}</small></td><td>${money(r.operatingProfit,r.currency)}<small>전년 대비 ${pct(r.profitGrowth)}</small></td><td>${pct(r.margin)}</td></tr><tr class="quarter-source-row"><td colspan="4">${r.available?(r.method==='annual_minus_q3'?'연간 − 3분기 누적 · 계산값':r.method==='cumulative_difference'?'인접 누적 공시의 차이 · 계산값':'공시의 3개월 실적'):'자료 미확인'} ${sources(r.sourceUrls)}</td></tr>`).join('')}</tbody></table></div></details>
 <p class="review-note">4분기는 연간에서 3분기 누적을 뺀 계산값이에요. 각 공시의 정정 시점이 다르면 계산값도 달라질 수 있어요. 증가율은 전년 같은 분기 값이 양수일 때만 계산해요. 자료 없는 분기를 0으로 채우지 않아요.${data.refreshFailed?' 최신 조회에 실패해 이전 공시 자료를 표시하고 있어요.':data.partialRefresh?' 일부 보고서의 재조회에 실패해 저장된 자료를 함께 표시하고 있어요.':data.refreshDelayed?' 확인이 지연되어 저장된 자료를 표시하고 있어요.':''}</p>${data.refreshing?loadingIndicator('새 공시를 확인하는 동안 저장된 분기 자료를 보여드려요'):''}${data.refreshFailed||data.partialRefresh||data.refreshDelayed?'<button type="button" class="retry" data-quarter-retry>분기 실적 다시 확인</button>':''}`;
}
export function mountQuarters(host,symbol){
 let sequence=0,key='revenue',lastGood=null;
 const paint=data=>{
  const expanded=host.querySelector('.quarter-table-details')?.open;
  const focusedKey=host.contains(document.activeElement)?document.activeElement?.dataset.quarterKey:null;
  const focusedSummary=host.querySelector('.quarter-table-details summary')===document.activeElement;
  host.innerHTML=html(data,key);bindSources(host);
  host.querySelector('.quarter-table-details').open=Boolean(expanded);
  const buttons=[...host.querySelectorAll('[data-quarter-key]')];
  buttons.forEach(b=>b.onclick=()=>{key=b.dataset.quarterKey;paint(data);});
  if(focusedKey)buttons.find(b=>b.dataset.quarterKey===focusedKey)?.focus({preventScroll:true});
  if(focusedSummary)host.querySelector('.quarter-table-details summary').focus({preventScroll:true});
  host.querySelector('[data-quarter-retry]')?.addEventListener('click',()=>load(true));
 };
 const load=async(force=false)=>{
  const run=++sequence,start=Date.now();host.setAttribute('aria-busy','true');
  if(lastGood)paint({...lastGood,refreshing:true,refreshFailed:false});
  else host.innerHTML=loadingIndicator('분기 보고서를 확인하고 있어요 · 첫 조회는 시간이 걸릴 수 있어요');
  try{
   while(host.isConnected&&run===sequence){
    const data=await financialQuartersData(symbol,{refresh:force});force=false;
    if(!host.isConnected||run!==sequence)return;
    if(data.available){lastGood=data;paint(data);if(!data.refreshing)return;}
    else{
    if(!['loading','busy'].includes(data.state))throw new Error(data.state==='error'?'분기 보고서를 불러오지 못했어요.':'확인할 수 있는 분기 보고서가 없어요.');
    }
    if(Date.now()-start>120000){if(lastGood){paint({...lastGood,refreshing:false,refreshDelayed:true});return;}throw new Error('보고서 확인이 지연되고 있어요. 잠시 후 다시 확인해주세요.');}
    await new Promise(resolve=>setTimeout(resolve,3000));
   }
  }catch(error){if(host.isConnected&&run===sequence){if(lastGood)paint({...lastGood,refreshing:false,refreshFailed:true});else{host.innerHTML=`<div class="financial-empty"><p>${esc(error?.message||'분기 보고서를 불러오지 못했어요.')}</p><button type="button" class="retry" data-quarter-retry>분기 실적 다시 확인</button></div>`;host.querySelector('button').onclick=()=>load(true);}}}
  finally{if(host.isConnected&&run===sequence)host.setAttribute('aria-busy','false');}
 };
 void load();
}
