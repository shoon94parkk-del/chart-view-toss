import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as exportModel from '../src/exportMomentumModel.js';
import {memoryMovements} from '../src/insightModel.js';
const loadView=(file,imports={})=>{const context=vm.createContext(imports);vm.runInContext(readFileSync(new URL('../src/'+file,import.meta.url),'utf8').replace(/^import[\s\S]*?;\r?\n/gm,'').replaceAll('export ',''),context);return context;};
test('item detail puts company investigation after summary and keeps country data in disclosures',()=>{
 const view=loadView('exportMomentumView.js',{...exportModel,memoryMovements});
 const html=view.renderItemDetail({key:'car',name:'자동차',note:'HS 87',period:'2026-08',history:[],countries:[]});
 assert.match(html,/data-export-research-jump/);
 assert.ok(html.indexOf('export-detail-summary')<html.indexOf('data-export-research-jump'));
 assert.ok(html.indexOf('export-research')<html.indexOf('export-detail-chart-stack'));
 assert.match(html,/<details[^>]*export-data-details/);
 assert.match(html,/지정 시장/);
});
