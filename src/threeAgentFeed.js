// Optional, read-only 3-agent audited PICK feed (v2 contract).
// Reads only server-precomputed data from GET /api/intelligence/feed/v2.
// No LLM call is ever made from the client: display is fail-closed on the
// required v2 contract fields, and optional extension fields (research
// score / agent claims / precomputed performance) are rendered only when
// present. NEVER merged into the existing PICK ledger or its performance
// math — use dedupAuditedPicks() to detect overlap with existing PICKs.
import { api } from './api.js';

// Off by default. v2 display requires an explicit operator-verified build:
//   VITE_THREE_AGENT_FEED_ENABLED=1
export const threeAgentEnabled = () => import.meta.env?.VITE_THREE_AGENT_FEED_ENABLED === '1';

const stamp = value => typeof value === 'string'
  && /(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(value) && Number.isFinite(Date.parse(value));
const finite = n => typeof n === 'number' && Number.isFinite(n);
const nonEmpty = value => typeof value === 'string' && value.trim().length > 0;
const TICKER_RE = /^[A-Z0-9.\-^]{1,18}$/;

// Forbidden key names (mirror of the server-side feed-v2 contract check).
// A hit means private operational fields leaked into the public document.
const FORBIDDEN_KEY_FRAGMENTS = ['api_key','apikey','secret','password','token','account_id','private_key','db_path','dsn'];

export function scanForbiddenKeys(value, path = '$') {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = scanForbiddenKeys(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const lower = key.toLowerCase();
      if (FORBIDDEN_KEY_FRAGMENTS.some(frag => lower.includes(frag))) return `${path}.${key}`;
      const hit = scanForbiddenKeys(value[key], `${path}.${key}`);
      if (hit) return hit;
    }
  }
  return null;
}

const STATUS_LABELS = ['유지','주의','재점검','종료'];
const VERDICTS = ['BUY','WAIT','SELL'];

function cleanExtension(pick) {
  const out = {};
  // 1. 조사 우선도 vs 최종 투자 판단 점수 (둘 다 서버 사전 계산값, 0~100).
  for (const key of ['research_score','judgment_score']) {
    if (pick[key] === undefined) continue;
    if (finite(pick[key]) && pick[key] >= 0 && pick[key] <= 100) out[key] = pick[key];
  }
  // 2. 메르·농구·멍이 핵심 주장 (서버가 토론 요약에서 미리 생성).
  if (pick.agent_claims && typeof pick.agent_claims === 'object') {
    const claims = {};
    for (const agent of ['mer','nonggu','meng']) {
      const text = pick.agent_claims[agent];
      if (typeof text === 'string' && text.trim().length > 0) {
        claims[agent] = text.trim().slice(0, 500);
      }
    }
    if (Object.keys(claims).length) out.agent_claims = claims;
  }
  // 3. 추천 이후 성과 (서버에서 종가 기준으로 미리 계산된 것만 표시).
  if (pick.performance && typeof pick.performance === 'object') {
    const perf = {};
    for (const key of ['return_pct','mdd_pct','excess_benchmark_pct']) {
      if (finite(pick.performance[key])) perf[key] = pick.performance[key];
    }
    if (typeof pick.performance.benchmark === 'string' && pick.performance.benchmark.trim()) {
      perf.benchmark = pick.performance.benchmark.trim().slice(0, 32);
    }
    if (nonEmpty(pick.performance.as_of)) perf.as_of = pick.performance.as_of;
    if (Object.keys(perf).length) out.performance = perf;
  }
  return out;
}

export function validateThreeAgentFeed(doc, nowMs = Date.now()) {
  if (!doc || doc.schema_version !== 2 || doc.kind !== 'market_research'
      || doc.publication_status !== 'AUDITED_PICKS'
      || !stamp(doc.as_of) || !stamp(doc.generated_at)
      || typeof doc.run_key !== 'string' || doc.run_key.trim().length === 0
      || !['COMPLETE','PARTIAL_COVERAGE'].includes(doc.coverage_status)
      || !['COMPLETE','PARTIAL_DATA'].includes(doc.quality_status)
      || !Array.isArray(doc.picks) || doc.picks.length === 0
      || doc.picks.length > 100) {
    return {status:'invalid',error:'v2 피드 스키마 또는 감사 게시 상태가 일치하지 않아요.'};
  }
  const leak = scanForbiddenKeys(doc);
  if (leak) return {status:'invalid',error:'문서에서 비공개 키 이름이 발견되어 표시를 거부했어요.'};
  const asOf = Date.parse(doc.as_of);
  const generated = Date.parse(doc.generated_at);
  if (asOf > nowMs + 60_000 || generated > nowMs + 60_000) {
    return {status:'invalid',error:'미래 기준시각은 사용할 수 없어요.'};
  }
  const seen = new Set();
  for (const pick of doc.picks) {
    if (!pick || typeof pick !== 'object'
        || !nonEmpty(pick.pick_id) || seen.has(pick.pick_id)
        || !TICKER_RE.test(String(pick.ticker || ''))
        || !['KR','US'].includes(pick.market)
        || !VERDICTS.includes(pick.verdict)
        || !stamp(pick.decided_at)
        || !nonEmpty(pick.fact_pack_hash)
        || !nonEmpty(pick.audit_hash)
        || pick.audit_status !== 'PASS'
        || !STATUS_LABELS.includes(pick.status)
        || pick.source !== 'three_agent_audited') {
      return {status:'invalid',error:'감사 통과 PICK 조건을 만족하지 않는 항목이 있어요.'};
    }
    seen.add(pick.pick_id);
    if (!Array.isArray(pick.evidence_urls)
        || pick.evidence_urls.some(url => typeof url !== 'string' || !url.startsWith('https://'))) {
      return {status:'invalid',error:'근거 URL 형식이 맞지 않아요.'};
    }
    if (!Array.isArray(pick.falsifiers)
        || pick.falsifiers.some(f => !f || !nonEmpty(f.id) || !nonEmpty(f.metric))) {
      return {status:'invalid',error:'반증 조건 형식이 맞지 않아요.'};
    }
    if (typeof pick.thesis !== 'string' || pick.thesis.length > 200) {
      return {status:'invalid',error:'투자 가설 요약이 계약을 벗어났어요.'};
    }
    pick.ext = cleanExtension(pick);
  }
  const age = nowMs - Math.max(asOf, generated);
  return {status: age > 7 * 86400000 ? 'stale' : 'ready', document: doc};
}

export async function loadThreeAgentFeed({force = false} = {}) {
  if (!threeAgentEnabled()) return {status:'disabled'};
  const fetchedAt = new Date().toISOString();
  try {
    const doc = await api('/api/intelligence/feed/v2', {ttlMs:60_000, timeoutMs:6000, retries:0, force});
    return {...validateThreeAgentFeed(doc), fetched_at: fetchedAt};
  } catch (error) {
    return {status:'unavailable', error:'3인 감사 PICK 데이터가 아직 연결되지 않았어요.', fetched_at: fetchedAt};
  }
}

// Guards requirement 9: existing PICK ledger and audited picks are disjoint
// sets. Returns {unique, duplicates} where duplicates overlap the existing
// ledger tickers — the renderer badges them and NEVER folds audited picks
// into the ledger's return/MDD math.
export function dedupAuditedPicks(existingPicks, auditedPicks) {
  const existing = new Set((existingPicks || []).map(row =>
    String(row?.symbol || row?.ticker || row?.code || '').toUpperCase().split('.')[0]
  ).filter(Boolean));
  const unique = [];
  const duplicates = [];
  for (const pick of auditedPicks || []) {
    const key = String(pick?.ticker || '').toUpperCase().split('.')[0];
    if (key && existing.has(key)) duplicates.push(pick);
    else unique.push(pick);
  }
  return {unique, duplicates};
}

const VERDICT_LABEL = {BUY:'매수', WAIT:'관망', SELL:'매도'};
const VERDICT_CLS = {BUY:'up', WAIT:'flat', SELL:'down'};
const AGENT_LABEL = {mer:'메르', nonggu:'농구천재', meng:'멍이'};
const esc = (value) => String(value ?? '').replace(/[&<>"']/g,
  (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed = (n) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;

export function auditedPickMarkup(pick, {duplicate = false} = {}) {
  const ext = pick.ext || {};
  const verdict = esc(VERDICT_LABEL[pick.verdict] || pick.verdict);
  const status = esc(pick.status);
  const evidence = (pick.evidence_urls || []).map((url, i) =>
    `<a class="three-agent-link" href="${esc(url)}" target="_blank" rel="noopener">근거${i + 1}</a>`).join('');
  const falsifiers = (pick.falsifiers || []).map(f =>
    `<li><strong>${esc(f.id)}</strong> · ${esc(f.metric)}</li>`).join('');
  const scoreBlock = (typeof ext.research_score === 'number' || typeof ext.judgment_score === 'number')
    ? `<p class="three-agent-score">조사 우선도 <strong>${ext.research_score ?? '—'}점</strong> · 최종 투자 판단 <strong>${ext.judgment_score ?? '—'}점</strong><span class="three-agent-note">조사 우선도는 발굴 단계 점수, 최종 판단은 3인 토론·감사 통과 후 점수예요.</span></p>`
    : '';
  const claimsBlock = ext.agent_claims
    ? `<div class="three-agent-claims">${Object.entries(ext.agent_claims).map(([agent, text]) =>
        `<p><strong>${esc(AGENT_LABEL[agent] || agent)}</strong> ${esc(text)}</p>`).join('')}</div>`
    : '';
  const hasReturn = typeof ext.performance?.return_pct === 'number';
  const perfBlock = ext.performance && hasReturn
    ? `<p class="three-agent-perf">추천 이후 <strong>${signed(ext.performance.return_pct)}</strong> · MDD ${ext.performance.mdd_pct != null ? ext.performance.mdd_pct.toFixed(2) + '%' : '—'} · ${esc(ext.performance.benchmark || '벤치마크')} 대비 ${ext.performance.excess_benchmark_pct != null ? signed(ext.performance.excess_benchmark_pct) : '—'}<span class="three-agent-note">서버에서 종가 기준으로 미리 계산한 값이에요${ext.performance.as_of ? ` (${esc(ext.performance.as_of)})` : ''}.</span></p>`
    : '';
  return `<article class="three-agent-pick" data-ticker="${esc(String(pick.ticker).toUpperCase().split('.')[0])}" ${duplicate ? 'data-dupe="1"' : ''}>
    <header><span class="three-agent-badge">3인 감사</span><strong>${esc(pick.ticker)}</strong><span class="three-agent-market">${esc(pick.market)}</span>
    <span class="three-agent-verdict ${VERDICT_CLS[pick.verdict] || 'flat'}">${verdict}</span><span class="three-agent-status">${status}</span>
    ${duplicate ? '<span class="three-agent-dupe">기존 PICK과 중복</span>' : '<span class="three-agent-dupe" hidden>기존 PICK과 중복</span>'}</header>
    <p class="three-agent-thesis">${esc(pick.thesis)}</p>
    ${scoreBlock}${claimsBlock}${perfBlock}
    ${falsifiers ? `<details><summary>반증 조건 · ${pick.falsifiers.length}건</summary><ul>${falsifiers}</ul></details>` : ''}
    ${evidence ? `<p class="three-agent-evidence">${evidence}</p>` : ''}
    <footer><span>분석 ${esc(pick.decided_at)}</span><span>감사 ${esc(String(pick.audit_hash).slice(0, 18))}…</span></footer>
  </article>`;
}

export function auditedSectionMarkup(doc, dedup, opts = {}) {
  const trust = doc.coverage_status === 'COMPLETE' && doc.quality_status === 'COMPLETE'
    ? '입력 유니버스 확인 · 지표 데이터 정상'
    : '시장 데이터 일부 누락 · 지표 일부 확인';
  const cards = doc.picks.map(pick =>
    auditedPickMarkup(pick, {duplicate: dedup && dedup.duplicates.includes(pick)})).join('');
  const dupeNote = dedup && dedup.duplicates.length
    ? ` · 기존 PICK ${dedup.duplicates.length}건 중복`
    : '';
  // P5: 분석 기준일(as_of)·피드 갱신시각(generated_at)·조회시각을 명시.
  // 과거 스냅샷을 현재 분석처럼 위장하지 않는다.
  const fetchedNote = opts.fetchedAt ? ` · 조회 ${esc(opts.fetchedAt)}` : '';
  return `<details class="pick-ledger-policy" id="three-agent-v2-details"><summary>3인 감사 PICK · ${doc.picks.length}건${dupeNote}</summary>
    <p>${esc(trust)} · 분석 기준 ${esc(doc.as_of)}${doc.generated_at !== doc.as_of ? ` · 갱신 ${esc(doc.generated_at)}` : ''}${fetchedNote} · 별도 집계로만 표시되며 기존 PICK 성과 계산에 합산되지 않아요.</p>
    <div class="three-agent-picks">${cards}</div></details>`;
}
