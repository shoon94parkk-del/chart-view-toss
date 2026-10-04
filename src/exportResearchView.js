import {companyContextData} from './api.js';
import {exportCompanyCandidates} from './insightModel.js';
import {formatSignedPct,formatUsdBillion} from './exportMomentumModel.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function mountExportResearch(host,detail,{alive=()=>host.isConnected,state={}}={}){
 if(!host||!alive())return;
 host.innerHTML='<h4>이 흐름을 기업 실적으로 확인하기</h4><p role="status">기존 KRX 주요제품에서 관련 사업 분류를 확인하고 있어요.</p>';
 let metadata={};try{if(detail.key==='semiconductor')metadata=await companyContextData();}catch{}
 if(!alive())return;
 const candidates=exportCompanyCandidates(detail.key,metadata),latest=detail.latest||detail.history?.at(-1)||{};
 host.innerHTML=`<h4>이 흐름을 기업 실적으로 확인하기</h4><p>월간 HS ${esc(detail.note)} · ${esc(detail.period)}. 기업별 수출액·납품 관계·수혜는 이 통계로 확인할 수 없어요.</p><p><b>공시에서 확인할 질문</b> · 관련 사업이 매출에서 차지하는 비중은? 재고·영업현금흐름도 매출과 같은 방향인가?</p>${candidates.length?`<label>조사한 수출 범위<select data-export-research-country><option value="">전세계 · 품목 전체</option>${(detail.countries||[]).map((row,index)=>`<option value="${index}">${esc(row.name)} · 수출 ${esc(formatUsdBillion(row.exportsUsdBillion))}</option>`).join('')}</select></label><p class="export-research-basis">${esc(metadata.source||'KRX 주요제품')} · 분류 자료 ${esc(candidates[0].basisDate)} · HS와 기업 제품의 완전한 일치가 아닌 사업 분류 후보예요.</p><div class="export-research-companies">${candidates.map((row,index)=>`<button type="button" data-export-research-company="${index}"><strong>${esc(row.name)}</strong><small>${esc(row.mainProducts)}</small><b>사업·공시 확인 →</b></button>`).join('')}</div>`:'<p>검증된 연결 후보가 없어요. 회사 이름이나 업종만으로 수혜 기업을 만들지 않았어요. 종목 검색에서 주요제품·사업 공시를 직접 대조해주세요.</p>'}`;
 const selector=host.querySelector('select');
 if(selector){const index=(detail.countries||[]).findIndex(row=>row.name===state.countryName);selector.value=index<0?'':String(index);selector.onchange=()=>{state.countryName=selector.value===''?'':detail.countries[Number(selector.value)]?.name||'';};}
 if(state.returnToResearch){state.returnToResearch=false;host.tabIndex=-1;host.scrollIntoView({block:'start'});host.focus({preventScroll:true});}
 host.querySelectorAll('[data-export-research-company]').forEach(button=>button.onclick=()=>{
  const row=candidates[Number(button.dataset.exportResearchCompany)],choice=host.querySelector('select').value;
  const country=choice===''?null:detail.countries[Number(choice)];
  state.returnToResearch=true;
  const observations=country?[`${country.name} 수출 ${formatUsdBillion(country.exportsUsdBillion)} · 해당 품목의 지정시장 관찰`]:[`수출액 YoY ${formatSignedPct(latest.exportYoY)}`,`순중량 YoY ${formatSignedPct(latest.exportWeightYoY)}`,`평균 단위가치 YoY ${formatSignedPct(latest.unitValueYoY)}`];
  window.__chartviewInvestigate?.(row.symbol,row.name,{kind:'export',symbol:row.symbol,title:`${detail.name} · ${country?.name||'전세계'} 수출에서 출발`,basisDate:detail.period,observations,source:row.source,productDate:row.basisDate,products:row.mainProducts,challenge:'통계 증가와 기업 매출·이익 증가는 같지 않아요. 사업 구성, 수출 노출, 재고와 영업현금흐름을 함께 확인하세요.',next:'사업 구성과 공시 실적 확인'});
 });
}
