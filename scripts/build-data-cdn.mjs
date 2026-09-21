import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
// Explicit local input: no remote execution, credentials or automatic publication.
const source=process.argv[2], out=process.argv[3]||'artifacts/data-cdn';
if(!source)throw new Error('Usage: node scripts/build-data-cdn.mjs /path/to/chart_View/static/data [output]');
await mkdir(out,{recursive:true});
const allow=['code','symbol','name','market','date','price','change1d','volumeRatio','rsi14','ret20','avgValue20','above20','cross20','aligned'];
const screener=JSON.parse(await readFile(path.join(source,'screener.json'),'utf8'));
const heatmap=JSON.parse(await readFile(path.join(source,'heatmap.json'),'utf8'));
if(!Array.isArray(screener.stocks)||!Array.isArray(heatmap.sectors))throw new Error('Invalid data schema');
await writeFile(path.join(out,'screener.json'),JSON.stringify({...Object.fromEntries(['tradeDate','generatedAt','updatedAt','updated','source'].filter(k=>screener[k]).map(k=>[k,screener[k]])),stocks:screener.stocks.map(row=>Object.fromEntries(allow.filter(k=>k in row).map(k=>[k,row[k]])))}));
await writeFile(path.join(out,'heatmap.json'),JSON.stringify(heatmap));
await writeFile(path.join(out,'manifest.json'),JSON.stringify({exportedAt:new Date().toISOString(),files:['screener.json','heatmap.json'],sourceDates:{screener:screener.tradeDate||null,heatmap:heatmap.updated||null}}));
await writeFile(path.join(out,'_headers'),'/*\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=300\n  X-Content-Type-Options: nosniff\n');
await writeFile(path.join(out,'404.html'),'<!doctype html><html lang="ko"><meta charset="utf-8"><title>자료 없음</title><p>요청한 자료가 없습니다.</p></html>');
console.log(`Data-only CDN artifact ready: ${out}. No publication performed.`);
