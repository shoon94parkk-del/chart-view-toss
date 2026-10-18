import test from 'node:test';
import assert from 'node:assert/strict';
const m=await import('../scripts/build-ait.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
const make=env=>{assert.equal(typeof m.aitBuildEnvironment,'function');return m.aitBuildEnvironment(env);};
test('native release builds use the independently updated public data path without Render-only environment',()=>{
 const source={VITE_CHARTVIEW_API_BASE:'https://chart-view-pkv8.onrender.com'};
 assert.equal(make(source).VITE_CHARTVIEW_STATIC_DATA_BASE,'https://raw.githubusercontent.com/shoon94parkk-del/chart_View/main/static/data');
 assert.equal(source.VITE_CHARTVIEW_STATIC_DATA_BASE,undefined);
 assert.equal(make({...source,VITE_CHARTVIEW_STATIC_DATA_BASE:''}).VITE_CHARTVIEW_STATIC_DATA_BASE,'https://raw.githubusercontent.com/shoon94parkk-del/chart_View/main/static/data');
});
test('native builds preserve an explicitly configured public data host and unrelated SDK environment',()=>{
 assert.deepEqual(make({VITE_CHARTVIEW_STATIC_DATA_BASE:'https://data.example.com',APP_KEY:'chartview'}),{VITE_CHARTVIEW_STATIC_DATA_BASE:'https://data.example.com',APP_KEY:'chartview'});
});
