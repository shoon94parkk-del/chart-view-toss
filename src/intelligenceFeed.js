// Optional, read-only three-agent research feed. NEVER a substitute for the
// existing PICK ledger, and never a source of trade instructions.
import { api } from './api.js';

export const marketIntelEnabled = () => import.meta.env?.VITE_MARKET_INTELLIGENCE_ENABLED === '1';
const stamp = value => typeof value === 'string'
  && /(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(value) && Number.isFinite(Date.parse(value));
const finite = n => typeof n === 'number' && Number.isFinite(n);

export function validateMarketIntelligence(doc, nowMs=Date.now()) {
  if (!doc || doc.schema_version !== 1 || doc.kind !== 'market_research'
      || doc.publication_status !== 'RESEARCH_ONLY'
      || !stamp(doc.as_of) || !Array.isArray(doc.candidates) || !Array.isArray(doc.market_events)) {
    return {status:'invalid',error:'스키마 또는 연구 단계가 일치하지 않아요.'};
  }
  const dt = Date.parse(doc.as_of);
  if (dt > nowMs+60_000) return {status:'invalid',error:'미래 기준시각은 사용할 수 없어요.'};
  if (!['COMPLETE','PARTIAL_COVERAGE'].includes(doc.coverage_status)) {
    return {status:'invalid',error:'시장 수집 범위 상태가 없어요.'};
  }
  if (!['COMPLETE','PARTIAL_DATA'].includes(doc.quality_status)) {
    return {status:'invalid',error:'지표 데이터 상태가 없어요.'};
  }
  if (doc.candidates.length > 50 || doc.market_events.length > 100) {
    return {status:'invalid',error:'허용된 데이터 크기를 초과했어요.'};
  }
  if (doc.candidates.some(row => !row || typeof row.ticker !== 'string'
      || !/^[A-Z0-9.^-]{1,18}$/.test(row.ticker) || !finite(row.score)
      || row.score < 0 || row.score > 100 || row.stage !== 'DISCOVERED'
      || row.buy_eligible !== false || !['KR','US'].includes(row.market))) {
    return {status:'invalid',error:'연구 후보 필드가 부정확해요.'};
  }
  if (doc.market_events.some(row => !row || typeof row.id !== 'string'
      || row.action !== 'REVIEW_ONLY' || row.requires_review !== true
      || !['CRITICAL','WARNING'].includes(row.severity))) {
    return {status:'invalid',error:'이벤트 검토 등급을 확인할 수 없어요.'};
  }
  // Never display unchecked decisions as if they were audited picks.
  if (!Array.isArray(doc.picks) || doc.picks.length !== 0
      || !Array.isArray(doc.pick_history) || doc.pick_history.length !== 0) {
    return {status:'invalid',error:'미검증 PICK 병합을 거부했어요.'};
  }
  const age=nowMs-dt;
  return {status:age>7*86400000?'stale':'ready',document:doc};
}

export async function loadMarketIntelligence({force=false}={}) {
  if (!marketIntelEnabled()) return {status:'disabled'};
  try {
    const doc=await api('/api/intelligence/feed',{ttlMs:60_000,timeoutMs:6000,retries:0,force});
    return validateMarketIntelligence(doc);
  } catch(error) {
    return {status:'unavailable',error:'3인 시장 조사 데이터가 아직 연결되지 않았어요.'};
  }
}
