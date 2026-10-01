import {aggregateSectors} from './sectorHeatmap.js';
import {loadingIndicator} from './loadingView.js';
import './sectorHeatmap.css';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>`${v>0?'+':''}${v.toFixed(2)}%`;
export function mountSectorHeatmap(host,{onStock=()=>{},retry=()=>{}}={}){
 let payload={},market='KR',selected=null;
 function paint(){
  if(!host.isConnected)return;
  const focus=host.contains(document.activeElement)?document.activeElement?.dataset:null;
  const data=aggregateSectors(payload,market);
  const group=data.groups.find(g=>g.label===selected);
  host.innerHTML=`<div class="sector-market-tabs" role="group" aria-label="섹터 히트맵 시장"><button data-sector-market="KR" aria-pressed="${market==='KR'}">한국장</button><button data-sector-market="US" aria-pressed="${market==='US'}">미국장</button></div><p class="sector-basis">${esc(data.session||'기준일 확인 중')} · 전 거래일 대비 · ${data.used}/${data.total}개 집계</p>${data.groups.length?`<div class="sector-grid">${data.groups.map(g=>`<button class="sector-tile ${Math.abs(g.change)<.05?'sector-flat':g.change>0?'sector-up':'sector-down'}" style="--sector-strength:${Math.min(1,.22+Math.abs(g.change)/5)}" data-sector-name="${esc(g.label)}" aria-expanded="${selected===g.label}"><strong>${esc(g.label)}</strong><b>${pct(g.change)}</b><small>${g.count}개 · 수집 시총 ${g.share.toFixed(1)}%</small></button>`).join('')}</div>`:payload.refreshing?loadingIndicator('섹터별 시세를 확인하고 있어요'):'<p class="muted-copy">같은 거래일의 시세와 분류가 확인된 종목이 아직 없어요.</p>'}${group?`<section class="sector-members"><h3>${esc(group.label)} <small>상승 ${group.up}/${group.count}개</small></h3><p>시가총액이 큰 종목부터 표시해요.</p>${group.members.map(row=>`<button data-sector-stock="${esc(row.ticker)}"><span><strong>${esc(row.name||row.ticker)}</strong><small>${esc(row.ticker)}</small></span><b class="${row.change>0?'up':row.change<0?'down':''}">${pct(Number(row.change))}</b></button>`).join('')}</section>`:''}<p class="sector-method">색상은 수집 종목의 시가총액 가중 평균이에요. 전체 시장의 공식 섹터 지수가 아니에요. 한국은 KRX 업종·주요제품, 미국은 기존 산업 분류를 사용해요.${data.excluded?` 누락·이전 시세·분류 미확인 ${data.excluded}개는 제외했어요.`:''}</p><div class="sector-load-status" role="status">${payload.error?`<span>새 시세를 확인하지 못했어요.${data.groups.length?' 기존 집계를 표시해요.':''}</span><button class="text-button" data-sector-retry>다시 시도</button>`:payload.refreshing?loadingIndicator('집계 시세를 갱신하고 있어요'):!data.groups.length?'<button class="text-button" data-sector-retry>다시 시도</button>':''}</div>`;
  if(focus){const selector=focus.sectorName?`[data-sector-name="${CSS.escape(focus.sectorName)}"]`:focus.sectorMarket?`[data-sector-market="${focus.sectorMarket}"]`:null;if(selector)host.querySelector(selector)?.focus({preventScroll:true});}
 }
 host.onclick=event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.sectorMarket){market=button.dataset.sectorMarket;selected=null;paint();}
  else if(button.dataset.sectorName){selected=selected===button.dataset.sectorName?null:button.dataset.sectorName;paint();}
  else if(button.dataset.sectorStock)onStock(button.dataset.sectorStock);
  else if(button.hasAttribute('data-sector-retry'))retry();
 };
 return {update(next){payload=next||{};paint();},loading(){payload={...payload,error:false,refreshing:true};paint();},error(){payload={...payload,refreshing:false,error:true};paint();}};
}
