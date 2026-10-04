const period=s=>s.year*4+(s.type==='annual'?4:s.quarter||0);
const receipt=url=>{try{const u=new URL(url),id=u.searchParams.get('rcpNo');return u.protocol==='https:'&&u.hostname==='dart.fss.or.kr'&&/^\d{14}$/.test(id||'')?id:null;}catch{return null;}};
export function filingChanges(old,current){
 if(!current)return {kind:'unavailable'};
 if(!old)return {kind:'first',previous:current.previous};
 if(old.currency!==current.currency||old.basis!==current.basis)return {kind:'incompatible'};
 if(period(current)<period(old))return {kind:'older'};
 if(old.type!==current.type||old.year!==current.year||old.quarter!==current.quarter)return {kind:'new',previous:current.previous};
 if(receipt(old.sourceUrl)&&receipt(current.sourceUrl)&&receipt(current.sourceUrl)<receipt(old.sourceUrl))return {kind:'older'};
 const priorChanged=Object.keys(current.previous||{}).filter(key=>(old.previous||{})[key]!==current.previous[key]);
 if(old.sourceUrl===current.sourceUrl&&JSON.stringify(old.current)===JSON.stringify(current.current)&&!priorChanged.length)return {kind:'same',previous:current.previous};
 return {kind:'corrected',previous:old.current,priorChanged};
}
