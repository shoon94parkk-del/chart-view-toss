import { readResearchEvidence, saveResearchEvidence, updateResearchEvidenceMemo, deleteResearchEvidence } from './researchEvidence.js';
import { getStorageContext, isStorageContextCurrent } from './storage.js';
import { newsArticleUrl } from './newsReaderModel.js';
import './researchEvidence.css';

const escape = value => String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const mounts = new WeakMap();
let sequence = 0;
function lifecycle(host,options) {
 mounts.get(host)?.cleanup();
 const context = getStorageContext();
 const listeners = [];
 let disposed = false;
 const token = {
  current:()=>!disposed && mounts.get(host) === token && host.isConnected !== false && isStorageContextCurrent(context) && (options.isCurrent?.() ?? true),
  listen(type,handler) { host.addEventListener(type,handler);listeners.push([type,handler]); },
  cleanup() { disposed=true;for (const [type,handler] of listeners) host.removeEventListener(type,handler);if (mounts.get(host) === token) mounts.delete(host); },
 };
 mounts.set(host,token);
 return token;
}
const button = (attrs,label,disabled=false) => `<button type="button" ${attrs}${disabled?' disabled':''}>${label}</button>`;
function restoreFocus(host,key) {
 if (!key) return;
 for (const control of host.querySelectorAll?.('[data-evidence-control]') || []) if (control.dataset.evidenceControl === key) { control.focus();break; }
}
function publication(value) {
 if (!value) return '발행일 미제공';
 return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value} · 시각 미제공` : value;
}
const field = (form,name) => form.querySelector(`[name="${name}"]`)?.value || '';
const mayRestoreFocus=host=>{
 const doc=host.ownerDocument,active=doc?.activeElement;
 return !active||active===doc.body||host.contains(active);
};

/** Opens an inline editor. Each save requires the user's choice from actual article stocks. */
export function openNewsEvidenceEditor(host,row,options = {}) {
 const returnFocus=host.ownerDocument?.activeElement;
 const life = lifecycle(host,options), id = ++sequence;
 const stocks = [...new Map((row?.stocks || []).filter(stock=>/^[A-Z0-9^.=:_-]{1,32}$/.test(stock?.symbol)).map(stock=>[stock.symbol,stock])).values()];
 let selected = '',memo = '',message = '',failed = false,busy = false;
 const render = () => {
  if (!life.current()) return;
  host.innerHTML = `<section class="research-evidence research-evidence-editor" aria-label="뉴스 조사 근거 저장">
   <h3>조사 근거 저장</h3><p class="research-evidence-title">${escape(row.title)}</p>
   <p class="research-evidence-meta">${escape((row.sources || []).join(' · '))} · ${escape(publication(row.publishedAt))}</p>
   <p class="research-evidence-help">기사 관련 종목을 직접 선택해주세요. 원문 정보와 메모만 이 기기에 저장해요.</p>
   ${newsArticleUrl(row.url) && stocks.length ? `<form data-evidence-editor>
    <label for="evidence-symbol-${id}">관련 종목</label><select id="evidence-symbol-${id}" name="symbol" required${busy?' disabled':''}>
     <option value="">선택해주세요</option>${stocks.map(stock=>`<option value="${escape(stock.symbol)}"${selected===stock.symbol?' selected':''}>${escape(stock.name || stock.symbol)} · ${escape(stock.symbol)}</option>`).join('')}
    </select>
    <label for="evidence-memo-${id}">개인 메모 (선택 · 300자 이내)</label><textarea id="evidence-memo-${id}" name="memo" maxlength="300" rows="3"${busy?' disabled':''}>${escape(memo)}</textarea>
    <div class="research-evidence-actions"><button type="submit" data-evidence-save${busy?' disabled':''}>${busy?'저장 중…':'조사 근거 저장'}</button>${button('data-evidence-cancel','닫기',busy)}</div>
   </form>` : `<p role="alert">안전한 HTTPS 원문과 기사 관련 종목을 확인하지 못했어요.</p>${button('data-evidence-cancel','닫기')}`}
   <p data-evidence-editor-status role="${failed?'alert':'status'}">${escape(message)}</p>
  </section>`;
 };
 life.listen('submit',async event=>{
  const form = event.target;
  if (form.dataset?.evidenceEditor === undefined || !host.contains(form)) return;
  event.preventDefault();
  if (!life.current() || busy) return;
  selected=field(form,'symbol');memo=field(form,'memo');
  if (!stocks.some(stock=>stock.symbol === selected)) { message='관련 종목을 선택해주세요.';failed=true;render();return; }
  busy=true;failed=false;message='저장 중…';render();
  try {
   const result = await saveResearchEvidence(row,{symbol:selected,memo});
   if (!life.current()) return;
   message=result.duplicate?'이미 저장한 조사 근거예요. 기존 메모를 유지했어요.':'조사 근거를 저장했어요.';
   options.onNotice?.(message);options.onSaved?.(result);
  } catch (error) {
   if (!life.current()) return;
   message=error.message || '조사 근거를 저장하지 못했어요. 다시 시도해주세요.';failed=true;
  } finally {
   busy=false;if (life.current()) { const restore=mayRestoreFocus(host);render();if(restore)host.querySelector('[data-evidence-save]')?.focus({preventScroll:true}); }
  }
 });
 life.listen('click',event=>{
  const target = event.target.closest?.('button');
  if (!life.current() || busy || !target || !host.contains(target)) return;
  if (target.dataset.evidenceCancel !== undefined) { life.cleanup();host.innerHTML='';options.onClose?.();if (returnFocus?.isConnected !== false) returnFocus?.focus?.(); }
 });
 render();host.scrollIntoView?.({block:'center',behavior:'instant'});host.querySelector('select')?.focus();
 return life.cleanup;
}

/** Mounts a compact list for a stock, or a collapsed all-stock list on Watch. */
export function mountResearchEvidence(host,options = {}) {
 const life = lifecycle(host,options), id = ++sequence;
 let rows=[],editing='',draft='',busy=false,message='',failed=false,expanded=Boolean(options.symbol);
 const render = (focusKey='') => {
  if (!life.current()) return;
  const oldDetails = host.querySelector('[data-research-evidence]');
  if (oldDetails) expanded=oldDetails.open;
  const result = readResearchEvidence(options.symbol);
  rows=result.rows;
  const status = `<p data-evidence-list-status tabindex="-1" role="${failed?'alert':'status'}">${escape(message)}</p>`;
  if (result.error) { host.innerHTML=`<section class="research-evidence"><h3>조사 근거</h3><p role="alert">${escape(result.error)}</p></section>`;return; }
  if (!rows.length && options.compact) { host.innerHTML='';return; }
  if (options.compact && rows.length) {
   const groups=new Map();
   for (const row of rows) {
    const group=groups.get(row.symbol);
    if (group) { group.count++;if (Date.parse(row.savedAt)>Date.parse(group.row.savedAt)) group.row=row; }
    else groups.set(row.symbol,{row,count:1});
   }
   host.innerHTML=`<section class="research-evidence research-evidence-compact" aria-label="저장한 조사 근거"><h3>조사 근거</h3><div class="research-evidence-stock-rows">${[...groups.values()].map(({row,count})=>`<button type="button" data-evidence-stock="${escape(row.id)}"><strong>${escape(options.nameFor?.(row.symbol) || row.symbol)} · ${count}개</strong><span>${escape(row.title)}</span></button>`).join('')}</div></section>`;return;
  }
  if (!rows.length) { host.innerHTML=`<section class="research-evidence"><h3>조사 근거</h3><p class="research-evidence-help">아직 저장한 조사 근거가 없어요. 뉴스에서 관련 종목을 선택해 저장해주세요.</p>${status}</section>`;return; }
  const rowHtml = row => {
   const editable = editing === row.id;
   const control = (action,label) => button(`data-evidence-${action}="${escape(row.id)}" data-evidence-control="${action}:${escape(row.id)}"`,label,busy);
   return `<article data-evidence-row="${escape(row.id)}" class="research-evidence-row">
    <h4 class="research-evidence-title">${escape(row.title)}</h4>
    <p class="research-evidence-meta">${escape(row.sources.join(' · ') || '출처 미제공')} · ${escape(publication(row.publishedAt))}</p>
    <p class="research-evidence-meta">저장 ${escape(row.savedAt.slice(0,10))}${!options.symbol?` · ${options.onStock?button(`data-evidence-stock="${escape(row.id)}"`,escape(row.symbol),busy):escape(row.symbol)}`:''}</p>
    ${editable?`<form data-evidence-memo-form="${escape(row.id)}"><label for="evidence-edit-${id}">개인 메모 (300자 이내)</label><textarea id="evidence-edit-${id}" name="memo" maxlength="300" rows="3"${busy?' disabled':''}>${escape(draft)}</textarea><div class="research-evidence-actions"><button type="submit" data-evidence-memo-save${busy?' disabled':''}>${busy?'저장 중…':'메모 저장'}</button>${control('memo-cancel','취소')}</div></form>`:`${row.memo?`<p class="research-evidence-memo">${escape(row.memo)}</p>`:''}<div class="research-evidence-actions">${control('original','원문 보기')}${control('edit','메모 수정')}${control('delete','삭제')}</div>`}
   </article>`;
  };
  host.innerHTML=`<section class="research-evidence"><details data-research-evidence${expanded?' open':''}><summary>조사 근거 ${rows.length}개${options.name?` · ${escape(options.name)}`:''}</summary><p class="research-evidence-help">저장한 원문 정보와 개인 메모예요. 현재 자료를 자동 검증한 결과가 아니에요.</p><div class="research-evidence-rows">${rows.map(rowHtml).join('')}</div></details>${status}</section>`;
  restoreFocus(host,focusKey);
 };
 const persist = async (operation,success,focusKey) => {
  busy=true;message='저장 중…';failed=false;render();
  try {
   await operation();
   if (!life.current()) return;
   editing='';message=success;options.onNotice?.(success);options.onUpdated?.();
  } catch (error) {
   if (!life.current()) return;
   message=error.message || '변경을 저장하지 못했어요. 다시 시도해주세요.';failed=true;
  } finally {
   busy=false;
   if (life.current()) {
    const restore=mayRestoreFocus(host);
    render(restore?focusKey:'');
    if (!restore) return;
    if (failed && editing) host.querySelector('textarea')?.focus();
    else if (!focusKey) (host.querySelector('summary') || host.querySelector('[data-evidence-list-status]'))?.focus({preventScroll:true});
   }
  }
 };
 life.listen('click',event=>{
  const target = event.target.closest?.('button');
  if (!life.current() || busy || !target || !host.contains(target) || target.disabled) return;
  const data=target.dataset;
  const row=rows.find(row=>[data.evidenceOriginal,data.evidenceEdit,data.evidenceDelete,data.evidenceMemoCancel,data.evidenceStock].includes(row.id));
  if (!row) return;
  if (data.evidenceOriginal && newsArticleUrl(row.url)) options.onExternal?.(row.url);
  else if (data.evidenceStock) options.onStock?.(row.symbol,row.symbol);
  else if (data.evidenceEdit) { editing=row.id;draft=row.memo;message='';render();host.querySelector('textarea')?.focus(); }
  else if (data.evidenceMemoCancel) { editing='';render(`edit:${row.id}`); }
  else if (data.evidenceDelete) persist(()=>deleteResearchEvidence(row.id),'조사 근거를 삭제했어요.');
 });
 life.listen('submit',event=>{
  const form=event.target;
  if (form.dataset?.evidenceMemoForm === undefined || !host.contains(form)) return;
  event.preventDefault();
  if (!life.current() || busy || form.dataset.evidenceMemoForm !== editing) return;
  draft=field(form,'memo');
  persist(()=>updateResearchEvidenceMemo(editing,draft),'메모를 저장했어요.',`edit:${editing}`);
 });
 render();return life.cleanup;
}
