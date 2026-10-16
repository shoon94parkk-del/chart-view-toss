import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNewsFeed, summaryPresentation } from '../src/newsReaderModel.js';

const article = (url, extra = {}) => ({ url, title: url, source: '연합', symbol: 'A', name: '알파', relationType: 'direct', relationBasis: 'title entity match', score: 10, publishedTs: 0, ...extra });
const shared = 'https://publisher.test/shared';

test('identical HTTPS articles retain every stock and its distinct relation evidence from groups', () => {
 const item = article(shared);
 const payload = { items: [item], groups: [{ symbol: 'A', name: '알파', items: [item] }, { symbol: 'B', name: '베타', items: [article(shared, {symbol:'B',name:'베타',relationType:'related',relationBasis:'industry keyword match'})] }] };
 const feed = buildNewsFeed(payload);
 assert.equal(feed.total, 1);
 assert.deepEqual(feed.rows[0].stocks.map(x => [x.symbol,x.name]), [['A','알파'],['B','베타']]);
 assert.deepEqual(feed.rows[0].relations.map(x => [x.symbol,x.relationType,x.relationBasis]), [['A','direct','title entity match'],['B','related','industry keyword match']]);
 assert.equal(buildNewsFeed(payload, {symbol:'B',relation:'direct'}).status, 'filtered-empty');
 assert.equal(buildNewsFeed(payload, {symbol:'B',relation:'related'}).total, 1);
});

test('same titles and URL variants are not invented topic clusters; unsafe URLs never merge', () => {
 const rows = [shared, `${shared}?ref=1`, 'http://publisher.test/shared', 'http://publisher.test/shared'].map(url => article(url,{title:'동일 제목'}));
 assert.equal(buildNewsFeed({items:rows}).total, 4);
});

test('filters expose local scope counts and clear back to complete returned article range', () => {
 const payload = {items:[article(shared), article('https://publisher.test/2',{source:'경제',relationType:'related'}),article('https://publisher.test/3',{source:'경제'})]};
 const filtered = buildNewsFeed(payload,{source:'경제',relation:'related',limit:1});
 assert.equal(filtered.total,3); assert.equal(filtered.filteredCount,1); assert.equal(filtered.visibleCount,1);
 assert.deepEqual(filtered.range,{start:1,end:1,total:1});
 assert.deepEqual(filtered.sources.map(x=>[x.value,x.count]),[['경제',1]]);
 assert.deepEqual(filtered.relations.map(x=>[x.value,x.count]),[['direct',1],['related',1]]);
 assert.equal(buildNewsFeed(payload,{source:'없음'}).status,'filtered-empty');
 assert.equal(buildNewsFeed(payload,{source:'all',relation:'all'}).filteredCount,3);
});

test('major and latest use provided scores/timestamps, keep zero and do not fabricate missing time', () => {
 const payload={items:[article('https://p.test/a',{score:2,publishedTs:0,publishedAt:'2099-01-01'}),article('https://p.test/b',{score:9,publishedTs:10}),article('https://p.test/c',{score:9,publishedTs:20})]};
 assert.deepEqual(buildNewsFeed(payload).rows.map(x=>x.url),['https://p.test/b','https://p.test/c','https://p.test/a']);
 assert.deepEqual(buildNewsFeed(payload,{sort:'latest'}).rows.map(x=>x.url),['https://p.test/c','https://p.test/b','https://p.test/a']);
 assert.equal(buildNewsFeed({items:[]}).status,'empty');
 assert.equal(buildNewsFeed({items:[],errors:[{code:'timeout'}]}).status,'error');
 assert.equal(buildNewsFeed({items:payload.items,errors:[{}]}).status,'partial');
});

test('summary basis and quality never disguise title/snippet fallbacks as full article evidence', () => {
 assert.match(summaryPresentation({summary:'요약',basis:'headline_only'}).notice,/제목만/);
 assert.match(summaryPresentation({summary:'요약',basis:'provider_snippet'}).notice,/제공처 요약문/);
 assert.match(summaryPresentation({summary:'요약',basis:'article_body',translationError:'failed'}).notice,/번역/);
 assert.match(summaryPresentation({summary:'unsafe',basis:'article_body',qualityStatus:'blocked_numbers'}).text,/원문/);
 assert.equal(summaryPresentation({summary:'unsafe',qualityStatus:'blocked_numbers'}).text.includes('unsafe'),false);
});

test('verified HTTP publishers keep working original links without broadening article merge identity',()=>{
 const url='http://www.yonhapnewstv.co.kr/news/test?q=1';
 const feed=buildNewsFeed({items:[article(url),article(url),article('https://www.yonhapnewstv.co.kr/news/test?q=1')]});
 assert.equal(feed.total,3);
 assert.equal(feed.rows[0].safeUrl,'https://www.yonhapnewstv.co.kr/news/test?q=1');
 assert.equal(buildNewsFeed({items:[article('http://unknown.test/article')]}).rows[0].safeUrl,'');
});

test('missing summary content has an explicit empty retry state instead of a body-success claim',()=>{
 const empty=summaryPresentation({summary:'  ',basis:'article_body',qualityStatus:'ok'});
 assert.equal(empty.retry,true);assert.equal(empty.label,'요약 미제공');assert.match(empty.notice,/요약 내용/);
});
