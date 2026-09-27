import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HOME_LIVE_POLL_MS,
  DEFAULT_HEARTBEAT_MS,
  activitySurface,
  mergeLiveRows,
  pollDelayForVisitor,
} from '../src/liveHomeSync.js';

test('Home live polling uses lightweight intervals and route surfaces',()=>{
  assert.equal(HOME_LIVE_POLL_MS,10_000);
  assert.equal(DEFAULT_HEARTBEAT_MS,20_000);
  assert.equal(activitySurface('home'),'home');
  assert.equal(activitySurface('watch'),'watchlist');
  assert.equal(activitySurface('chart'),'chart');
  assert.equal(activitySurface('discover'),'screener');
  assert.equal(activitySurface('picks'),'pick');
  assert.equal(activitySurface('heatmap'),'market');
  assert.equal(activitySurface('detail'),'other');
});

test('visitor jitter stays near ten seconds and is deterministic',()=>{
  const a=pollDelayForVisitor('web:visitor-a');
  const b=pollDelayForVisitor('web:visitor-a');
  const c=pollDelayForVisitor('web:visitor-b');
  assert.equal(a,b);
  assert.ok(a>=9_000&&a<=12_000);
  assert.ok(c>=9_000&&c<=12_000);
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
