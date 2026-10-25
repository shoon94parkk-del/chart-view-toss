import { RESEARCH_EVIDENCE_KEY, readStored, writeStored, getStorageContext, isStorageContextCurrent } from './storage.js';
import { newsArticleUrl } from './newsReaderModel.js';

const VERSION = 1;
const MAX_TOTAL = 100;
const MAX_PER_STOCK = 20;
const damaged = () => new Error('저장된 조사 근거를 읽지 못했어요. 기존 자료를 덮어쓰지 않았어요.');
const symbolValue = value => {
 const symbol = typeof value === 'string' ? value.trim().toUpperCase() : '';
 if (!/^[A-Z0-9^.=:_-]{1,32}$/.test(symbol)) throw new Error('관련 종목을 선택해주세요.');
 return symbol;
};
function memoValue(value = '') {
 if (typeof value !== 'string' || value.length > 300) throw new Error('개인 메모는 300자 이내로 적어주세요.');
 return value.trim();
}
function safeUrl(value) {
 return typeof value === 'string' && value.length <= 4096 && !/[\u0000-\u0020<>"']/u.test(value) ? newsArticleUrl(value) : '';
}
const bounded = (value, limit, required = false) => typeof value === 'string' && value.length <= limit && (!required || Boolean(value.trim()));
function validRecord(row) {
 if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
 try {
  return bounded(row.id,160,true) && row.symbol === symbolValue(row.symbol) && bounded(row.title,500,true)
   && Boolean(safeUrl(row.url)) && Array.isArray(row.sources) && row.sources.length <= 10
   && row.sources.every(source=>bounded(source,160,true)) && new Set(row.sources).size === row.sources.length
   && bounded(row.publishedAt,100) && bounded(row.savedAt,40,true) && Number.isFinite(Date.parse(row.savedAt))
   && typeof row.memo === 'string' && row.memo.length <= 300;
 } catch { return false; }
}
function readAll() {
 try {
  const raw = readStored(RESEARCH_EVIDENCE_KEY);
  if (raw == null) return [];
  const value = JSON.parse(raw);
  if (value?.version !== VERSION || !Array.isArray(value.rows) || value.rows.length > MAX_TOTAL) throw damaged();
  const ids = new Set(), identities = new Set(), counts = new Map();
  for (const row of value.rows) {
   if (!validRecord(row)) throw damaged();
   const identity = JSON.stringify([row.symbol,row.url]);
   const count = (counts.get(row.symbol) || 0) + 1;
   if (ids.has(row.id) || identities.has(identity) || count > MAX_PER_STOCK) throw damaged();
   ids.add(row.id);identities.add(identity);counts.set(row.symbol,count);
  }
  return value.rows;
 } catch { throw damaged(); }
}

/** Reads never migrate or rewrite old data. Invalid data remains available for recovery. */
export function readResearchEvidence(symbol) {
 try {
  const key = symbol == null ? null : symbolValue(symbol);
  const rows = readAll().filter(row=>!key || row.symbol === key);
  rows.sort((a,b)=>Date.parse(b.savedAt)-Date.parse(a.savedAt));
  return {rows,error:null};
 } catch (error) { return {rows:[],error:error.message}; }
}

let mutationQueue = Promise.resolve();
function mutate(change) {
 const context = getStorageContext();
 const result = mutationQueue.catch(()=>{}).then(async()=>{
  if (!isStorageContextCurrent(context)) throw new Error('저장 환경이 바뀌었어요. 현재 화면에서 다시 시도해주세요.');
  const rows = readAll();
  const next = change(rows);
  if (next.write !== false) await writeStored(RESEARCH_EVIDENCE_KEY,JSON.stringify({version:VERSION,rows:next.rows}),{confirmed:true});
  if (!isStorageContextCurrent(context)) throw new Error('저장 환경이 바뀌었어요. 현재 화면에서 다시 시도해주세요.');
  return next.value;
 });
 mutationQueue = result;
 return result;
}

/** Only an explicit symbol actually supplied for this article can receive evidence. */
export async function saveResearchEvidence(article, {symbol,memo='',now=new Date()} = {}) {
 const selected = symbolValue(symbol);
 if (!Array.isArray(article?.stocks) || !article.stocks.some(stock=>stock?.symbol === selected)) throw new Error('기사에 표시된 관련 종목을 선택해주세요.');
 const url = safeUrl(article.url);
 if (!url) throw new Error('자격증명 없는 HTTPS 원문 링크만 저장할 수 있어요.');
 const title = typeof article.title === 'string' ? article.title.trim().slice(0,500) : '';
 if (!title) throw new Error('원문 제목을 확인해주세요.');
 const sources = [...new Set((Array.isArray(article.sources) ? article.sources : [article.source]).filter(value=>typeof value === 'string' && value.trim()).map(value=>value.trim().slice(0,160)))].slice(0,10);
 const row = {
  id:globalThis.crypto?.randomUUID?.() || `evidence-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  symbol:selected,title,url,sources,
  publishedAt:typeof article.publishedAt === 'string' ? article.publishedAt.slice(0,100) : '',
  savedAt:now.toISOString(),memo:memoValue(memo),
 };
 return mutate(rows=>{
  const duplicate = rows.find(old=>old.symbol === selected && old.url === url);
  if (duplicate) return {write:false,value:{row:duplicate,duplicate:true}};
  if (rows.filter(old=>old.symbol === selected).length >= MAX_PER_STOCK) throw new Error('종목당 조사 근거는 20개까지 저장할 수 있어요. 기존 근거를 확인해주세요.');
  if (rows.length >= MAX_TOTAL) throw new Error('조사 근거는 전체 100개까지 저장할 수 있어요. 기존 근거를 확인해주세요.');
  return {rows:[...rows,row],value:{row,duplicate:false}};
 });
}

export async function updateResearchEvidenceMemo(id,memo) {
 const value = memoValue(memo);
 return mutate(rows=>{
  const old = rows.find(row=>row.id === id);
  if (!old) throw new Error('저장된 조사 근거를 찾지 못했어요. 다시 확인해주세요.');
  const updated = {...old,memo:value};
  return {rows:rows.map(row=>row.id === id ? updated : row),value:updated};
 });
}

export function deleteResearchEvidence(id) {
 return mutate(rows=>({rows:rows.filter(row=>row.id !== id),value:undefined}));
}
