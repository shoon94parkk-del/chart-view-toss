import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export function assertRenderBranchIntegrated({cwd=process.cwd(),renderRef='origin/feat/apps-in-toss-mvp',mainRef='origin/main'}={}){
 try{execFileSync('git',['merge-base','--is-ancestor',renderRef,mainRef],{cwd,stdio:'pipe'});}
 catch(error){
  if(error.status===1)throw new Error('Render branch contains changes missing from main. Integrate those changes before syncing; previously deployed fixes must not be discarded.');
  throw error;
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)assertRenderBranchIntegrated();
