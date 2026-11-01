import test from 'node:test';
import assert from 'node:assert/strict';
import {visualLearningTemplate,visualLearningMarkup,bindVisualLearningInteractions} from '../src/learningVisualCards.js';

const lesson = {
  title:'삼양식품 기업 공부',industry:'식품',
  companies:[{symbol:'003230',name:'삼양식품',industry:'식품'}],
  sections:[{title:'기업 사업 구조',body:'어떤 제품과 고객으로 돈을 버는지 확인합니다.'},{title:'환율과 비용',body:'원재료비와 해외 판매를 함께 확인합니다.'}]
};

test('five illustrated cards and an interactive formative check are produced without an AI call',()=>{
  const html=visualLearningMarkup(lesson);
  assert.equal((html.match(/data-visual-card/g)||[]).length,5);
  assert.match(html,/data-learning-visual-track/);
  assert.match(html,/식품과 브랜드/);
  assert.match(html,/삼양식품/);
  assert.match(html,/어떤 제품과 고객/);
  assert.match(html,/실제 기업 제품 사진이 아닙니다/);
  assert.match(html,/data-visual-correct="1"/);
  assert.match(html,/점수가 저장되지 않습니다/);
  assert.doesNotMatch(html,/fetch\(|<img.*https?:\/\//);
});
test('industry selection uses an industry template, not fabricated company financial data',()=>{
  assert.equal(visualLearningTemplate({industry:'반도체',companies:[{symbol:'000660',name:'SK하이닉스'}]}).kind,'chip');
  assert.equal(visualLearningTemplate({industry:'화장품',companies:[{symbol:'278470',name:'에이피알'}]}).kind,'beauty');
  assert.equal(visualLearningTemplate({industry:'전력기기',companies:[{symbol:'062040',name:'산일전기'}]}).kind,'power');
  const unknown=visualLearningMarkup({title:'미등록 기업',industry:'분류되지 않음',sections:[]});
  assert.match(unknown,/매출뿐 아니라 원가와 영업비용/);
  assert.doesNotMatch(unknown,/실제 매출 [0-9]+억/);
});
test('untrusted lesson fields are HTML escaped, including class-relevant attributes',()=>{
  const html=visualLearningMarkup({title:'<img src=x onerror=alert(1)>',industry:'x & y',sections:[{title:'<svg/onload=alert(1)>',body:'A < B & C'}]});
  assert.doesNotMatch(html,/<img src=x/);
  assert.doesNotMatch(html,/<svg\/onload/);
  assert.match(html,/&lt;img src=x/);
  assert.match(html,/&lt;svg\/onload/);
  assert.match(html,/A &lt; B &amp; C/);
});
test('navigation and immediate check operate within the current card host only',()=>{
  const callbacks={};
  const track={scrollLeft:0,clientWidth:280,scrollTo:({left})=>{track.scrollLeft=left;},querySelector:()=>({getBoundingClientRect:()=>({width:280})})};
  const visual={querySelector:()=>track};
  const button={dataset:{visualStep:'1'},closest:()=>visual};
  const feedback={hidden:true,textContent:'',dataset:{}};
  const explanation={hidden:true};
  const field={dataset:{visualCorrect:'1'},querySelector:selector=>selector==='[data-visual-feedback]'?feedback:explanation};
  const root={addEventListener:(name,fn)=>{callbacks[name]=fn;},contains:()=>true};
  bindVisualLearningInteractions(root);
  callbacks.click({target:{closest:()=>button}});
  assert.equal(track.scrollLeft,292);
  callbacks.change({target:{matches:()=>true,closest:()=>field,value:'0'}});
  assert.equal(feedback.dataset.result,'retry');
  callbacks.change({target:{matches:()=>true,closest:()=>field,value:'1'}});
  assert.equal(feedback.dataset.result,'correct');
  assert.equal(explanation.hidden,false);
});


test('visual evidence sources reuse validated HTTPS URL rules and never fabricate links',()=>{
  const html=visualLearningMarkup({
    ...lesson,
    sources:[
      {title:'공식 보고서',url:'https://dart.fss.or.kr/example?year=2025'},
      {title:'악성 경로',url:'javascript:alert(1)'},
      {title:'비밀값',url:'https://example.com/?token=secret'}
    ]
  });
  assert.match(html,/data-learning-source/);
  assert.match(html,/data-external-url="https:\/\/dart.fss.or.kr\/example\?year=2025"/);
  assert.doesNotMatch(html,/javascript:alert\(1\)/);
  assert.doesNotMatch(html,/token=secret/);
  const missing=visualLearningMarkup({...lesson,sources:[]});
  assert.match(missing,/원문 링크가 등록되지 않았어요/);
  assert.doesNotMatch(missing,/data-learning-source/);
});
