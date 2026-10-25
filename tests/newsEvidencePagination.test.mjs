import test from 'node:test';
import assert from 'node:assert/strict';
import {mountNewsReader} from '../src/newsReaderView.js';
const article=i=>({url:`https://news.test/${i}`,title:`기사 ${i}`,symbol:'AAPL',name:'애플',source:i%2?'경제':'매체',relationType:'direct',score:100-i,publishedTs:i});
const payload={items:Array.from({length:31},(_,i)=>article(i))};
function harness(){
 const listeners=new Map();const host={innerHTML:'',contains:x=>x.inside===true,addEventListener:(t,f)=>listeners.set(t,f),removeEventListener:(t,f)=>{if(listeners.get(t)===f)listeners.delete(t);},querySelector:()=>null};
 return {host,click(dataset){return listeners.get('click')?.({target:{closest:()=>({inside:true,dataset})}});},count:()=>[...host.innerHTML.matchAll(/data-news-reader-card=/g)].length};
}
test('more displays loaded articles by twelve, retains range on detail return, and never requests a summary',()=>{
 const h=harness(),preferences={};let requests=0;
 const options={preferences,loadSummary:()=>{requests++;}};
 let cleanup=mountNewsReader(h.host,payload,options);assert.equal(h.count(),12);
 h.click({newsMore:''});assert.equal(h.count(),24);assert.match(h.host.innerHTML,/1–24개 표시/);assert.equal(requests,0);cleanup();
 cleanup=mountNewsReader(h.host,{...payload,errors:[{}]},options);assert.equal(h.count(),24);assert.match(h.host.innerHTML,/일부 종목/);
 h.click({newsMore:''});assert.equal(h.count(),31);assert.doesNotMatch(h.host.innerHTML,/data-news-more/);assert.equal(requests,0);cleanup();
});
test('filter and sort changes reset pagination while transient errors and smaller payloads preserve requested range',()=>{
 const h=harness(),preferences={};let cleanup=mountNewsReader(h.host,payload,{preferences});
 h.click({newsMore:''});cleanup();
 cleanup=mountNewsReader(h.host,{items:[],errors:[{}]},{preferences});cleanup();
 cleanup=mountNewsReader(h.host,{items:payload.items.slice(0,4)},{preferences});assert.equal(h.count(),4);cleanup();
 cleanup=mountNewsReader(h.host,payload,{preferences});assert.equal(h.count(),24);
 h.click({newsSource:'매체'});assert.equal(h.count(),12);h.click({newsMore:''});assert.equal(h.count(),16);
 h.click({newsClear:''});assert.equal(h.count(),12);h.click({newsMore:''});cleanup();
 cleanup=mountNewsReader(h.host,payload,{preferences,sort:'latest'});assert.equal(h.count(),12);cleanup();
});
test('save evidence forwards only the displayed real article stocks through a separate action',()=>{
 const h=harness(),saved=[];const cleanup=mountNewsReader(h.host,payload,{onSaveEvidence:row=>saved.push(row)});
 assert.match(h.host.innerHTML,/data-news-save-evidence/);
 h.click({newsSaveEvidence:'https://news.test/0'});assert.equal(saved.length,1);assert.equal(saved[0].stocks[0].symbol,'AAPL');
 h.click({newsSaveEvidence:'https://news.test/30'});assert.equal(saved.length,1);cleanup();
});
test('partial news responses do not discard explicitly expanded summary state for temporarily unavailable articles',async()=>{
 const h=harness(),preferences={};let calls=0;
 const loader=async()=>{calls++;return {summary:'확인한 요약',basis:'article_body'};};
 let cleanup=mountNewsReader(h.host,{items:[article(0),article(1)]},{preferences,loadSummary:loader});h.click({newsSummary:'https://news.test/0'});await new Promise(resolve=>setImmediate(resolve));cleanup();
 cleanup=mountNewsReader(h.host,{items:[article(1)],errors:[{symbol:'AAPL'}]},{preferences,loadSummary:loader});cleanup();
 cleanup=mountNewsReader(h.host,{items:[article(0),article(1)]},{preferences,loadSummary:loader});assert.match(h.host.innerHTML,/확인한 요약/);assert.equal(calls,1);cleanup();
});
test('the final more action moves keyboard focus to the updated visible range after its button disappears',()=>{
 const h=harness();let focused=false;const active={inside:true,dataset:{newsMore:''}};
 h.host.ownerDocument={activeElement:active};h.host.querySelector=selector=>selector==='.news-reader-count'?{focus(){focused=true;}}:null;
 const cleanup=mountNewsReader(h.host,{items:payload.items.slice(0,13)});h.click({newsMore:''});assert.equal(focused,true);cleanup();
});
