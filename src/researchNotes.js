import { RESEARCH_KEY, readStored, writeStored, getStorageContext, isStorageContextCurrent } from './storage.js';

let researchMutationQueue=Promise.resolve(),pendingMutations=0;

function enqueueResearchMutation(persist){
  const context=getStorageContext();
  pendingMutations++;
  const result=researchMutationQueue.catch(()=>{}).then(()=>{
    if(!isStorageContextCurrent(context))throw new Error('Storage context changed');
    return persist();
  }).then(value=>{
    if(!isStorageContextCurrent(context))throw new Error('Storage context changed');
    return value;
  });
  researchMutationQueue=result;
  result.then(()=>pendingMutations--,()=>pendingMutations--);
  return result;
}

const text=(value,limit)=>String(value??'').trim().slice(0,limit);
const ticker=value=>{
  const symbol=String(value??'').trim().toUpperCase();
  if(!/^[A-Z0-9^.=:_-]{1,32}$/.test(symbol))throw new Error('종목코드를 확인해주세요.');
  return symbol;
};
const validDate=value=>{
  const date=String(value??'').trim();
  if(!date)return '';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(`${date}T00:00:00Z`))||new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)!==date)throw new Error('다시 볼 날짜를 확인해주세요.');
  return date;
};
const validPeer=(value,current)=>value&&typeof value.name==='string'&&value.name.trim()&&/^\d{6}\.(KS|KQ)$/.test(value.symbol)&&value.symbol!==current?{symbol:value.symbol,name:text(value.name,80)}:null;

// Quote evidence is a copy of the already displayed canonical row. Save time
// never fills a missing observation time, currency, price or provider basis.
function checkpointQuote(value,symbol){
  if(!value||typeof value!=='object'||typeof value.price!=='number'||!Number.isFinite(value.price)||value.price<=0)return null;
  if(value.ticker&&String(value.ticker).trim().toUpperCase()!==symbol)return null;
  if(value.symbol&&String(value.symbol).trim().toUpperCase()!==symbol)return null;
  const currency=typeof value.currency==='string'?value.currency.trim():'';
  if(!/^[A-Z]{3}$/.test(currency))return null;
  const rawAsOf=typeof value.asOf==='string'?value.asOf.trim():'';
  let asOf=rawAsOf&&Number.isFinite(Date.parse(rawAsOf))?rawAsOf:null;
  // Date.parse normalizes dates such as February 30. Validate the source
  // calendar date before treating an offset timestamp as timed evidence.
  if(asOf&&/^\d{4}-\d{2}-\d{2}(?:T|$)/i.test(asOf)){
    try{validDate(asOf.slice(0,10));}catch{asOf=null;}
  }
  const timed=Boolean(asOf&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(asOf));
  const quote={price:value.price,currency,asOf,timed,source:text(value.source,160),stale:typeof value.stale==='boolean'?value.stale:null};
  for(const key of ['priceBasis','quoteBasis','sessionDate','sessionType'])if(typeof value[key]==='string'&&value[key].trim())quote[key]=text(value[key],100);
  if(typeof value.delayTime==='number'&&Number.isFinite(value.delayTime)&&value.delayTime>=0)quote.delayTime=value.delayTime;
  return quote;
}

function readCheckpoints(value,symbol){
  if(!Array.isArray(value))return [];
  const seen=new Set(),events=[];
  for(const event of value){
    if(!event||typeof event!=='object'||typeof event.id!=='string'||!event.id.trim()||seen.has(event.id)||typeof event.question!=='string'||!event.question.trim()||typeof event.savedAt!=='string'||!Number.isFinite(Date.parse(event.savedAt)))continue;
    let reviewOn='';try{reviewOn=validDate(event.reviewOn);}catch{}
    seen.add(event.id);
    events.push({id:text(event.id,160),savedAt:event.savedAt,question:text(event.question,180),support:text(event.support,800),challenge:text(event.challenge,800),reviewOn,...(validPeer(event.peer,symbol)?{peer:validPeer(event.peer,symbol)}:{}),quote:checkpointQuote(event.quote,symbol)});
  }
  return events.slice(-20);
}
let checkpointSequence=0;
export const newResearchCheckpointOperation=()=>globalThis.crypto?.randomUUID?.()||`research-${Date.now()}-${++checkpointSequence}-${Math.random().toString(36).slice(2)}`;

function readCards(){
  const stored=readStored(RESEARCH_KEY);
  try{
    const value=JSON.parse(stored||'{}');
    return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  }catch{return {};}
}

export function readResearchNote(symbol){
  const value=readCards()[ticker(symbol)];
  if(!value||typeof value!=='object'||typeof value.question!=='string'||!value.question.trim())return null;
  return {
    ...(validPeer(value.peer,ticker(symbol))?{peer:validPeer(value.peer,ticker(symbol))}:{}),
    ...(Array.isArray(value.checkpoints)?{checkpoints:readCheckpoints(value.checkpoints,ticker(symbol))}:{}),
    question:text(value.question,180),
    support:text(value.support,800),
    challenge:text(value.challenge,800),
    reviewOn:typeof value.reviewOn==='string'?value.reviewOn:'',
    createdAt:typeof value.createdAt==='string'?value.createdAt:'',
    updatedAt:typeof value.updatedAt==='string'?value.updatedAt:'',
  };
}

export function saveResearchNote(symbol,input,{now=new Date(),confirmed=false,operationId=newResearchCheckpointOperation(),quoteSnapshot=null}={}){
  const key=ticker(symbol);
  const question=text(input?.question,180);
  if(!question)throw new Error('확인하고 싶은 질문을 적어주세요.');
  const id=text(operationId,160);
  if(!id)throw new Error('저장 작업을 확인해주세요.');
  const quote=checkpointQuote(quoteSnapshot,key);
  const previous=readResearchNote(key);
  const note={
    ...(validPeer(input?.peer,key)?{peer:validPeer(input.peer,key)}:{}),
    question,
    support:text(input?.support,800),
    challenge:text(input?.challenge,800),
    reviewOn:validDate(input?.reviewOn),
    createdAt:previous?.createdAt||now.toISOString(),
    updatedAt:now.toISOString(),
  };
  const persist=(confirmWrite=confirmed)=>{
    // Read after the preceding confirmed write so a save from another screen
    // cannot replace a different company's still-pending card.
    const cards=readCards();
    const latest=readResearchNote(key);
    const checkpoints=latest?.checkpoints||[];
    // A retry or duplicate click may arrive after another question was saved.
    // Replaying an acknowledged operation must not replace that later note.
    if(checkpoints.some(event=>event.id===id))return confirmWrite?Promise.resolve(latest):latest;
    const event={id,savedAt:note.updatedAt,question:note.question,support:note.support,challenge:note.challenge,reviewOn:note.reviewOn,...(note.peer?{peer:{...note.peer}}:{}),quote};
    const next={...note,createdAt:latest?.createdAt||note.createdAt,checkpoints:[...checkpoints,event].slice(-20)};
    cards[key]=next;
    const persisted=writeStored(RESEARCH_KEY,JSON.stringify(cards),{confirmed:confirmWrite});
    return confirmWrite?Promise.resolve(persisted).then(()=>next):next;
  };
  if(!confirmed&&!pendingMutations)return persist();
  const result=enqueueResearchMutation(()=>persist(true));
  // Preserve the legacy synchronous return; mixed pending mutations still
  // merge only after preceding writes settle, avoiding a stale whole-card map.
  if(!confirmed){result.catch(()=>{});return note;}
  return result;
}

export function deleteResearchNote(symbol,{confirmed=false}={}){
  const key=ticker(symbol);
  const persist=(confirmWrite=confirmed)=>{
    const cards=readCards();
    delete cards[key];
    return writeStored(RESEARCH_KEY,JSON.stringify(cards),{confirmed:confirmWrite});
  };
  if(!confirmed&&!pendingMutations){persist();return;}
  const result=enqueueResearchMutation(()=>persist(true));
  if(!confirmed){result.catch(()=>{});return;}
  return result;
}
