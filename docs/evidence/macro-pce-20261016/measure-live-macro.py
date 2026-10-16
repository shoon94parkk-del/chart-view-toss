"""Small warm production sample; never a cold-start or statistically robust p95."""
import hashlib,json,statistics,sys,time
from pathlib import Path
import requests
phase=sys.argv[1]
expected=sys.argv[2]
base='https://chart-view-pkv8.onrender.com'
with requests.Session() as client:
    health=client.get(base+'/health',timeout=45);health.raise_for_status()
    assert health.json()['revision']==expected
    samples=[]
    for i in range(8):
        start=time.perf_counter()
        response=client.get(base+'/api/macro',timeout=45)
        duration=(time.perf_counter()-start)*1000
        response.raise_for_status();data=response.json()
        assert len(data['results'])==16
        assert len(data['inflation']['series'])==(4 if phase=='before' else 6)
        samples.append({'index':i,'discardedWarmup':i==0,'ms':round(duration,3),'status':response.status_code,'decodedBytes':len(response.content),'bodySha256':hashlib.sha256(response.content).hexdigest(),'series':len(data['inflation']['series']),'asOf':{r['id']:r['asOf'] for r in data['inflation']['series']},'contentEncoding':response.headers.get('Content-Encoding')})
    final=client.get(base+'/health',timeout=45);final.raise_for_status();assert final.json()['revision']==expected
values=[s['ms'] for s in samples[1:]]
result={'phase':phase,'recordedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'revision':expected,'endpoint':base+'/api/macro','method':'Sequential requests.Session with verified TLS/inherited proxy, same client region, one discarded warmup, seven measured complete responses. No forced server sleep, no API fixtures. Warm HTTP including internet and body transfer; not a cold-start comparison/SLA/p95. Data refresh differences recorded separately.','medianMs':statistics.median(values),'maxMs':max(values),'samples':samples}
Path(__file__).with_name('live-macro-'+phase+'.json').write_text(json.dumps(result,indent=2))
print(json.dumps({'phase':phase,'medianMs':result['medianMs'],'maxMs':result['maxMs'],'decodedBytes':samples[-1]['decodedBytes'],'series':samples[-1]['series']}))
