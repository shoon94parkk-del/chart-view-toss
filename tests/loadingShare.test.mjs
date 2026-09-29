import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadingIndicator } from '../src/loadingView.js';

const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const analysis=fs.readFileSync(new URL('../src/analysisViews.js',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');

test('loading indicator is visible, accessible and safely escapes labels',()=>{
 const html=loadingIndicator('<차트>');
 assert.match(html,/role="status"/);
 assert.match(html,/loading-spinner/);
 assert.match(html,/&lt;차트&gt;/);
 assert.doesNotMatch(html,/<차트>/);
});

test('chart and detail loading overlays clear for data and error states',()=>{
 assert.match(main,/id="chart-loading"/);
 assert.match(main,/id="detail-chart-loading"/);
 assert.match(main,/document\.querySelector\('#chart-loading'\)\?\.remove\(\)/);
 assert.match(main,/document\.querySelector\('#detail-chart-loading'\)\?\.remove\(\)/);
 assert.match(styles,/@media\(prefers-reduced-motion:reduce\).*\.loading-spinner/);
});

test('all route shells expose share, including Toss native-hidden topbar',()=>{
 assert.match(main,/class="ait-share-row"/);
 assert.match(main,/\[data-share-current\]/);
 assert.match(main,/share\/toss/);
 assert.match(styles,/html\[data-ait-runtime="true"\] \.ait-share-row/);
 assert.match(analysis,/loadingIndicator\(`\$\{titles\[tab\]\} 데이터를 불러오고 있어요`\)/);
});
