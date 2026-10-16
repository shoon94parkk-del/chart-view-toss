const fields=['kind','route','target','basisDate','value','observation'];
const topic=row=>JSON.stringify([row.kind,row.route,row.target]);
const same=(a,b)=>fields.every(key=>a[key]===b[key]);
const period=value=>{
 if(typeof value!=='string'||!/^\d{4}-\d{2}(?:-\d{2})?$/.test(value))return false;
 const day=value.length===7?value+'-01':value;
 const parsed=new Date(day+'T00:00:00Z');
 return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===day;
};

// Persist only the public text already displayed by a Home card. In particular,
// collection/build clocks and personal research fields are never a baseline.
export function publicationFingerprint(row){
 if(!row||!period(row.basisDate))return null;
 const limits={kind:32,route:64,target:64,basisDate:10,value:80,observation:600};
 const result={};
 for(const key of fields){
  if(typeof row[key]!=='string'||!row[key].trim()||row[key].length>limits[key])return null;
  result[key]=row[key];
 }
 return result;
}

function readTopics(value){
 try{if(typeof value==='string')value=JSON.parse(value);}catch{return [];}
 if(!Array.isArray(value))return [];
 const topics=[];
 for(const candidate of value){
  const row=publicationFingerprint(candidate);
  if(!row)continue;
  const index=topics.findIndex(previous=>topic(previous)===topic(row));
  if(index>=0){if(topics[index].basisDate<=row.basisDate)topics[index]=row;}
  else if(topics.length<12)topics.push(row);
 }
 return topics;
}

export function publicationStatus(value,baseline=[]){
 const row=publicationFingerprint(value);
 const previous=row&&readTopics(baseline).find(candidate=>topic(candidate)===topic(row));
 if(!previous)return {state:'baseline',label:'기준 자료'};
 if(same(row,previous))return {state:'same',label:'지난 조회와 같음'};
 if(row.basisDate>previous.basisDate)return {state:'newer',label:'기준기간 갱신'};
 if(row.basisDate<previous.basisDate)return {state:'older',label:'이전 기준 자료'};
 return {state:'changed',label:'표시값 변경'};
}

export function mergePublications(previous,observations){
 const topics=readTopics(previous);
 for(const candidate of observations||[]){
  const row=publicationFingerprint(candidate);
  if(!row)continue;
  const index=topics.findIndex(item=>topic(item)===topic(row));
  if(index>=0){
   if(topics[index].basisDate>row.basisDate||same(topics[index],row))continue;
   topics.splice(index,1);
  }
  topics.unshift(row);
 }
 return topics.slice(0,12);
}

export function createPublicationJournal({read,write,getContext,isCurrent}){
 let queue=Promise.resolve();
 let pending=0;
 return {
  start(){
   const context=getContext();
   let baseline=[];
   const capture=()=>{try{if(isCurrent(context))baseline=readTopics(read());}catch{}};
   // A quick return may precede the last native confirmation. Capture once
   // behind it, without making provider loads wait for the storage bridge.
   let ready;
   if(pending)ready=queue.then(capture);
   else{capture();ready=Promise.resolve();}
   return {
    ready,
    classify:row=>publicationStatus(row,isCurrent(context)?baseline:[]),
    remember(observations,{status='ready'}={}){
     if(status!=='ready')return Promise.resolve(false);
     const rows=(observations||[]).map(publicationFingerprint).filter(Boolean);
     if(!rows.length)return Promise.resolve(false);
     const work=queue.catch(()=>{}).then(async()=>{
      if(!isCurrent(context))return false;
      // Read after the preceding confirmed save, so independent providers and
      // remounted views merge with its actual committed public topics.
      const previous=readTopics(read());
      const next=mergePublications(previous,rows);
      if(JSON.stringify(previous)===JSON.stringify(next))return true;
      if(!isCurrent(context))return false;
      await write(JSON.stringify(next),{confirmed:true});
      return isCurrent(context);
     }).catch(()=>false);
     pending++;
     work.then(()=>pending--);
     queue=work;
     return work;
    },
   };
  },
 };
}
