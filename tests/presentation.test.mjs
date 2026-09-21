import test from 'node:test';
import assert from 'node:assert/strict';
import {formatCurrencyPrice,formatMacroValue,formatMacroChange} from '../src/dataPresentation.js';
test('missing market values are never shown as zero prices or changes',()=>{
 assert.equal(formatCurrencyPrice(null,'KRW'),'-');
 assert.equal(formatMacroValue({symbol:'PCEPI',value:null}),'-');
 assert.equal(formatMacroChange({symbol:'PCEPI',displayChange:null,delta:null,change:null,changeUnit:'bp'}),'비교값 없음');
 assert.equal(formatCurrencyPrice(0,'KRW'),'0원');
 assert.equal(formatMacroChange({symbol:'PCEPI',displayChange:0,changeUnit:'bp'}),'0.0bp');
});
