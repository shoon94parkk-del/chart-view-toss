import test from 'node:test';
import assert from 'node:assert/strict';
import { clearLiveQuotes, getLiveQuote, rememberLiveQuotes, mergeRowsWithLive } from '../src/liveQuoteStore.js';

test('canonical live quote store keeps the newest provider timestamp',()=>{
  clearLiveQuotes();
  rememberLiveQuotes([{ticker:'005930.KS',price:80000,change:1.2,asOf:'2026-09-28T04:37:00Z',source:'old'}]);
  rememberLiveQuotes([{ticker:'005930.KS',price:81000,change:2.3,asOf:'2026-09-28T06:30:00Z',source:'new'}]);
  rememberLiveQuotes([{ticker:'005930.KS',price:79000,change:-1.1,asOf:'2026-09-28T04:40:00Z',source:'late-old'}]);
  const row=getLiveQuote('005930.ks');
  assert.equal(row.price,81000);
  assert.equal(row.change,2.3);
  assert.equal(row.source,'new');
});

test('full heatmap rows are overlaid with the same session live quote',()=>{
  clearLiveQuotes();
  rememberLiveQuotes([{ticker:'005930.KS',price:81200,change:2.55,asOf:'2026-09-28T06:31:00Z'}]);
  const rows=mergeRowsWithLive([
    {ticker:'005930.KS',price:79000,change:-0.5,marketCap:500},
    {ticker:'NVDA',price:180,change:1.0,marketCap:400},
  ]);
  assert.equal(rows[0].price,81200);
  assert.equal(rows[0].change,2.55);
  assert.equal(rows[0].marketCap,500);
  assert.equal(rows[1].price,180);
});

test('detail uses Home quote immediately and fresh-polls one symbol',async()=>{
  const fs=await import('node:fs/promises');
  const [main,api]=await Promise.all([
    fs.readFile(new URL('../src/main.js',import.meta.url),'utf8'),
    fs.readFile(new URL('../src/api.js',import.meta.url),'utf8'),
  ]);
  assert.ok(api.includes("fresh=true"));
  assert.ok(main.includes("getLiveQuote(symbol)||homeCachedQuote(symbol)"));
  assert.ok(main.includes("quoteSnapshotsLive([symbol])"));
  assert.ok(main.includes("detailLiveTimer=setTimeout(pullDetailLive,5_000)"));
  assert.ok(main.includes("persistLiveQuoteToHomeSnapshot(quote)"));
});

test('older Home live events cannot overwrite a newer detail quote',async()=>{
  const fs=await import('node:fs/promises');
  const [main,extras]=await Promise.all([
    fs.readFile(new URL('../src/main.js',import.meta.url),'utf8'),
    fs.readFile(new URL('../src/homeExtras.js',import.meta.url),'utf8'),
  ]);
  assert.ok(main.includes("const canonical=rows.map(row=>getLiveQuote(row?.ticker)||row)"));
  assert.ok(extras.includes("const canonicalRows = liveRows.map((row) => getLiveQuote(row?.ticker) || row)"));
  assert.ok(extras.includes("mergeLiveRows(baseRows, canonicalRows)"));
});


test('null fields from a detail quote cannot remove a full heatmap stock',()=>{
  clearLiveQuotes();
  rememberLiveQuotes([{
    ticker:'009150.KS',
    name:null,
    marketCap:null,
    price:1498000,
    change:-0.6,
    asOf:'2026-09-28T09:03:00Z',
  }]);
  const [row]=mergeRowsWithLive([{
    ticker:'009150.KS',
    name:'삼성전기',
    marketCap:12500000000000,
    price:1507000,
    change:0.4,
  }]);
  assert.equal(row.name,'삼성전기');
  assert.equal(row.marketCap,12500000000000);
  assert.equal(row.price,1498000);
  assert.equal(row.change,-0.6);
});

test('heatmap navigation forwards the visible company name to detail',async()=>{
  const fs=await import('node:fs/promises');
  const [main,extras]=await Promise.all([
    fs.readFile(new URL('../src/main.js',import.meta.url),'utf8'),
    fs.readFile(new URL('../src/homeExtras.js',import.meta.url),'utf8'),
  ]);
  assert.ok(main.includes("b.dataset.stockName||''"));
  assert.ok(main.includes("state.detailName=route.tab==='detail'?(history.state?.detailName||''):''"));
  assert.ok(extras.includes("cell.dataset.stockName || ''"));
});
