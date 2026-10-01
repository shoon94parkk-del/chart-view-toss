import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInvestmentIdeas, ideaCoverage } from '../src/ideaEngine.js';

const data={tradeDate:'2026-09-29',stocks:[
 {symbol:'A.KS',name:'A',market:'KOSPI',price:110,change1d:4,volumeRatio:3.2,rsi14:61,ret20:14,avgValue20:2_000_000_000,ma20:100,ma60:90,macd:3,macdSignal:2,distance52HighPct:-1,near52High:true},
 {symbol:'B.KS',name:'B',market:'KOSDAQ',price:102,change1d:1,volumeRatio:1.3,rsi14:48,ret20:5,avgValue20:2_000_000_000,ma20:100,ma60:95,trend2060:true,macd:1,macdSignal:.5,distance52HighPct:-8},
 {symbol:'C.KS',name:'C',market:'KOSPI',price:80,change1d:-2,volumeRatio:1.1,rsi14:27,ret20:-12,avgValue20:2_000_000_000,ma20:90,ma60:95,macd:-2,macdSignal:-1,distance52HighPct:-30},
 {symbol:'D.KS',name:'D',market:'KOSDAQ',price:120,change1d:2.2,volumeRatio:2.4,rsi14:64,ret20:9,avgValue20:2_000_000_000,ma20:110,ma60:100,macd:2,macdSignal:1,distance52HighPct:-2,near52High:true},
]};

test('idea engine turns screener facts into multiple inspectable idea cards',()=>{
 const ideas=buildInvestmentIdeas(data,{limit:5,perIdea:3});
 assert.ok(ideas.length>=4);
 assert.ok(ideas.find(x=>x.id==='volume-rise').candidates.some(x=>x.symbol==='A.KS'));
 assert.ok(ideas.find(x=>x.id==='pullback').candidates.some(x=>x.symbol==='B.KS'));
 assert.ok(ideas.find(x=>x.id==='near-high').candidates.some(x=>x.symbol==='D.KS'));
 assert.ok(ideas.find(x=>x.id==='oversold').candidates.some(x=>x.symbol==='C.KS'));
});

test('idea cards expose only reasons supported by supplied metrics',()=>{
 const card=buildInvestmentIdeas(data,{limit:5,perIdea:3}).find(x=>x.id==='volume-rise');
 const row=card.candidates.find(x=>x.symbol==='A.KS');
 assert.match(row.reasons.join(' '),/거래량 3\.2배/);
 assert.match(row.reasons.join(' '),/당일 \+4\.0%/);
});

test('coverage reports source date and usable technical rows',()=>{
 assert.deepEqual(ideaCoverage(data),{total:4,usable:4,tradeDate:'2026-09-29'});
});

test('idea candidates require at least 10억원 in 20-day average traded value',()=>{
 const eligible={...data.stocks[0],symbol:'OK.KS',avgValue20:1_000_000_000};
 const thin={...data.stocks[0],symbol:'THIN.KS',avgValue20:999_999_999,change1d:20,volumeRatio:20};
 const missing={...data.stocks[0],symbol:'MISSING.KS',avgValue20:null,change1d:30,volumeRatio:30};
 const ideas=buildInvestmentIdeas({stocks:[thin,missing,eligible]},{limit:5,perIdea:5});
 assert.ok(ideas.length);
 assert.ok(ideas.every(idea=>idea.candidates.every(row=>row.symbol==='OK.KS')));
});

test('classification work is bounded by visible winners while ranking is preserved',()=>{
 let reads=0;
 const stocks=Array.from({length:300},(_,i)=>({symbol:`T${i}.KS`,name:`T${i}`,industry:'테스트 산업',date:'2026-10-01',avgValue20:2e9,volumeRatio:2+i/100,change1d:1,ret5:1,get mainProducts(){reads++;return '';}}));
 const ideas=buildInvestmentIdeas({stocks},{limit:1,perIdea:4});
 assert.deepEqual(ideas[0].candidates.map(row=>row.symbol),['T299.KS','T298.KS','T297.KS','T296.KS']);
 assert.ok(reads<stocks.length*30,`unnecessary industry reads: ${reads}`);
});
