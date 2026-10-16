import { externalLinkTarget } from './externalLinks.js';

/** Only identical, credential-free HTTPS strings identify the same article. */
export function newsArticleUrl(value) {
 const raw = typeof value === 'string' ? value : '';
 if (!raw || raw !== raw.trim()) return '';
 try { const url = new URL(raw); return url.protocol === 'https:' && !url.username && !url.password ? raw : ''; } catch { return ''; }
}
const text = value => String(value ?? '').trim();
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const relationType = value => value === 'direct' ? 'direct' : ['related','industry'].includes(value) ? 'related' : 'unknown';
const matchesRelation = (row, relation, symbol) => !relation || relation === 'all' || row.relations.some(receipt => (!symbol || receipt.symbol === symbol) && receipt.relationType === relationType(relation));

/** Filters and counts cover only items already supplied by the backend, including groups. */
export function buildNewsFeed(payload, options = {}) {
 const merged = new Map();
 let ordinal = 0;
 const add = (input, group = {}) => {
  if (!input || typeof input !== 'object') return;
  const articleUrl = newsArticleUrl(input.url);
  const safeUrl = articleUrl || (/^http:\/\//.test(input.url || '') ? externalLinkTarget(input.url).url || '' : '');
  const key = articleUrl || `unlinked:${ordinal}`;
  let row = merged.get(key);
  if (!row) {
   row = {...input, key, url: text(input.url), safeUrl, stocks: [], relations: [], sources: [], score: number(input.score), publishedTs: number(input.publishedTs), ordinal};
   merged.set(key, row);
  }
  ordinal += 1;
  // The strongest supplied article score is retained; no client relevance calculation.
  row.score = Math.max(row.score, number(input.score));
  const source = text(input.source) || '출처 미제공';
  if (!row.sources.includes(source)) row.sources.push(source);
  const symbol = text(input.symbol || group.symbol);
  const name = text(input.name || (symbol === group.symbol ? group.name : '')) || symbol;
  if (symbol) {
   const stock = row.stocks.find(stock => stock.symbol === symbol);
   if (!stock) row.stocks.push({symbol,name});
   else if (stock.name === symbol && name !== symbol) stock.name = name;
  }
  const receipt = {symbol,name,relationType:relationType(input.relationType),relationBasis:text(input.relationBasis)};
  if (!row.relations.some(old => old.symbol === receipt.symbol && old.relationType === receipt.relationType && old.relationBasis === receipt.relationBasis)) row.relations.push(receipt);
 };
 for (const item of payload?.items || []) add(item);
 for (const group of payload?.groups || []) for (const item of group?.items || []) add(item, group);
 const symbol = text(options.symbol);
 const source = text(options.source || 'all');
 const relation = text(options.relation || 'all');
 const scoped = [...merged.values()].filter(row => !symbol || row.stocks.some(stock => stock.symbol === symbol));
 const sourceRows = scoped.filter(row => matchesRelation(row,relation,symbol));
 const sourceNames = [...new Set(sourceRows.flatMap(row => row.sources))].sort((a,b) => a.localeCompare(b,'ko'));
 const sources = sourceNames.map(value => ({value,count:sourceRows.filter(row=>row.sources.includes(value)).length}));
 const bySource = scoped.filter(row => source === 'all' || row.sources.includes(source));
 const relations = ['direct','related'].map(value => ({value,count:bySource.filter(row=>matchesRelation(row,value,symbol)).length}));
 const allRows = bySource.filter(row=>matchesRelation(row,relation,symbol));
 // Stable ties match the established major/latest sorts in main.js.
 allRows.sort((a,b) => options.sort === 'latest' ? b.publishedTs-a.publishedTs || a.ordinal-b.ordinal : b.score-a.score || a.ordinal-b.ordinal);
 const limit = Number.isFinite(options.limit) ? Math.max(0,Math.floor(options.limit)) : 12;
 const rows = allRows.slice(0,limit);
 const failed = Boolean(payload?.loadError || payload?.error || payload?.status === 'error' || payload?.errors?.length || payload?.groups?.some(group=>group.status==='error'));
 const status = !scoped.length ? failed ? 'error' : 'empty' : !allRows.length ? 'filtered-empty' : failed ? 'partial' : 'ready';
 return {rows,allRows,total:scoped.length,filteredCount:allRows.length,visibleCount:rows.length,sources,relations,status,range:{start:rows.length?1:0,end:rows.length,total:allRows.length}};
}

export function summaryPresentation(payload) {
 const basis = text(payload?.basis);
 const quality = text(payload?.qualityStatus);
 const empty = !text(payload?.summary);
 const blocked = quality.startsWith('blocked_');
 const labels = {article_body:'본문 기반',page_description:'본문 설명 기반',provider_snippet:'기사 요약문 기반',title_snippet_fallback:'제목·요약문 기반',headline_only:'제목 기반'};
 const notices = {article_body:'원문 본문을 바탕으로 만든 요약이에요.',page_description:'페이지 설명을 바탕으로 만든 요약이며 전체 본문을 확인한 결과는 아니에요.',provider_snippet:'제공처 요약문을 바탕으로 했으며 전체 본문을 확인한 결과는 아니에요.',title_snippet_fallback:'제목·요약문으로 만든 대체 요약이며 전체 본문을 확인한 결과는 아니에요.',headline_only:'제목만 바탕으로 만든 요약이며 본문 내용은 확인하지 못했어요.'};
 let notice = notices[basis] || '요약 근거를 확인하지 못했어요. 원문을 함께 확인해주세요.';
 if (payload?.fetchError) notice += ' 원문 읽기에 제한이 있었어요.';
 if (payload?.translationError) notice += ' 번역 처리에 제한이 있어 원문 확인이 필요해요.';
 if (quality.startsWith('fallback_')) notice += ' 품질 검사 후 대체 요약을 표시해요.';
 if (blocked) notice += ' 요약 품질 검사에서 표시가 보류됐어요.';
 if (empty) notice = '요약 내용을 받지 못했어요. 원문을 확인하거나 다시 시도해주세요.';
 return {basis,label:empty?'요약 미제공':labels[basis]||'근거 미확인',quality,blocked,notice,text:blocked?'신뢰할 수 있는 요약을 만들지 못했어요. 원문에서 확인해주세요.':text(payload?.summary)||'요약을 만들지 못했어요. 원문에서 확인해주세요.',retry:empty||blocked||Boolean(payload?.translationError||payload?.fetchError)||quality.startsWith('fallback_')};
}
