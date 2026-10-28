import test from 'node:test';
import assert from 'node:assert/strict';
import { clearLiveQuotes, getLiveQuote, rememberLiveQuotes, mergeRowsWithLive } from '../src/liveQuoteStore.js';
import { watchQuoteCacheKey, saveWatchQuoteCache, seedWatchQuoteCache } from '../src/watchQuoteCache.js';

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

test('newer explicit missing quote values do not inherit old observation fields',()=>{
  clearLiveQuotes();
  rememberLiveQuotes([{
    ticker:'005930.KS',name:'삼성전자',marketCap:500,price:70000,change:3,
    previousClose:67961,sessionDate:'2026-10-27',marketStatus:'CLOSE',
    asOf:'2026-10-27T06:30:00Z',source:'old',currency:'KRW',
  }],{priority:50});
  const next={
    ticker:'005930.KS',name:null,marketCap:null,price:71000,change:null,
    previousClose:null,sessionDate:'2026-10-28',marketStatus:null,
    asOf:'2026-10-28T01:00:00Z',source:'new',
  };
  rememberLiveQuotes([next],{priority:50});
  const quote=getLiveQuote(next.ticker);
  assert.equal(quote.price,71000);
  assert.equal(quote.change,null);
  assert.equal(quote.previousClose,null);
  assert.equal(quote.marketStatus,null);
  assert.equal(quote.asOf,next.asOf);
  assert.equal(quote.name,'삼성전자');
  assert.equal(quote.marketCap,500);
  // An omitted field remains a partial patch; only explicit null clears it.
  assert.equal(quote.currency,'KRW');
});

test('live overlays clear explicitly missing observations without losing heatmap structure',()=>{
  clearLiveQuotes();
  rememberLiveQuotes([{
    ticker:'005930.KS',name:null,marketCap:null,price:71000,change:null,
    previousClose:null,marketStatus:null,asOf:'2026-10-28T01:00:00Z',source:'new',
  }],{priority:50});
  const [row]=mergeRowsWithLive([{
    ticker:'005930.KS',name:'삼성전자',marketCap:500,price:70000,change:3,
    previousClose:67961,marketStatus:'CLOSE',asOf:'2026-10-27T06:30:00Z',
  }]);
  assert.equal(row.price,71000);
  assert.equal(row.change,null);
  assert.equal(row.previousClose,null);
  assert.equal(row.marketStatus,null);
  assert.equal(row.asOf,'2026-10-28T01:00:00Z');
  assert.equal(row.name,'삼성전자');
  assert.equal(row.marketCap,500);
});

test('zero quote values remain observations and rejected older nulls cannot clear them',()=>{
  clearLiveQuotes();
  const quote={ticker:'005930.KS',price:71000,change:0,dayChange:0,delayTime:0,asOf:'2026-10-28T01:00:00Z',source:'new'};
  rememberLiveQuotes([quote],{priority:50});
  rememberLiveQuotes([{...quote,change:null,dayChange:null,delayTime:null}],{priority:10});
  rememberLiveQuotes([{...quote,change:null,dayChange:null,delayTime:null,asOf:'2026-10-27T06:30:00Z'}],{priority:50});
  const [row]=mergeRowsWithLive([{ticker:quote.ticker,change:3,dayChange:100,delayTime:15}]);
  assert.equal(getLiveQuote(quote.ticker).change,0);
  assert.equal(row.change,0);
  assert.equal(row.dayChange,0);
  assert.equal(row.delayTime,0);
});

test('an undated or source-free snapshot cannot replace a timed direct quote',()=>{
  clearLiveQuotes();
  rememberLiveQuotes([{ticker:'000660.KS',price:1761000,change:-5.42,asOf:'2026-09-28T11:20:23Z',source:'Naver Finance'}]);
  rememberLiveQuotes([{ticker:'000660.KS',price:1750000,change:-6,source:'snapshot without time'}]);
  rememberLiveQuotes([{ticker:'000660.KS',price:1755000,change:-5.7,asOf:'2026-09-28T11:20:23Z',source:null}]);
  const quote=getLiveQuote('000660.KS');
  assert.equal(quote.price,1761000);
  assert.equal(quote.change,-5.42);
});

test('equal-time full heatmap cannot roll back Home live or direct quote',()=>{
  clearLiveQuotes();
  const row=(price,change)=>({ticker:'000660.KS',price,change,asOf:'2026-09-28T11:20:23Z'});
  rememberLiveQuotes([row(1750000,-6)],{priority:20});
  rememberLiveQuotes([row(1761000,-5.42)],{priority:30});
  rememberLiveQuotes([row(1700000,-7)],{priority:10});
  assert.equal(getLiveQuote('000660.KS').price,1761000);
  rememberLiveQuotes([row(1762000,-5.37)],{priority:50});
  rememberLiveQuotes([row(1761000,-5.42)],{priority:30});
  assert.equal(getLiveQuote('000660.KS').price,1762000);
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

test('live price parity keeps the full heatmap structural data',()=>{
  clearLiveQuotes();
  rememberLiveQuotes([{ticker:'000660.KS',name:'예전 이름',marketCap:100,price:1761000,change:-5.42,asOf:'2026-09-28T11:20:23Z'}]);
  const [row]=mergeRowsWithLive([{ticker:'000660.KS',name:'SK하이닉스',marketCap:200,price:1750000,change:-6}]);
  assert.equal(row.name,'SK하이닉스');
  assert.equal(row.marketCap,200);
  assert.equal(row.price,1761000);
  assert.equal(row.change,-5.42);
});

test('detail uses Home quote immediately and fresh-polls one symbol',async()=>{
  const fs=await import('node:fs/promises');
  const [main,api]=await Promise.all([
    fs.readFile(new URL('../src/main.js',import.meta.url),'utf8'),
    fs.readFile(new URL('../src/api.js',import.meta.url),'utf8'),
  ]);
  assert.ok(api.includes("fresh=true"));
  assert.ok(main.includes("resolveLiveQuote(symbol,homeCachedQuote(symbol))"));
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


test('watch quote cache restores the same symbols across list ordering without rolling back newer quotes',()=>{
  const previous=globalThis.localStorage;
  const values=new Map();
  globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  try{
    clearLiveQuotes();
    const symbols=['000660.KS','NVDA'];
    rememberLiveQuotes([{ticker:'000660.KS',price:1761000,change:-5.42,asOf:'2026-09-28T11:20:23Z'}]);
    saveWatchQuoteCache(symbols);
    assert.equal(watchQuoteCacheKey(symbols),watchQuoteCacheKey([...symbols].reverse()));
    clearLiveQuotes();
    assert.equal(seedWatchQuoteCache([...symbols].reverse())[0].price,1761000);
    rememberLiveQuotes([{ticker:'000660.KS',price:1762000,change:-5.37,asOf:'2026-09-28T11:21:23Z'}]);
    seedWatchQuoteCache(symbols);
    assert.equal(getLiveQuote('000660.KS').price,1762000);
  }finally{
    clearLiveQuotes();
    if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;
  }
});


test('regular-close provenance survives live overlay across surfaces',()=>{
  clearLiveQuotes();
  rememberLiveQuotes([{
    ticker:'005930.KS',
    price:276000,
    change:2.22,
    asOf:'2026-10-02T15:30:00+09:00',
    source:'Naver Finance KRX/Koscom',
    marketStatus:'CLOSE',
    sessionType:'regular',
    priceBasis:'regular_close',
  }],{priority:50});
  const [row]=mergeRowsWithLive([{ticker:'005930.KS',price:275500,change:2.0}]);
  assert.equal(row.price,276000);
  assert.equal(row.marketStatus,'CLOSE');
  assert.equal(row.sessionType,'regular');
  assert.equal(row.priceBasis,'regular_close');
});

// Actual Detail CLOSE/polling behavior is covered with the browser clock in
// e2e/detail-quote-recovery.spec.mjs, including failed and stale CLOSE replies.
