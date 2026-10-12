import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';

// Keep the same two build profiles and scripts as mobile-release-qa.yml.
// Preserve every failure and continue gathering the other release evidence.
const directory='artifacts/toss-exposure-mobile';
mkdirSync(directory,{recursive:true});
const results=[];
function run(name,cmd,args,env={}){
 const started=Date.now();
 const result=spawnSync(cmd,args,{env:{...process.env,...env},encoding:'utf8',maxBuffer:20*1024*1024});
 writeFileSync(`${directory}/${name}.log`,(result.stdout||'')+(result.stderr||'')+(result.error?String(result.error):''));
 const row={name,status:result.status===0?'passed':'failed',exitCode:result.status,durationMs:Date.now()-started};
 results.push(row);console.log(JSON.stringify(row));
 return result.status===0;
}
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
const qaEnv={QA_BASE_URL:base,VITE_CHARTVIEW_STATIC_DATA_BASE:''};
if(run('build-short-timeout','npm',['run','build'],{...qaEnv,VITE_CHARTVIEW_API_TIMEOUT_MS:'300'})){
 for(const name of ['mobile_release','value_discovery','home_journey','sector_heatmap','analysis'])run(name,process.execPath,[`tests/${name}_qa.mjs`],qaEnv);
}
if(run('build-production-timeout','npm',['run','build'],{...qaEnv,VITE_CHARTVIEW_API_TIMEOUT_MS:'12000'})){
 for(const name of ['progressive','reliability_audit','export_recovery','insight_flow','insight_research','insight_followup','mobile_density','mobile_continuity','guru_investing','review_validation','strategy_report','experience_audit','redesign_review','release_gates','audit_plan'])run(name,process.execPath,[`tests/${name}_qa.mjs`],qaEnv);
}
writeFileSync(`${directory}/results.json`,JSON.stringify({schemaVersion:1,base,results},null,2)+'\n');
process.exitCode=results.some(row=>row.status==='failed')?1:0;
