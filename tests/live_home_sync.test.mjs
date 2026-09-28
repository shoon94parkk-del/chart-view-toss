import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HOME_LIVE_POLL_MS,
  HOME_MARKET_POLL_MS,
  INITIAL_HOME_LIVE_DELAY_MS,
  INITIAL_HOME_MARKET_DELAY_MS,
  DEFAULT_HEARTBEAT_MS,
  activitySurface,
  mergeLiveRows,
  pollDelayForVisitor,
} from '../src/liveHomeSync.js';

test('Home live polling uses lightweight intervals and route surfaces',()=>{
  assert.equal(HOME_LIVE_POLL_MS,5_000);
  assert.equal(HOME_MARKET_POLL_MS,12_000);
  assert.equal(INITIAL_HOME_LIVE_DELAY_MS,3_500);
  assert.equal(INITIAL_HOME_MARKET_DELAY_MS,6_000);
  assert.equal(DEFAULT_HEARTBEAT_MS,20_000);
  assert.equal(activitySurface('home'),'home');
  assert.equal(activitySurface('watch'),'watchlist');
  assert.equal(activitySurface('chart'),'chart');
  assert.equal(activitySurface('discover'),'screener');
  assert.equal(activitySurface('picks'),'pick');
  assert.equal(activitySurface('heatmap'),'market');
  assert.equal(activitySurface('detail'),'other');
});

test('visitor jitter stays near five seconds and is deterministic',()=>{
  const a=pollDelayForVisitor('web:visitor-a');
  const b=pollDelayForVisitor('web:visitor-a');
  const c=pollDelayForVisitor('web:visitor-b');
  assert.equal(a,b);
  assert.ok(a>=4_500&&a<=6_000);
  assert.ok(c>=4_500&&c<=6_000);
});

test('live quotes update price/change while preserving heatmap layout fields',()=>{
  const base=[
    {ticker:'005930.KS',name:'삼성전자',marketCap:500,price:80000,change:1.1},
    {ticker:'NVDA',name:'엔비디아',marketCap:400,price:180,change:-0.2},
  ];
  const live=[
    {ticker:'005930.KS',price:83000,change:4.44,asOf:'2026-09-27T01:00:00Z',source:'shared-memory'},
  ];
  const merged=mergeLiveRows(base,live);
  assert.equal(merged[0].marketCap,500);
  assert.equal(merged[0].price,83000);
  assert.equal(merged[0].change,4.44);
  assert.equal(merged[0].source,'shared-memory');
  assert.equal(merged[1].price,180);
  assert.equal(merged[1].change,-0.2);
});


test('first Home paint is protected from immediate live/market fetch contention',async()=>{
  const source=await import('node:fs/promises').then(fs=>fs.readFile(new URL('../src/liveHomeSync.js',import.meta.url),'utf8'));
  assert.match(source,/reschedule\(\{initial:true\}\)/);
  assert.match(source,/initial\?INITIAL_HOME_LIVE_DELAY_MS/);
  assert.match(source,/initial\?INITIAL_HOME_MARKET_DELAY_MS/);
  assert.doesNotMatch(source,/changed\|\|next==='home'/);
});
