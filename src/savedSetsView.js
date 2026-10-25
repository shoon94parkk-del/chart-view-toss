import {readSavedSets,saveNamedSet,renameSavedSet,deleteSavedSet,validateSavedSetValue} from './savedSets.js';
import {getStorageContext,isStorageContextCurrent} from './storage.js';
import './savedSets.css';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let mountSequence=0;

export function mountSavedSets(host,{kind,getValue,onApply,onNotice=()=>{},isCurrent=()=>true}){
 let disposed=false,busy=false,editing=null;
 const context=getStorageContext(),id=`saved-set-${++mountSequence}`;
 const current=()=>!disposed&&host.isConnected&&isCurrent()&&isStorageContextCurrent(context);
 const title=kind==='screener'?'저장한 검색 조건':'저장한 비교 세트';
 host.innerHTML=`<details class="saved-sets" data-saved-sets="${esc(kind)}"><summary>${title} <span data-saved-sets-count></span></summary><div class="saved-sets-body"><p class="saved-sets-help">기기에 각각 5개까지 저장해요. 실행하면 현재 자료로 확인하며 저장 당시 결과는 보관하지 않아요.${kind==='comparison'?' 관심종목은 바뀌지 않아요.':''}</p><form data-saved-set-form class="saved-sets-form"><label for="${id}">세트 이름</label><div class="saved-sets-input-row"><input id="${id}" name="setName" type="text" maxlength="40" required autocomplete="off" placeholder="예: 다음에 확인할 조건"><button type="submit" data-saved-set-save>현재 ${kind==='screener'?'조건':'비교'} 저장</button></div></form><p role="status" aria-live="polite" class="saved-sets-status" data-saved-sets-status></p><ul class="saved-sets-list" data-saved-sets-list></ul></div></details>`;
 const box=host.querySelector('[data-saved-sets]'),list=box.querySelector('[data-saved-sets-list]'),status=box.querySelector('[data-saved-sets-status]'),form=box.querySelector('[data-saved-set-form]');
 let rows=[],corrupt=false;
 const message=(text,{notice=false}={})=>{if(!current())return;status.textContent=text;if(notice)onNotice(text);};
 function syncDisabled(){
  box.setAttribute('aria-busy',String(busy));
  for(const field of box.querySelectorAll('input,button'))field.disabled=busy||corrupt;
  form.querySelector('button').disabled=busy||corrupt||rows.length>=5;
 }
 function paint(focus){
  if(!current())return;
  const result=readSavedSets(kind);rows=result.rows;corrupt=Boolean(result.error);
  box.querySelector('[data-saved-sets-count]').textContent=`${rows.length}/5`;
  if(result.error)status.textContent=result.error;
  list.innerHTML=rows.map(row=>`<li data-saved-set-id="${esc(row.id)}"><div class="saved-set-heading"><strong data-saved-set-name>${esc(row.name)}</strong><button type="button" data-saved-set-apply aria-label="${esc(row.name)} 실행">실행</button></div>${editing===row.id?`<form class="saved-set-rename-form"><label for="${id}-rename">새 이름</label><input id="${id}-rename" name="renameSet" value="${esc(row.name)}" maxlength="40" required autocomplete="off"><div class="saved-set-actions"><button type="submit" data-saved-set-rename-confirm>이름 저장</button><button type="button" data-saved-set-rename-cancel>취소</button></div></form>`:`<div class="saved-set-actions"><button type="button" data-saved-set-rename aria-label="${esc(row.name)} 이름 변경">이름 변경</button><button type="button" data-saved-set-delete aria-label="${esc(row.name)} 삭제">삭제</button></div>`}</li>`).join('');
  if(!rows.length&&!corrupt)list.innerHTML='<li class="saved-sets-empty">저장한 세트가 없어요.</li>';
  syncDisabled();
  if(focus){const row=rows.find(row=>row.id===focus.id),item=row&&[...list.querySelectorAll('[data-saved-set-id]')].find(el=>el.dataset.savedSetId===row.id);(item?.querySelector(focus.selector)||form.querySelector('input'))?.focus({preventScroll:true});}
 }
 async function run(action,success,{focus,redraw=true}={}){
  if(busy||!current())return;
  const focused=box.contains(document.activeElement)?document.activeElement:null;
  let succeeded=false;
  busy=true;syncDisabled();message('처리 중이에요.');
  try{
   await action();if(!current())return;
   if(redraw)paint();message(success,{notice:true});succeeded=true;
  }catch(error){message(`저장한 세트를 변경하지 못했어요. ${error.message||'다시 시도해주세요.'}`,{notice:true});}
  finally{
   busy=false;
   if(current()){
    syncDisabled();
    const active=document.activeElement;
    // Disabling/replacing a control can leave focus on the document. Restore
    // that focus, but preserve a deliberate move to another connected control.
    const moved=active&&active!==focused&&active!==document.body&&active!==document.documentElement&&active.isConnected;
    if(!moved){
     if(!succeeded&&focused?.isConnected&&!focused.disabled)focused.focus({preventScroll:true});
     else if(focus){const item=[...list.querySelectorAll('[data-saved-set-id]')].find(el=>el.dataset.savedSetId===focus.id);(item?.querySelector(focus.selector)||form.querySelector('input'))?.focus({preventScroll:true});}
     else if(focused?.isConnected&&!focused.disabled)focused.focus({preventScroll:true});
    }
   }
  }
 }
 form.onsubmit=event=>{
  event.preventDefault();if(busy||!current())return;
  const name=form.elements.setName.value;
  void run(async()=>{const value=getValue();await saveNamedSet(kind,name,value,{isCurrent:current});if(current())form.elements.setName.value='';},'세트를 저장했어요.');
 };
 const onClick=event=>{
  const button=event.target.closest('button');if(!button||busy||!current())return;
  const item=button.closest('[data-saved-set-id]'),row=rows.find(row=>row.id===item?.dataset.savedSetId);if(!row)return;
  if(button.hasAttribute('data-saved-set-rename')){editing=row.id;paint({id:row.id,selector:'[name="renameSet"]'});}
  else if(button.hasAttribute('data-saved-set-rename-cancel')){editing=null;paint({id:row.id,selector:'[data-saved-set-rename]'});}
  else if(button.hasAttribute('data-saved-set-delete'))void run(async()=>{await deleteSavedSet(kind,row.id,{isCurrent:current});editing=null;},'세트를 삭제했어요.',{focus:{id:rows[rows.indexOf(row)+1]?.id||rows[rows.indexOf(row)-1]?.id,selector:'[data-saved-set-apply]'}});
  else if(button.hasAttribute('data-saved-set-apply'))void run(async()=>{
   const fresh=readSavedSets(kind);if(fresh.error)throw new Error(fresh.error);
   const saved=fresh.rows.find(set=>set.id===row.id);if(!saved)throw new Error('저장한 세트를 찾지 못했어요.');
   const value=validateSavedSetValue(kind,saved.value);if(!current())return;
   if(await onApply(value)===false)throw new Error('세트를 적용하지 못했어요. 다시 시도해주세요.');
  },'세트를 적용했어요. 현재 자료로 확인해요.',{redraw:false});
 };
 const onSubmit=event=>{
  if(!event.target.matches('.saved-set-rename-form'))return;
  event.preventDefault();const item=event.target.closest('[data-saved-set-id]'),id=item.dataset.savedSetId,name=event.target.elements.renameSet.value;
  void run(async()=>{await renameSavedSet(kind,id,name,{isCurrent:current});editing=null;},'세트 이름을 변경했어요.',{focus:{id,selector:'[data-saved-set-rename]'}});
 };
 list.addEventListener('click',onClick);list.addEventListener('submit',onSubmit);paint();
 return()=>{disposed=true;form.onsubmit=null;list.removeEventListener('click',onClick);list.removeEventListener('submit',onSubmit);};
}
