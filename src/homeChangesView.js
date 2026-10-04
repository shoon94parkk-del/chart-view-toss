import {loadExportMomentumSnapshot} from './exportMomentumData.js';
import {screenerData} from './api.js';
import {homeChanges} from './insightModel.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function mountHomeChanges(host){
 let expanded=false;
 const sources={exports:{value:{},status:'idle',run:0},stocks:{value:{},status:'idle',run:0}};
 function paint(){
  if(!host.isConnected)return;
  const element=typeof document==='undefined'?null:document.activeElement;
  const focused=element&&host.contains?.(element)&&element.matches?.('[data-feature-route]')?{route:element.dataset.featureRoute,target:element.dataset.featureTarget,top:element.getBoundingClientRect().top}:null;
  const rows=homeChanges(sources.exports.value,sources.stocks.value);
  const loading=Object.values(sources).some(source=>source.status==='loading');
  const failed=Object.values(sources).some(source=>source.status==='error');
  if(focused&&rows.findIndex(row=>row.route===focused.route&&row.target===focused.target)>=2)expanded=true;
  const card=row=>`<article class="home-change-card ${row.kind==='exports'?'tool-exports':'tool-find'}"><header><h3>${esc(row.title)}</h3><strong>${esc(row.value)}</strong></header><small>${esc(row.basisDate)} · ${row.kind==='exports'?'월간 통관 통계':'장마감 기술 관찰'}</small><p>${esc(row.observation)}</p><p class="home-change-question"><b>확인할 질문</b>${esc(row.question)}</p><details class="home-change-limit"><summary>해석할 때 주의</summary><p>${esc(row.limit)}</p></details><button type="button" data-feature-route="${row.route}" data-feature-target="${row.target}">${esc(row.next)} →</button></article>`;
  host.querySelector('[data-home-changes]').innerHTML=rows.length?rows.slice(0,2).map(card).join('')+(rows.length>2?`<div class="home-change-more" ${expanded?'':'hidden'}>${rows.slice(2).map(card).join('')}</div>`:''):(loading?'<p>자료별 기준일과 변화를 확인하고 있어요.</p>':'<p>표시 가능한 변화 자료가 없어요. 수출·조건 검색 화면에서 자료를 직접 확인해주세요.</p>');
  const toggle=host.querySelector('[data-home-change-toggle]');
  if(toggle){toggle.hidden=rows.length<=2;toggle.textContent=expanded?'변화 접기':'변화 모두 보기';toggle.setAttribute('aria-expanded',String(expanded));}
  host.querySelector('[data-home-change-status]').textContent=failed?'일부 자료를 불러오지 못했어요. 확인된 자료만 표시해요.':loading?'다른 자료도 확인 중이에요.':'';
  host.querySelector('[data-home-change-retry]').hidden=!failed;
  window.__chartviewBindNav?.();
  if(focused){
   const replacement=[...host.querySelectorAll('[data-feature-route]')].find(button=>button.dataset.featureRoute===focused.route&&button.dataset.featureTarget===focused.target);
   if(replacement){replacement.focus({preventScroll:true});const delta=replacement.getBoundingClientRect().top-focused.top;if(Math.abs(delta)>1)window.scrollBy(0,delta);}
  }else window.__chartviewRestoreScroll?.();
 }
 async function load(keys,force=false){
  await Promise.allSettled(keys.map(async key=>{
   const source=sources[key],seq=++source.run;
   source.status='loading';paint();
   try{
    const value=await (key==='exports'?loadExportMomentumSnapshot({force}):screenerData());
    if(!host.isConnected||seq!==source.run)return;
    source.value=value;source.status='ready';
   }catch{
    if(!host.isConnected||seq!==source.run)return;
    source.status='error';
   }
   paint();
  }));
 }
 host.querySelector('[data-home-change-retry]').onclick=()=>void load(Object.keys(sources).filter(key=>sources[key].status==='error'),true);
 const toggle=host.querySelector('[data-home-change-toggle]');
 if(toggle)toggle.onclick=()=>{expanded=!expanded;paint();};
 await load(Object.keys(sources));
}
