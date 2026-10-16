// Provider errors can be represented by a successful HTTP response.
export function newsResponseState(payload) {
 if(!payload||(!Array.isArray(payload.items)&&!Array.isArray(payload.groups)))return 'error';
 const groups=Array.isArray(payload.groups)?payload.groups:[];
 const failed=Boolean(payload.loadError||payload.status==='error'||payload.errors?.length||groups.some(row=>row?.status==='error'));
 if(!failed)return 'ready';
 return (payload.items?.length||groups.some(row=>row?.items?.length))?'partial':'error';
}

export function newsResponseRows(payload,symbol) {
 const items=Array.isArray(payload?.items)?payload.items:[];
 const groups=Array.isArray(payload?.groups)?payload.groups:[];
 const rows=[...items,...groups.flatMap(group=>(Array.isArray(group?.items)?group.items:[]).filter(row=>row&&typeof row==='object').map(row=>({...row,symbol:row.symbol||group.symbol,name:row.name||group.name})))];
 const seen=new Set();
 return rows.filter(row=>{
  if(!row||typeof row!=='object'||(symbol&&row.symbol&&row.symbol!==symbol))return false;
  const key=JSON.stringify([row.url||'',row.title||'',row.symbol||symbol||'']);
  if(seen.has(key))return false;seen.add(key);return true;
 });
}
