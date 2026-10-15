import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('performance audit applies its actual wait budget as Playwright options', async () => {
  const source = readFileSync(new URL('./production_performance_audit.mjs', import.meta.url), 'utf8');
  const fn = source.slice(source.indexOf('async function waitReady('), source.indexOf('function apiSummary('));
  const waitReady = runInNewContext(`${fn}\nwaitReady;`, { TIMEOUT: 17, performance, round: Math.round });
  let actualBudget;
  const result = await waitReady({ waitForFunction: async (_fn, _arg, options = {}) => {
    actualBudget = options.timeout ?? 30_000;
    // A never-ready condition must be classified as timeout under its chosen
    // budget, not silently use Playwright's unrelated 30s default.
    throw new Error('condition never ready');
  } }, { ready: () => false });
  assert.equal(actualBudget, 17);
  assert.equal(result.state, 'timeout');
});

test('detail-stage workflow applies each stage budget instead of passing it to the page', async () => {
  const source = readFileSync(new URL('../.github/workflows/major-detail-stage-timing.yml', import.meta.url), 'utf8');
  const fn = source.match(/const mark=async\(key,fn,timeout=15000\)=>\{[\s\S]*?\n\s*\};/)[0];
  const marks = {};
  let actualBudget;
  const mark = runInNewContext(`${fn}\nmark;`, { marks, start: performance.now(), performance, round: Math.round,
    page: { waitForFunction: async (_fn, _arg, options = {}) => {
      actualBudget = options.timeout ?? 30_000;
      throw new Error('stage unavailable');
    } },
  });
  await mark('quote', () => false, 5);
  assert.equal(actualBudget, 5);
  assert.equal(marks.quote, null);
});

function collectorHarness(){
  const source=readFileSync(new URL('./production_performance_audit.mjs',import.meta.url),'utf8');
  const fn=source.slice(source.indexOf('function apiCollector('),source.indexOf('async function seed('));
  const factory=runInNewContext(`${fn}\napiCollector;`,{performance,round:Math.round,URL,dataRequestPath:()=>true});
  const handlers=new Map();
  const page={on:(event,handler)=>handlers.set(event,handler),off:(event)=>handlers.delete(event)};
  return {collector:factory(page),handlers};
}

test('performance collector tolerates context close while an optional body is pending',async()=>{
  const {collector,handlers}=collectorHarness();
  const req={url:()=> 'https://example.test/api/compare'};
  handlers.get('request')(req);
  let rejectBody;
  const pending=handlers.get('response')({request:()=>req,finished:()=>new Promise((_,reject)=>{rejectBody=reject;})});
  collector.stop();
  rejectBody(new Error('Target page, context or browser has been closed'));
  await pending;
  assert.equal(collector.rows.length,0);
  assert.equal(handlers.size,0);
});

test('aborted response headers do not become completed body latency',async()=>{
  const {collector,handlers}=collectorHarness();
  const req={url:()=> 'https://example.test/api/optional'};
  handlers.get('request')(req);
  await handlers.get('response')({request:()=>req,finished:async()=>new Error('aborted'),status:()=>200});
  assert.equal(collector.rows.length,1);
  assert.equal(collector.rows[0].bodyComplete,false);
  assert.equal(collector.rows[0].ms,null);
});

function routeReady(route,document){
 const line=readFileSync(new URL('./production_performance_audit.mjs',import.meta.url),'utf8').split('\n').find(line=>line.includes(`route:'${route}'`));
 const expression=line.slice(line.indexOf('ready:')+6,line.lastIndexOf('},'));
 return runInNewContext('('+expression+')',{document});
}
test('watch readiness works against deployed markup without new state attributes',()=>{
 let loaded=false,error=false;
 const host={dataset:{},querySelector:s=>s.includes('.watch-refresh-note')&&error?{}:null,querySelectorAll:()=>[{textContent:loaded?'103,700원':'확인 중'}]};
 const ready=routeReady('watch',{querySelector:()=>host});
 assert.equal(ready(),false);loaded=true;assert.equal(ready(),true);
 loaded=false;error=true;assert.equal(ready(),true,'a terminal error must settle for separate classification');
 host.dataset.loadState='loading';assert.equal(ready(),false,'cached numbers do not settle an active refresh');
});
test('provisional readiness works against the currently deployed digest markup',()=>{
 let loaded=false,error=false;
 const radar={dataset:{},querySelector:s=>s.includes('.export-provisional-error')&&error?{}:s.includes('[data-export-digest]')&&loaded?{}:null};
 const panel={dataset:{loadState:'ready'},querySelector:()=>radar};
 const ready=routeReady('exports',{querySelector:()=>panel});
 assert.equal(ready(),false);loaded=true;assert.equal(ready(),true);
 loaded=false;error=true;assert.equal(ready(),true);
});

function outcomeFor(route, {watch=null,panel=null}={}) {
 const source=readFileSync(new URL('../scripts/performance-outcome.mjs',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('export function performanceOutcome'),source.indexOf('export function dataRequestPath')).replace('export function','function');
 const visible=element=>element&&Object.assign(element,{closest:()=>null,getClientRects:()=>[{}]});
 const document={querySelector:()=>watch,querySelectorAll:selector=>selector==='[data-export-panel]:not([hidden])'&&panel?[visible(panel)]:[]};
 return runInNewContext(`${fn}\nperformanceOutcome`,{document})(route);
}
test('legacy watch placeholders and failed refreshes are excluded from successful latency',()=>{
 let value='확인 중',failed=false;
 const watch={dataset:{},querySelector:()=>failed?{}:null,querySelectorAll:()=>[{textContent:value}]};
 assert.equal(outcomeFor('watch',{watch}),'pending');
 value='103,700원';assert.equal(outcomeFor('watch',{watch}),'ready');
 failed=true;assert.equal(outcomeFor('watch',{watch}),'error');
 failed=false;value='-';assert.equal(outcomeFor('watch',{watch}),'unavailable');
});
test('legacy provisional loading and errors cannot become a successful export measurement',()=>{
 let loaded=false,failed=false;
 const radar={dataset:{},querySelector:s=>s.includes('error')&&failed?{}:s.includes('data-export-digest')&&loaded?{}:null};
 const panel={dataset:{loadState:'ready'},querySelector:()=>radar};
 assert.equal(outcomeFor('exports',{panel}),'pending');
 loaded=true;assert.equal(outcomeFor('exports',{panel}),'ready');
 loaded=false;failed=true;assert.equal(outcomeFor('exports',{panel}),'error');
 radar.dataset.loadState='loading';assert.equal(outcomeFor('exports',{panel}),'pending');
 panel.dataset.loadState='error';assert.equal(outcomeFor('exports',{panel}),'error');
});
