import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

// The SDK artifact has no Render build environment. Keep its public-data reader
// attached to the independently updated publication, including scheduled NPS.
export function aitBuildEnvironment(environment=process.env) {
 return {...environment,VITE_CHARTVIEW_STATIC_DATA_BASE:environment.VITE_CHARTVIEW_STATIC_DATA_BASE||'https://raw.githubusercontent.com/shoon94parkk-del/chart_View/main/static/data'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const npmCli=process.env.npm_execpath;
 if(!npmCli)throw new Error('Run npm run build:ait so the configured npm CLI is used.');
 const cwd=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 const result=spawnSync(process.execPath,[npmCli,'run','build'],{cwd,env:aitBuildEnvironment(),stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
