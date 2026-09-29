import test from 'node:test';
import assert from 'node:assert/strict';
import { classifySupplyChain, buildSectorContext, findSupplyChainPeers, companyContext } from '../src/industryContext.js';

const rows=[
 {symbol:'A.KQ',name:'A장비',industry:'특수 목적용 기계 제조업',mainProducts:'반도체 검사장비',change1d:3,ret5:-2,trend2060:true,volumeRatio:2.2,technicalScore:28,avgValue20:10000000000},
 {symbol:'B.KQ',name:'B소재',industry:'특수 목적용 기계 제조업',mainProducts:'반도체용 세라믹 부품',change1d:1,ret5:4,trend2060:true,volumeRatio:1.1,technicalScore:25,avgValue20:8000000000},
 {symbol:'C.KQ',name:'C테스터',industry:'특수 목적용 기계 제조업',mainProducts:'웨이퍼 메모리 테스터',change1d:2,ret5:6,trend2060:true,volumeRatio:2.4,technicalScore:29,avgValue20:12000000000},
 {symbol:'D.KQ',name:'D장비',industry:'특수 목적용 기계 제조업',mainProducts:'OLED 증착 장비',change1d:-1,ret5:-1,trend2060:false,volumeRatio:1.0,technicalScore:20,avgValue20:5000000000},
 {symbol:'E.KS',name:'E반도체',industry:'반도체 제조업',mainProducts:'DRAM NAND 메모리',change1d:1.5,ret5:3,trend2060:true,volumeRatio:1.3,technicalScore:27,avgValue20:500000000000},
];

test('classifies supply chain by verifiable industry/product keywords',()=>{
 assert.deepEqual(classifySupplyChain(rows[0]),{chain:'semiconductor',chainLabel:'반도체',stage:'장비'});
 assert.equal(classifySupplyChain(rows[1]).stage,'소재·부품');
 assert.equal(classifySupplyChain(rows[4]).stage,'칩·소자');
});

test('sector context measures breadth instead of judging a stock in isolation',()=>{
 const ctx=buildSectorContext(rows[0],rows);
 assert.equal(ctx.peerCount,2);
 assert.equal(ctx.upRatio,.5);
 assert.equal(ctx.avgChange,2);
 assert.equal(ctx.period,'최근 5거래일');
 assert.equal(ctx.label,'표본 부족');
 assert.equal(ctx.leaders[0].symbol,'C.KQ');
 assert.equal(ctx.groupBasis,'KRX 주요제품·산업 단계');
});

test('Samsung Electronics and SK hynix use comparable chip peers despite different KRX industries',()=>{
 const samsung={symbol:'005930.KS',name:'삼성전자',industry:'통신 및 방송 장비 제조업',mainProducts:'통신 장비, 반도체 제조(메모리) 제품, 디스플레이',change1d:1,ret5:5,date:'2026-09-28'};
 const hynix={symbol:'000660.KS',name:'SK하이닉스',industry:'반도체 제조업',mainProducts:'반도체,컴퓨터,통신기기 제조,도매',change1d:2,ret5:-1,date:'2026-09-28'};
 const irrelevant={symbol:'X.KS',name:'통신사',industry:'통신 및 방송 장비 제조업',mainProducts:'방송 장비',change1d:-5,ret5:99,date:'2026-09-28'};
 const old={...hynix,symbol:'OLD.KS',date:'2026-09-27',ret5:99};
 assert.equal(classifySupplyChain(samsung).stage,'칩·소자');
 assert.equal(classifySupplyChain(hynix).stage,'칩·소자');
 const ctx=buildSectorContext(samsung,[samsung,hynix,irrelevant,old]);
 assert.equal(ctx.industry,'메모리 반도체 제조');
 assert.equal(ctx.peerCount,2);
 assert.equal(ctx.avgChange,2);
 assert.equal(ctx.officialIndustry,'통신 및 방송 장비 제조업');
});

test('weekly breadth ignores missing five-session returns and uses observed count for the tone',()=>{
 const base={...rows[0],symbol:'A.KQ',date:'2026-09-29'};
 const observed={...rows[2],date:'2026-09-29'};
 const missing={...rows[0],symbol:'M.KQ',ret5:null,date:'2026-09-29'};
 const ctx=buildSectorContext(base,[base,observed,missing]);
 assert.equal(ctx.peerCount,3);
 assert.equal(ctx.observedCount,2);
 assert.equal(ctx.label,'표본 부족');
 assert.equal(ctx.upRatio,.5);
});

test('company names do not invent industries and LNG insulation is linked to shipbuilding',()=>{
 const portal={symbol:'X.KQ',name:'디지틀조선',industry:'인터넷 정보매개 서비스업',mainProducts:'위성서비스'};
 const insulation={symbol:'033500.KQ',name:'동성화인텍',industry:'기초 화학물질 제조업',mainProducts:'초저온 보냉재'};
 assert.equal(classifySupplyChain(portal),null);
 assert.equal(classifySupplyChain(insulation).chain,'shipbuilding');
 assert.equal(classifySupplyChain(insulation).stage,'소재·기자재');
});

test('core shipbuilders stay in shipbuilding and solar-first distributors are excluded',()=>{
 const builder={symbol:'329180.KS',industry:'선박 및 보트 건조업',mainProducts:'선박, 해양플랜트 및 엔진기계 등'};
 const holding={symbol:'009540.KS',industry:'기타 금융업',mainProducts:'선박,해양구조물,엔진,펌프 전동기 제조'};
 const insulation={symbol:'017960.KS',industry:'구조용 금속제품 제조업',mainProducts:'탄소섬유, LNG선박용 단열판넬'};
 const solar={symbol:'099220.KQ',industry:'기계장비 도매업',mainProducts:'태양광기자재 및 선박용엔진 도매'};
 assert.equal(classifySupplyChain(builder).stage,'조선·플랜트');
 assert.equal(classifySupplyChain(holding).stage,'조선·플랜트');
 assert.equal(classifySupplyChain(insulation).stage,'소재·기자재');
 assert.equal(classifySupplyChain(solar),null);
 const equipment={symbol:'X.KS',industry:'선박 및 보트 건조업',mainProducts:'선용원격자동측정시스템'};
 assert.equal(classifySupplyChain(equipment).stage,'소재·기자재');
});

test('LNG insulation is compared only with matching products, not all ship equipment',()=>{
 const insulation={symbol:'033500.KQ',industry:'기초 화학물질 제조업',mainProducts:'초저온 보냉재',date:'2026-09-29',ret5:3};
 const peer={symbol:'017960.KS',industry:'구조용 금속제품 제조업',mainProducts:'LNG선박용 단열판넬',date:'2026-09-29',ret5:4};
 const engine={symbol:'X.KS',industry:'일반 목적용 기계 제조업',mainProducts:'선박용엔진밸브',date:'2026-09-29',ret5:-8};
 const ctx=buildSectorContext(insulation,[insulation,peer,engine]);
 assert.equal(ctx.industry,'LNG 선박 보냉재');
 assert.equal(ctx.peerCount,2);
 assert.equal(ctx.avgChange,3.5);
 assert.equal(ctx.label,'표본 부족');
});

test('supply peers prefer related chain and identify adjacent stages',()=>{
 const peers=findSupplyChainPeers(rows[0],rows,{limit:3});
 assert.ok(peers.some(x=>x.symbol==='B.KQ'));
 assert.ok(peers.some(x=>x.symbol==='E.KS'));
 assert.ok(peers.every(x=>!['D.KQ'].includes(x.symbol)));
});

test('company context keeps KRX product text separate from inferred supply chain',()=>{
 const ctx=companyContext(rows[0],rows);
 assert.equal(ctx.mainProducts,'반도체 검사장비');
 assert.equal(ctx.supply.chainLabel,'반도체');
 assert.ok(ctx.sector);
});

test('medical device makers are not grouped into pharma by the generic medical term',()=>{
 const medical={symbol:'208370.KQ',name:'셀바스헬스케어',industry:'의료용 기기 제조업',mainProducts:'체성분측정기, 혈압계, 전자정보단말기'};
 const cls=classifySupplyChain(medical);
 assert.equal(cls.chain,'medical-device');
 assert.equal(cls.chainLabel,'의료기기');
 assert.equal(cls.stage,'진단·측정기기');
});
