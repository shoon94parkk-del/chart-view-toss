export function finiteNumber(value){if(value==null||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;}
export function estimateRevision(current,previous){const a=finiteNumber(current),b=finiteNumber(previous);return a>0&&b>0?(a/b-1)*100:null;}
export function filterScreener(rows,{query='',market='',rsiMin='',rsiMax='',volumeMin='',ret20Min='',valueMin='',trend='',sort='name'}={}){
 const q=query.trim().toLowerCase(),rsi=finiteNumber(rsiMax),rsiFloor=finiteNumber(rsiMin),volume=finiteNumber(volumeMin),retFloor=finiteNumber(ret20Min),valueFloor=finiteNumber(valueMin);
 return rows.filter(row=>{
  if(q&&!`${row.name} ${row.symbol} ${row.code}`.toLowerCase().includes(q))return false;
  if(market&&row.market!==market)return false;
  if(trend&&row[trend]!==true)return false;
  const r=finiteNumber(row.rsi14),v=finiteNumber(row.volumeRatio),ret=finiteNumber(row.ret20),value=finiteNumber(row.avgValue20);
  return (rsi===null||(r!==null&&r<=rsi))&&(rsiFloor===null||(r!==null&&r>=rsiFloor))&&(volume===null||(v!==null&&v>=volume))&&(retFloor===null||(ret!==null&&ret>=retFloor))&&(valueFloor===null||(value!==null&&value>=valueFloor*100000000));
 }).sort((a,b)=>{
  if(sort==='name')return String(a.name).localeCompare(String(b.name),'ko');
  const av=finiteNumber(a[sort]),bv=finiteNumber(b[sort]);
  return av===null?(bv===null?0:1):bv===null?-1:bv-av;
 });
}
