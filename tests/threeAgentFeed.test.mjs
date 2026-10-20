import test from 'node:test';
import assert from 'node:assert/strict';
import { validateThreeAgentFeed, dedupAuditedPicks, auditedPickMarkup, auditedSectionMarkup, scanForbiddenKeys } from '../src/threeAgentFeed.js';

const now = Date.parse('2026-10-19T20:00:00+09:00');
const pick = () => ({
  pick_id: 'KR-20261019-005930',
  market: 'KR',
  ticker: '005930',
  verdict: 'BUY',
  decided_at: '2026-10-19T11:10:11+09:00',
  decision_date: '2026-10-19',
  thesis: '메모리 수요 회복 + HBM 공급 규율 유지 가설.',
  evidence_urls: ['https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260813001713'],
  falsifiers: [{id: 'F1', metric: 'D램 현물가 전월 대비 -10% 이상 하락'}],
  fact_pack_hash: 'sha256:FACT',
  audit_hash: 'sha256:AUDIT',
  audit_status: 'PASS',
  status: '유지',
  source: 'three_agent_audited',
});
const doc = () => ({
  schema_version: 2, kind: 'market_research', publication_status: 'AUDITED_PICKS',
  as_of: '2026-10-19T19:55:00+09:00', generated_at: '2026-10-19T19:56:00+09:00',
  run_key: 'run-20261019-001', coverage: 'KR+US',
  coverage_status: 'COMPLETE', quality_status: 'COMPLETE',
  failure_state: null, picks: [pick()],
});

test('valid audited feed accepted', () => {
  const r = validateThreeAgentFeed(doc(), now);
  assert.equal(r.status, 'ready');
  assert.equal(r.document.picks.length, 1);
});

test('WAIT/SELL verdicts and 유지/주의/재점검/종료 statuses accepted', () => {
  for (const verdict of ['WAIT', 'SELL']) {
    for (const status of ['유지', '주의', '재점검', '종료']) {
      const d = doc(); d.picks[0].verdict = verdict; d.picks[0].status = status;
      assert.equal(validateThreeAgentFeed(d, now).status, 'ready', `${verdict}/${status}`);
    }
  }
});

test('audit FAIL / missing hash / non-https evidence rejected', () => {
  const a = doc(); a.picks[0].audit_status = 'FAIL';
  assert.equal(validateThreeAgentFeed(a, now).status, 'invalid');
  const b = doc(); delete b.picks[0].fact_pack_hash;
  assert.equal(validateThreeAgentFeed(b, now).status, 'invalid');
  const c = doc(); c.picks[0].evidence_urls = ['http://example.com/x'];
  assert.equal(validateThreeAgentFeed(c, now).status, 'invalid');
  const e = doc(); e.picks[0].source = 'other';
  assert.equal(validateThreeAgentFeed(e, now).status, 'invalid');
});

test('empty picks, duplicate pick_id, wrong publication_status rejected', () => {
  const a = doc(); a.picks = [];
  assert.equal(validateThreeAgentFeed(a, now).status, 'invalid');
  const b = doc(); b.picks = [pick(), pick()];
  assert.equal(validateThreeAgentFeed(b, now).status, 'invalid');
  const c = doc(); c.publication_status = 'RESEARCH_ONLY'; c.schema_version = 1;
  assert.equal(validateThreeAgentFeed(c, now).status, 'invalid');
});

test('stale and future data are never fresh', () => {
  const s = doc(); s.as_of = '2026-10-01T12:00:00+09:00'; s.generated_at = '2026-10-01T12:00:00+09:00';
  assert.equal(validateThreeAgentFeed(s, now).status, 'stale');
  const f = doc(); f.as_of = '2026-10-20T12:00:00+09:00'; f.generated_at = '2026-10-20T12:00:00+09:00';
  assert.equal(validateThreeAgentFeed(f, now).status, 'invalid');
});

test('forbidden key names refuse display', () => {
  const d = doc(); d.picks[0].api_key = 'x';
  assert.equal(validateThreeAgentFeed(d, now).status, 'invalid');
  assert.equal(scanForbiddenKeys({ok: 1}), null);
  assert.equal(scanForbiddenKeys({nested: {auth_token: 'x'}}), '$.nested.auth_token');
});

test('optional extensions parsed only when valid', () => {
  const d = doc();
  d.picks[0].research_score = 82.5;
  d.picks[0].judgment_score = 74;
  d.picks[0].agent_claims = {mer: '수요 회복 가시화.', nonggu: '공급 규율 유지.', meng: '밸류 상한 확인 필요.'};
  d.picks[0].performance = {return_pct: 5.32, mdd_pct: -2.1, benchmark: 'KOSPI', excess_benchmark_pct: 1.05, as_of: '2026-10-19'};
  const r = validateThreeAgentFeed(d, now);
  assert.equal(r.status, 'ready');
  const ext = r.document.picks[0].ext;
  assert.equal(ext.research_score, 82.5);
  assert.equal(ext.judgment_score, 74);
  assert.equal(ext.agent_claims.meng, '밸류 상한 확인 필요.');
  assert.equal(ext.performance.return_pct, 5.32);
  // malformed extensions are dropped, pick stays valid
  const d2 = doc();
  d2.picks[0].research_score = 150;
  d2.picks[0].agent_claims = {mer: 123};
  d2.picks[0].performance = {return_pct: NaN};
  const r2 = validateThreeAgentFeed(d2, now);
  assert.equal(r2.status, 'ready');
  assert.deepEqual(r2.document.picks[0].ext, {});
});

test('dedup flags overlap but never mutates the ledger rows', () => {
  const rows = [{symbol: '005930.KS', returnPct: 3.1}, {symbol: '000660.KS', returnPct: -1.2}];
  const before = JSON.stringify(rows);
  const audited = [pick(), {...pick(), pick_id: 'US-20261019-NVDA', ticker: 'NVDA'}];
  const {unique, duplicates} = dedupAuditedPicks(rows, audited);
  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].pick_id, 'KR-20261019-005930');
  assert.equal(unique.length, 1);
  assert.equal(unique[0].ticker, 'NVDA');
  assert.equal(JSON.stringify(rows), before); // ledger untouched
});

test('audited markup carries audit badge, falsifiers and separate aggregation note', () => {
  const d = doc();
  d.picks[0].research_score = 82.5;
  d.picks[0].agent_claims = {mer: '수요 회복.', nonggu: '공급 규율.', meng: '상한 확인.'};
  d.picks[0].performance = {return_pct: 5.32, mdd_pct: -2.1, benchmark: 'KOSPI', excess_benchmark_pct: 1.05};
  const r = validateThreeAgentFeed(d, now);
  const dedup = dedupAuditedPicks([{symbol: '005930.KS'}], r.document.picks);
  const html = auditedSectionMarkup(r.document, dedup);
  assert.match(html, /3인 감사/);
  assert.match(html, /조사 우선도.*최종 투자 판단/);
  assert.match(html, /메르/); assert.match(html, /농구천재/); assert.match(html, /멍이/);
  assert.match(html, /반증 조건/);
  assert.match(html, /\+5\.32%/);
  assert.match(html, /기존 PICK과 중복/);
  assert.match(html, /기존 PICK 성과 계산에 합산되지 않아요/);
  // non-duplicate card hides the dupe badge
  const r2 = validateThreeAgentFeed(doc(), now);
  const html2 = auditedPickMarkup(r2.document.picks[0], {duplicate: false});
  assert.match(html2, /three-agent-dupe" hidden/);
});
