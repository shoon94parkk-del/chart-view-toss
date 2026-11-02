import test from 'node:test';
import assert from 'node:assert/strict';
import {curatedProductPhoto,allCuratedPhotos,officialProductCatalog} from '../src/learningProductPhotos.js';
import {companyPhotoHtml} from '../src/learningEvidenceCards.js';
import {visualLearningMarkup} from '../src/learningVisualCards.js';

test('verified real product photography is indexed by canonical Korean ticker, including KS/KQ suffix',()=>{
 const samyang=curatedProductPhoto('003230.KS');
 const hynix=curatedProductPhoto('000660');
 const samsung=curatedProductPhoto('005930.KS');
 assert.equal(samyang.creator,'Mobius6');
 assert.equal(hynix.type,'company-product');
 assert.match(samsung.title,/SSD 990/);
 assert.equal(curatedProductPhoto('AAPL'),null);
 assert.equal(curatedProductPhoto('999999'),null);
 assert.equal(allCuratedPhotos().length,4);
});
test('all curated assets have a verified commons image source and license attribution',()=>{
 for(const photo of allCuratedPhotos()) {
   const image=new URL(photo.imageUrl),source=new URL(photo.sourceUrl),license=new URL(photo.licenseUrl);
   assert.equal(image.protocol,'https:');
   assert.equal(image.hostname,'thumb.wikimedia.org');
   assert.ok(image.pathname.startsWith('/wikipedia/commons/thumb/'));
   assert.equal(source.hostname,'commons.wikimedia.org');
   assert.ok(source.pathname.startsWith('/wiki/File:'));
   assert.equal(license.hostname,'creativecommons.org');
   assert.ok(photo.creator.length>=3);
   assert.match(photo.license,/^CC/);
   assert.equal(photo.reviewDate,'2026-11-02');
 }
});
test('photographs are visible on first lesson card with attribution and image-error fallback',()=>{
 const html=visualLearningMarkup({title:'SK하이닉스',industry:'반도체',companies:[{symbol:'000660.KS',name:'SK하이닉스'}]});
 assert.match(html,/data-learning-hero-photo/);
 assert.match(html,/SOCAMM/);
 assert.match(html,/4300streetcar/);
 assert.match(html,/data-learning-photo-illustration hidden/);
 assert.match(html,/사진 원본·출처/);
});
test('image and legal credits on actual company product card',()=>{
 const html=companyPhotoHtml({mainProducts:'DDR5 메모리 모듈'},'SK하이닉스','000660.KS');
 assert.match(html,/learning-evidence-photo/);
 assert.match(html,/SK하이닉스 SOCAMM/);
 assert.match(html,/CC BY 4.0/);
 assert.match(html,/사진 원본·저작자 확인/);
 assert.match(html,/라이선스 조건/);
 assert.match(html,/실제 해당 기업 제품 사진/);
});
test('power transformer photo cannot be misrepresented as a Sansil Electric product',()=>{
 const html=companyPhotoHtml({mainProducts:'변압기'},'산일전기','062040.KS');
 assert.match(html,/산업 대표 사진 · 해당 기업 제품 아님/);
 assert.match(html,/산일전기에서 생산한 제품이라는 근거는 없음/);
 assert.match(html,/CC0 1.0/);
});
test('APR official product catalogue is provided instead of unlicensed Medicube photos',()=>{
 assert.match(officialProductCatalog('278470.KS').url,/themedicube.kr/);
 const html=companyPhotoHtml({mainProducts:'화장품, 뷰티 디바이스'},'에이피알','278470.KS');
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/재사용 권한이 확인된 자산이 없습니다/);
 assert.match(html,/메디큐브 AGE-R 공식 디바이스 라인업/);
});
