// Session-local measurements only. Never capture query strings, keys, stock symbols,
// error messages, stack traces or user data. Nothing is sent to an external service.
const records=[];
export function recordMetric(name,start,outcome='ok') {
  if(typeof performance==='undefined') return;
  const durationMs=Math.max(0,Math.round(performance.now()-start));
  records.push({name,durationMs,outcome});
  if(records.length>200) records.shift();
  try { performance.measure(`chartview:${name}`,{start,end:performance.now(),detail:{outcome}}); } catch {}
  performance.clearMeasures?.(`chartview:${name}`);
}
export function diagnosticSummary() {
  const groups={};
  for(const row of records) {
    const group=groups[row.name] ||= {samples:[],failures:0};
    group.samples.push(row.durationMs); if(row.outcome!=='ok')group.failures++;
  }
  return Object.fromEntries(Object.entries(groups).map(([name,{samples,failures}])=>{
    samples.sort((a,b)=>a-b);
    return [name,{count:samples.length,failures,p50Ms:samples[Math.ceil(samples.length*.5)-1],p95Ms:samples[Math.ceil(samples.length*.95)-1]}];
  }));
}
export function clearDiagnostics(){records.length=0;}
