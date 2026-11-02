// Evidence-based visual study. Reuses the exact existing Chart View Toss DART and company-context APIs.
// No AI, speculative company metrics, unlicensed photos, or writes to server scored attempts.
import {businessReportData,financialHistoryData,companyContextData} from './api.js';
import {safeLearningUrl} from './learningModel.js';
import {curatedProductPhoto,officialProductCatalog} from './learningProductPhotos.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=v=>Array.isArray(v)?v:[];
const num=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const ticker=s=>/^\d{6}(?:\.(?:KS|KQ))?$/i.test(String(s||''))?String(s).toUpperCase():null;
const money=(v,currency)=>num(v)===null?'자료 없음':currency==='KRW'||!currency?((num(v)/1e8).toLocaleString('ko-KR',{maximumFractionDigits:1})+'억 원'):(num(v).toLocaleString('ko-KR')+' '+esc(currency));
const evidenceLink=(url,label)=>{const safe=safeLearningUrl(url);return safe&&new URL(safe).hostname==='dart.fss.or.kr'?'<button type="button" data-learning-source data-external-url="'+esc(safe)+'">'+esc(label)+' ↗</button>':'';};
const unavailable=(reason)=>'<p class="learning-evidence-unavailable">'+esc(reason)+'</p>';
export function revenueEvidenceHtml(data) {
 if(!data?.available)return unavailable('확인 가능한 DART 매출 구성 자료가 없어요. 추정 비중은 표시하지 않습니다.');
 const items=arr(data.items).filter(i=>i&&typeof i.name==='string'&&num(i.share)!==null&&num(i.share)>=0&&num(i.share)<=100).slice(0,6);
 if(!items.length)return unavailable('DART가 검증한 제품·부문별 비중이 없습니다.');
 const bars=items.map(i=>'<div class="learning-evidence-bar"><div><strong>'+esc(i.name)+'</strong><b>'+num(i.share).toLocaleString('ko-KR',{maximumFractionDigits:1})+'%</b></div><span><i style="width:'+num(i.share)+'%"></i></span></div>').join('');
 return '<div class="learning-evidence-kicker">DART 실데이터 · '+esc(data.reportYear||'연도 미확인')+'</div><p class="learning-evidence-caption">'+esc(data.basis||'매출 구성')+' · '+esc(data.reportName||'사업보고서')+'</p>'+bars+
 '<p class="learning-visual-note">공시의 일부 제품·부문만 표시할 수 있습니다. 비중 합계가 100%라고 가정하지 마세요. 기준일 '+esc(data.rceptDate||'확인 필요')+' · '+esc(data.source||'DART')+' · '+esc(data.confidence||'검증 등급 미기재')+'</p>'+evidenceLink(data.sourceUrl,'매출 구성 공시 원문');
}
export function financialEvidenceHtml(data) {
 if(!data?.available)return unavailable('확인 가능한 OpenDART 연간 재무제표가 없어요. 숫자를 임의로 만들지 않습니다.');
 const rows=arr(data.annual).filter(r=>Number.isInteger(num(r.year))&&num(r.revenue)!==null&&num(r.operatingProfit)!==null).sort((a,b)=>num(a.year)-num(b.year)).slice(-4);
 if(!rows.length)return unavailable('확인 가능한 연간 매출·영업이익 비교 자료가 없습니다.');
 const basis=String(data.basis||'재무제표 기준 미확인'),currency=data.currency||'KRW';
 const max=Math.max(...rows.map(r=>Math.abs(num(r.revenue))),1);
 return '<div class="learning-evidence-kicker">OpenDART 연간 실적 · '+esc(basis)+'</div><div class="learning-evidence-annual">'+rows.map(r=>'<div><strong>'+esc(r.year)+'년</strong><span>매출 '+money(r.revenue,currency)+'</span><span class="learning-evidence-bar"><i style="width:'+Math.min(100,Math.abs(num(r.revenue))/max*100)+'%"></i></span><span>영업이익 '+money(r.operatingProfit,currency)+'</span></div>').join('')+'</div><p class="learning-visual-note">연간 실적이며 분기 누적·TTM과 혼합하지 않습니다. 공시 정정 시 수치가 달라질 수 있습니다.</p>'+evidenceLink(data.annualSourceUrl,'연간 재무제표 원문');
}
export function companyPhotoHtml(row,name,symbol=row?.symbol) {
 const curated=curatedProductPhoto(symbol);
 const catalog=officialProductCatalog(symbol);
 const legacyUrl=row?.productImageUrl||row?.imageUrl||row?.photoUrl;
 const legacyLicense=String(row?.imageLicense||row?.photoLicense||'').toLowerCase();
 let legacySafe=null;
 try{
   const u=new URL(legacyUrl);
   if(u.protocol==='https:'&&!u.username&&!u.password&&/^(licensed|owned|public.domain|cc.by)/.test(legacyLicense))legacySafe=u.href;
 }catch{}
 const image=curated?.imageUrl||legacySafe;
 const products=String(row?.mainProducts||'').trim();
 let media='';
 if(curated){
   const typeLabel=curated.type==='industry-example'?'산업 대표 사진 · 해당 기업 제품 아님':'실제 해당 기업 제품 사진';
   media='<figure class="learning-product-photo"><img class="learning-evidence-photo" src="'+esc(image)+'" alt="'+esc(curated.description)+'" loading="lazy" referrerpolicy="no-referrer" data-learning-company-photo><figcaption><strong>'+esc(curated.title)+'</strong><span class="learning-product-type">'+esc(typeLabel)+'</span><small>사진 '+esc(curated.creator)+' · '+esc(curated.license)+' · '+esc(curated.modification)+'</small><div class="learning-photo-credit"><button type="button" data-learning-source data-external-url="'+esc(curated.sourceUrl)+'">사진 원본·저작자 확인 ↗</button><button type="button" data-learning-source data-external-url="'+esc(curated.licenseUrl)+'">라이선스 조건 ↗</button></div></figcaption></figure>';
 }else if(legacySafe){
   media='<img class="learning-evidence-photo" src="'+esc(image)+'" alt="'+esc(name)+' 등록 제품 이미지" loading="lazy" referrerpolicy="no-referrer" data-learning-company-photo/>';
 }else {
   media=unavailable('현재 이 기업의 제품 사진 중 재사용 권한이 확인된 자산이 없습니다. 기존 산업 개념도를 유지합니다.');
 }
 const official=catalog?'<div class="learning-product-catalog"><p>'+esc(catalog.message)+'</p><button type="button" data-learning-source data-external-url="'+esc(catalog.url)+'">'+esc(catalog.label)+' ↗</button></div>':'';
 return media+official+(products?'<p><strong>차트뷰 기업 DB 등록 주요 제품</strong></p><p class="learning-evidence-caption">'+esc(products.slice(0,350))+'</p>':unavailable('기업 DB에서 주요 제품 항목을 확인하지 못했어요.'))+
 '<p class="learning-visual-note">사진은 촬영 당시의 제품·설비이며 현재 판매 제품 전체를 의미하지 않습니다. 공식 사업보고서의 제품 정보와 비교하세요.</p>';
}
export function peerEvidenceHtml({current,other,currentName,otherName}) {
 const left=arr(current?.annual).slice().sort((a,b)=>Number(b.year)-Number(a.year));
 const right=arr(other?.annual).slice().sort((a,b)=>Number(b.year)-Number(a.year));
 const l=left.find(x=>num(x.revenue)!==null&&num(x.operatingProfit)!==null&&right.some(y=>String(y.year)===String(x.year)&&num(y.revenue)!==null&&num(y.operatingProfit)!==null));
 const r=right.find(x=>String(x.year)===String(l?.year)&&num(x.revenue)!==null&&num(x.operatingProfit)!==null);
 if(!l||!r||current?.currency!==other?.currency||current?.basis!==other?.basis)return unavailable('동일한 연도·재무 기준·통화의 검증된 실적이 부족해 수치 비교를 표시하지 않습니다.');
 const margin=x=>num(x.revenue)>0?(num(x.operatingProfit)/num(x.revenue)*100).toFixed(1)+'%':'계산 불가';
 return '<div class="learning-evidence-kicker">'+esc(l.year)+'년 · '+esc(current.basis)+' · '+esc(current.currency)+'</div><div class="learning-evidence-peer"><div><strong>'+esc(currentName)+'</strong><p>매출 '+money(l.revenue,current.currency)+'</p><p>영업이익률 '+margin(l)+'</p></div><div><strong>'+esc(otherName)+'</strong><p>매출 '+money(r.revenue,other.currency)+'</p><p>영업이익률 '+margin(r)+'</p></div></div><p class="learning-visual-note">기업 규모와 이익률을 구분해서 비교하세요. 우열이나 매수 판단을 자동 도출하지 않습니다.</p>'+evidenceLink(current.annualSourceUrl,'첫 번째 회사 DART')+evidenceLink(other.annualSourceUrl,'비교 회사 DART');
}
export function adaptiveReviewHtml(workspace,session,lesson) {
 const attempts=arr(workspace?.attempts).filter(a=>a.sessionId===session?.id).sort((a,b)=>String(b.submittedAt||'').localeCompare(String(a.submittedAt||'')));
 if(!attempts.length)return '<p>정식 퀴즈를 제출하면 실제 오답 개념에 따라 복습 질문을 제시합니다.</p><p class="learning-visual-note">학습 평가가 아직 없는 상태입니다. 임의 점수를 만들지 않습니다.</p>';
 const latest=attempts[0], wrong=arr(latest.wrongAnswers);
 if(!wrong.length)return '<p><strong>최근 제출의 객관식 오답이 없습니다.</strong></p><p>설명할 수 있는지 다른 기업과 비교하고 반증 조건을 적어보세요.</p>';
 return '<div class="learning-evidence-kicker">최근 정식 퀴즈 · 실제 오답 '+wrong.length+'개</div>'+
 wrong.slice(0,4).map(w=>'<div class="learning-evidence-review"><strong>'+esc(w.concept||'확인할 개념')+'</strong><p>'+esc(w.prompt||'')+'</p><p>'+esc(w.explanation||'공식 자료를 다시 확인하세요.')+'</p><small>복습 과제: 같은 개념을 이 기업의 제품·실적·경제 변수에 적용해 설명하기</small></div>').join('')+
 '<p class="learning-visual-note">학습 방향 제안이며 정식 복습 점수·일정은 기존 서버 평가를 따릅니다.</p>';
}
const set=(host,key,html)=>{const e=host.querySelector('[data-learning-evidence="'+key+'"]');if(e)e.innerHTML=html;};
export async function mountLearningEvidence(host,lesson,catalog,workspace,session,{loadBusiness=businessReportData,loadFinancial=financialHistoryData,loadContext=companyContextData}={}) {
 const selected=arr(lesson?.companies)[0]||lesson?.company||{};
 const symbol=ticker(selected.symbol);
 if(!symbol){for(const k of ['photo','mix','financial','compare'])set(host,k,unavailable('국내 상장종목 코드가 확인되지 않아 DART 조회를 생략합니다.'));set(host,'review',adaptiveReviewHtml(workspace,session,lesson));return;}
 const current=()=>host.isConnected&&host.querySelector('[data-learning-evidence="financial"]')?.dataset?.symbol===symbol;
 for(const k of ['photo','mix','financial','compare']){const e=host.querySelector('[data-learning-evidence="'+k+'"]');if(e)e.dataset.symbol=symbol;}
 set(host,'review',adaptiveReviewHtml(workspace,session,lesson));
 set(host,'photo',unavailable('기업 DB의 제품 정보를 조회하고 있어요.'));
 set(host,'mix',unavailable('기존 DART 사업보고서 매출 구성을 조회하고 있어요.'));
 set(host,'financial',unavailable('기존 DART 재무제표를 조회하고 있어요.'));
 const catalogRows=arr(catalog?.companies);
 const candidates=catalogRows.filter(c=>c.symbol!==selected.symbol&&c.industry&&c.industry===(selected.industry||lesson.industry)&&ticker(c.symbol)).slice(0,12);
 const compare=host.querySelector('[data-learning-evidence="compare"]');
 if(compare)compare.innerHTML=candidates.length?'<label class="learning-evidence-picker">같은 산업의 비교 기업<select data-learning-peer-select><option value="">선택해 비교하기</option>'+candidates.map(c=>'<option value="'+esc(c.symbol)+'">'+esc(c.name)+'</option>').join('')+'</select></label><div data-learning-peer-result><p>기업을 선택하면 기존 OpenDART 연간 자료로 같은 기준의 실적을 비교합니다.</p></div>':unavailable('학습 카탈로그에서 동일 산업 비교 기업을 찾지 못했어요.');
 const reportPromise=Promise.resolve().then(()=>loadBusiness(symbol,selected.name||''));
 const financialPromise=Promise.resolve().then(()=>loadFinancial(symbol));
 const contextPromise=Promise.resolve().then(()=>loadContext());
 const tasks=[
   reportPromise.then(data=>{if(current())set(host,'mix',revenueEvidenceHtml(data));}).catch(()=>{if(current())set(host,'mix',unavailable('DART 매출 구성 조회에 실패했습니다.'));}),
   financialPromise.then(data=>{if(current())set(host,'financial',financialEvidenceHtml(data));}).catch(()=>{if(current())set(host,'financial',unavailable('DART 연간 재무제표 조회에 실패했습니다.'));}),
   contextPromise.then(data=>{
     if(!current())return;
     const row=arr(data?.companies).find(r=>ticker(r.symbol)?.slice(0,6)===symbol.slice(0,6))||{};
     set(host,'photo',companyPhotoHtml(row,selected.name||symbol,symbol));
     const photo=host.querySelector('[data-learning-evidence="photo"] img');
     if(photo)photo.addEventListener('error',()=>{photo.hidden=true;const notice=document.createElement('p');notice.className='learning-evidence-unavailable';notice.textContent='사진 서비스에 연결할 수 없어요. 원본 출처 링크에서 확인하세요.';photo.after(notice);},{once:true});
   }).catch(()=>{if(current())set(host,'photo',unavailable('기업 제품 정보 조회에 실패했습니다.'));})
 ];
 const selector=host.querySelector('[data-learning-peer-select]');
 if(selector)selector.onchange=async()=>{
   const symbol2=ticker(selector.value),match=candidates.find(c=>c.symbol===symbol2),target=host.querySelector('[data-learning-peer-result]');
   if(!match||!target)return;
   target.innerHTML='<p>동일 연도·재무 기준을 확인하고 있어요.</p>';
   try{
     const [first,peer]=await Promise.all([financialPromise,loadFinancial(match.symbol)]);
     if(!current()||selector.value!==match.symbol)return;
     target.innerHTML=peerEvidenceHtml({current:first,other:peer,currentName:selected.name||symbol,otherName:match.name});
   }catch{if(current()&&selector.value===match.symbol)target.innerHTML=unavailable('비교 기업 DART 조회에 실패했습니다. 다시 선택해 주세요.');}
 };
 await Promise.allSettled(tasks);
}
