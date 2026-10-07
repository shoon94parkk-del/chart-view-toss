import {fullHeatmap} from './api.js';
import {readHomeFast,writeHomeFast} from './homeFastCache.js';
import {alignHeatmapQuotes,mergeHeatmapProgress} from './heatmapAlignment.js';
import {loadingIndicator} from './loadingView.js';

// Below-the-fold content never joins the Home critical request/paint path.
export function attachLazySectors(host,onStock){
 let started=false,seq=0;
 let view=null;
 const cached=readHomeFast('full-heatmap',6*60*60*1000);
 let shown=cached;
 host.innerHTML='<p class="home-extra-caption">화면에 도달하면 한국·미국 섹터별 등락을 불러와요.</p>';
 async function load(force=false){
  const token=++seq;
  if(!cached&&!started)host.innerHTML=loadingIndicator('섹터 히트맵을 불러오고 있어요');
  started=true;
  try{
   if(!view){const {mountSectorHeatmap}=await import('./sectorHeatmapView.js');if(!host.isConnected||token!==seq)return;view=mountSectorHeatmap(host,{onStock,retry:()=>void load(true)});if(cached?.results?.some(row=>row.sector||row.industry))view.update(cached);}
   view.loading();
   for(let i=0;i<20&&host.isConnected&&token===seq;i++){
    const payload=await fullHeatmap({force:force||i>0});
    if(!host.isConnected||token!==seq)return;
    if(payload?.results?.length){
     const next=alignHeatmapQuotes(mergeHeatmapProgress(shown,payload));shown=next;
     writeHomeFast('full-heatmap',next);view.update(next);
    }else{
     view.loading();
     if(!payload?.refreshing)throw new Error('No usable heatmap rows');
    }
    if(!payload.refreshing)return;
    await new Promise(resolve=>setTimeout(resolve,3000));
   }
   if(host.isConnected&&token===seq)view.error();
  }catch{if(host.isConnected&&token===seq){if(view)view.error();else{host.innerHTML='<p>섹터 화면을 불러오지 못했어요.</p><button class="text-button" data-sector-load>다시 시도</button>';host.onclick=()=>void load(true);}}}
 }
 if(typeof IntersectionObserver==='undefined'){host.innerHTML='<button class="text-button" data-sector-load>섹터 히트맵 보기</button>';host.onclick=()=>void load();}
 else{
  const observer=new IntersectionObserver(entries=>{if(!host.isConnected){observer.disconnect();return;}if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();void load();}},{rootMargin:'120px'});
  observer.observe(host);
  const disposal=new MutationObserver(()=>{if(!host.isConnected){observer.disconnect();disposal.disconnect();seq++;}});
  disposal.observe(document.body,{childList:true,subtree:true});
 }
}
