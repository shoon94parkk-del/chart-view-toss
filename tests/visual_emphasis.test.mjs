import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const emphasis=readFileSync(new URL('../src/emphasis.css',import.meta.url),'utf8');

test('semantic emphasis loads after experience overrides',()=>{
  const experience=main.indexOf("import './uiExperience.css';");
  const visual=main.indexOf("import './emphasis.css';");
  assert.ok(experience>=0&&visual>experience,'emphasis must load after uiExperience');
});

test('home uses consistent export selection and watch identities',()=>{
  assert.match(emphasis,/\.home-changes[\s\S]*--purpose:var\(--cv-teal\)/);
  assert.match(emphasis,/\.home-pick-section[\s\S]*--purpose:var\(--cv-purple\)/);
  assert.match(emphasis,/\.watch-section[\s\S]*--purpose:var\(--cv-gold\)/);
  assert.match(emphasis,/\.home-change-card\.tool-exports[\s\S]*--card-accent:var\(--cv-teal\)/);
  assert.match(emphasis,/\.home-change-card\.tool-find[\s\S]*--card-accent:var\(--cv-blue\)/);
});

test('detail surfaces continue the same semantic identities',()=>{
  assert.match(emphasis,/data-surface="discover"[\s\S]*--purpose:var\(--cv-blue\)/);
  assert.match(emphasis,/data-surface="picks"[\s\S]*--purpose:var\(--cv-purple\)/);
  assert.match(emphasis,/data-surface="exports"[\s\S]*--purpose:var\(--cv-teal\)/);
});

test('semantic status colors are not replaced by section accents',()=>{
  assert.match(emphasis,/data-quality-warning/);
  assert.doesNotMatch(emphasis,/\.pick-ledger-status\.keep/);
  assert.doesNotMatch(emphasis,/\.pick-ledger-status\.watch/);
  assert.doesNotMatch(emphasis,/\.pick-ledger-status\.sell/);
  assert.doesNotMatch(emphasis,/\.up\{/);
  assert.doesNotMatch(emphasis,/\.down\{/);
});
