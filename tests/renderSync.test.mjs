import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assertRenderBranchIntegrated} from '../scripts/validate-render-sync.mjs';

test('Render sync rejects an unmerged deployed fix and accepts it after integration',()=>{
 const cwd=mkdtempSync(join(tmpdir(),'chartview-render-guard-'));
 const git=(...args)=>execFileSync('git',args,{cwd,stdio:'pipe'});
 const check=()=>assertRenderBranchIntegrated({cwd,renderRef:'preview',mainRef:'main'});
 try{
  git('init','-b','main');git('config','user.name','Regression Test');git('config','user.email','test@example.invalid');
  writeFileSync(join(cwd,'base.txt'),'base');git('add','.');git('commit','-m','base');git('branch','preview');check();
  git('checkout','preview');writeFileSync(join(cwd,'exit.txt'),'preserve EXIT');git('add','.');git('commit','-m','deployed EXIT fix');git('checkout','main');
  assert.throws(check,/changes missing from main/);
  git('merge','--no-edit','preview');check();
  writeFileSync(join(cwd,'audit.txt'),'audit');git('add','.');git('commit','-m','new audit');check();
 }finally{assert.ok(cwd.startsWith(join(tmpdir(),'chartview-render-guard-')));rmSync(cwd,{recursive:true,force:true});}
});
