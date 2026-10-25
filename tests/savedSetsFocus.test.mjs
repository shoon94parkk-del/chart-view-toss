import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exercise the view's real async operation with a retained rename form. Failed
// persistence must leave the user's draft and keyboard position together.
test('failed inline rename keeps focus on its retained submit control',async()=>{
 const source=readFileSync('src/savedSetsView.js','utf8');
 const operation=source.slice(source.indexOf(' async function run('),source.indexOf('\n form.onsubmit='));
 let renameFocus=0,newNameFocus=0;
 const rename={isConnected:true,disabled:false,focus:()=>renameFocus++};
 const freshName={focus:()=>newNameFocus++};
 const messages=[];
 const context=vm.createContext({busy:false,current:()=>true,document:{activeElement:rename},box:{contains:()=>true},
  list:{querySelectorAll:()=>[{dataset:{savedSetId:'row'},querySelector:()=>null}]},form:{querySelector:()=>freshName},syncDisabled:()=>{},paint:()=>assert.fail('failed rename must retain its form'),message:value=>messages.push(value),
 });
 vm.runInContext(operation+'\nthis.runOperation=run;',context);
 await context.runOperation(async()=>{throw Error('disk full');},'saved',{focus:{id:'row',selector:'[data-saved-set-rename]'}});
 assert.equal(renameFocus,1);assert.equal(newNameFocus,0);assert.match(messages.at(-1),/disk full/);
});

test('delayed saved-set application preserves focus deliberately moved to a chart control',async()=>{
 const source=readFileSync('src/savedSetsView.js','utf8');
 const operation=source.slice(source.indexOf(' async function run('),source.indexOf('\n form.onsubmit='));
 let restored=0,release;
 const apply={isConnected:true,disabled:false,focus:()=>restored++};
 const rangeInput={isConnected:true};
 const document={activeElement:apply,body:{isConnected:true},documentElement:{isConnected:true}};
 const context=vm.createContext({busy:false,current:()=>true,document,box:{contains:()=>true},syncDisabled:()=>{},paint:()=>{},message:()=>{}});
 vm.runInContext(operation+'\nthis.runOperation=run;',context);
 const pending=context.runOperation(()=>new Promise(resolve=>{release=resolve;}),'applied',{redraw:false});
 document.activeElement=rangeInput;release();await pending;
 assert.equal(restored,0);assert.equal(document.activeElement,rangeInput);
});

test('disabled-control blur still restores the original control after saved-set application',async()=>{
 const source=readFileSync('src/savedSetsView.js','utf8');
 const operation=source.slice(source.indexOf(' async function run('),source.indexOf('\n form.onsubmit='));
 let restored=0,release;
 const apply={isConnected:true,disabled:false,focus:()=>restored++};
 const document={activeElement:apply,body:{isConnected:true},documentElement:{isConnected:true}};
 const context=vm.createContext({busy:false,current:()=>true,document,box:{contains:()=>true},syncDisabled:()=>{},paint:()=>{},message:()=>{}});
 vm.runInContext(operation+'\nthis.runOperation=run;',context);
 const pending=context.runOperation(()=>new Promise(resolve=>{release=resolve;}),'applied',{redraw:false});
 document.activeElement=document.body;release();await pending;
 assert.equal(restored,1);
});

test('successful rename restores its replacement control when browser focus falls back to body',async()=>{
 const source=readFileSync('src/savedSetsView.js','utf8');
 const operation=source.slice(source.indexOf(' async function run('),source.indexOf('\n form.onsubmit='));
 let restored=0;
 const submit={isConnected:true,disabled:false,focus:()=>assert.fail('old rename form was removed')};
 const rename={focus:()=>restored++};
 const document={activeElement:submit,body:{isConnected:true},documentElement:{isConnected:true}};
 const context=vm.createContext({busy:false,current:()=>true,document,box:{contains:()=>true},list:{querySelectorAll:()=>[{dataset:{savedSetId:'row'},querySelector:()=>rename}]},form:{querySelector:()=>null},syncDisabled:()=>{},
  paint:()=>{submit.isConnected=false;document.activeElement=document.body;},message:()=>{}});
 vm.runInContext(operation+'\nthis.runOperation=run;',context);
 await context.runOperation(async()=>{},'renamed',{focus:{id:'row',selector:'[data-saved-set-rename]'}});
 assert.equal(restored,1);
});
