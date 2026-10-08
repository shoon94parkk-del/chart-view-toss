// Optional detail sections recover locally; price/chart stay usable on failure.
const retryAssets = new Map();
export function loadDetailModule({host,key,isCurrent,load,mount}) {
  let disposed=false,controller=null,timer=null,added=[];
  const current=()=>!disposed&&host?.isConnected&&isCurrent();
  let loading;
  const before=new Set([...document.querySelectorAll('link[rel="modulepreload"]')].map(link=>link.href));
  try{loading=load();}catch(error){loading=Promise.reject(error);}finally{
    added=[...document.querySelectorAll('link[rel="modulepreload"]')].map(link=>link.href).filter(href=>{
      try{const url=new URL(href);return !before.has(href)&&url.origin===location.origin&&/^\/assets\/[^/]+\.js$/.test(url.pathname);}catch{return false;}
    });
  }
  void Promise.resolve(loading).then(view=>{if(current())return mount(view);}).catch(()=>{
    const assets=[...new Set([...(retryAssets.get(key)||[]),...added])].slice(0,6);
    retryAssets.set(key,assets);
    if(!current())return;
    host.innerHTML='<div class="empty" role="alert"><strong>이 영역의 화면을 불러오지 못했어요.</strong><span>가격과 차트는 계속 확인할 수 있어요.</span><button type="button" class="retry" data-retry-detail-module>화면 다시 불러오기</button></div>';
    const button=host.querySelector('[data-retry-detail-module]');
    button.onclick=async()=>{
      if(!current()||button.disabled)return;
      button.disabled=true;controller=new AbortController();
      timer=setTimeout(()=>controller?.abort(),4000);
      try{
        await Promise.allSettled(assets.map(async href=>{
          const response=await fetch(href,{cache:'reload',signal:controller.signal});
          if(!response.ok||!/(?:java|ecma)script/i.test(response.headers.get('content-type')||''))throw new Error('Bundled script unavailable');
          await response.arrayBuffer();
        }));
      }finally{clearTimeout(timer);timer=null;if(current())location.reload();}
    };
  });
  return ()=>{disposed=true;controller?.abort();clearTimeout(timer);};
}
