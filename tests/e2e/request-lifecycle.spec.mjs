import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures.mjs';

const probe='/__request-lifecycle/';
async function installSourceProbe(context,body){
 const source=await readFile(new URL('../../src/requestClient.js',import.meta.url),'utf8');
 await context.route(`**${probe}**`,route=>{
  const path=new URL(route.request().url()).pathname;
  if(path===probe+'source.js')return route.fulfill({contentType:'application/javascript',body:source});
  if(path===probe+'data.json')return route.fulfill({json:{value:0}});
  return route.fulfill({contentType:'text/html',body:`<!doctype html><script type="module">import {createRequestClient} from '${probe}source.js';${body};window.lifecycleReady=true;</script><p>Request lifecycle probe</p>`});
 });
}

test('a 503 released during real pagehide cannot start a transport retry',async({page,context})=>{
 const attempts=[],errors=[];let released=false;
 page.on('console',message=>{
  if(message.text().startsWith('lifecycle-attempt '))attempts.push(Number(message.text().slice('lifecycle-attempt '.length)));
  if(message.text()==='lifecycle-release pagehide')released=true;
 });
 page.on('pageerror',error=>errors.push(error.message));
 await installSourceProbe(context,`
 let release,calls=0;
 const request=createRequestClient({base:'https://chart-view-pkv8.onrender.com',fetchImpl:(...args)=>{
  calls++;console.log('lifecycle-attempt '+calls);
  if(calls===1)return new Promise(resolve=>{release=()=>resolve(new Response('{}',{status:503}));});
  return fetch(...args);
 }});
 window.startLifecycleRequest=()=>{void request('/api/published-data/screener.json',{retries:1}).catch(()=>{});};
 window.addEventListener('pagehide',()=>{console.log('lifecycle-release pagehide');release?.();});
 `);
 await page.goto(probe);await page.waitForFunction(()=>window.lifecycleReady);
 await page.evaluate(()=>window.startLifecycleRequest());
 expect(attempts).toEqual([1]);
 await page.reload();await page.waitForFunction(()=>window.lifecycleReady);
 expect(released).toBe(true);expect(attempts).toEqual([1]);expect(errors).toEqual([]);
});

test('persisted pageshow resumes source-module requests after document suspension',async({page,context})=>{
 await installSourceProbe(context,`
 const request=createRequestClient({base:location.origin});
 window.readLifecycleData=()=>request('${probe}data.json',{retries:0});
 `);
 await page.goto(probe);await page.waitForFunction(()=>window.lifecycleReady);
 const hidden=await page.evaluate(async()=>{
  window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
  try{await window.readLifecycleData();return 'unexpected success';}catch(error){return error.name;}
 });
 expect(hidden).toBe('AbortError');
 const resumed=await page.evaluate(async()=>{
  window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
  return window.readLifecycleData();
 });
 expect(resumed).toEqual({value:0});
});
