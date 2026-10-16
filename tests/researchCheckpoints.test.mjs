import test from 'node:test';
import assert from 'node:assert/strict';
import {researchCheckpointsHtml} from '../src/researchCheckpoints.js';
const event={id:'one',savedAt:'2026-10-16T02:00:00.000Z',question:'<private question>',reviewOn:'2026-11-01',peer:{name:'<peer>',symbol:'000660.KS'},quote:{price:83000,currency:'KRW',asOf:'2026-10-16T01:00:00+09:00',source:'canonical provider',stale:true,timed:true,priceBasis:'regular_close',quoteBasis:'exchange'}};
test('timeline is collapsed and separates observed quote time, save time, date-only review and stale basis',()=>{
 const html=researchCheckpointsHtml([event]);assert.match(html,/<details class="research-checkpoints" data-research-checkpoints>/);assert.doesNotMatch(html,/<details[^>]+open/);assert.match(html,/저장 시각/);assert.match(html,/2026-10-16T02:00:00.000Z/);assert.match(html,/2026-10-16T01:00:00\+09:00/);assert.match(html,/83,000원/);assert.match(html,/canonical provider/);assert.match(html,/장마감/);assert.match(html,/exchange/);assert.match(html,/오래된/);assert.match(html,/현재 시세 아님/);assert.match(html,/2026-11-01/);assert.doesNotMatch(html,/<private question>|<peer>/);assert.match(html,/&lt;private question&gt;/);
});
test('timeline explicitly discloses missing, untimed and unknown-staleness quotes without inventing times',()=>{
 assert.match(researchCheckpointsHtml([{...event,quote:null}]),/시세 스냅샷 없음/);
 const untimed=researchCheckpointsHtml([{...event,quote:{price:1,currency:'USD',asOf:'2026-10-16',timed:false,stale:false,source:''}}]);assert.match(untimed,/시세 시각 미제공/);assert.match(untimed,/2026-10-16/);assert.match(untimed,/출처 미제공/);assert.match(untimed,/현재 시세 아님/);
 assert.match(researchCheckpointsHtml([{...event,quote:{...event.quote,stale:null}}]),/신선도 미확인/);
 assert.match(researchCheckpointsHtml([]),/아직 저장한 체크포인트가 없어요/);
});
