import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clearLiveQuotes,rememberLiveQuotes,resolveLiveQuote} from '../src/liveQuoteStore.js';

test('newer Home index quote replaces previous detail even if the next provider request fails',()=>{
 clearLiveQuotes();
 rememberLiveQuotes([{ticker:'^KS11',price:3000,change:-1,asOf:'2026-10-01T06:00:00Z'}],{priority:50});
 const quote=resolveLiveQuote('^KS11',{ticker:'^KS11',price:3100,change:2,asOf:'2026-10-01T07:00:00Z'});
 assert.equal(quote.price,3100);assert.equal(quote.change,2);
});

test('older Home cache cannot roll back a newer detail index quote',()=>{
 clearLiveQuotes();
 rememberLiveQuotes([{ticker:'^KS11',price:3200,change:3,asOf:'2026-10-01T08:00:00Z'}],{priority:50});
 const quote=resolveLiveQuote('^KS11',{ticker:'^KS11',price:3100,change:2,asOf:'2026-10-01T07:00:00Z'});
 assert.equal(quote.price,3200);assert.equal(quote.change,3);
});
