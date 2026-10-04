import {loadExportMomentumSnapshot} from './exportMomentumData.js';
import {screenerData} from './api.js';
import {homeChanges} from './insightModel.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function mountHomeChanges(host){
 const sources={exports:{value:{},status:'idle',run:0},stocks:{value:{},status:'idle',run:0}};
 function paint(){
  if(!host.isConnected)return;
  const rows=homeChanges(sources.exports.value,sources.stocks.value);
  const loading=Object.values(sources).some(source=>source.status==='loading');
  const failed=Object.values(sources).some(source=>source.status==='error');
  host.querySelector('[data-home-changes]').innerHTML=rows.map(row=>`<article class="home-change-card ${row.kind==='exports'?'tool-exports':'tool-find'}"><header><h3>${esc(row.title)}</h3><strong>${esc(row.value)}</strong></header><small>${esc(row.basisDate)} · ${row.kind==='exports'?'월간 통관 통계':'장마감 기술 관찰'}</small><p>${esc(row.observation)}</p><button type="button" data-feature-route="${row.route}" data-feature-target="${row.target}">${esc(row.next)} →</button></article>`).join('')||(loading?'<p>자료별 기준일과 변화를 확인하고 있어요.</p>':'<p>표시 가능한 변화 자료가 없어요. 수출·조건 검색 화면에서 자료를 직접 확인해주세요.</p>');
  host.querySelector('[data-home-change-status]').textContent=failed?'일부 자료를 불러오지 못했어요. 확인된 자료만 표시해요.':loading?'다른 자료도 확인 중이에요.':'';
  host.querySelector('[data-home-change-retry]').hidden=!failed;
  window.__chartviewBindNav?.();window.__chartviewRestoreScroll?.();
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
 await load(Object.keys(sources));
}
