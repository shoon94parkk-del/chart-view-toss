/** Patch prices in existing controls so a late quote cannot detach a click/focus. */
export function reconcileWatchRows(host,markup){
 const active=host.ownerDocument.activeElement,restore=host.contains(active);
 const template=host.ownerDocument.createElement('template');template.innerHTML=markup;
 const existing=new Map([...host.querySelectorAll('.watch-detail-card')].map(row=>[row.querySelector('[data-stock-detail]')?.dataset.stockDetail,row]));
 const desired=[...template.content.children].map(next=>{
  const symbol=next.querySelector('[data-stock-detail]')?.dataset.stockDetail,previous=symbol&&existing.get(symbol);
  if(!previous)return next;
  for(const selector of ['.watch-main-copy strong','.watch-main-copy small','.watch-card-price','.stock-logo']){
   const from=next.querySelector(selector),to=previous.querySelector(selector);if(from&&to&&from.innerHTML!==to.innerHTML)to.innerHTML=from.innerHTML;
  }
  return previous;
 });
 for(let index=0;index<desired.length;index++){const node=desired[index];if(host.children[index]!==node)host.insertBefore(node,host.children[index]||null);}
 for(const child of [...host.children])if(!desired.includes(child))child.remove();
 if(restore&&active.isConnected&&host.ownerDocument.activeElement===host.ownerDocument.body)active.focus({preventScroll:true});
}
