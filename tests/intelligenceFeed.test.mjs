import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMarketIntelligence } from '../src/intelligenceFeed.js';

const now=Date.parse('2026-10-19T18:00:00+09:00');
const sample=()=>({
  schema_version:1,kind:'market_research',publication_status:'RESEARCH_ONLY',
  as_of:'2026-10-19T17:55:00+09:00',coverage_status:'PARTIAL_COVERAGE',
  quality_status:'COMPLETE',
  candidates:[{market:'KR',ticker:'000660',score:73.1,stage:'DISCOVERED',buy_eligible:false}],
  market_events:[{id:'MARKET:vix:1:2026-10-19',severity:'WARNING',action:'REVIEW_ONLY',requires_review:true}],
  picks:[],pick_history:[]
});
test('research-only feed accepted but not promoted to picks',()=>{
  assert.equal(validateMarketIntelligence(sample(),now).status,'ready');
});
test('unverified pick injection rejected',()=>{
  assert.equal(validateMarketIntelligence({...sample(),picks:[{ticker:'000660',verdict:'BUY'}]},now).status,'invalid');
});
test('stale and future data are never fresh',()=>{
  assert.equal(validateMarketIntelligence({...sample(),as_of:'2026-10-01T12:00:00+09:00'},now).status,'stale');
  assert.equal(validateMarketIntelligence({...sample(),as_of:'2026-10-20T12:00:00+09:00'},now).status,'invalid');
});
test('bad ticker, buy eligibility, false alert action rejected',()=>{
  const d=sample();d.candidates[0].buy_eligible=true;
  assert.equal(validateMarketIntelligence(d,now).status,'invalid');
  const e=sample();e.market_events[0].action='BUY';
  assert.equal(validateMarketIntelligence(e,now).status,'invalid');
});
test('only timestamp with time zone is accepted',()=>{
  assert.equal(validateMarketIntelligence({...sample(),as_of:'2026-10-19T17:55:00'},now).status,'invalid');
});
