import {deferHomePaint} from './homeGesturePaint.js';
import {loadExportMomentumSnapshot} from './exportMomentumData.js';
import {screenerData} from './api.js';
import {homeChanges} from './insightModel.js';
import './homeBriefing.css';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function mountHomeChanges(host,{journal=null}={}){
 let expanded=false;
 const publication=journal?.start();
 const sources={exports:{value:{},status:'idle',run:0},stocks:{value:{},status:'idle',run:0}};
 if(publication?.ready)void publication.ready.then(()=>paint());
 function paint(fromClick=false){
  if(!host.isConnected)return;
  if(deferHomePaint(host,paint,fromClick))return;
  const element=typeof document==='undefined'?null:document.activeElement;
  const focused=element&&host.contains?.(element)&&element.matches?.('[data-feature-route]')?{route:element.dataset.featureRoute,target:element.dataset.featureTarget,top:element.getBoundingClientRect().top}:null;
  const rows=homeChanges(sources.exports.value,sources.stocks.value);
  const loading=Object.values(sources).some(source=>source.status==='loading');
  const failed=Object.values(sources).some(source=>source.status==='error');
  if(focused&&rows.findIndex(row=>row.route===focused.route&&row.target===focused.target)>=2)expanded=true;
  const card=row=>{
   const observation=row.compactObservation||row.basisDate+' · '+row.observation;
   const observed=sources[row.kind==='exports'?'exports':'stocks'].observed;
   const state=(observed&&publication?.classify(row))||{state:'baseline',label:'기준 자료'};
   return `<article class="home-change-card ${row.kind==='exports'?'tool-exports':'tool-find'}"><button type="button" class="home-change-open" data-feature-route="${row.route}" data-feature-target="${row.target}" aria-label="${esc(row.title+' '+row.value+' '+state.label+' · '+observation+' · '+row.basisDate+' · '+row.observation+' · '+row.next)}"><span class="home-change-copy"><span class="home-change-top"><strong>${esc(row.title)}</strong><em>${esc(row.value)}</em></span><small class="home-briefing-observation"><span class="home-briefing-state" data-publication-state="${state.state}">${esc(state.label)}</span> · <span class="home-briefing-basis">${esc(observation)}</span></small></span><span class="home-change-next" aria-hidden="true">→</span></button></article>`;
  };
  host.querySelector('[data-home-changes]').innerHTML=rows.length?rows.slice(0,2).map(card).join('')+(rows.length>2?`<div class="home-change-more" ${expanded?'':'hidden'}>${rows.slice(2).map(card).join('')}</div>`:''):(loading?'<p>자료별 기준일과 변화를 확인하고 있어요.</p>':'<p>표시 가능한 변화 자료가 없어요. 수출·조건 검색 화면에서 자료를 직접 확인해주세요.</p>');
  const toggle=host.querySelector('[data-home-change-toggle]');
  if(toggle){toggle.hidden=rows.length<=2;toggle.textContent=expanded?'변화 접기':'변화 모두 보기';toggle.setAttribute('aria-expanded',String(expanded));}
  const subtitle=host.querySelector('.home-changes-title p');
  if(subtitle&&rows.length){
   const groups=[['exports','관세청'],['discovery','조건 검색']].map(([kind,label])=>{
    const dates=[...new Set(rows.filter(row=>row.kind===kind).map(row=>row.basisDate))];
    return dates.length?`${label} · ${dates.join(' / ')} 기준`:'';
   }).filter(Boolean);
   subtitle.textContent=groups.join(' · ');
  }
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
    // Only actual dated source observations enter the journal. A collection
    // clock used by an older screener payload is not a public data period.
    source.observed=!value?.pending&&!value?.refreshing&&!value?.error&&value?.available!==false&&!['pending','error','loading'].includes(value?.status)&&(key!=='stocks'||!!value?.tradeDate);
    if(publication&&source.observed){
     const observed=homeChanges(key==='exports'?value:{},key==='stocks'?value:{});
     void publication.remember(observed);
    }
   }catch{
    if(!host.isConnected||seq!==source.run)return;
    source.status='error';
   }
   paint();
  }));
 }
 host.querySelector('[data-home-change-retry]').onclick=()=>void load(Object.keys(sources).filter(key=>sources[key].status==='error'),true);
 const toggle=host.querySelector('[data-home-change-toggle]');
 if(toggle)toggle.onclick=()=>{expanded=!expanded;paint(true);};
 await load(Object.keys(sources));
}
