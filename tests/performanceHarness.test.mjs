import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { performanceOptions, summarizeRequests, summarizeMeasurements } from '../scripts/performance-harness.mjs';

test('performance options keep bounded defaults and select repeatable routes/phases/failures', () => {
  const defaults=performanceOptions();
  assert.equal(defaults.runs,1);
  assert.deepEqual(defaults.phases,['cold','spa','warm']);
  assert.equal(defaults.proxyServer,null);
  const options=performanceOptions({PERF_ROUTES:'#detail/NVDA,exports/cosmetics',PERF_RUNS:'3',PERF_PHASES:'cold,warm,cold',PERF_OUTPUT:'artifacts/performance/audit.json',PERF_FAILURE_PATH:'/api/financial-history',PERF_FAILURE_MODE:'503',E2E_PROXY_SERVER:'http://proxy.test:8080'});
  assert.deepEqual(options.routeNames,['detail/NVDA','exports/cosmetics']);
  assert.deepEqual(options.phases,['cold','warm']);
  assert.equal(options.runs,3);
  assert.deepEqual(options.failure,{path:'/api/financial-history',mode:'503',matching:'exact pathname'});
  for(const value of ['0','1.5','21','invalid'])assert.throws(()=>performanceOptions({PERF_RUNS:value}));
  assert.throws(()=>performanceOptions({PERF_PHASES:'unknown'}));
  assert.throws(()=>performanceOptions({PERF_FAILURE_PATH:'financial-history'}));
  assert.throws(()=>performanceOptions({PERF_FAILURE_PATH:'/api/optional',PERF_FAILURE_MODE:'empty'}));
});

test('request summary preserves exact queries, decoded bytes, pending and transport versus HTTP failures', () => {
  const rows=[
    {key:'/api/quotes?tickers=NVDA',path:'/api/quotes',state:'complete',bodyComplete:true,status:200,ms:23,decodedBodyBytes:128},
    {key:'/api/quotes?tickers=NVDA',path:'/api/quotes',state:'complete',bodyComplete:true,status:503,ms:41,decodedBodyBytes:64},
    {key:'/api/quotes?tickers=AAPL',path:'/api/quotes',state:'pending',bodyComplete:false,status:null},
    {key:'/api/optional',path:'/api/optional',state:'failed',bodyComplete:false,status:null},
    {key:'/api/optional',path:'/api/optional',state:'canceled',bodyComplete:false,status:200},
  ];
  const summary=summarizeRequests(rows);
  const nvda=summary.find(row=>row.key.endsWith('NVDA'));
  assert.equal(nvda.calls,2);assert.equal(nvda.completedBodies,2);
  assert.equal(nvda.decodedBodyBytes,192);assert.equal(nvda.httpErrors,1);assert.equal(nvda.failed,0);
  assert.equal(summary.find(row=>row.key.endsWith('AAPL')).pending,1);
  const optional=summary.find(row=>row.path==='/api/optional');
  assert.equal(optional.failed,1);assert.equal(optional.canceled,1);assert.equal(optional.ms,null);
  assert.equal(optional.decodedBodyBytes,null);
});

test('measurement summary never ranks errors or timeouts as successful usable data', () => {
  const summary=summarizeMeasurements([
    {route:'home',coldMs:10,coldReadyState:'error',warmMs:5,warmReadyState:'ready'},
    {route:'home',coldMs:200,coldReadyState:'ready',warmMs:7,warmReadyState:'ready'},
    {route:'home',coldMs:500,coldReadyState:'timeout',warmMs:2,warmReadyState:'unavailable'},
  ],['cold','warm']);
  assert.deepEqual(summary[0].outcomes,{error:1,ready:1,timeout:1});
  assert.equal(summary[0].readySamples,1);assert.equal(summary[0].medianReadyMs,200);
  assert.equal(summary[1].readySamples,2);assert.equal(summary[1].medianReadyMs,6);assert.equal(summary[1].minReadyMs,5);assert.equal(summary[1].maxReadyMs,7);
});

function collectorHarness(){
  const source=readFileSync(new URL('./production_performance_audit.mjs',import.meta.url),'utf8');
  const fn=source.slice(source.indexOf('function apiCollector('),source.indexOf('async function seed('));
  const factory=runInNewContext(`${fn}\napiCollector;`,{performance,round:Math.round,URL,dataRequestPath:value=>new URL(value).pathname});
  const handlers=new Map();
  return {collector:factory({on:(name,handler)=>handlers.set(name,handler),off:name=>handlers.delete(name)}),handlers};
}

test('collector records pending requests before headers and keeps failed-before-headers evidence', () => {
  const {collector,handlers}=collectorHarness();
  const pending={url:()=> 'https://example.test/api/quotes?tickers=NVDA',method:()=> 'GET'};
  handlers.get('request')(pending);
  assert.equal(collector.rows.length,1);assert.equal(collector.rows[0].state,'pending');
  assert.equal(collector.rows[0].key,'/api/quotes?tickers=NVDA');
  const failed={url:()=> 'https://example.test/api/optional',failure:()=>({errorText:'net::ERR_FAILED'})};
  handlers.get('request')(failed);handlers.get('requestfailed')(failed);
  assert.equal(collector.rows[1].state,'failed');assert.equal(collector.rows[1].bodyComplete,false);
  const canceled={url:()=> 'https://example.test/api/cancel',failure:()=>({errorText:'net::ERR_ABORTED'})};
  handlers.get('request')(canceled);handlers.get('requestfailed')(canceled);
  assert.equal(collector.rows[2].state,'canceled');
});

test('collector records decoded response bytes and does not mutate a later route generation', async () => {
  const {collector,handlers}=collectorHarness();
  const request={url:()=> 'https://example.test/api/optional'};
  handlers.get('request')(request);
  await handlers.get('response')({request:()=>request,status:()=>200,finished:async()=>null,body:async()=>Buffer.from('한국어')});
  assert.equal(collector.rows[0].bodyComplete,true);assert.equal(collector.rows[0].decodedBodyBytes,Buffer.byteLength('한국어'));
  const obsolete={url:()=> 'https://example.test/api/old'};
  handlers.get('request')(obsolete);
  let finish;
  const work=handlers.get('response')({request:()=>obsolete,status:()=>200,finished:()=>new Promise(resolve=>{finish=resolve;})});
  collector.reset();finish(null);await work;
  assert.equal(collector.rows.length,0);
});
