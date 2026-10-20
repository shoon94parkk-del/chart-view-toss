import test from 'node:test';
import assert from 'node:assert/strict';
const m=await import('../src/npsAllocationModel.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const baseline={date:'2026-07-31',total:1000,domestic:200,kospi:2000,overseas:400};
const inputs={baseTotal:1000,baseDomestic:200,baseKospi:2000,kospi:2200,target:20,saa:6,taa:2,beta:1,otherReturn:0,fxReturn:10,hedgeRatio:0,netFlow:0,domesticFlow:0,equityReturn:10,bondReturn:0,domesticBondReturn:0,alternativeReturn:0,cashReturn:0,assetModel:1};
const assetBaseline=[{id:'equity',name:'해외주식',base:400,returnKey:'equityReturn',foreignShare:1},{id:'domesticBond',name:'국내채권',base:400,returnKey:'domesticBondReturn',foreignShare:0}];
const seed=()=>({schemaVersion:1,snapshotVersion:'a'.repeat(20),generatedAt:'2026-10-18T21:30:00Z',marketDate:'2026-10-16',baseline:{...baseline},inputs:{...inputs},assetBaseline:structuredClone(assetBaseline),result:{domestic:220,other:884,total:1104,weight:220/1104*100,gap:220/1104*100-20,adjustment:.8,targetKospi:2210,saaKospi:3105.4054054054,taaKospi:3437.7777777778,assets:[{...assetBaseline[0],marketGain:40,fxGain:44,projected:484},{...assetBaseline[1],marketGain:0,fxGain:0,projected:400}]},filing:{reportDate:'2026-06-30',filedDate:'2026-08-13',totalCount:2,directCount:1,reportCoveragePct:90,overseasCoveragePct:50,totalValueUSD:100,detailsFile:'holdings-'+ 'a'.repeat(20)+'.json'},sources:[],warnings:[],update:{frequency:'평일 종가 게시'}});
const invoke=(name,...args)=>{assert.equal(typeof m[name],'function',`${name} must be implemented`);return m[name](...args);};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('NPS scenario revalues other assets and applies currency exactly once',()=>{
 const result=invoke('calculateNpsScenario',seed(),{});near(result.domestic,220);near(result.other,884);near(result.total,1104);near(result.adjustment,.8);near(result.weight,220/1104*100);
 near(invoke('calculateNpsScenario',seed(),{hedgeRatio:100}).other,840);
});
test('domestic transfer keeps total and threshold inversion reaches target',()=>{
 const data=seed(),r=invoke('calculateNpsScenario',data,{});const transferred=invoke('calculateNpsScenario',data,{domesticFlow:r.adjustment});near(transferred.total,r.total);near(transferred.weight,20);
 near(invoke('calculateNpsScenario',data,{kospi:r.targetKospi}).weight,20);
});
test('summary validation rejects impossible, missing, inconsistent and nonfinite data',()=>{
 assert.equal(invoke('validateNpsSummary',seed()).marketDate,'2026-10-16');
 for(const change of [d=>delete d.inputs.kospi,d=>d.result.weight=80,d=>d.result.total=999,d=>d.inputs.fxReturn=-100,d=>d.filing.directCount=9,d=>d.assetBaseline[0].base=-1,d=>d.marketDate='2026-99-01']){const data=seed();change(data);assert.throws(()=>invoke('validateNpsSummary',data));}
});
test('older publications never replace newer market observations',()=>{
 const current=seed(),older=seed();older.marketDate='2026-10-15';assert.equal(invoke('chooseNpsPublication',current,older),current);
 const newer=seed();newer.snapshotVersion='b'.repeat(20);newer.generatedAt='2026-10-18T22:30:00Z';assert.equal(invoke('chooseNpsPublication',current,newer),newer);
});
test('holdings require same publication and preserve missing versus real zero returns',()=>{
 const data=seed(),details={snapshotVersion:data.snapshotVersion,rows:[{ticker:'A',issuer:'A',shares:1,reportValueUSD:90,weightPct:90,totalReturnPct:0,method:'direct',currentValueUSD:90},{ticker:'B',issuer:'B',shares:1,reportValueUSD:10,weightPct:10,totalReturnPct:null,method:'residual',currentValueUSD:null}]};
 assert.equal(invoke('validateNpsHoldings',details,data).rows[0].totalReturnPct,0);assert.throws(()=>invoke('validateNpsHoldings',{...details,snapshotVersion:'wrong'},data));
});
test('freshness uses the price date and never calls collection time a price update',()=>{
 assert.equal(invoke('npsFreshness',seed(),Date.parse('2026-10-18T00:00:00Z')).stale,false);
 assert.equal(invoke('npsFreshness',seed(),Date.parse('2026-10-23T00:00:00Z')).stale,true);
});

test('freshness flags missed Tuesday scheduled close while preserving Friday on Tuesday morning',()=>{
 const data=seed();
 assert.equal(invoke('npsFreshness',data,Date.parse('2026-10-20T00:30:00Z')).stale,false);
 const overdue=invoke('npsFreshness',data,Date.parse('2026-10-20T05:30:00Z'));
 assert.equal(overdue.expectedDate,'2026-10-19');
 assert.equal(overdue.stale,true);
 const updated={...data,marketDate:'2026-10-19'};
 assert.equal(invoke('npsFreshness',updated,Date.parse('2026-10-20T05:30:00Z')).stale,false);
});
test('target KOSPI responds to offshore asset revaluation while preserving domestic holdings',()=>{
 const data=seed();
 const original=invoke('calculateNpsScenario',data);
 const strongerForeign=invoke('calculateNpsScenario',data,{equityReturn:25});
 assert.ok(strongerForeign.targetKospi>original.targetKospi);
 near(invoke('calculateNpsScenario',data,{kospi:strongerForeign.targetKospi,equityReturn:25}).weight,data.inputs.target);
});
