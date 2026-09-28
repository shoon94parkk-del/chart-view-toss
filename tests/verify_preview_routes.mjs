import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const dist=new URL('../dist/',import.meta.url);
const root=await readFile(new URL('index.html',dist),'utf8');
for(const route of ['chartviewHome','chartview/chartviewHome','chart','watch','valuation','macro','discover','picks','news','heatmap']){
  const nested=await readFile(new URL(`${route}/index.html`,dist),'utf8');
  assert.equal(nested,root,`direct-entry ${route} must load the same hashed app bundle`);
}
const assets=new URL('assets/',dist);
const scripts=(await readdir(assets)).filter(name=>name.endsWith('.js'));
const bundled=(await Promise.all(scripts.map(name=>readFile(new URL(name,assets),'utf8')))).join('\n');
for(const forbidden of ['PICK 관리','추천 평균 수익률','오늘 주목받는 종목','pick_monitor.json','/api/home-bootstrap']){
  assert.equal(bundled.includes(forbidden),false,`Toss bundle must not ship ${forbidden}`);
}
console.log('Direct-entry static route files match the production app bundle');
