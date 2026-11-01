// Deterministic educational cards; never infer company-specific financial values.
// Formal lesson, official sources, account storage and scored quizzes are unchanged.
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr = value => Array.isArray(value) ? value : [];
const PACKS = {
  food:{label:'식품',product:'식품과 브랜드',flow:['원재료·제품 개발','생산·품질 관리','유통·소비자'],factor:'원/달러 환율',effects:['수출 매출의 원화 환산액 변화 가능','수입 원재료 비용 증가 가능'],question:'원화 가치가 하락하고 수입 원재료 가격도 올랐다면?',options:['수출 기업의 이익은 반드시 증가한다','수출 매출과 수입 원가·환헤지를 함께 비교한다','환율은 이익에 영향을 주지 않는다'],answer:1,why:'수출 매출뿐 아니라 수입 비용, 생산 지역, 결제 통화와 환헤지를 함께 확인해야 해요.'},
  chip:{label:'반도체',product:'반도체와 제조 기술',flow:['기술·설계·설비 투자','반도체 제조·검사','서버·기기 등 수요처'],factor:'메모리 업황',effects:['수요·판매가격이 매출에 영향','수율·생산능력·투자가 비용에 영향'],question:'반도체 출하량이 증가하면 이익도 반드시 증가할까요?',options:['출하량만 늘면 반드시 증가한다','판매가격·원가·수율을 함께 확인한다','판매가격은 실적과 무관하다'],answer:1,why:'제품 가격, 제품 조합, 수율과 비용을 함께 봐야 이익 변화를 설명할 수 있어요.'},
  beauty:{label:'뷰티',product:'화장품과 미용 제품',flow:['제품 기획·브랜드','제조·마케팅·판매','유통 채널·소비자'],factor:'해외 소비와 환율',effects:['해외 수요가 판매량에 영향','광고비·채널 수수료가 마진에 영향'],question:'해외 판매량이 급증하면 영업이익도 반드시 급증할까요?',options:['판매량 증가만으로 이익도 같은 비율로 늘어난다','마케팅비·유통비·가격과 마진도 확인한다','마케팅비는 이익과 무관하다'],answer:1,why:'매출 증가율과 이익 증가율은 다릅니다. 광고비와 유통비를 포함해 확인해요.'},
  power:{label:'전력기기',product:'전력 설비와 부품',flow:['부품·설계·조달','전력기기 제조·검사','전력망·산업설비 고객'],factor:'전력 인프라 투자',effects:['수주와 납기가 매출 인식에 영향','원자재 가격과 생산능력이 마진에 영향'],question:'전력기기 수주가 늘면 이익이 즉시 확정될까요?',options:['수주 발표 즉시 매출과 이익이 발생한다','납기·원가·계약 조건을 확인한다','원재료비는 마진과 무관하다'],answer:1,why:'수주와 매출 인식은 다릅니다. 계약 조건, 제작·납기, 원가를 함께 확인해요.'},
  general:{label:'기업 분석',product:'제품과 서비스',flow:['원재료·기술·인력','제품·서비스 제공','고객과 매출'],factor:'경기·금리·환율',effects:['수요와 가격이 매출에 영향','자금·원가·운영비가 이익에 영향'],question:'매출이 증가하면 영업이익도 반드시 증가할까요?',options:['매출 성장만으로 이익 성장도 확정된다','매출뿐 아니라 원가와 영업비용도 확인한다','비용은 이익과 무관하다'],answer:1,why:'매출보다 비용이 더 빠르게 증가하면 이익은 오히려 감소할 수 있어요.'}
};
export function visualLearningTemplate(lesson={}) {
  const company=arr(lesson.companies)[0]||lesson.company||{};
  const symbol=String(company.symbol||'').replace(/\.(KS|KQ)$/i,'');
  const text=[lesson.industry,company.industry,lesson.title,company.name].filter(x=>typeof x==='string').join(' ');
  let kind='general';
  if(['003230','004370','271560'].includes(symbol)||/식품|라면|푸드/.test(text))kind='food';
  else if(['000660','005930'].includes(symbol)||/반도체|메모리|HBM|DRAM/.test(text))kind='chip';
  else if(symbol==='278470'||/화장품|뷰티|미용/.test(text))kind='beauty';
  else if(symbol==='062040'||/전력기기|변압기|송배전/.test(text))kind='power';
  return {...PACKS[kind],kind,company:company.name||lesson.title||'이번 수업',industry:lesson.industry||company.industry||'산업 분석'};
}
function picture(kind) {
  const wrapStart='<svg viewBox="0 0 320 165" role="img" xmlns="http://www.w3.org/2000/svg" aria-label="산업 구조 교육용 그림"><rect width="320" height="165" rx="22" fill="#eef5ff"/>';
  const art={
    food:'<rect x="65" y="25" width="84" height="114" rx="12" fill="#e95f56"/><rect x="74" y="34" width="66" height="97" rx="7" fill="#f6b34d"/><path d="M84 87q23-32 46 0q-23 26-46 0" fill="#fff5d4"/><path d="M93 86q12-12 25 0" stroke="#dd7c3c" stroke-width="4" fill="none"/><path d="M168 85h29m-9-9 9 9-9 9" stroke="#64819c" stroke-width="5" fill="none"/><rect x="217" y="55" width="55" height="74" rx="5" fill="#73addb"/><path d="M213 55h63l-7-14h-49z" fill="#398bca"/>',
    chip:'<rect x="95" y="30" width="130" height="109" rx="14" fill="#31558b"/><rect x="108" y="43" width="104" height="83" rx="8" fill="#76acf3"/><path d="M122 62h76v10h-76zm0 23h76v10h-76zm0 23h76v10h-76z" fill="#d9edff"/><path d="M77 54h18m-18 26h18m-18 26h18m-18 26h18m130-78h18m-18 26h18m-18 26h18m-18 26h18" stroke="#4c87d0" stroke-width="7" stroke-linecap="round"/>',
    beauty:'<rect x="73" y="61" width="75" height="76" rx="12" fill="#f1a5c5"/><rect x="88" y="38" width="45" height="27" rx="5" fill="#ca739e"/><path d="M89 97h43" stroke="white" stroke-width="6" stroke-linecap="round"/><rect x="185" y="49" width="67" height="89" rx="12" fill="#bfafe8"/><rect x="196" y="39" width="45" height="15" rx="4" fill="#8b7ac2"/><path d="M199 94h39" stroke="white" stroke-width="6" stroke-linecap="round"/>',
    power:'<rect x="63" y="50" width="80" height="91" rx="8" fill="#55a49b"/><path d="M75 68h56v56H75z" fill="#bce8d9"/><circle cx="103" cy="95" r="18" fill="none" stroke="#539f97" stroke-width="6"/><path d="M162 95h34m-10-10 10 10-10 10m32-64-28 99m28-99 28 99m-47-70h37m-44 24h45m-51 24h57" fill="none" stroke="#488e84" stroke-width="5" stroke-linecap="round"/>',
    general:'<rect x="58" y="57" width="86" height="78" rx="6" fill="#7daae4"/><path d="M67 57V37h66v20M73 78h16m14 0h16m-46 21h16m14 0h16" fill="none" stroke="white" stroke-width="6" stroke-linecap="round"/><path d="M155 95h34m-10-9 10 9-10 9" fill="none" stroke="#6388b5" stroke-width="5"/><rect x="209" y="70" width="68" height="65" rx="7" fill="#9acfe2"/><path d="M202 70h82l-8-18h-66z" fill="#4e8ed2"/>'
  };
  return wrapStart+(art[kind]||art.general)+'</svg>';
}
const card=(i,title,body)=>'<article class="learning-visual-card" data-visual-card aria-label="'+i+'번 학습 카드"><header><small>'+i+' / 5</small><strong>'+esc(title)+'</strong></header>'+body+'</article>';
function summary(section) {
  const raw=String(section?.body||'').trim().replace(/\s+/g,' ');
  const chars=[...raw];
  return esc(!raw?'자세한 수업 내용은 아래 원문 공부 자료에서 확인하세요.':chars.length>140?chars.slice(0,140).join('')+'…':raw);
}
export function visualLearningMarkup(lesson={}) {
  const t=visualLearningTemplate(lesson);
  const topics=arr(lesson.sections).slice(0,3);
  const topicHtml=topics.length?topics.map((s,i)=>'<li><strong>'+esc(s.title||'공부 '+(i+1))+'</strong><p>'+summary(s)+'</p></li>').join(''):'<li>공식 사업보고서에서 제품·고객·실적을 확인해 보세요.</li>';
  const flow=t.flow.map((n,i)=>'<div class="learning-visual-node"><span>0'+(i+1)+'</span><strong>'+esc(n)+'</strong></div>'+(i<2?'<span aria-hidden="true" class="learning-visual-arrow">↓</span>':'')).join('');
  const effects=t.effects.map(x=>'<p>• '+esc(x)+'</p>').join('');
  const answers=t.options.map((o,i)=>'<label><input type="radio" name="visual-learning-check" value="'+i+'"><span>'+esc(o)+'</span></label>').join('');
  return '<section class="learning-visual" data-learning-visual aria-label="그림으로 이해하는 기업">'
    +'<div class="learning-visual-heading"><span>VISUAL LEARNING · LLM 호출 0회</span><h3>먼저 그림으로 이해해요</h3><p>'+esc(t.company)+' · '+esc(t.industry)+' · 5장의 개념 카드</p></div>'
    +'<div class="learning-visual-track" data-learning-visual-track tabindex="0" aria-label="좌우로 넘기는 다섯 장의 학습 카드">'
    +card(1,'무엇을 만드는 산업인가?','<div class="learning-visual-art">'+picture(t.kind)+'</div><span class="learning-visual-chip">'+esc(t.label)+'</span><h4>'+esc(t.product)+'</h4><p>이 기업의 실제 제품, 고객, 매출 비중을 공시에서 직접 확인해 보세요.</p><p class="learning-visual-note">직접 제작한 산업 개념도로 실제 기업 제품 사진이 아닙니다.</p>')
    +card(2,'돈이 흘러가는 구조','<div class="learning-visual-flow">'+flow+'</div><p class="learning-visual-note">산업의 일반적인 예시입니다. 실제 공급망·거래처는 공시로 확인해야 합니다.</p>')
    +card(3,'매출과 이익은 다릅니다','<div class="learning-visual-equation"><div><small>매출</small><strong>판매량 × 판매단가</strong></div><span>−</span><div><small>영업비용</small><strong>매출원가 + 판매관리비</strong></div><span>=</span><div><small>영업이익</small><strong>매출 − 영업비용</strong></div></div><p>매출이 늘어도 비용이 더 빠르게 늘면 영업이익은 줄어들 수 있어요.</p>')
    +card(4,'이번 수업의 핵심','<ol class="learning-visual-topics">'+topicHtml+'</ol><div class="learning-visual-effects"><strong>'+esc(t.factor)+' 변화 시</strong>'+effects+'</div><p class="learning-visual-note">확인된 사실과 경제적 가설을 구분하세요.</p>')
    +card(5,'내가 이해했는지 확인','<fieldset class="learning-visual-check" data-visual-correct="'+t.answer+'"><legend>'+esc(t.question)+'</legend>'+answers+'<p class="learning-visual-feedback" data-visual-feedback role="status" aria-live="polite" hidden></p><p class="learning-visual-explanation" data-visual-explanation hidden>'+esc(t.why)+'</p></fieldset><p class="learning-visual-note">연습용 문제로 점수가 저장되지 않습니다. 정식 퀴즈는 아래에서 별도 제출하세요.</p>')
    +'</div><nav class="learning-visual-controls" aria-label="학습 카드 이동"><button type="button" data-visual-step="-1" aria-label="이전 학습 카드">‹ 이전</button><span>좌우로 넘겨 보기</span><button type="button" data-visual-step="1" aria-label="다음 학습 카드">다음 ›</button></nav></section>';
}
export function bindVisualLearningInteractions(root) {
  root.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-visual-step]');
    if(!button||!root.contains(button))return;
    const track=button.closest('[data-learning-visual]')?.querySelector('[data-learning-visual-track]');
    const first=track?.querySelector('[data-visual-card]');
    if(!first)return;
    const size=first.getBoundingClientRect().width+12;
    const next=Math.max(0,Math.min(4,Math.round(track.scrollLeft/size)+Number(button.dataset.visualStep)));
    track.scrollTo({left:next*size,behavior:'smooth'});
  });
  root.addEventListener('change',event=>{
    const input=event.target;
    if(!input.matches?.('[data-learning-visual] input[name="visual-learning-check"]'))return;
    const field=input.closest('[data-visual-correct]');
    const feedback=field?.querySelector('[data-visual-feedback]');
    const explanation=field?.querySelector('[data-visual-explanation]');
    if(!feedback||!explanation)return;
    feedback.hidden=false;explanation.hidden=false;
    const correct=Number(input.value)===Number(field.dataset.visualCorrect);
    feedback.textContent=correct?'정답입니다. 핵심 조건을 이해했어요.':'다시 생각해 보세요. 함께 확인할 조건이 있어요.';
    feedback.dataset.result=correct?'correct':'retry';
  });
}
