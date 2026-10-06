// HTTPS support verified on these publishers' actual article paths, 2026-10-06.
// Unknown HTTP origins are not upgraded speculatively or accepted by the bridge.
const httpsPublishers=new Set(['www.yonhapnewstv.co.kr','yonhapnewstv.co.kr','www.newsdream.kr','newsdream.kr']);
export function externalLinkTarget(raw,base='https://chart-view-toss.onrender.com'){
 try{
  if(!raw)return {error:'원문 주소가 제공되지 않았어요.'};
  const url=new URL(raw,base);
  if(url.username||url.password)return {error:'이 원문 주소는 열 수 없어요.'};
  if(url.protocol==='http:'&&httpsPublishers.has(url.hostname)&&!url.port)url.protocol='https:';
  if(url.protocol!=='https:')return {error:'안전한 HTTPS 원문 주소가 제공되지 않아 열 수 없어요.'};
  return {url:url.href};
 }catch{return {error:'원문 주소의 형식이 올바르지 않아요.'};}
}
