import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRoute} from '../src/routes.js';
import {selectionScorePresentation} from '../src/pickLedger.js';

test('favorites aliases open the existing watch page without changing canonical routes',()=>{
 for(const location of [{hash:'#favorites'},{pathname:'/favorites'},{pathname:'/chartview/favorites'}])assert.deepEqual(resolveRoute(location),{tab:'watch',detailSymbol:null});
 assert.equal(resolveRoute({hash:'#watch'}).tab,'watch');
 assert.equal(resolveRoute({hash:'#earnings'}).tab,'notfound');
});

test('selection score preserves real zero and missing values with separate provenance',()=>{
 const zero=selectionScorePresentation({score:0,analysisSource:'사용자 최종 선택'});
 assert.equal(zero.label,'선정 점수 0점');
 assert.equal(zero.source,'사용자 최종 선택');
 assert.match(zero.note,/원자료에 기록된 값/);
 assert.match(zero.note,/계산 산식/);
 for(const score of [null,undefined,''])assert.equal(selectionScorePresentation({score}).label,'선정 점수 미제공');
 assert.equal(selectionScorePresentation({score:85}).label,'선정 점수 85점');
 assert.match(selectionScorePresentation({score:85}).note,/현재 기술점수/);
});
