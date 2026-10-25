import test from 'node:test';
import assert from 'node:assert/strict';
import { mountNewsReader, createNewsSummaryController } from '../src/newsReaderView.js';
const tick = () => new Promise(resolve=>setImmediate(resolve));
const deferred = () => { let resolve,reject; const promise=new Promise((a,b)=>{resolve=a;reject=b;}); return {promise,resolve,reject}; };
const row = (id='one') => ({url:`https://news.test/${id}`,title:`기사 ${id}`,source:'제공 매체',publishedAt:'2026-10-16T01:00:00Z',publishedTs:1792112400,symbol:'A',name:'알파',relationType:'direct',relationBasis:'title entity match'});
function harness() {
 const listeners=new Map(); let writes=0,html='';
 const host={get innerHTML(){return html;},set innerHTML(value){html=value;writes++;},addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:(type,fn)=>{if(listeners.get(type)===fn)listeners.delete(type);},contains:element=>element.inside===true,querySelector:()=>null};
 return {host,get writes(){return writes;},click(dataset) { const button={inside:true,dataset,disabled:false}; return listeners.get('click')?.({target:{closest:()=>button},preventDefault(){}}); }, listeners};
}

test('summary scheduler caps requests at three and deduplicates pending URL across controllers',async()=>{
 const pending=[],calls=[];
 const loader=(item,options)=>{const d=deferred();pending.push(d);calls.push([item.url,options]);return d.promise;};
 const first=createNewsSummaryController({loadSummary:loader});
 const second=createNewsSummaryController({loadSummary:loader});
 const jobs=Array.from({length:5},(_,i)=>first.request(row(`queue-${i}`)));
 const duplicate=second.request(row('queue-0'),{force:true});
 await tick(); assert.equal(calls.length,3);
 pending[0].resolve({summary:'완료',basis:'article_body'}); await tick(); assert.equal(calls.length,4);
 pending[1].resolve({summary:'완료'}); await tick(); assert.equal(calls.length,5);
 for(const d of pending)d.resolve({summary:'완료'});
 await Promise.all([...jobs,duplicate]);
 assert.equal(second.get(row('queue-0').url).status,'ready');
 first.dispose();second.dispose();
});

test('disposed or obsolete controllers neither notify nor start queued summary jobs',async()=>{
 const pending=[],changes=[];let current=true;
 const c=createNewsSummaryController({loadSummary:()=>{const d=deferred();pending.push(d);return d.promise;},isCurrent:()=>current,onChange:()=>changes.push(true)});
 const jobs=Array.from({length:4},(_,i)=>c.request(row(`dispose-${i}`)));
 await tick();assert.equal(pending.length,3);
 const count=changes.length;current=false;c.dispose();
 pending.forEach(d=>d.resolve({summary:'늦은 응답'}));await Promise.all(jobs);await tick();
 assert.equal(changes.length,count);assert.equal(pending.length,3);
});

test('controller supports explicit retry and ready cache without automatic duplicate work',async()=>{
 let attempts=0;const forces=[];
 const c=createNewsSummaryController({loadSummary:async(item,{force})=>{forces.push(force);if(++attempts===1)throw Error('실패');return {summary:'짧은 요약',basis:'provider_snippet'};}});
 await c.request(row('retry'));assert.equal(c.get(row('retry').url).status,'error');
 await c.request(row('retry'),{force:true});assert.equal(c.get(row('retry').url).status,'ready');
 await c.request(row('retry'));assert.equal(attempts,2);assert.deepEqual(forces,[false,true]);c.dispose();
});

test('reader keeps source and relation controls across remount and separates original/stock/summary actions',async()=>{
 const h=harness(),prefs={},opened=[],stocks=[];let loads=0;
 let cleanup=mountNewsReader(h.host,{items:[row(),row('two')]},{preferences:prefs,loadSummary:async()=>{loads++;return {summary:'요약',basis:'headline_only'};},onExternal:url=>opened.push(url),onStock:(...args)=>stocks.push(args)});
 assert.equal(loads,0);assert.match(h.host.innerHTML,/<article/);assert.match(h.host.innerHTML,/요약 펼침을 누르면/);
 h.click({newsSource:'제공 매체'});h.click({newsRelation:'related'});
 assert.match(h.host.innerHTML,/조건에 맞는 기사가 없어요/);assert.equal(prefs.source,'제공 매체');assert.equal(prefs.relation,'related');
 cleanup();cleanup=mountNewsReader(h.host,{items:[row()]},{preferences:prefs,loadSummary:async()=>{loads++;return {summary:'요약',basis:'headline_only'};},onExternal:url=>opened.push(url),onStock:(...args)=>stocks.push(args)});
 assert.match(h.host.innerHTML,/조건에 맞는 기사가 없어요/);
 h.click({newsClear:''});assert.equal(prefs.source,'all');assert.equal(prefs.relation,'all');
 h.click({newsExternal:'https://news.test/one'});h.click({newsStock:'A'});
 assert.deepEqual(opened,['https://news.test/one']);assert.deepEqual(stocks,[['A','알파']]);
 h.click({newsSummary:'https://news.test/one'});await tick();assert.equal(loads,1);assert.match(h.host.innerHTML,/제목만/);
 cleanup();assert.equal(h.listeners.has('click'),false);
});

test('reader starts no work on mount, pending double toggle stays one request and late completion cannot mutate host',async()=>{
 const h=harness(),d=deferred();let calls=0,current=true;
 const cleanup=mountNewsReader(h.host,{items:[row('late')]},{isCurrent:()=>current,loadSummary:()=>{calls++;return d.promise;}});
 assert.equal(calls,0);h.click({newsSummary:'https://news.test/late'});h.click({newsSummary:'https://news.test/late'});h.click({newsSummary:'https://news.test/late'});
 await tick();assert.equal(calls,1);assert.match(h.host.innerHTML,/요약을 확인하고 있어요/);
 current=false;cleanup();h.host.innerHTML='다음 화면';const count=h.writes;
 d.resolve({summary:'늦은 내용',basis:'article_body'});await tick();assert.equal(h.writes,count);assert.equal(h.host.innerHTML,'다음 화면');
});

test('reader reports empty API, failed API and per-card retry separately',async()=>{
 const h=harness();let cleanup=mountNewsReader(h.host,{items:[]});assert.match(h.host.innerHTML,/현재 표시할 관련 뉴스가 없어요/);cleanup();
 let retries=0;cleanup=mountNewsReader(h.host,{items:[],errors:[{}]},{onRetry:()=>retries++});assert.match(h.host.innerHTML,/뉴스를 불러오지 못했어요/);h.click({newsRetry:''});assert.equal(retries,1);cleanup();
 cleanup=mountNewsReader(h.host,{items:[row('error')]},{loadSummary:async()=>{throw Error('실패');}});h.click({newsSummary:'https://news.test/error'});await tick();assert.match(h.host.innerHTML,/요약을 불러오지 못했어요/);assert.match(h.host.innerHTML,/요약 다시 시도/);cleanup();
});

test('cached summary survives a visit remount and an older same-host mount cannot overwrite its successor',async()=>{
 const h=harness(),preferences={};let calls=0;
 let cleanup=mountNewsReader(h.host,{items:[row('cached')]},{preferences,loadSummary:async()=>{calls++;return {summary:'보관된 짧은 요약',basis:'provider_snippet'};}});
 h.click({newsSummary:'https://news.test/cached'});await tick();assert.equal(calls,1);cleanup();
 cleanup=mountNewsReader(h.host,{items:[row('cached')]},{preferences,loadSummary:async()=>{calls++;return {summary:'다른 내용'};}});
 assert.equal(calls,1);h.click({newsSummary:'https://news.test/cached'});await tick();
 assert.equal(calls,1);assert.match(h.host.innerHTML,/보관된 짧은 요약/);cleanup();
 const d=deferred();mountNewsReader(h.host,{items:[row('old-host')]},{loadSummary:()=>d.promise});h.click({newsSummary:'https://news.test/old-host'});await tick();
 cleanup=mountNewsReader(h.host,{items:[row('new-host')]});const writes=h.writes;
 d.resolve({summary:'obsolete'});await tick();assert.equal(h.writes,writes);assert.match(h.host.innerHTML,/기사 new-host/);cleanup();
});

test('HTML escapes untrusted title/source/stock/summary and preserves separate controls',async()=>{
 const h=harness();const cleanup=mountNewsReader(h.host,{items:[{...row('escaped'),title:'<img src=x onerror=alert(1)>',source:'<매체>',name:'<종목>'}]},{loadSummary:async()=>({summary:'<script>bad()</script>',basis:'headline_only'})});
 assert.equal(h.host.innerHTML.includes('<img'),false);assert.match(h.host.innerHTML,/&lt;매체&gt;/);assert.match(h.host.innerHTML,/data-news-reader-stock="A"/);assert.match(h.host.innerHTML,/data-news-summary-toggle/);
 assert.doesNotMatch(h.host.innerHTML,/<button[^>]*>(?:(?!<\/button>)[\s\S])*<button/);
 h.click({newsSummary:'https://news.test/escaped'});await tick();assert.equal(h.host.innerHTML.includes('<script>'),false);assert.match(h.host.innerHTML,/&lt;script&gt;/);cleanup();
});

test('visit restores expanded ready, pending and error summaries without starting more work',async()=>{
 for(const outcome of ['ready','pending','error']) {
  const h=harness(),preferences={},d=deferred();let calls=0;
  const loader=()=>{calls++;return d.promise;};
  let cleanup=mountNewsReader(h.host,{items:[row(`visit-${outcome}`)]},{preferences,loadSummary:loader});
  h.click({newsSummary:row(`visit-${outcome}`).url});await tick();
  if(outcome==='ready')d.resolve({summary:'유지된 요약',basis:'article_body'});
  if(outcome==='error')d.reject(Error('실패'));
  await tick();cleanup();
  cleanup=mountNewsReader(h.host,{items:[row(`visit-${outcome}`)]},{preferences,loadSummary:loader});
  assert.match(h.host.innerHTML,/data-news-summary-toggle[^>]*aria-expanded="true"/);assert.equal(calls,1);
  if(outcome==='error')assert.match(h.host.innerHTML,/요약을 불러오지 못했어요/);
  if(outcome==='pending') { assert.match(h.host.innerHTML,/요약을 확인하고 있어요/);d.resolve({summary:'돌아온 뒤 완료',basis:'article_body'});await tick();assert.match(h.host.innerHTML,/돌아온 뒤 완료/); }
  h.click({newsSummary:row(`visit-${outcome}`).url});cleanup();
  cleanup=mountNewsReader(h.host,{items:[row(`visit-${outcome}`)]},{preferences,loadSummary:loader});assert.match(h.host.innerHTML,/data-news-summary-toggle[^>]*aria-expanded="false"/);assert.equal(calls,1);cleanup();
 }
});

test('article removal discards expansion and stale pending result before the same article returns',async()=>{
 const h=harness(),preferences={},d=deferred();let calls=0;
 const loader=()=>{calls++;return d.promise;};
 let cleanup=mountNewsReader(h.host,{items:[row('removed')]},{preferences,loadSummary:loader});h.click({newsSummary:row('removed').url});await tick();cleanup();
 cleanup=mountNewsReader(h.host,{items:[]},{preferences,loadSummary:loader});const writes=h.writes;d.resolve({summary:'삭제된 기사 응답'});await tick();assert.equal(h.writes,writes);cleanup();
 cleanup=mountNewsReader(h.host,{items:[row('removed')]},{preferences,loadSummary:loader});assert.match(h.host.innerHTML,/data-news-summary-toggle[^>]*aria-expanded="false"/);assert.doesNotMatch(h.host.innerHTML,/삭제된 기사 응답/);assert.equal(calls,1);cleanup();
});

test('same URL with changed headline or seed never reuses a cached summary',async()=>{
 for(const field of ['title','summarySeed','snippet']) {
  const h=harness(),preferences={};let calls=0;
  const original={...row(`correct-${field}`),[field]:'수정 전'};
  const loader=async item=>{calls++;return {summary:item[field],basis:'headline_only'};};
  let cleanup=mountNewsReader(h.host,{items:[original]},{preferences,loadSummary:loader});h.click({newsSummary:original.url});await tick();cleanup();
  cleanup=mountNewsReader(h.host,{items:[{...original,[field]:'수정 후'}]},{preferences,loadSummary:loader});assert.equal(calls,1);
  h.click({newsSummary:original.url});await tick();assert.equal(calls,2);assert.match(h.host.innerHTML,/news-reader-summary-text">수정 후/);cleanup();
 }
});

test('pending cross-controller dedupe distinguishes the actual title and seed inputs',async()=>{
 const calls=[],jobs=[];
 const loader=item=>{calls.push(item);const d=deferred();jobs.push(d);return d.promise;};
 const a=createNewsSummaryController({loadSummary:loader}),b=createNewsSummaryController({loadSummary:loader}),c=createNewsSummaryController({loadSummary:loader});
 const base={...row('input-identity'),summarySeed:'first'};
 const results=[a.request(base),b.request({...base,title:'corrected'}),c.request({...base,summarySeed:'corrected'})];await tick();
 const count=calls.length;jobs.forEach(d=>d.resolve({summary:'완료'}));await Promise.all(results);a.dispose();b.dispose();c.dispose();assert.equal(count,3);
});

test('immediate disposal prevents loader start and null responses leave a retryable error',async()=>{
 let calls=0;const c=createNewsSummaryController({loadSummary:async()=>{calls++;return {summary:'완료'};}});
 const p=c.request(row('immediate-disposal'));c.dispose();await p;assert.equal(calls,0);
 const h=harness();const cleanup=mountNewsReader(h.host,{items:[row('null-result')]},{loadSummary:async()=>null});h.click({newsSummary:row('null-result').url});await tick();assert.match(h.host.innerHTML,/요약을 불러오지 못했어요/);assert.match(h.host.innerHTML,/요약 다시 시도/);cleanup();
});

test('rerender restores original-link focus separately from title-link focus',()=>{
 const h=harness(),url=row('focus').url;let selected='';
 const doc={activeElement:{inside:true,dataset:{newsExternal:url,newsControl:'original:'+url}}};
 h.host.ownerDocument=doc;
 h.host.querySelectorAll=()=>[{dataset:{newsExternal:url,newsControl:'title:'+url},focus(){selected='title';}},{dataset:{newsExternal:url,newsControl:'original:'+url},focus(){selected='original';}}];
 const cleanup=mountNewsReader(h.host,{items:[row('focus')]});assert.equal(selected,'original');cleanup();
});

test('visit observes a pending completion while away and retains it on return',async()=>{
 const h=harness(),preferences={},d=deferred();let calls=0;
 const loader=()=>{calls++;return d.promise;};
 let cleanup=mountNewsReader(h.host,{items:[row('away')]},{preferences,loadSummary:loader});h.click({newsSummary:row('away').url});await tick();cleanup();
 h.host.innerHTML='종목 상세';const writes=h.writes;d.resolve({summary:'방문 상태에 보관',basis:'provider_snippet'});await tick();assert.equal(h.writes,writes);
 cleanup=mountNewsReader(h.host,{items:[row('away')]},{preferences,loadSummary:loader});assert.equal(calls,1);assert.match(h.host.innerHTML,/data-news-summary-toggle[^>]*aria-expanded="true"/);assert.match(h.host.innerHTML,/방문 상태에 보관/);cleanup();
});

test('controller bounds retained summary state and drops the oldest entry',async()=>{
 const c=createNewsSummaryController({loadSummary:async()=>({summary:'보관'})});
 for(let i=0;i<121;i++)await c.request(row(`bounded-${i}`));
 assert.equal(c.get(row('bounded-0')).status,'idle');assert.equal(c.get(row('bounded-1')).status,'ready');assert.equal(c.get(row('bounded-120')).status,'ready');c.dispose();
});

test('same-visit immediate remount adopts the already requested pending job before transport starts',async()=>{
 const h=harness(),preferences={},d=deferred();let calls=0;
 const loader=()=>{calls++;return d.promise;};
 let cleanup=mountNewsReader(h.host,{items:[row('micro-remount')]},{preferences,loadSummary:loader});h.click({newsSummary:row('micro-remount').url});cleanup();
 cleanup=mountNewsReader(h.host,{items:[row('micro-remount')]},{preferences,loadSummary:loader});await tick();
 const count=calls;d.resolve({summary:'한 번만 요청',basis:'article_body'});await tick();cleanup();assert.equal(count,1);
});

test('explicit US lookback coverage discloses provider window even for empty results',()=>{
 const h=harness();let cleanup=mountNewsReader(h.host,{items:[]},{usLookbackDays:4});
 assert.match(h.host.innerHTML,/미국 종목 뉴스는 제공처 조회 범위 최근 4일이며 전체 과거 기사가 아니에요/);cleanup();
 cleanup=mountNewsReader(h.host,{items:[row('kr-only')]});assert.doesNotMatch(h.host.innerHTML,/제공처 조회 범위 최근/);cleanup();
 cleanup=mountNewsReader(h.host,{items:[]},{usLookbackDays:0});assert.doesNotMatch(h.host.innerHTML,/제공처 조회 범위 최근/);cleanup();
});

test('merged article retains supplied translated and escaped tags with the existing two-tag limit and title language',()=>{
 const h=harness();const article={...row('tag-context'),title:'Company earnings release',investmentTags:['earnings','<태그>','analyst']};
 let cleanup=mountNewsReader(h.host,{items:[article],groups:[{symbol:'B',name:'베타',items:[{...article,symbol:'B',name:'베타',relationType:'related',relationBasis:'industry keyword match'}]}]});
 assert.equal((h.host.innerHTML.match(/data-news-reader-card=/g)||[]).length,1);assert.match(h.host.innerHTML,/data-news-reader-stock="A"/);assert.match(h.host.innerHTML,/data-news-reader-stock="B"/);
 assert.match(h.host.innerHTML,/<div class="news-tags">\s*<span>실적<\/span><span>&lt;태그&gt;<\/span>\s*<\/div>/);assert.doesNotMatch(h.host.innerHTML,/애널리스트 분석/);assert.match(h.host.innerHTML,/영문 원문/);assert.doesNotMatch(h.host.innerHTML,/<태그>/);cleanup();
 cleanup=mountNewsReader(h.host,{items:[{...row('no-tags'),title:'기업 실적 발표'}]});assert.doesNotMatch(h.host.innerHTML,/class="news-tags"/);assert.match(h.host.innerHTML,/한국어/);cleanup();
});

test('progressive update retains filters, visible range, focused control and explicitly opened summaries',async()=>{
 for(const status of ['ready','pending','error']) {
  const h=harness(),preferences={},job=deferred();let calls=0,focused=0;
  const articles=Array.from({length:25},(_,i)=>row(`progress-${status}-${i}`));
  const cleanup=mountNewsReader(h.host,{items:articles,complete:false,pendingSymbols:['B']},{preferences,loadSummary:()=>{calls++;return job.promise;}});
  assert.equal(typeof cleanup.update,'function');assert.match(h.host.innerHTML,/1개 종목.*확인 중/);
  h.click({newsSource:'제공 매체'});h.click({newsMore:''});h.click({newsSummary:articles[0].url});await tick();
  if(status==='ready')job.resolve({summary:'진행 중 보존 요약',basis:'article_body'});if(status==='error')job.resolve(null);await tick();
  h.host.ownerDocument={activeElement:{inside:true,dataset:{newsControl:'original:'+articles[0].url}}};h.host.querySelectorAll=()=>[{dataset:{newsControl:'original:'+articles[0].url},focus(){focused++;}}];
  cleanup.update({items:[...articles,row('new')],groups:[],complete:true,pendingSymbols:[]});
  assert.equal(preferences.source,'제공 매체');assert.equal(preferences.visibleCount,24);assert.match(h.host.innerHTML,/data-news-summary-toggle[^>]*aria-expanded="true"/);assert.equal(focused,1);assert.equal(calls,1);assert.doesNotMatch(h.host.innerHTML,/종목.*확인 중/);
  if(status==='ready')assert.match(h.host.innerHTML,/진행 중 보존 요약/);if(status==='error')assert.match(h.host.innerHTML,/요약을 불러오지 못했어요/);if(status==='pending'){assert.match(h.host.innerHTML,/요약을 확인하고 있어요/);job.resolve({summary:'업데이트 뒤 완료'});await tick();assert.match(h.host.innerHTML,/업데이트 뒤 완료/);}cleanup();
 }
});

test('pending reader keeps first articles visible and shows confirmed empty only after completion',()=>{
 const h=harness(),cleanup=mountNewsReader(h.host,{items:[],complete:false,pendingSymbols:['A','B']});assert.match(h.host.innerHTML,/2개 종목.*확인 중/);assert.doesNotMatch(h.host.innerHTML,/현재 표시할 관련 뉴스가 없어요/);
 cleanup.update({items:[row('first')],complete:false,pendingSymbols:['B']});assert.match(h.host.innerHTML,/기사 first/);assert.match(h.host.innerHTML,/1개 종목.*확인 중/);
 cleanup.update({items:[],complete:true,pendingSymbols:[]});assert.match(h.host.innerHTML,/현재 표시할 관련 뉴스가 없어요/);cleanup();
});

test('progressive paints wait until the active pointer click resolves and cleanup cancels the queued paint',async()=>{
 const docListeners=new Map(),doc={addEventListener:(type,fn)=>docListeners.set(type,fn),removeEventListener:(type,fn)=>{if(docListeners.get(type)===fn)docListeners.delete(type);}};
 const h=harness(),opened=[];h.host.ownerDocument=doc;
 const cleanup=mountNewsReader(h.host,{items:[row('pressed')]},{onExternal:url=>opened.push(url)});
 docListeners.get('pointerdown')({pointerId:1,target:{inside:true}});const writes=h.writes;
 cleanup.update({items:[row('moved'),row('pressed')]});assert.equal(h.writes,writes);
 docListeners.get('pointerup')({pointerId:1});assert.equal(h.writes,writes);
 h.click({newsExternal:row('pressed').url});assert.deepEqual(opened,[row('pressed').url]);assert.equal(h.writes,writes);
 await new Promise(resolve=>setTimeout(resolve,5));assert.match(h.host.innerHTML,/기사 moved/);
 docListeners.get('pointerdown')({pointerId:2,target:{inside:true}});cleanup.update({items:[row('obsolete')]});docListeners.get('pointerup')({pointerId:2});cleanup();const stopped=h.writes;
 await new Promise(resolve=>setTimeout(resolve,5));assert.equal(h.writes,stopped);assert.equal(docListeners.size,0);cleanup.update({items:[row('late')]});assert.equal(h.writes,stopped);
});
