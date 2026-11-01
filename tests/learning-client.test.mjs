import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLearningClient} from '../src/learningClient.js';
function setup(fetchImpl){const disk=new Map();let context=1;const client=createLearningClient({base:'https://example.com',fetchImpl,read:()=>disk.get('session'),write:async value=>disk.set('session',value),getContext:()=>context,isContextCurrent:value=>value===context});return {client,disk,switchAccount:()=>{context++;disk.delete('session');}};}
const reply=data=>({ok:true,status:200,json:async()=>data});
test('private requests carry bearer only in headers and disable cache without retrying mutation',async()=>{
 const calls=[];const s=setup(async(url,options)=>{calls.push({url,options});return reply({version:1});});await s.client.setSession({accountId:'a',token:'secret',expiresAt:'2099-01-01'});
 await s.client.request('/sessions',{method:'POST',body:{requestId:'r'}});
 assert.equal(calls.length,1);assert.equal(calls[0].options.headers.Authorization,'Bearer secret');assert.equal(calls[0].options.cache,'no-store');assert.equal(calls[0].options.credentials,'omit');assert.equal(calls[0].url,'https://example.com/api/learning/sessions');assert.ok(!calls[0].url.includes('secret'));
});
test('an account switch rejects a late private response and late authentication cannot save credentials',async()=>{
 let finish;const s=setup(()=>new Promise(resolve=>{finish=resolve;}));await s.client.setSession({accountId:'a',token:'secret',expiresAt:'2099-01-01'});
 const pending=s.client.request('/workspace');s.switchAccount();finish(reply({sessions:[{private:'A'}]}));await assert.rejects(pending,e=>e.code==='STALE_ACCOUNT');assert.equal(await s.client.getSession(),null);
});
test('409 exposes the conflict and does not clear durable credentials or automatically resend',async()=>{
 let count=0;const s=setup(async()=>{count++;return {ok:false,status:409,json:async()=>({detail:'version conflict'})};});await s.client.setSession({accountId:'a',token:'secret',expiresAt:'2099-01-01'});
 await assert.rejects(s.client.request('/sessions',{method:'POST',body:{}}),e=>e.status===409);assert.equal(count,1);assert.equal((await s.client.getSession()).token,'secret');
});
test('logout clears local session before a slow revocation and prevents late authenticated paint',async()=>{
 let finish;const s=setup(()=>new Promise(resolve=>{finish=resolve;}));await s.client.setSession({accountId:'a',token:'secret',expiresAt:'2099-01-01'});const pending=s.client.logout();assert.equal(await s.client.getSession(),null);finish(reply({ok:true}));await pending;
});
test('unconfigured and expired accounts are explicit and session secrets never survive invalid auth',async()=>{
 const s=setup(async()=>({ok:false,status:503,json:async()=>({detail:'Durable storage unavailable'})}));await assert.rejects(s.client.request('/status',{public:true}),e=>e.status===503);
 await s.client.setSession({accountId:'a',token:'secret',expiresAt:'2000-01-01'});assert.equal(await s.client.getSession(),null);
});
test('authentication arriving after a device-account switch never installs the prior account token',async()=>{
 let finish;const s=setup(()=>new Promise(resolve=>{finish=resolve;}));const pending=s.client.authenticate('recovery-secret');s.switchAccount();finish(reply({accountId:'a',token:'late-secret',expiresAt:'2099-01-01'}));await assert.rejects(pending,e=>e.code==='STALE_ACCOUNT');assert.equal(s.disk.get('session'),undefined);
});
test('401 discards the current credential and route abort never returns private payload',async()=>{
 const s=setup(async()=>({ok:false,status:401,json:async()=>({detail:'expired'})}));await s.client.setSession({accountId:'a',token:'secret',expiresAt:'2099-01-01'});await assert.rejects(s.client.request('/workspace'),e=>e.status===401);assert.equal(s.client.getSession(),null);
 const abort=new AbortController();let finish;const held=setup(()=>new Promise(resolve=>{finish=resolve;}));await held.client.setSession({accountId:'a',token:'secret',expiresAt:'2099-01-01'});const pending=held.client.request('/workspace',{signal:abort.signal});abort.abort();finish(reply({sessions:[{private:'value'}]}));await assert.rejects(pending,e=>e.code==='ABORTED');
});
test('malformed stored expiry never authenticates a request',async()=>{
 const s=setup(async()=>reply({}));s.disk.set('session',JSON.stringify({accountId:'a',token:'secret',expiresAt:'invalid-date'}));assert.equal(s.client.getSession(),null);await assert.rejects(s.client.request('/workspace'),e=>e.status===401);
});
test('a cross-tab credential replacement cannot send an old rendered draft under the new bearer',async()=>{
 const calls=[];const s=setup(async(url,options)=>{calls.push({url,options});return reply({workspace:{}});});await s.client.setSession({accountId:'account-a',token:'token-a',expiresAt:'2099-01-01'});
 s.disk.set('session',JSON.stringify({accountId:'account-b',token:'token-b',expiresAt:'2099-01-01'}));
 await assert.rejects(s.client.request('/sessions',{method:'POST',body:{notes:'private A'},expectedAccountId:'account-a',expectedToken:'token-a'}),e=>e.code==='STALE_ACCOUNT');assert.equal(calls.length,0);
 await assert.rejects(s.client.logout({expectedAccountId:'account-a',expectedToken:'token-a'}),e=>e.code==='STALE_ACCOUNT');assert.equal(s.client.getSession().accountId,'account-b');
});
test('a replacement credential appearing while a private response is parsed rejects the old response',async()=>{
 let finish;const s=setup(async()=>({ok:true,status:200,json:()=>new Promise(resolve=>{finish=resolve;})}));await s.client.setSession({accountId:'a',token:'token-a',expiresAt:'2099-01-01'});const pending=s.client.request('/workspace',{expectedAccountId:'a',expectedToken:'token-a'});await Promise.resolve();s.disk.set('session',JSON.stringify({accountId:'b',token:'token-b',expiresAt:'2099-01-01'}));finish({sessions:['private A']});await assert.rejects(pending,e=>e.code==='STALE_ACCOUNT');
});
test('an unchanged stored account with an expired token requests recovery without discarding its draft identity',async()=>{
 let calls=0;const s=setup(async()=>{calls++;return reply({});});await s.client.setSession({accountId:'a',token:'expired-a',expiresAt:'2000-01-01'});
 await assert.rejects(s.client.request('/sessions',{method:'POST',body:{notes:'retained draft'},expectedAccountId:'a',expectedToken:'expired-a'}),e=>e.status===401&&e.code!=='STALE_ACCOUNT');assert.equal(calls,0);assert.equal(JSON.parse(s.disk.get('session')).accountId,'a');
});
