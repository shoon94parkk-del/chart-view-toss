const MAX_AGE_MS=48*60*60*1000;
const markets={KR:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}),US:new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'})};
function validDay(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const time=Date.parse(value+'T00:00:00Z');
 return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value;
}
function instant(value){
 if(typeof value!=='string')return NaN;
 const match=/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
 if(!match||!validDay(match[1])||Number(match[2])>23||Number(match[3])>59||Number(match[4])>59)return NaN;
 if(match[6]!=='Z'&&(Number(match[6].slice(1,3))>23||Number(match[6].slice(4))>59))return NaN;
 // Preserve sub-millisecond ordering in Python's ISO timestamps as well.
 const whole=Date.parse(`${match[1]}T${match[2]}:${match[3]}:${match[4]}${match[6]}`);
 return whole+(match[5]?Number(`0.${match[5]}`)*1000:0);
}
function localDay(time,market){
 const parts=Object.fromEntries(markets[market].formatToParts(new Date(time)).map(part=>[part.type,part.value]));
 return `${parts.year}-${parts.month}-${parts.day}`;
}
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const recent=(time,now)=>Number.isFinite(time)&&time<=now&&now-time<=MAX_AGE_MS;

// Reject the complete file if any observation is invalid/expired. Never turn
// legacy layout prices or missing changes into apparently canonical quotes.
export function validateFullHeatmapSnapshot(payload,{now=Date.now()}={}){
 if(!Number.isFinite(now)||!object(payload)||payload.snapshotVersion!==1||payload.complete!==true||typeof payload.source!=='string'||!payload.source.startsWith('canonical-'))return null;
 const captured=instant(payload.snapshotCapturedAt),generated=instant(payload.generatedAt);
 if(!recent(captured,now)||!recent(generated,now)||generated>captured)return null;
 if(!Array.isArray(payload.results)||payload.results.length!==60||!object(payload.counts)||Object.keys(payload.counts).length!==2||payload.counts.KR!==20||payload.counts.US!==40)return null;
 const seen=new Set(),counts={KR:0,US:0},results=[];
 for(const row of payload.results){
  if(!object(row)||!Object.hasOwn(counts,row.market)||typeof row.ticker!=='string'||!row.ticker||row.ticker!==row.ticker.trim().toUpperCase()||seen.has(row.ticker)||((row.market==='KR')!==/\.(KS|KQ)$/.test(row.ticker)))return null;
  if(!['provider-canonical','home-canonical'].includes(row.quoteBasis)||typeof row.source!=='string'||!row.source.trim()||/legacy/i.test(row.source))return null;
  if(!Number.isFinite(row.price)||row.price<=0||!Number.isFinite(row.change)||!Number.isFinite(row.marketCap)||row.marketCap<=0||('stale' in row&&typeof row.stale!=='boolean'))return null;
  const observed=instant(row.asOf);
  if(!recent(observed,now)||observed>captured)return null;
  const day=localDay(observed,row.market),session=row.sessionDate,previous=row.previousSessionDate;
  if(session!=null&&(!validDay(session)||session>day))return null;
  if(previous!=null&&(!validDay(previous)||previous>=day||(session!=null&&previous>=session)))return null;
  seen.add(row.ticker);counts[row.market]++;results.push({...row,stale:true});
 }
 if(counts.KR!==20||counts.US!==40)return null;
 return {...payload,results};
}
