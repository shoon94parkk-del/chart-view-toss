import { readFile, mkdir, writeFile } from 'node:fs/promises';

const dist=new URL('../dist/',import.meta.url);
const html=await readFile(new URL('index.html',dist),'utf8');
const paths=[
  'chartviewHome','chartview/chartviewHome',
  'home','chart','watch','valuation','macro','discover','ideas','picks','news',
  'heatmap','consensus','bands','tools','info','more',
];
for(const path of paths){
  const directory=new URL(`${path}/`,dist);
  await mkdir(directory,{recursive:true});
  await writeFile(new URL('index.html',directory),html);
}
console.log(`Exported ${paths.length} direct-entry preview routes`);
