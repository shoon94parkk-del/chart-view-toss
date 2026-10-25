import test from 'node:test';
import assert from 'node:assert/strict';
import {newsResponseState} from '../src/newsResponse.js';
test('provider error bodies are distinct from confirmed empty news and preserve partial results',()=>{
 assert.equal(newsResponseState({items:[],groups:[{status:'error'}],errors:[{code:'not_configured'}]}),'error');
 assert.equal(newsResponseState({items:[{url:'https://example.com/a'}],groups:[{status:'error'}]}),'partial');
 assert.equal(newsResponseState({items:[],groups:[{status:'no_news'}],errors:[]}),'ready');
 assert.equal(newsResponseState({groups:[{status:'success',items:[{}]},{status:'error'}]}),'partial');
 for(const invalid of [null,{},false])assert.equal(newsResponseState(invalid),'error');
});

test('detail preserves grouped-only verified rows without duplicate or other-issuer evidence',async()=>{
 const {newsResponseRows}=await import('../src/newsResponse.js');
 const row={url:'https://example.com/a',title:'공시',symbol:'005930.KS'};
 const payload={items:[row],groups:[{symbol:'005930.KS',name:'삼성전자',items:[null,false,row,{url:'https://example.com/b',title:'후속 공시'}]},{symbol:'AAPL',items:[{url:'https://example.com/c',title:'다른 회사'}]}]};
 assert.deepEqual(newsResponseRows(payload,'005930.KS').map(row=>row.url),['https://example.com/a','https://example.com/b']);
});

test('unfinished news is pending even when an earlier group has articles or a provider error',()=>{
 for(const items of [[],[{url:'https://news.test/ready'}]])assert.equal(newsResponseState({items,complete:false,pendingSymbols:['B'],groups:[{symbol:'B',status:'pending'}],errors:[{symbol:'C',code:'provider'}]}),'pending');
});
