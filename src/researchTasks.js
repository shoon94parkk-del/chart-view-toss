import { RESEARCH_TASKS_KEY, readStored, writeStored, getStorageContext, isStorageContextCurrent } from './storage.js';
import { savedResearch } from './savedResearch.js';
import { reviewConditionEvidence } from './reviewConditionEvidence.js';

const MAX_TASKS=200,MAX_BYTES=100000;
const taskLabels={overdue:'기한 지남',today:'오늘',future:'예정',completed:'완료',undated:'날짜 없음'};
let taskMutationQueue=Promise.resolve();
const isRecord=value=>value&&typeof value==='object'&&!Array.isArray(value);
const validSymbol=value=>typeof value==='string'&&/^[A-Z0-9^][A-Z0-9.^=\-]{0,29}$/.test(value);
function taskDate(value,{optional=false}={}){
 if(optional&&value==='')return '';
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.startsWith('0000')||!Number.isFinite(Date.parse(`${value}T00:00:00Z`))||new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)!==value)throw new Error('다시 볼 날짜를 확인해주세요.');
 return value;
}
function instant(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))return false;
 try{taskDate(value.slice(0,10));return true;}catch{return false;}
}
function stable(value){
 if(Array.isArray(value))return value.map(stable);
 if(isRecord(value))return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));
 return value;
}
// Two independent 32-bit fingerprints plus length bind the record to the
// original question/evidence and observed filing, never to a refresh timestamp.
function fingerprint(value){
 const source=JSON.stringify(stable(value));
 let a=2166136261,b=5381;for(let i=0;i<source.length;i++){a=Math.imul(a^source.charCodeAt(i),16777619);b=Math.imul(b,33)^source.charCodeAt(i);}
 return `${source.length}:${(a>>>0).toString(16)}:${(b>>>0).toString(16)}`;
}
function sourceRevision(row){
 const base=fingerprint({symbol:row.symbol,question:row.question||'',reviewOn:row.reviewOn||'',updatedAt:row.updatedAt||'',conditions:row.conditions||[],filing:row.filing||null});
 const filing=row.observation?.filing||row.observation?.lastKnownFiling||row.filing||null;
 const conditions=(row.conditions||[]).map(condition=>{
  const id=condition.id||condition.key+':'+(condition.peer?.symbol||'self');
  const current=(row.observation?.conditions||[]).find(item=>item?.id===id),known=(row.observation?.lastKnownConditions||[]).find(item=>item?.id===id);
  return reviewConditionEvidence(current)||reviewConditionEvidence(known)||reviewConditionEvidence({...condition.baseline,id});
 }).filter(Boolean);
 // Last-known provenance is recorded only by the existing explicit observation
 // write. Exact matching prevents failures from resurrecting an old completion.
 return `${base}|${fingerprint({filing,conditions})}`;
}
export function readResearchTasks(){
 try{
  const raw=readStored(RESEARCH_TASKS_KEY);if(raw==null)return {tasks:{},error:false};
  if(raw.length>MAX_BYTES)throw Error('size');
  const store=JSON.parse(raw);
  if(!isRecord(store)||store.version!==1||!isRecord(store.tasks)||Object.keys(store.tasks).length>MAX_TASKS)throw Error('schema');
  for(const [symbol,task] of Object.entries(store.tasks)){
   if(!validSymbol(symbol)||!isRecord(task)||typeof task.revision!=='string'||!/^\d+:[a-f0-9]+:[a-f0-9]+\|(?:\d+:[a-f0-9]+:[a-f0-9]+)?$/.test(task.revision)||task.revision.length>80||!(task.completedAt===null||instant(task.completedAt)))throw Error('record');
   taskDate(task.reviewOn,{optional:true});
  }
  return {tasks:store.tasks,error:false};
 }catch{return {tasks:{},error:true};}
}
export function researchTaskState(row,{now=new Date(),tasks=readResearchTasks().tasks}={}){
 const revision=sourceRevision(row),saved=Object.hasOwn(tasks,row.symbol)&&tasks[row.symbol].revision===revision?tasks[row.symbol]:null;
 let reviewOn='',dateError=false;try{reviewOn=taskDate(saved?.reviewOn||row.reviewOn||'',{optional:true});}catch{dateError=true;}
 const today=new Date(now.getTime()+9*60*60*1000).toISOString().slice(0,10);
 const completedAt=saved?.completedAt||null;
 const kind=completedAt?'completed':!reviewOn?'undated':reviewOn<today?'overdue':reviewOn===today?'today':'future';
 return {kind,label:taskLabels[kind],reviewOn,completedAt,dateError,revision};
}
function mutateTask(row,change){
 const context=getStorageContext(),revision=sourceRevision(row);
 const result=taskMutationQueue.catch(()=>{}).then(async()=>{
  if(!isStorageContextCurrent(context))throw new Error('저장 계정 또는 초기화 상태가 변경됐어요. 다시 확인해주세요.');
  if(!validSymbol(row.symbol))throw new Error('종목코드를 확인해주세요.');
  const source=savedResearch(),current=source.rows.find(item=>item.symbol===row.symbol);
  if(source.error)throw new Error('저장 내용을 읽지 못했어요. 기존 자료를 지우지 않았어요.');
  if(!current||sourceRevision(current)!==revision)throw new Error('저장한 질문이나 공시가 변경됐어요. 다시 열어 확인해주세요.');
  const {tasks,error}=readResearchTasks();if(error)throw new Error('확인 기록을 읽지 못했어요. 기존 자료를 지우지 않았어요.');
  if(!Object.hasOwn(tasks,row.symbol)&&Object.keys(tasks).length>=MAX_TASKS)throw new Error('확인 기록은 최대 200종목까지 저장할 수 있어요.');
  const previous=Object.hasOwn(tasks,row.symbol)&&tasks[row.symbol].revision===revision?tasks[row.symbol]:{revision,completedAt:null,reviewOn:''};
  const next={...tasks,[row.symbol]:{...previous,...change}};
  const encoded=JSON.stringify({version:1,tasks:next});if(encoded.length>MAX_BYTES)throw new Error('확인 기록 저장 한도를 넘었어요.');
  await writeStored(RESEARCH_TASKS_KEY,encoded,{confirmed:true});
  if(!isStorageContextCurrent(context))throw new Error('저장 계정 또는 초기화 상태가 변경됐어요. 다시 확인해주세요.');
  return next[row.symbol];
 });
 taskMutationQueue=result;return result;
}
export function completeResearchTask(row,{now=new Date()}={}){
 return mutateTask(row,{completedAt:now.toISOString()});
}
export function undoResearchTask(row){return mutateTask(row,{completedAt:null});}
export function postponeResearchTask(row,reviewOn){
 const date=taskDate(reviewOn);return mutateTask(row,{reviewOn:date,completedAt:null});
}
