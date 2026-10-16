"""Read-only assertions on saved, actual deployed HTTP responses."""
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo
import hashlib
import json
import math

OUT = Path(__file__).resolve().parent
EXPECTED = '01929d488a2d3cfbe715bce1a357a9302c6b171f'
checks=[]

def load(name):
    return json.loads((OUT/(name+'.json')).read_text())

def check(name, condition, evidence=None):
    checks.append({'name':name,'passed':bool(condition),'evidence':evidence})

def instant(value):
    return datetime.fromisoformat(value.replace('Z','+00:00'))

def shift(month,offset):
    y,m=map(int,month.split('-'));v=y*12+m-1+offset
    return f'{v//12:04d}-{v%12+1:02d}'

http=load('api-http');health=load('health');macro=load('macro');home=load('home-snapshot')
earnings=load('earnings-events');exports=load('export-momentum');trends=load('semiconductor-trends');provisional=load('provisional')
check('exact_healthy_revision',health.get('status')=='ok' and health.get('revision')==EXPECTED,health)
for name in ['macro','home-snapshot','earnings-events','export-momentum','semiconductor-trends','provisional']:
    check(name+'_actual_http_200',http[name]['httpStatus']==200,http[name])
legacy_ids={'T10Y2Y','T10Y3M','BAMLH0A0HYM2','RRPONTSYD','DFII10','T10YIE','PCEPI','PCETRIM12M159SFRBDAL','UNRATE','RSAFS','WALCL','WTREGEN','M2SL','FEDTARGET','DFF','^VIX'}
check('legacy_16_exact_symbols',len(macro['results'])==16 and {r.get('original_symbol') or r['symbol'] for r in macro['results']}==legacy_ids)
check('legacy_16_substantive_charts',all(r.get('chart_data') and isinstance(r.get('value'),(float,int)) for r in macro['results']))
local_legacy=load('legacy-macro-reference')
local_map={r.get('original_symbol') or r['symbol']:r for r in local_legacy['results']}
check('legacy_values_and_formulas_unchanged_from_shipped_cache',all(all(row.get(key)==local_map[row.get('original_symbol') or row['symbol']].get(key) for key in ['value','asOf','chart_data','delta','change']) for row in macro['results']))
check('home_real_heatmap_and_16_macro_rows',len(home['heatmap']['results'])==18 and len(home['macro']['results'])==16)
check('home_omits_optional_inflation_and_calendar',all(key not in home['macro'] and key not in home for key in ['inflation','releaseCalendar']))
check('home_preserves_legacy_macro_summary',home['macro']['summary']==macro['summary'])
expected_sources={'cpi':('CUSR0000SA0','CUUR0000SA0'),'core_cpi':('CUSR0000SA0L1E','CUUR0000SA0L1E'),'ppi':('WPSFD4','WPUFD4'),'core_ppi':('WPSFD49104','WPUFD49104')}
series=macro['inflation']['series'];check('four_exact_inflation_definitions',len(series)==4 and {r['id'] for r in series}==set(expected_sources))
summary=[]
for row in series:
    key=row['id'];sa={p['month']:p['value'] for p in row['sourceIndices']['sa']};nsa={p['month']:p['value'] for p in row['sourceIndices']['nsa']}
    check(key+'_correct_sa_nsa_sources',row['basis']=={'yoy':'NSA','mom':'SA'} and (row['source']['saSeriesId'],row['source']['nsaSeriesId'])==expected_sources[key],row['source'])
    check(key+'_60_calendar_months',len(row['points'])==60 and row['points'][0]['month']=='2021-10' and row['points'][-1]['month']==row['asOf']=='2026-09')
    formulas=[]
    for point in row['points']:
        for metric,index,lag in [('yoy',nsa,12),('mom',sa,1)]:
            numerator,denominator=index.get(point['month']),index.get(shift(point['month'],-lag))
            expected=round((numerator/denominator-1)*100,6) if numerator is not None and denominator is not None else None
            formulas.append(point[metric]==expected)
    check(key+'_every_point_exact_calendar_formula',all(formulas),{'calculatedFields':len(formulas)})
    check(key+'_publication_is_not_collection_time',row['publishedAt']!=row['collectedAt'] and instant(row['publishedAt'])<instant(row['checkedAt'])<=instant(macro['inflation']['generatedAt']))
    check(key+'_actual_official_recheck_preserves_gap_status',row['status']==('partial' if key in ['cpi','core_cpi'] else 'ok') and row['checkedAt']=='2026-10-16T03:14:19Z' and row['source']['name']=='U.S. Bureau of Labor Statistics Public Data API')
    if key in ['cpi','core_cpi']:
        points={p['month']:p for p in row['points']}
        check(key+'_official_gap_is_null',points['2025-10']['yoy'] is None and points['2025-10']['mom'] is None and points['2025-11']['mom'] is None and row['coverage']['yoyCount']==59 and row['coverage']['momCount']==58)
    else:
        check(key+'_complete_change_coverage',row['coverage']['yoyCount']==row['coverage']['momCount']==60)
    summary.append({k:row.get(k) for k in ['id','status','asOf','publishedAt','collectedAt','checkedAt','coverage']}|{'latest':row['points'][-1]})
calendar=macro['releaseCalendar'];events=calendar['events'];observed=instant(http['macro']['retrievedAt'])
check('calendar_28_nonempty_official_future_events',len(events)==28 and all(e['status']=='confirmed' and e['indicator'] in ['cpi','ppi'] and urlsplit(e['sourceUrl']).hostname=='www.bls.gov' and instant(e['scheduledAt'])>observed for e in events))
check('calendar_all_eastern_times_match_dst_utc',all(instant(e['scheduledAt']).astimezone(ZoneInfo(e['timeZone'])).strftime('%Y-%m-%d %H:%M')==e['localDate']+' '+e['localTime'] for e in events))
check('calendar_next_confirmed_release_times',[(e['indicator'],e['observationMonth'],e['scheduledAt']) for e in events[:2]]==[('cpi','2026-10','2026-11-10T13:30:00Z'),('ppi','2026-10','2026-11-13T13:30:00Z')],events[:2])
check('calendar_mixed_checks_not_falsely_all_fresh',calendar['status']=='partial' and calendar['checkedAt']=='2026-10-16T01:55:44Z' and sum(e['checkedAt']=='2026-10-16T03:14:19Z' for e in events)==4 and sum(e['checkedAt']=='2026-10-16T01:55:44Z' for e in events)==24)
calls=earnings['events'];call_map={e['symbol']:e for e in calls}
check('actual_apple_samsung_calls_present',set(call_map)=={'AAPL','005930.KS'})
check('calls_separate_from_results_and_consensus',all(e['eventType']=='earnings_call' and e['timingRole']=='conference_call' and e['publishedAt'] is None and e['status']=='confirmed_call' and e['session']=='unknown' and not any(k in e for k in ['actualEps','consensusEps','expectedEps','reactionReturn']) for e in calls) and earnings['comparison']['status']=='unavailable')
check('calls_official_sources',urlsplit(call_map['AAPL']['source']['url']).hostname=='investor.apple.com' and urlsplit(call_map['005930.KS']['source']['url']).hostname=='www.samsung.com' and all(len(e['source']['contentSha256'])==64 for e in calls))
check('calls_exact_verified_schedule_times',call_map['AAPL']['scheduledAt']=='2026-11-02T22:00:00Z' and call_map['AAPL']['scheduledAtKst']=='2026-11-03T07:00:00+09:00' and call_map['005930.KS']['scheduledAt']=='2026-10-29T01:00:00Z' and call_map['005930.KS']['scheduledAtKst']=='2026-10-29T10:00:00+09:00')
check('unverified_issuers_explicitly_missing',{m['symbol'] for m in earnings['coverage']['missing']}=={'NVDA','000660.KS'},earnings['coverage'])
export_map={r['key']:r for r in exports['semiconductorBreakdown']};trend_map={r['key']:r for r in trends['segments']};dram_summary=[]
check('monthly_exports_substantive_official_september',exports['status']=='official_api' and exports['period']==trends['period']=='2026-09' and exports['summary']['exportsUsdBillion']>0 and bool(exports['items']))
for key,expected,aug,sep in [('dram',6.6,15.7331,16.777),('flash',15.2,2.8622,3.2968),('mcp-memory',22.8,12.2253,15.014)]:
    history={r['period']:r for r in trend_map[key]['history']};prior=history['2026-08']['exportsUsdBillion'];current=history['2026-09']['exportsUsdBillion'];calculated=round((current/prior-1)*100,1)
    check(key+'_actual_monthly_cross_endpoint_matches',export_map[key]['exportsUsdBillion']==trend_map[key]['exportsUsdBillion']==current==sep and prior==aug and export_map[key]['exportMoM']==calculated==expected)
    dram_summary.append({'segment':key,'augustUsdBillion':prior,'septemberUsdBillion':current,'calculatedMoMPct':calculated,'liveExportMoMPct':export_map[key]['exportMoM']})
check('provisional_official_current_month_and_actual_cutoff',provisional['status']=='official_preliminary_api' and provisional['period']=='2026-10' and provisional['latestStage']==10 and provisional['latestStageLabel']=='1~10일' and len(provisional['checkpoints'])==1 and provisional['checkpoints'][0]['stage']==10 and provisional['checkpoints'][0]['periodRaw']=='01~10')
checkpoint=provisional['checkpoints'][0]
check('provisional_actual_values_nonempty',checkpoint['total']['exportsUsdBillion']==26.104 and checkpoint['semiconductor']['exportsUsdBillion']==12.1978 and len(provisional['items'])==10)
check('provisional_flags_keep_projection_separate_from_actual',provisional['landingProjection']['status']=='open' and all(provisional['landingProjection'][key]['actualUsdBillion'] is None and provisional['landingProjection'][key]['actualErrorPct'] is None for key in ['total','semiconductor']))
check('provisional_official_source_and_basis_explicit',provisional['source']['url']=='https://www.data.go.kr/data/15157908/openapi.do' and '잠정치' in provisional['meta']['basis'] and 'not HS monthly classification' in provisional['meta']['classification'])

baseline=json.loads((OUT/'guru-baseline-screening.json').read_text())
current=json.loads((OUT/'guru-final-screening.json').read_text())
check('all_five_guru_strategy_outputs_exactly_preserved',baseline['criteriaVersion']==current['criteriaVersion'] and baseline['strategies']==current['strategies'])
report={'expectedRevision':EXPECTED,'verifiedAt':datetime.now(timezone.utc).isoformat(),'assertionsPassed':sum(c['passed'] for c in checks),'assertionCount':len(checks),'allPassed':all(c['passed'] for c in checks),'checks':checks,'inflation':summary,'dram':dram_summary,'caveat':'Actual HTTPS responses after caches warmed. Initial export-momentum 45s timeout and successful unchanged contract recheck are preserved separately. Native Toss Sandbox remains unverified.'}
(OUT/'assertion-result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:report[k] for k in ['expectedRevision','assertionsPassed','assertionCount','allPassed']},indent=2))
if not report['allPassed']:
 print(json.dumps([c for c in checks if not c['passed']],ensure_ascii=False,indent=2));raise SystemExit(1)
