// Backend → Toss v2 contract test (P5).
//
// The fixture tests/fixtures/feed-v2-extended.json is produced by the
// chart-view backend's own allowlist projection
// (intelligence_feed_v2_service.v2_projection) — not hand-written.
// This test proves the Toss v2 client renders exactly what the backend
// publishes: audited picks with validated extension fields
// (research_score / judgment_score / agent_claims / performance).
//
// Anti-fabrication rules under test:
// - scores/claims/performance render ONLY when present in the document.
// - the client never invents a score, return, or model judgment.
// - audited picks are never folded into the existing PICK ledger math.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  validateThreeAgentFeed,
  auditedPickMarkup,
  auditedSectionMarkup,
  dedupAuditedPicks,
} from '../src/threeAgentFeed.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(
  join(here, 'fixtures', 'feed-v2-extended.json'), 'utf-8'));
// Fixture timestamps are pinned at generation time; validate against a
// fixed "now" so the test stays deterministic (ready, not stale).
const nowMs = Date.parse('2026-10-19T14:00:00Z');

test('backend fixture validates as ready', () => {
  const r = validateThreeAgentFeed(fixture, nowMs);
  assert.equal(r.status, 'ready');
  assert.equal(r.document.picks.length, 1);
  const pick = r.document.picks[0];
  assert.equal(pick.source, 'three_agent_audited');
  assert.equal(pick.audit_status, 'PASS');
});

test('contract field names match between backend and Toss client', () => {
  // Every key the backend projects must be understood by the client
  // validator (no silent drops, no unknown required fields).
  const r = validateThreeAgentFeed(fixture, nowMs);
  const pick = r.document.picks[0];
  for (const key of ['research_score', 'judgment_score',
                     'agent_claims', 'performance']) {
    assert.ok(key in pick, `${key} survives backend → Toss`);
  }
  assert.ok(pick.ext, 'extension fields are extracted to pick.ext');
  assert.equal(typeof pick.ext.research_score, 'number');
  assert.equal(typeof pick.ext.judgment_score, 'number');
  assert.ok(pick.ext.agent_claims.mer);
  assert.equal(typeof pick.ext.performance.return_pct, 'number');
});

test('extended fields render in Toss markup', () => {
  const r = validateThreeAgentFeed(fixture, nowMs);
  const html = auditedPickMarkup(r.document.picks[0]);
  assert.ok(html.includes('조사 우선도'), 'research score block rendered');
  assert.ok(html.includes('최종 투자 판단'), 'judgment score block rendered');
  assert.ok(html.includes('메르'), 'agent claim rendered');
  assert.ok(html.includes('농구천재'), 'agent claim rendered');
  assert.ok(html.includes('멍이'), 'agent claim rendered');
  assert.ok(html.includes('추천 이후'), 'performance block rendered');
  assert.ok(html.includes('+12.34%'), 'precomputed return rendered');
  assert.ok(html.includes('서버에서 종가 기준으로 미리 계산한 값이에요'),
    'server-computed provenance note rendered');
});

test('no fabrication: missing extension fields render nothing', () => {
  // A backend document without extension fields must NOT gain scores,
  // returns, or claims on the client — the client never invents them.
  const bare = JSON.parse(JSON.stringify(fixture));
  const pick = bare.picks[0];
  delete pick.research_score;
  delete pick.judgment_score;
  delete pick.agent_claims;
  delete pick.performance;
  const r = validateThreeAgentFeed(bare, nowMs);
  assert.equal(r.status, 'ready');
  const html = auditedPickMarkup(r.document.picks[0]);
  assert.ok(!html.includes('조사 우선도'), 'no invented research score');
  assert.ok(!html.includes('최종 투자 판단'), 'no invented judgment score');
  assert.ok(!html.includes('three-agent-claims'), 'no invented claims');
  assert.ok(!html.includes('추천 이후'), 'no invented performance');
});

test('section shows analysis date and fetch time, never merges ledgers', () => {
  const r = validateThreeAgentFeed(fixture, nowMs);
  const existing = [{ symbol: '005930' }]; // same ticker as audited pick
  const dedup = dedupAuditedPicks(existing, r.document.picks);
  assert.equal(dedup.duplicates.length, 1);
  assert.equal(dedup.unique.length, 0);
  const html = auditedSectionMarkup(r.document, dedup,
    { fetchedAt: '2026-10-19T14:00:00Z' });
  assert.ok(html.includes('분석 기준'), 'as_of displayed');
  assert.ok(html.includes('조회 2026-10-19T14:00:00Z'), 'fetched_at displayed');
  assert.ok(html.includes('기존 PICK 1건 중복'), 'duplicate badged');
  assert.ok(html.includes('기존 PICK 성과 계산에 합산되지 않아요'),
    'no-merge guarantee displayed');
  // The existing ledger rows are untouched by dedup.
  assert.equal(existing.length, 1);
  assert.equal(existing[0].symbol, '005930');
});

test('malformed extension values are dropped, never rendered', () => {
  // Defense in depth: the server already refuses bad documents (503);
  // the client additionally drops malformed extension values instead of
  // rendering them — never fabricated, never displayed.
  const bad = JSON.parse(JSON.stringify(fixture));
  bad.picks[0].research_score = 101;
  const r = validateThreeAgentFeed(bad, nowMs);
  assert.equal(r.status, 'ready');
  assert.ok(!('research_score' in (r.document.picks[0].ext || {})),
    'out-of-range score dropped from ext');
  const html = auditedPickMarkup(r.document.picks[0]);
  assert.ok(!html.includes('101'), 'bad score value not rendered');
  // valid sibling fields still render (drop is per-field, not per-pick)
  assert.ok(html.includes('최종 투자 판단'), 'valid judgment score kept');
  const bad2 = JSON.parse(JSON.stringify(fixture));
  bad2.picks[0].performance = { return_pct: 'twelve' };
  const r2 = validateThreeAgentFeed(bad2, nowMs);
  assert.equal(r2.status, 'ready');
  assert.ok(!('performance' in (r2.document.picks[0].ext || {})));
});
