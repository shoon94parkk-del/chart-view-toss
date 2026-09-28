import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const dist=new URL('../dist/',import.meta.url);
const root=await readFile(new URL('index.html',dist),'utf8');
for(const route of ['chartviewHome','chartview/chartviewHome','chart','watch','valuation','macro','discover','news','heatmap']){
  const nested=await readFile(new URL(`${route}/index.html`,dist),'utf8');
  assert.equal(nested,root,`direct-entry ${route} must load the same hashed app bundle`);
}
console.log('Direct-entry static route files match the production app bundle');
