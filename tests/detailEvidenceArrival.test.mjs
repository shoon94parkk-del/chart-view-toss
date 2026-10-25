import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
function harness({layout=true}={}){
 const source=readFileSync('src/main.js','utf8');
 const start=source.indexOf('function createDetailEvidenceArrival(');
 assert.notEqual(start,-1,'saved evidence arrival needs a scoped lifecycle');
 const timers=new Map();
 const listeners=new Map(),frames=new Map(),restores=[],completed=[];let next=0,ready=false,current=true,observer,focused=0,top=8000,scroll=0;
 const host={isConnected:true,getBoundingClientRect:()=>({top:top-scroll}),setAttribute(){},focus:()=>focused++};
 const document={addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:(type,fn)=>{if(listeners.get(type)===fn)listeners.delete(type);},querySelector:()=>({getBoundingClientRect:()=>({height:78})})};
 const context=vm.createContext({setTimeout:fn=>{timers.set(++next,fn);return next;},clearTimeout:id=>timers.delete(id),document,MutationObserver:class{constructor(callback){observer=this;this.callback=callback;}observe(){}disconnect(){this.disconnected=true;}},requestAnimationFrame:fn=>{frames.set(++next,fn);return next;},cancelAnimationFrame:id=>frames.delete(id),window:{get scrollY(){return scroll;},__chartviewRestoreScroll:options=>{restores.push(options);if(!options.cancel)frames.set(++next,()=>{scroll=options.top;});}},Math});
 vm.runInContext(source.slice(start,source.indexOf('\nasync function renderDetail(',start))+'\nthis.create=createDetailEvidenceArrival;',context);
 const arrival=context.create({host,container:{},isCurrent:()=>current,ready:()=>ready,layoutReady:()=>layout,onDone:()=>completed.push(true)});
 return {expire:()=>{for(const fn of timers.values())fn();timers.clear();},get timers(){return timers.size;},arrival,listeners,restores,completed,get focused(){return focused;},setReady:()=>{ready=true;},leave:()=>{current=false;},grow:()=>{top=12000;observer.callback();},mutation:()=>observer.callback(),frame:()=>{const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn());},get pending(){return frames.size;},get disconnected(){return observer.disconnected;}};
}
test('evidence arrival waits for initial layout and restores the final target through the root scroll engine',()=>{
 const h=harness();h.arrival.notify();h.frame();assert.equal(h.restores.length,0);
 h.grow();h.setReady();h.arrival.notify();h.frame();h.grow();h.frame();h.frame();h.frame();
 assert.equal(h.restores.length,1);assert.equal(h.restores[0].top,11904);assert.equal(h.restores[0].clamp,true);assert.equal(h.focused,1);assert.equal(h.completed.length,1);assert.equal(h.listeners.size,0);assert.equal(h.disconnected,true);
});
for(const type of ['wheel','touchstart','pointerdown','keydown'])test(`user ${type} cancels pending evidence arrival before late layout can scroll`,()=>{
 const h=harness();h.listeners.get(type)();h.setReady();h.mutation();h.arrival.notify();h.frame();h.frame();h.frame();assert.equal(h.restores.length,0);assert.equal(h.focused,0);assert.equal(h.completed.length,1);
});
test('route cleanup or an obsolete epoch prevents queued evidence arrival',()=>{
 for(const mode of ['cleanup','epoch']){
  const h=harness();h.setReady();h.arrival.notify();h.frame();if(mode==='cleanup')h.arrival.dispose();else h.leave();h.frame();h.frame();assert.equal(h.restores.length,0);assert.equal(h.focused,0);
 }
});
test('input after scheduling the root frame cancels its scroll before application',()=>{
 const h=harness();h.setReady();h.arrival.notify();h.frame();h.frame();assert.equal(h.restores.length,1);h.listeners.get('wheel')();assert.equal(h.restores.at(-1).cancel,true);h.frame();assert.equal(h.focused,0);
});

test('optional layout polling cannot indefinitely block local evidence arrival',()=>{const h=harness({layout:false});h.setReady();h.arrival.notify();assert.equal(h.timers,1);h.expire();h.frame();h.frame();h.frame();h.frame();assert.equal(h.focused,1);});
test('cleanup cancels optional layout deadline',()=>{const h=harness({layout:false});h.setReady();h.arrival.notify();h.arrival.dispose();assert.equal(h.timers,0);h.expire();h.frame();assert.equal(h.focused,0);});
