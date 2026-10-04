import test from 'node:test';
import assert from 'node:assert/strict';
const model=await import('../src/insightModel.js').catch(()=>({}));

test('market brief keeps complete sentences and individual observation dates',()=>{
 const result=model.marketBrief?.({summary:{text:'신호가 혼재합니다. 현재는 부정 압력이 넓게 나타납니다.',latestBasisDate:'2026-10-02'},results:[{symbol:'^VIX',value:16.34,date:'2026-09-30'}]});
 assert.equal(result?.text,'신호가 혼재합니다. 현재는 부정 압력이 넓게 나타납니다.');
 assert.match(result?.basis||'',/VIX.*2026-09-30/);
});
test('memory movements separate positive growth from the largest decline',()=>{
 const rows=[{name:'메모리 IC',exportMoM:18.2},{name:'DRAM',exportMoM:-42},{name:'Flash',exportMoM:-19.6}];
 assert.deepEqual(model.memoryMovements?.(rows),{increase:rows[0],decrease:rows[1]});
 assert.deepEqual(model.memoryMovements?.([{exportMoM:null},{exportMoM:0}]),{increase:null,decrease:null});
});
test('technical warning describes provider reasons without inventing a score decline',()=>{
 const result=model.technicalWarning?.([{monitor:{technical:{signal:'TECH_SELL_REVIEW',previousScore:17,score:18,dayDelta:1,reasons:['RSI 75.5 과열','20일 +39.0% 급등']}}}]);
 assert.match(result||'',/RSI 75.5.*20일/);assert.doesNotMatch(result||'',/기술점수 하락/);
 assert.match(model.technicalWarning?.([{monitor:{technical:{reasons:[]}}}])||'',/발동 조건.*미제공/);
});
test('band coverage explains a five-year request backed by three years of observations',()=>{
 assert.match(model.bandCoverage?.({start:'2023-10-06',end:'2026-10-02',observations:157},5)||'',/5년 요청.*약 3\.0년.*157/);
 assert.match(model.bandCoverage?.(null,5)||'',/관측 기간 미제공/);
 assert.match(model.bandCoverage?.({start:'2023-10-06',end:'2026-10-02',observations:157},10,3)||'',/현재 제공 범위 최대 3년/);
});
test('export candidates require product evidence, retain dates, and never infer direct trade',()=>{
 const meta={source:'KRX KIND',asOf:'2026-10-01',companies:[{symbol:'005930.KS',name:'삼성전자',mainProducts:'반도체 제조(메모리) 제품'}, {symbol:'X',name:'반도체 수혜주',industry:'반도체 제조업',mainProducts:'도매'}]};
 const result=model.exportCompanyCandidates?.('semiconductor',meta);
 assert.equal(result?.length,1);assert.equal(result?.[0]?.symbol,'005930.KS');assert.equal(result?.[0]?.basisDate,'2026-10-01');
 assert.deepEqual(model.exportCompanyCandidates?.('unknown',meta),[]);
 const live={source:'KRX KIND',companies:[{symbol:'005930.KS',name:'삼성전자',mainProducts:'통신 및 방송 장비 제조(무선) 제품, 반도체 제조(메모리) 제품, 전자부품 제조(디스플레이) 제품'},{symbol:'000660.KS',name:'SK하이닉스',industry:'반도체 제조업',mainProducts:'반도체,컴퓨터,통신기기 제조,도매'},{symbol:'084010.KS',name:'대덕',mainProducts:'반도체패키지기판,메모리모듈기판 제조'},{symbol:'059090.KQ',name:'미코',mainProducts:'반도체 및 디스플레이 부품 제조'},{symbol:'357780.KQ',name:'솔브레인',mainProducts:'반도체 및 디스플레이 관련 화학재료 제조ㆍ판매 등'}]};
 assert.deepEqual(model.exportCompanyCandidates?.('semiconductor',live)?.map(row=>row.symbol),['005930.KS','000660.KS']);
});
test('discovery context records actual condition, value and date without inventing financial evidence',()=>{
 const result=model.discoveryContext?.({symbol:'123456.KQ',date:'2026-10-02',rsi14:28,volumeRatio:2.3,ret20:5},{volumeMin:'2'},'거래량 급증','2026-10-01');
 assert.equal(result?.basisDate,'2026-10-02');assert.match(result?.observations?.join(' ')||'',/거래량 2\.3배/);
 assert.match(result?.conditions?.join(' ')||'',/2/);assert.match(result?.next||'',/현금흐름/);
});
test('comparison example uses selected or same business peer and never the current company',()=>{
 const rows=[{symbol:'000660.KS',name:'SK하이닉스',industry:'반도체 제조업',mainProducts:'DRAM NAND'},{symbol:'005930.KS',name:'삼성전자',industry:'반도체 제조업',mainProducts:'반도체 제조(메모리) 제품'},{symbol:'123456.KQ',name:'의약회사',mainProducts:'약품'}];
 assert.equal(model.comparisonExample?.('000660.KS',rows)?.symbol,'005930.KS');
 assert.equal(model.comparisonExample?.('123456.KQ',rows),null);
 assert.equal(model.comparisonExample?.('000660.KS',rows,rows[0])?.symbol,'005930.KS');
});
test('home change cards use separate actual dates, cap at three and omit missing data',()=>{
 const result=model.homeChanges?.({period:'2026-09',itemPeriod:'2026-08',summary:{exportYoY:4},items:[{key:'semiconductor',name:'반도체',exportWeightYoY:10,unitValueYoY:-5}]}, {tradeDate:'2026-10-02',stocks:[{symbol:'X',name:'X',volumeRatio:3}]} );
 assert.equal(result?.length,3);assert.deepEqual(result?.map(x=>x.basisDate),['2026-09','2026-08','2026-10-02']);
 assert.deepEqual(model.homeChanges?.({},{}),[]);
});
