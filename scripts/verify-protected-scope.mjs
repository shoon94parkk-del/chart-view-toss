import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const manifest=JSON.parse(readFileSync('docs/audits/2026-10-12-exposure/protected-scope.json','utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
for(const row of manifest.files)assert.equal(hash(readFileSync(row.path)),row.sha256,`Protected file changed: ${row.path}`);
for(const row of manifest.fragments){
 const source=readFileSync(row.path,'utf8'),start=source.indexOf(row.start),end=source.indexOf(row.end,start);
 assert.ok(start>=0&&end>start,`Missing protected section: ${row.path}`);
 assert.equal(hash(source.slice(start,end)),row.sha256,`Protected section changed: ${row.path}`);
}
console.log(`${manifest.files.length} files and ${manifest.fragments.length} PICK sections match ${manifest.base}`);
