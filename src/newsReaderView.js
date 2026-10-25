import { buildNewsFeed, newsArticleUrl, summaryPresentation } from './newsReaderModel.js';
import { relationBasisLabel, translatedTag, titleLanguage } from './dataPresentation.js';

// Grouping stays URL-based; summaries depend on every input sent by the API wrapper.
export function newsSummaryKey(row) {
 const url = newsArticleUrl(row?.safeUrl || row?.url);
 return url ? JSON.stringify([url,String(row.title || ''),String(row.summarySeed || row.snippet || '')]) : '';
}
const MAX_SUMMARIES = 120;
const createSession = () => ({entries:new Map(),expanded:new Set(),listeners:new Set()});
function trimSession(session) {
 while (session.entries.size > MAX_SUMMARIES) {
  const key = session.entries.keys().next().value;
  session.entries.delete(key);session.expanded.delete(key);
 }
}
function pruneSession(session,validKeys) {
 for (const key of session.entries.keys()) if (!validKeys.has(key)) session.entries.delete(key);
 for (const key of session.expanded) if (!validKeys.has(key)) session.expanded.delete(key);
 trimSession(session);
}
// Shared across remounts: navigation cannot open another three jobs while old ones finish.
const queue = [], pending = new Map();
let active = 0;
function pump() {
 while (active < 3 && queue.length) {
  const job = queue.shift();
  if (![...job.subscribers].some(owner=>owner.current())) { pending.delete(job.key);job.resolve(null);continue; }
  active += 1;
  Promise.resolve().then(()=>{
   // Navigation can occur between enqueue and the microtask that starts transport.
   const owner = [...job.subscribers].find(subscriber=>subscriber.current());
   return owner ? owner.loadSummary(job.row,{force:job.force}) : null;
  }).then(job.resolve,job.reject).finally(()=>{
   active -= 1;if (pending.get(job.key) === job) pending.delete(job.key);pump();
  });
 }
}
function enqueue(owner,row,force) {
 const key = newsSummaryKey(row);
 let job = pending.get(key);
 if (!job) {
  let resolve,reject;
  const promise = new Promise((yes,no)=>{resolve=yes;reject=no;});
  job = {key,row,force,promise,resolve,reject,subscribers:new Set()};
  pending.set(key,job);queue.push(job);
 }
 job.subscribers.add(owner);pump();return job.promise;
}

/** Session entries survive route cleanup; only current listeners may render them. */
export function createNewsSummaryController({loadSummary,isCurrent=()=>true,onChange=()=>{},session=createSession()} = {}) {
 let disposed = false;
 const states = session.entries;
 const owner = {loadSummary,current:()=>!disposed && isCurrent()};
 const listener = () => { if (owner.current()) onChange(); };
 session.listeners.add(listener);
 const notify = () => { for (const subscriber of session.listeners) subscriber(); };
 const get = row => {
  // URL lookup is retained for callers inspecting a single unambiguous controller.
  // Views always pass the full row so changed title/seed inputs cannot reuse state.
  const key = typeof row === 'string' ? [...states.keys()].reverse().find(key=>states.get(key).url === row) : newsSummaryKey(row);
  return states.get(key) || {status:'idle'};
 };
 const request = (row,{force=false} = {}) => {
  const key = newsSummaryKey(row);
  if (!owner.current() || !key) return Promise.resolve(null);
  const old = get(row);
  if (old.status === 'pending') return old.promise;
  if (!force && old.status === 'ready') return Promise.resolve(old.payload);
  const entry = {url:row.safeUrl || row.url,status:'pending',promise:null};
  const finish = payload => {
   // A removed/corrected/evicted entry cannot be resurrected by a late response.
   if (states.get(key) === entry) {
    entry.status = payload && typeof payload === 'object' ? 'ready' : 'error';
    if (entry.status === 'ready') entry.payload = payload;
    entry.promise = null;notify();
   }
   return payload;
  };
  states.delete(key);states.set(key,entry);trimSession(session);
  if (typeof loadSummary !== 'function') { finish(null);return Promise.resolve(null); }
  entry.promise = enqueue(owner,row,Boolean(force)).then(finish,()=>finish(null));
  notify();return entry.promise;
 };
 // Adopt an existing explicitly requested job; mounting never enqueues a new one.
 if (typeof loadSummary === 'function') for (const [key,entry] of states) {
  if (entry.status === 'pending') pending.get(key)?.subscribers.add(owner);
 }
 trimSession(session);
 const dispose = () => {
  disposed = true;session.listeners.delete(listener);
  for (const job of pending.values()) job.subscribers.delete(owner);
  pump();
 };
 return {get,request,dispose};
}

const escape = value => String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const relationLabel = value => value === 'direct' ? '직접 관련' : value === 'related' ? '업종 관련' : '관련 근거 미확인';
const preferenceSessions = new WeakMap(), mounts = new WeakMap();
let mountId = 0;
function publication(row) {
 if (!row.publishedAt) return '게시시각 미제공';
 // Preserve date-only and source-local strings rather than shifting them onto a chart day.
 const raw = String(row.publishedAt);
 if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw} · 시각 미제공`;
 const parsed = Date.parse(raw);
 return Number.isFinite(parsed) && /(?:Z|[+-]\d\d:\d\d)$/.test(raw) ? `${new Date(parsed).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})} KST` : raw;
}

/** Returns cleanup. Call it before replacing the route, and pass the route's isCurrent guard. */
export function mountNewsReader(host,payload,options = {}) {
 mounts.get(host)?.cleanup();
 const id = ++mountId, token = {cleanup:null};
 mounts.set(host,token);
 const preferences = options.preferences && typeof options.preferences === 'object' ? options.preferences : {};
 if (!preferences.source) preferences.source = 'all';
 if (!preferences.relation) preferences.relation = 'all';
 const sort = options.sort === 'latest' ? 'latest' : 'major';
 if (preferences.sort !== sort || !Number.isSafeInteger(preferences.visibleCount) || preferences.visibleCount < 12) preferences.visibleCount = 12;
 preferences.sort = sort;
 if (!preferenceSessions.has(preferences)) preferenceSessions.set(preferences,createSession());
 const session = preferenceSessions.get(preferences);
 const expanded = session.expanded;
 const returned = buildNewsFeed(payload,{symbol:options.symbol,limit:0});
 if (returned.status !== 'error' && returned.status !== 'partial') pruneSession(session,new Set(returned.allRows.map(newsSummaryKey).filter(Boolean)));
 let disposed = false, feed;
 const current = () => !disposed && mounts.get(host) === token && host.isConnected !== false && (options.isCurrent?.() ?? true);
 let controller;
 const button = (attrs,label,extra='') => `<button type="button" ${attrs} ${extra}>${label}</button>`;
 const renderSummary = (row,index) => {
  const state = controller.get(row);
  const isExpanded = expanded.has(newsSummaryKey(row));
  const panelId = `news-summary-${id}-${index}`;
  let content = '';
  if (state.status === 'pending') content = '<p role="status">요약을 확인하고 있어요. 요청이 많으면 순서대로 처리해요.</p>';
  else if (state.status === 'error') content = `<p role="status">요약을 불러오지 못했어요. 원문을 확인하거나 다시 시도해주세요.</p>${button(`data-news-summary-retry="${escape(row.key)}"`,'요약 다시 시도')}`;
  else if (state.status === 'ready') {
   const summary = summaryPresentation(state.payload);
   content = `<p class="news-reader-summary-basis">${escape(summary.label)}${summary.blocked?' · 품질 확인 필요':''}</p><p class="news-reader-summary-text">${escape(summary.text.slice(0,1200))}</p><p class="news-reader-notice">${escape(summary.notice)}</p>${summary.retry?button(`data-news-summary-retry="${escape(row.key)}"`,'요약 다시 시도'):''}`;
  } else content = '<p>요약 펼침을 누르면 요약을 요청해요.</p>';
  return `${button(`data-news-summary="${escape(row.key)}" data-news-summary-toggle`,isExpanded?'요약 접기':'요약 펼침',`aria-expanded="${isExpanded}" aria-controls="${panelId}"${row.safeUrl?'':' disabled'}`)}<div id="${panelId}" class="news-reader-summary"${isExpanded?'':' hidden'}>${content}</div>`;
 };
 const card = (row,index) => `<article class="news-reader-card" data-news-reader-card="${escape(row.key)}" aria-labelledby="news-title-${id}-${index}">
  <div class="news-reader-meta"><span>${escape(row.sources.join(' · '))}</span><span>${escape(titleLanguage(row.title))}</span><time${row.publishedAt?` datetime="${escape(row.publishedAt)}"`:''}>${escape(publication(row))}</time></div>
  <h3 id="news-title-${id}-${index}" class="news-reader-title">${row.safeUrl?button(`data-news-external="${escape(row.safeUrl)}" data-news-control="title:${escape(row.key)}"`,escape(row.title||'제목 미제공')):escape(row.title||'제목 미제공')}</h3>
  <div class="news-reader-stocks" aria-label="기사 관련 종목">${row.stocks.map(stock=>button(`data-news-stock="${escape(stock.symbol)}" data-news-reader-stock="${escape(stock.symbol)}"`,escape(stock.name||stock.symbol))).join('')}</div>
  <ul class="news-reader-relations">${row.relations.map(receipt=>`<li><span class="news-reader-relation ${escape(receipt.relationType)}">${escape(relationLabel(receipt.relationType))}</span> ${escape(receipt.name||receipt.symbol||'종목 미제공')} · ${escape(receipt.relationBasis?relationBasisLabel(receipt.relationBasis):'세부 근거 미제공')}</li>`).join('')}</ul>
  ${Array.isArray(row.investmentTags)&&row.investmentTags.length?`<div class="news-tags">${row.investmentTags.slice(0,2).map(tag=>`<span>${escape(translatedTag(tag))}</span>`).join('')}</div>`:''}
  <p class="news-reader-notice">요약 펼침을 누르면 요청해요. 본문을 읽지 못하면 제목·요약문 기반임을 표시해요.</p>
  <div class="news-reader-actions">${row.safeUrl?button(`data-news-external="${escape(row.safeUrl)}" data-news-control="original:${escape(row.key)}"`,'원문 보기'):'<span class="news-reader-notice">안전한 HTTPS 원문 링크를 확인하지 못했어요.</span>'}${options.onSaveEvidence && newsArticleUrl(row.url) && row.stocks.length ? button(`data-news-save-evidence="${escape(row.key)}"`,'조사 근거 저장') : ''}${renderSummary(row,index)}</div>
 </article>`;
 const render = () => {
  if (!current()) return;
  const focused = host.ownerDocument?.activeElement;
  const focusData = focused && host.contains(focused) ? (focused.dataset?.newsControl ? ['newsControl',focused.dataset.newsControl] : Object.entries(focused.dataset||{}).find(([key])=>/^news/.test(key))) : null;
  feed = buildNewsFeed(payload,{...options,source:preferences.source,relation:preferences.relation,limit:preferences.visibleCount});
  const sourceChoices = feed.sources.some(source=>source.value===preferences.source) || preferences.source === 'all' ? feed.sources : [...feed.sources,{value:preferences.source,count:0}];
  const filters = `<div class="news-reader-filters"><div role="group" aria-label="뉴스 출처 필터"><span class="news-reader-filter-label">출처</span>${button('data-news-source="all"',`전체 ${buildNewsFeed(payload,{...options,source:'all',relation:preferences.relation}).filteredCount}`,`aria-pressed="${preferences.source==='all'}"`)}${sourceChoices.map(source=>button(`data-news-source="${escape(source.value)}"`,`${escape(source.value)} ${source.count}`,`aria-pressed="${preferences.source===source.value}"`)).join('')}</div><div role="group" aria-label="뉴스 관련성 필터"><span class="news-reader-filter-label">관련성</span>${button('data-news-relation="all"','전체',`aria-pressed="${preferences.relation==='all'}"`)}${feed.relations.map(relation=>button(`data-news-relation="${relation.value}"`,`${relationLabel(relation.value)} ${relation.count}`,`aria-pressed="${preferences.relation===relation.value}"`)).join('')}${button('data-news-clear','필터 초기화')}</div></div>`;
  const coverage = Number.isInteger(options.usLookbackDays) && options.usLookbackDays > 0 ? `<p class="news-reader-notice" data-news-us-coverage>미국 종목 뉴스는 제공처 조회 범위 최근 ${options.usLookbackDays}일이며 전체 과거 기사가 아니에요.</p>` : '';
  let body;
  if (feed.status === 'error') body = `<div class="news-reader-empty" role="status"><strong>뉴스를 불러오지 못했어요</strong><p>연결 또는 제공처 상태를 확인한 뒤 다시 시도해주세요.</p>${options.onRetry?button('data-news-retry','뉴스 다시 시도'):''}</div>`;
  else if (feed.status === 'empty') body = '<div class="news-reader-empty" role="status"><strong>현재 표시할 관련 뉴스가 없어요</strong><p>직접 또는 업종 관련 근거가 확인된 기사를 표시해요.</p></div>';
  else if (feed.status === 'filtered-empty') body = `<div class="news-reader-empty" role="status"><strong>조건에 맞는 기사가 없어요</strong><p>조회된 기사 ${feed.total}개 안에서 출처·관련성 조건을 적용했어요.</p>${button('data-news-clear','필터 초기화')}</div>`;
  else body = feed.rows.map(card).join('');
  host.innerHTML = `<div class="news-reader">${filters}<p class="news-reader-count" role="status" tabindex="-1">조회된 기사 ${feed.total}개 · 조건 일치 ${feed.filteredCount}개 · ${feed.range.start}–${feed.range.end}개 표시</p>${coverage}${feed.status==='partial'?`<p class="news-reader-notice" role="status">일부 종목의 뉴스를 불러오지 못했어요. 확인된 기사만 표시해요.</p>${options.onRetry?button('data-news-retry','뉴스 다시 시도'):''}`:''}<div class="news-reader-list">${body}</div>${feed.visibleCount < feed.filteredCount ? `<div class="news-reader-more">${button('data-news-more',`기사 더 보기 · ${Math.min(12,feed.filteredCount-feed.visibleCount)}개`)}<span>이미 받은 기사에서 더 표시해요.</span></div>` : ''}<p class="news-reader-notice">이미 받은 기사 목록에서 필터링해요. 기사 본문·이미지는 재게시하지 않으며 원문은 해당 매체에서 확인해주세요.</p></div>`;
  if (focusData) {
   const [key,value] = focusData;
   if (key === 'newsMore' && feed.visibleCount >= feed.filteredCount) host.querySelector('.news-reader-count')?.focus({preventScroll:true});
   for (const element of host.querySelectorAll?.('button') || []) if (element.dataset[key] === value) { element.focus({preventScroll:true}); break; }
  }
 };
 controller = createNewsSummaryController({loadSummary:options.loadSummary,isCurrent:current,onChange:render,session});
 const onClick = event => {
  if (!current()) return;
  const target = event.target.closest?.('button');
  if (!target || !host.contains(target) || target.disabled) return;
  const data = target.dataset;
  if (data.newsSource !== undefined) { preferences.source = data.newsSource;preferences.visibleCount=12;render(); }
  else if (data.newsRelation !== undefined) { preferences.relation = data.newsRelation;preferences.visibleCount=12;render(); }
  else if (data.newsClear !== undefined) { preferences.source='all';preferences.relation='all';preferences.visibleCount=12;render(); }
  else if (data.newsMore !== undefined) { preferences.visibleCount = Math.min(feed.filteredCount,preferences.visibleCount+12);render(); }
  else if (data.newsSaveEvidence) {
   const row = feed.rows.find(row=>row.key===data.newsSaveEvidence);
   if (row && newsArticleUrl(row.url) && row.stocks.length) options.onSaveEvidence?.(row);
  }
  else if (data.newsExternal) { if (newsArticleUrl(data.newsExternal)) options.onExternal?.(data.newsExternal); }
  else if (data.newsStock) {
   const stock = feed.allRows.flatMap(row=>row.stocks).find(stock=>stock.symbol===data.newsStock);
   if (stock) options.onStock?.(stock.symbol,stock.name);
  } else if (data.newsRetry !== undefined) options.onRetry?.();
  else if (data.newsSummary || data.newsSummaryRetry) {
   const key = data.newsSummary || data.newsSummaryRetry;
   const row = feed.rows.find(row=>row.key===key);
   if (!row) return;
   const force = Boolean(data.newsSummaryRetry);
   const summaryKey = newsSummaryKey(row);
   if (!force && expanded.has(summaryKey)) { expanded.delete(summaryKey);render();return; }
   expanded.add(summaryKey);render();controller.request(row,{force});
  }
 };
 host.addEventListener('click',onClick);
 token.cleanup = () => { disposed=true;controller.dispose();host.removeEventListener('click',onClick);if(mounts.get(host)===token)mounts.delete(host); };
 render();return token.cleanup;
}
