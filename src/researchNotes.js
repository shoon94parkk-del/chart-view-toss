import { RESEARCH_KEY, readStored, writeStored } from './storage.js';

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
    question:text(value.question,180),
    support:text(value.support,800),
    challenge:text(value.challenge,800),
    reviewOn:typeof value.reviewOn==='string'?value.reviewOn:'',
    createdAt:typeof value.createdAt==='string'?value.createdAt:'',
    updatedAt:typeof value.updatedAt==='string'?value.updatedAt:'',
  };
}

export function saveResearchNote(symbol,input,{now=new Date()}={}){
  const key=ticker(symbol);
  const question=text(input?.question,180);
  if(!question)throw new Error('확인하고 싶은 질문을 적어주세요.');
  const previous=readResearchNote(key);
  const note={
    question,
    support:text(input?.support,800),
    challenge:text(input?.challenge,800),
    reviewOn:validDate(input?.reviewOn),
    createdAt:previous?.createdAt||now.toISOString(),
    updatedAt:now.toISOString(),
  };
  const cards=readCards();
  cards[key]=note;
  writeStored(RESEARCH_KEY,JSON.stringify(cards));
  return note;
}

export function deleteResearchNote(symbol){
  const cards=readCards();
  delete cards[ticker(symbol)];
  writeStored(RESEARCH_KEY,JSON.stringify(cards));
}
