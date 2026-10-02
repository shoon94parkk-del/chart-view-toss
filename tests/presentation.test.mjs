import test from 'node:test';
import assert from 'node:assert/strict';
import {formatCurrencyPrice,formatMacroValue,formatMacroChange,formatChartDate,formatMetricPeriod,formatMarketCap,macroFreshness,relationBasisLabel,translatedTag} from '../src/dataPresentation.js';
test('missing market values are never shown as zero prices or changes',()=>{
 assert.equal(formatCurrencyPrice(null,'KRW'),'-');
 assert.equal(formatMacroValue({symbol:'PCEPI',value:null}),'-');
 assert.equal(formatMacroChange({symbol:'PCEPI',displayChange:null,delta:null,change:null,changeUnit:'bp'}),'비교값 없음');
 assert.equal(formatCurrencyPrice(0,'KRW'),'0원');
 assert.equal(formatMacroChange({symbol:'PCEPI',displayChange:0,changeUnit:'bp'}),'0.0bp');
});

test('chart dates render as Korean calendar dates for all Lightweight Charts time shapes',()=>{
 assert.equal(formatChartDate({year:2026,month:9,day:28}),'2026.09.28');
 assert.equal(formatChartDate('2026-09-28'),'2026.09.28');
 assert.match(formatChartDate(Date.UTC(2026,8,28)/1000),/^2026\.09\.(28|29)$/);
});

test('valuation periods use readable labels and explicit missing state',()=>{
 assert.equal(formatMetricPeriod('TTM'),'최근 12개월 실적');
 assert.equal(formatMetricPeriod('FY+1'),'다음 회계연도 예상');
 assert.equal(formatMetricPeriod('FY 2026'),'2026 회계연도');
 assert.equal(formatMetricPeriod(undefined),'기준기간 미제공');
 // 운영자 수정 2026-10-03: 백엔드 복합/제공처 표기를 사람이 읽을 수 있게 풀어준다
 assert.equal(formatMetricPeriod('provider forward period'),'제공처 예상 기간(미검증)');
 assert.equal(formatMetricPeriod('provider forward period (not independently verified)'),'제공처 예상 기간(미검증)');
 assert.equal(formatMetricPeriod('TTM/latest reported'),'최근 12개월 실적·최근 공시 기준');
 assert.equal(formatMetricPeriod('latest trading value'),'최근 거래값 기준');
 assert.equal(formatMetricPeriod('latest available'),'최근 가용 데이터 기준');
 assert.equal(formatMetricPeriod('latest reported'),'최근 공시 기준');
 assert.equal(formatMetricPeriod('latest indicated/reported'),'최근 공시·배당 기준');
 assert.equal(formatMetricPeriod('some unknown provider label'),'공급자 기간 기준 확인 필요');
});

test('market cap renders in KRW jo/eok units, USD in $B, missing as 미제공',()=>{
 assert.equal(formatMarketCap(1805804906741760,'KRW'),'1,805조 8,049억원');
 assert.equal(formatMarketCap(5574576046080,'USD'),'$5,574.6B');
 assert.equal(formatMarketCap(235.36,'USD'),'$0B');
 assert.equal(formatMarketCap(9500000000,'KRW'),'95억원');
 assert.equal(formatMarketCap(null,'KRW'),'미제공');
 assert.equal(formatMarketCap(undefined,'USD'),'미제공');
 assert.equal(formatMarketCap(0,'KRW'),'미제공');
});

test('macro freshness is derived from observation date and frequency',()=>{
 const now=Date.UTC(2026,8,28);
 assert.deepEqual(macroFreshness({symbol:'^VIX',asOf:'2026-09-20'},now),{stale:true,ageDays:8,limitDays:4});
 assert.deepEqual(macroFreshness({symbol:'PCEPI',asOf:'2026-08-01'},now),{stale:true,ageDays:58,limitDays:50});
 assert.equal(macroFreshness({symbol:'WALCL',asOf:'2026-09-18'},now).stale,false);
 assert.equal(macroFreshness({symbol:'^TNX'},now).stale,true);
});

test('news relation basis translates known backend English labels',()=>{
 assert.equal(relationBasisLabel('title entity match'),'제목에서 기업명 확인');
 assert.equal(relationBasisLabel('관련 업종 키워드 확인: hbm'),'관련 업종 키워드 확인: HBM');
 assert.equal(relationBasisLabel('internal relation score'),'관련 키워드 확인');
 assert.equal(translatedTag('strategy'),'전략');
 assert.equal(translatedTag('analyst'),'애널리스트 분석');
 assert.equal(translatedTag('unmapped internal tag'),'기타 분류');
});
