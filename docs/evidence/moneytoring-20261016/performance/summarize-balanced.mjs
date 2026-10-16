import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const names=['before.json','after.json','reverse/after.json','reverse/before.json'];
const runs=await Promise.all(names.map(async file=>({file,raw:await readFile(new URL(file,import.meta.url))})));
for(const run of runs)run.data=JSON.parse(run.raw);
const reference=runs[0].data;
for(const run of runs){
 if(JSON.stringify(run.data.conditions)!==JSON.stringify(reference.conditions)||run.data.fixture.sha256!==reference.fixture.sha256)throw Error('Conditions/fixture differ');
 if(run.data.rows.some(row=>row.state!=='ready'||row.errors.length||row.overflowPx>1))throw Error('Invalid observation');
}
const median=values=>{const sorted=values.toSorted((a,b)=>a-b),n=sorted.length;return n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2;};
const report={baseline:reference.baselineSourceCommit,design:'AB then BA; seven new-context samples per route/build/order, one discarded warmup per route/build/order',conditions:reference.conditions,limit:'14 per build/route: descriptive median/max only, no production p95 or quote-provider speed claim',inputs:runs.map(run=>({file:run.file,sha256:createHash('sha256').update(run.raw).digest('hex')})),routes:[]};
for(const route of ['home','detail/005930.KS','macro']){
 const result={route};
 for(const phase of ['before','after']){
  const selected=runs.filter(run=>run.data.phase===phase).flatMap(run=>run.data.rows.filter(row=>row.route===route&&row.iteration>0));
  if(selected.length!==14)throw Error('Incomplete sample');
  const inflation=selected.map(row=>row.ready.inflation).filter(Number.isFinite);
  result[phase]={samples:14,medianMs:median(selected.map(row=>row.primaryMs)),maxMs:Math.max(...selected.map(row=>row.primaryMs)),inflationMedianMs:inflation.length?median(inflation):null,requestCounts:[...new Set(selected.map(row=>row.requestsAtInitialReady.length))],overflowPx:Math.max(...selected.map(row=>row.overflowPx))};
 }
 result.medianChangeMs=result.after.medianMs-result.before.medianMs;
 if(JSON.stringify(result.before.requestCounts)!==JSON.stringify(result.after.requestCounts))throw Error('Request count changed');
 report.routes.push(result);
}
await writeFile(new URL('balanced.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.routes));
