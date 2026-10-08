import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as settle} from 'node:timers/promises';
import {loadDetailModule} from '../src/detailModuleRecovery.js';

function harness() {
  const saved=Object.fromEntries(['document','location','fetch'].map(key=>[key,globalThis[key]]));
  const links=[],reloads=[],calls=[],button={disabled:false};
  const host={isConnected:true,innerHTML:'pending',querySelector:()=>button};
  globalThis.document={querySelectorAll:()=>links};
  globalThis.location={origin:'https://app.test',reload:()=>reloads.push(true)};
  globalThis.fetch=async(href,options)=>{calls.push({href,options});return new Response('export {};',{headers:{'content-type':'text/javascript'}});};
  return {host,links,reloads,calls,button,restore(){for(const [key,value] of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}};
}
test('optional detail chunk failure stays host-local and retry only repairs bounded own assets',async()=>{
  const h=harness();let mounted=0;
  try {
    loadDetailModule({host:h.host,key:'unit-assets',isCurrent:()=>true,load:()=>{
      h.links.push(...Array.from({length:9},(_,i)=>({href:`https://app.test/assets/section-${i}.js`})),{href:'https://external.test/assets/no.js'});
      return Promise.reject(new Error('failed chunk'));
    },mount:()=>mounted++});
    await settle();assert.match(h.host.innerHTML,/data-retry-detail-module/);assert.equal(mounted,0);
    await h.button.onclick();assert.equal(h.calls.length,6);assert.equal(h.reloads.length,1);
    assert.ok(h.calls.every(row=>row.options.cache==='reload'&&row.options.signal));
  }finally{h.restore();}
});
test('late optional detail import cannot mount into a detached or newer host',async()=>{
  const h=harness();let resolve,mounted=0;
  try {
    const cleanup=loadDetailModule({host:h.host,key:'unit-late',isCurrent:()=>true,load:()=>new Promise(done=>{resolve=done;}),mount:()=>mounted++});
    await settle();cleanup();resolve({});await settle();assert.equal(mounted,0);assert.equal(h.host.innerHTML,'pending');
  }finally{h.restore();}
});
test('leaving detail during repair aborts its request and prevents document reload',async()=>{
  const h=harness();let signal;
  try {
    globalThis.fetch=async(_,options)=>new Promise((resolve,reject)=>{signal=options.signal;signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});});
    const cleanup=loadDetailModule({host:h.host,key:'unit-cancel',isCurrent:()=>true,load:()=>{h.links.push({href:'https://app.test/assets/cancel.js'});return Promise.reject(new Error('failed'));},mount:()=>{}});
    await settle();const pending=h.button.onclick();await settle();cleanup();await pending;
    assert.equal(signal.aborted,true);assert.equal(h.reloads.length,0);
  }finally{h.restore();}
});
test('late failed preload is retained for repair after reentry without replacing the departed host',async()=>{
  const h=harness();let reject;
  try {
    const cleanup=loadDetailModule({host:h.host,key:'unit-reentry',isCurrent:()=>true,load:()=>{
      h.links.push({href:'https://app.test/assets/retained.js'});
      return new Promise((resolve,fail)=>{reject=fail;});
    },mount:()=>{}});
    await settle();cleanup();reject(new Error('late failure'));await settle();assert.equal(h.host.innerHTML,'pending');
    loadDetailModule({host:h.host,key:'unit-reentry',isCurrent:()=>true,load:()=>Promise.reject(new Error('cached preload failure')),mount:()=>{}});
    await settle();await h.button.onclick();assert.deepEqual(h.calls.map(row=>row.href),['https://app.test/assets/retained.js']);
  }finally{h.restore();}
});
test('detail loader owns its preload synchronously before another shared consumer can add unrelated assets',async()=>{
  const h=harness();let reject,started=false;
  try {
    loadDetailModule({host:h.host,key:'unit-shared-order',isCurrent:()=>true,load:()=>{
      started=true;h.links.push({href:'https://app.test/assets/shared-quarter.js'});
      return new Promise((resolve,fail)=>{reject=fail;});
    },mount:()=>{}});
    assert.equal(started,true);
    h.links.push({href:'https://app.test/assets/unrelated-review.js'});
    reject(new Error('shared quarter failed'));await settle();await h.button.onclick();
    assert.deepEqual(h.calls.map(row=>row.href),['https://app.test/assets/shared-quarter.js']);
  }finally{h.restore();}
});
