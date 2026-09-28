import test from 'node:test';
import assert from 'node:assert/strict';
import {formatCurrencyPrice,formatMacroValue,formatMacroChange,formatChartDate,formatMetricPeriod,macroFreshness,relationBasisLabel} from '../src/dataPresentation.js';
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
 assert.equal(formatMetricPeriod('FY 2026'),'FY 2026');
 assert.equal(formatMetricPeriod(undefined),'기준기간 미제공');
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
 assert.equal(relationBasisLabel('관련 업종 키워드 확인: hbm'),'관련 업종 키워드 확인: hbm');
});
