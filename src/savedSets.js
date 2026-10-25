import {readStored,writeStored,SAVED_SETS_KEY,getStorageContext,isStorageContextCurrent} from './storage.js';
import {decodeSharedView} from './experienceState.js';
import {SCREENER_PRESETS} from './analysisData.js';

const kinds=new Set(['screener','comparison']);
const filterKeys=['query','market','rsiMin','rsiMax','volumeMin','ret20Min','valueMin','trend','signal','sort','priceBasis'];
const numericKeys=['rsiMin','rsiMax','volumeMin','ret20Min','valueMin'];
const options={market:['','KOSPI','KOSDAQ'],trend:['','above20','cross20','trend2060','aligned'],signal:['','macdBullish','macdCrossUp','goldenCross2060','near52High','bbBreakout'],sort:['name','change1d','volumeRatio','avgValue20','ret20','rsiAsc','rsiDesc','distance52HighPct'],priceBasis:['','exclude','only']};
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const onlyKeys=(value,keys)=>record(value)&&Object.keys(value).every(key=>keys.includes(key));
const badValue=kind=>new Error(kind==='screener'?'검색 조건의 입력값과 범위를 확인해주세요.':'비교 종목과 기간을 확인해주세요.');
const badStore=()=>new Error('저장한 세트를 읽지 못했어요. 기존 저장 내용을 보호하기 위해 변경하지 않았어요.');
const nameValue=name=>{
 if(typeof name!=='string'||!name.trim()||name.trim().length>40||/[\u0000-\u001f\u007f]/.test(name))throw new Error('세트 이름은 1~40자로 입력해주세요.');
 return name.trim();
};

// Shared links deliberately ignore unknown fields. Personal records instead
// reject them, and never silently clamp a user's saved conditions.
export function validateSavedSetValue(kind,value){
 if(!kinds.has(kind))throw badValue(kind);
 if(kind==='comparison'){
  if(!onlyKeys(value,['selected','period','customRange'])||!Array.isArray(value.selected)||!value.selected.length||value.selected.some(symbol=>typeof symbol!=='string'))throw badValue(kind);
  const selected=[...new Set(value.selected)];
  if(selected.length>6||!['1mo','3mo','6mo','1y','5y','max'].includes(value.period))throw badValue(kind);
  if(value.customRange!=null&&!onlyKeys(value.customRange,['start','end']))throw badValue(kind);
  const decoded=decodeSharedView(JSON.stringify({tab:'chart',selected,period:value.period,customRange:value.customRange??null}));
  if(!decoded)throw badValue(kind);
  return {selected:decoded.selected,period:decoded.period,customRange:decoded.customRange};
 }
 if(!onlyKeys(value,['filters','activePreset','count'])||!onlyKeys(value.filters,filterKeys)||typeof value.activePreset!=='string'||(value.activePreset!==''&&!SCREENER_PRESETS.some(p=>p.id===value.activePreset))||!Number.isSafeInteger(value.count)||value.count<30||value.count>1000000)throw badValue(kind);
 const filters={};
 for(const [key,raw] of Object.entries(value.filters)){
  if(!['string','number'].includes(typeof raw)||String(raw).length>100||/[\u0000-\u001f\u007f]/.test(String(raw)))throw badValue(kind);
  const text=String(raw);filters[key]=text;
  if(options[key]&&!options[key].includes(text))throw badValue(kind);
  if(numericKeys.includes(key)&&text!==''){
   if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text))throw badValue(kind);
   const number=Number(text);
   if(!Number.isFinite(number))throw badValue(kind);
   if(key.startsWith('rsi')&&(number<0||number>100||!Number.isInteger(number)))throw badValue(kind);
   if(['volumeMin','valueMin'].includes(key)&&number<0)throw badValue(kind);
   if(key==='volumeMin'&&Math.abs(number*10-Math.round(number*10))>1e-7)throw badValue(kind);
  }
 }
 if(filters.rsiMin!==undefined&&filters.rsiMin!==''&&filters.rsiMax!==undefined&&filters.rsiMax!==''&&Number(filters.rsiMin)>Number(filters.rsiMax))throw badValue(kind);
 return {filters,activePreset:value.activePreset,count:value.count};
}

function readStore(){
 try{
  const raw=readStored(SAVED_SETS_KEY);
  if(raw==null)return {version:1,sets:[]};
  if(typeof raw!=='string'||raw.length>50000)throw badStore();
  const parsed=JSON.parse(raw);
  if(!onlyKeys(parsed,['version','sets'])||parsed.version!==1||!Array.isArray(parsed.sets)||parsed.sets.length>10)throw badStore();
  const ids=new Set(),counts={screener:0,comparison:0};
  const sets=parsed.sets.map(row=>{
   if(!onlyKeys(row,['id','kind','name','value','savedAt','updatedAt'])||typeof row.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(row.id)||ids.has(row.id)||!kinds.has(row.kind)||++counts[row.kind]>5||nameValue(row.name)!==row.name)throw badStore();
   for(const stamp of [row.savedAt,row.updatedAt])if(typeof stamp!=='string'||!Number.isFinite(Date.parse(stamp))||new Date(stamp).toISOString()!==stamp)throw badStore();
   ids.add(row.id);return {...row,value:validateSavedSetValue(row.kind,row.value)};
  });
  return {version:1,sets};
 }catch{throw badStore();}
}

export function readSavedSets(kind){
 try{if(!kinds.has(kind))throw badValue(kind);return {rows:readStore().sets.filter(row=>row.kind===kind),error:null};}
 catch(error){return {rows:[],error:error.message};}
}

let transactions=Promise.resolve();
function mutate(change,{isCurrent=()=>true}={}){
 const context=getStorageContext();
 const check=()=>{if(!isStorageContextCurrent(context)||!isCurrent())throw new Error('저장 환경이나 화면이 변경됐어요. 다시 시도해주세요.');};
 const result=transactions.catch(()=>{}).then(async()=>{
  check();const store=readStore(),result=change(store);check();
  await writeStored(SAVED_SETS_KEY,JSON.stringify(store),{confirmed:true});check();return result;
 });
 transactions=result;return result;
}

export async function saveNamedSet(kind,name,value,options){
 const cleanName=nameValue(name),cleanValue=validateSavedSetValue(kind,value);
 return mutate(store=>{
  if(store.sets.filter(row=>row.kind===kind).length>=5)throw new Error('검색과 비교 세트는 각각 5개까지 저장할 수 있어요.');
  const now=new Date().toISOString();
  const id=globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const row={id,kind,name:cleanName,value:cleanValue,savedAt:now,updatedAt:now};store.sets.push(row);return row;
 },options);
}
export async function renameSavedSet(kind,id,name,options){
 const cleanName=nameValue(name);
 return mutate(store=>{const row=store.sets.find(row=>row.kind===kind&&row.id===id);if(!row)throw new Error('저장한 세트를 찾지 못했어요.');row.name=cleanName;row.updatedAt=new Date().toISOString();return row;},options);
}
export async function deleteSavedSet(kind,id,options){
 return mutate(store=>{const index=store.sets.findIndex(row=>row.kind===kind&&row.id===id);if(index<0)throw new Error('저장한 세트를 찾지 못했어요.');store.sets.splice(index,1);},options);
}
