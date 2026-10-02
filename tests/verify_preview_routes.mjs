import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const dist=new URL('../dist/',import.meta.url);
const root=await readFile(new URL('index.html',dist),'utf8');
for(const route of ['chartviewHome','chartview/chartviewHome','chart','watch','valuation','macro','exports','discover','picks','news','heatmap']){
  const nested=await readFile(new URL(`${route}/index.html`,dist),'utf8');
  assert.equal(nested,root,`direct-entry ${route} must load the same hashed app bundle`);
}
const assets=new URL('assets/',dist);
const scripts=(await readdir(assets)).filter(name=>name.endsWith('.js'));
const bundled=(await Promise.all(scripts.map(name=>readFile(new URL(name,assets),'utf8')))).join('\n');
for(const required of ['최근 주목받는 종목','선정 종목 사후 수익률','pick_monitor.json','/api/home-bootstrap','수출 모멘텀']){
  assert.equal(bundled.includes(required),true,`App bundle must include ${required}`);
}
console.log('Direct-entry static route files match the production app bundle');
