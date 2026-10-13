// Optional observations sit above PICK actions. Preserve an in-progress
// gesture's target until the browser has dispatched its click, without delaying
// either data source. One tracker per document also covers remounted Home views.
const homeGestures=new WeakMap();
export function watchHomeGestures(host){
 const doc=host.ownerDocument||(typeof document==='undefined'?null:document);
 if(!doc?.addEventListener)return null;
 let state=homeGestures.get(doc);
 if(!state){
  state={pointers:new Set(),pending:new Map(),scheduled:false};
  homeGestures.set(doc,state);
  const flush=()=>{
   if(state.pointers.size||state.scheduled)return;
   state.scheduled=true;
   setTimeout(()=>{
    state.scheduled=false;
    if(state.pointers.size)return;
    const paints=[...state.pending.values()];state.pending.clear();
    for(const render of paints)render();
   },0);
  };
  doc.addEventListener('pointerdown',event=>{
   if(event.target?.closest?.('#home-discovery-feed'))state.pointers.add(event.pointerId);
  },true);
  const end=event=>{if(state.pointers.delete(event.pointerId)&&!state.pointers.size)flush();};
  doc.addEventListener('pointerup',end,true);
  doc.addEventListener('pointercancel',end,true);
  doc.defaultView?.addEventListener('blur',()=>{state.pointers.clear();flush();});
 }
 return state;
}
export function deferHomePaint(host,paint,fromClick=false){
 const state=watchHomeGestures(host);
 if(!state)return false;
 // An explicit click has its target already resolved. Preserve its immediate
 // toggle contract, while protecting any other pointer still held in the feed.
 if(!state.pointers.size&&(fromClick||!state.scheduled)){
  state.pending.delete(host);return false;
 }
 state.pending.set(host,paint);
 return true;
}
