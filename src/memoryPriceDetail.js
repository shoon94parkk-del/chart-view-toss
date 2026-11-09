import {memoryPriceSeries,memoryPriceSummary} from './memoryPriceModel.js';
import {finiteNumber} from './analysisData.js';

const esc=(value='')=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>value===null||value===undefined?'-':'$'+value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:3});
const pct=value=>value===null||value===undefined?'계산 불가':(value>0?'+':'')+value.toFixed(2)+'%';
const tone=value=>value>0?'up':value<0?'down':'';
const date=value=>{
 const parsed=new Date(value);return value&&Number.isFinite(parsed.getTime())?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'numeric',day:'numeric'}).format(parsed):'기준일 미제공';
};
const scalar=value=>typeof value==='number'||typeof value==='string'?finiteNumber(value):null;
const periods=[['1m','1개월'],['3m','3개월'],['all','전체']];
const width=640,left=180,right=20,top=24,bottom=204;

function detailData(group,history,state){
 const items=Array.isArray(group?.items)?group.items:[];
 const item=items.find(row=>row.key===state.itemKey)||items[0];
 const points=item?memoryPriceSeries(history,item.key,{period:state.period,sourceDate:item.sourceDate||group.sourceDate}):[];
 const summary=memoryPriceSummary(points);
 const mode=state.mode==='index'&&points[0]?.value>0?'index':'price';
 const selectedIndex=points.findIndex(point=>point.date===state.selectedDate);
 const index=selectedIndex<0?Math.max(0,points.length-1):selectedIndex;
 return {item,items,points,summary,mode,index};
}

function geometry(points,mode){
 const values=points.map(point=>mode==='index'?point.index:point.value);
 let min=Math.min(...values),max=Math.max(...values);
 const margin=max===min?Math.max(Math.abs(max)*.03,.01):(max-min)*.12;
 min=Math.max(0,min-margin);max+=margin;
 const start=Date.parse(points[0].date),end=Date.parse(points.at(-1).date);
 return {min,max,coords:points.map((point,i)=>({
  x:start===end?(left+width-right)/2:left+(Date.parse(point.date)-start)/(end-start)*(width-left-right),
  y:top+(max-values[i])/(max-min)*(bottom-top)
 }))};
}

function observation(points,index,mode='price'){
 const point=points[index];if(!point)return '';
 const first=points[0],change=first.value>0?(point.value/first.value-1)*100:null;
 const priorChange=point.change===null?'비교값 없음':point.changePct===null?'직전 가격이 0 · 계산 불가':pct(point.changePct);
 return `<div class="memory-observation-top"><span>선택한 관측일 <b>${esc(date(point.date))}</b></span><strong>${esc(money(point.value))}${mode==='index'?`<small>지수 ${point.index.toFixed(2)}</small>`:''}</strong></div>
 <div class="memory-observation-changes"><span>직전 관측 대비 <b class="${tone(point.changePct)}">${esc(priorChange)}</b></span><span>기간 시작 대비 <b class="${tone(change)}">${esc(pct(change))}</b></span></div>`;
}

function plot(points,mode,index){
 if(!points.length)return '<div class="memory-detail-empty">이 기간에 수집된 가격이 없어요. 다른 기간이나 품목을 선택해 주세요.</div>';
 const {min,max,coords}=geometry(points,mode),selected=coords[index];
 const line=coords.map((point,i)=>(i?'L':'M')+point.x.toFixed(2)+' '+point.y.toFixed(2)).join(' ');
 const label=value=>mode==='index'?value.toFixed(2):money(value);
 return `<div class="memory-detail-chart" data-memory-plot data-mode="${mode}">
 <div class="memory-chart-unit">${mode==='index'?'기간 첫 관측 = 100':'USD · 수집된 세션 평균'}</div>
 <svg viewBox="0 0 ${width} 240" role="img" aria-label="선택 품목 ${mode==='index'?'시작값 100 지수':'USD 가격'} 상세 추이" data-memory-chart>
 ${[max,(min+max)/2,min].map(value=>{const y=top+(max-value)/(max-min)*(bottom-top);return `<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" class="memory-chart-grid"/><text x="${left-8}" y="${y+4}" text-anchor="end">${esc(label(value))}</text>`;}).join('')}
 ${coords.length>1?`<path d="${line} L${coords.at(-1).x} ${bottom} L${coords[0].x} ${bottom} Z" class="memory-chart-area"/><path d="${line}" class="memory-chart-line"/>`:''}
 ${coords.map(point=>`<circle cx="${point.x}" cy="${point.y}" r="2.5" class="memory-chart-point"/>`).join('')}
 <line data-memory-crosshair x1="${selected.x}" x2="${selected.x}" y1="${top}" y2="${bottom}" class="memory-chart-crosshair"/>
 <circle data-memory-marker cx="${selected.x}" cy="${selected.y}" r="5" class="memory-chart-marker"/>
 <text x="${left}" y="232">${esc(date(points[0].date))}</text><text x="${width-right}" y="232" text-anchor="end">${esc(date(points.at(-1).date))}</text>
 </svg></div>
 <div class="memory-observation" data-memory-observation aria-live="polite" aria-atomic="true">${observation(points,index,mode)}</div>
 ${points.length>1?`<label class="memory-date-slider">관측일 선택 <span>차트를 누르거나 아래 막대를 움직여 보세요.</span><input type="range" min="0" max="${points.length-1}" step="1" value="${index}" aria-label="관측일 선택" aria-valuetext="${esc(date(points[index].date)+' '+money(points[index].value))}" data-memory-date></label>`:'<p class="memory-detail-note">관측값 1개 · 추세와 기간 변화를 계산하려면 관측값이 더 필요해요.</p>'}`;
}

function stats(summary){
 const {count,first,last,low,high,average,changePct}=summary;
 if(!count)return '';
 return `<div class="memory-detail-stats">
 <div><span>기간 시작 대비</span><strong class="${tone(changePct)}" data-memory-stat="change">${count<2?'관측 부족':esc(pct(changePct))}</strong></div>
 <div><span>관측 평균</span><strong data-memory-stat="average">${esc(money(average))}</strong></div>
 <div><span>수집 관측일</span><strong data-memory-stat="count">${count}회</strong></div></div>
 <div class="memory-detail-extremes"><div><span>관측 최저</span><strong data-memory-stat="low">${esc(money(low.value))} <small>${esc(date(low.date))}</small></strong></div><div><span>관측 최고</span><strong data-memory-stat="high">${esc(money(high.value))} <small>${esc(date(high.date))}</small></strong></div></div>
 <p class="memory-detail-note">${esc(date(first.date))} ~ ${esc(date(last.date))} · 평균·최고·최저는 수집된 세션 평균가 기준이에요.</p>`;
}

function historyTable(points){
 if(!points.length)return '';
 return `<details class="memory-detail-disclosure"><summary>날짜별 누적 이력 <span>${points.length}개 관측일</span></summary><p class="memory-detail-note">직전 관측일 대비 변화예요. 수집되지 않은 날짜는 채우지 않아요.</p><table class="memory-history-table"><caption>선택 기간 날짜별 세션 평균 가격과 직전 관측 대비 변화</caption><thead><tr><th scope="col">기준일</th><th scope="col">평균가 · USD</th><th scope="col">직전 대비</th></tr></thead><tbody>${[...points].reverse().map(point=>`<tr><th scope="row">${esc(date(point.date))}</th><td>${esc(money(point.value))}</td><td class="${tone(point.changePct)}">${point.change===null?'-':esc(pct(point.changePct))}<small>${point.change===null?'첫 관측':esc((point.change>0?'+':point.change<0?'-':'')+money(Math.abs(point.change)))}</small></td></tr>`).join('')}</tbody></table></details>`;
}

function metadata(item,group){
 const publication=group.updatedAt&&Number.isFinite(Date.parse(group.updatedAt))?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(group.updatedAt))+' KST':'미제공';
 const entries=[['품목',item.name||item.key],['가격군',group.name],['가격 단위',item.unit||'USD'],['가격 기준일',date(item.sourceDate||group.sourceDate)],['공개 저가',money(scalar(item.dailyLow))],['공개 고가',money(scalar(item.dailyHigh))],['세션 저가',money(scalar(item.sessionLow))],['세션 고가',money(scalar(item.sessionHigh))],['공급자 게시',publication]];
 return `<details class="memory-detail-disclosure" data-memory-metadata><summary>품목·가격 기준 자세히</summary><dl class="memory-metadata">${entries.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><p class="memory-detail-note">제공 변동률은 공급자 표의 변화율이에요. 공개 고저가는 가격군에 따라 일간 또는 주간 범위이며, 위 차트의 관측 최고·최저와 기준이 달라요. 수집 이력은 기준일별 마지막 확인값을 보관해요.</p><button type="button" class="memory-detail-source" data-external-url="${esc(item.sourceUrl||group.sourceUrl||'https://www.trendforce.com/price')}">이 품목의 원문 보기</button></details>`;
}

export function memoryDetailMarkup(group,history,state={}){
 const {item,items,points,summary,mode,index}=detailData(group,history,state);if(!item)return '';
 const change=scalar(item.changePct);
 return `<section class="memory-detail" data-memory-detail aria-label="품목 가격 상세">
 <div class="memory-detail-heading"><span>품목 상세</span><label for="memory-detail-item">상세 품목 선택</label><select id="memory-detail-item" data-memory-item>${items.map(row=>`<option value="${esc(row.key)}" ${row.key===item.key?'selected':''}>${esc(row.name||row.key)}</option>`).join('')}</select></div>
 <div class="memory-detail-current"><div><span>${group.stale?'마지막 확인 세션 평균':'공개 세션 평균'}</span><strong>${esc(money(scalar(item.average)))}</strong></div><div><span>제공 변동률</span><b class="${tone(change)}">${change===null?'미제공':esc(pct(change))}</b></div></div>
 <p class="memory-detail-note">${esc(date(item.sourceDate||group.sourceDate))} 기준 · USD${group.stale?' · 과거 확인값':''}</p>
 <div class="memory-detail-toolbar"><div role="group" aria-label="가격 이력 기간">${periods.map(([key,label])=>`<button type="button" data-memory-period="${key}" aria-pressed="${(state.period||'all')===key}">${label}</button>`).join('')}</div><div role="group" aria-label="차트 표시 기준"><button type="button" data-memory-mode="price" aria-pressed="${mode==='price'}">가격</button><button type="button" data-memory-mode="index" aria-pressed="${mode==='index'}" ${!points.length||points[0].value<=0?'disabled':''}>시작값 100</button></div></div>
 ${points.length&&points[0].value===0?'<p class="memory-detail-note">시작 가격이 0이라 변화율과 시작값 100 지수를 계산할 수 없어요.</p>':''}
 ${plot(points,mode,index)}${stats(summary)}${historyTable(points)}${metadata(item,group)}
 <p class="memory-detail-note memory-collection-note">누적 이력은 차트뷰가 공개 가격을 수집한 날짜부터 제공해요. 1개월·3개월은 가격 기준일로부터 최근 30일·90일이에요.</p>
 </section>`;
}

export function bindMemoryDetail(host,group,history,state,onChange){
 const detail=host.querySelector('[data-memory-detail]');if(!detail)return;
 detail.querySelector('[data-memory-item]')?.addEventListener('change',event=>onChange({itemKey:event.target.value,selectedDate:null},'[data-memory-item]'));
 detail.querySelectorAll('[data-memory-period]').forEach(button=>button.addEventListener('click',()=>onChange({period:button.dataset.memoryPeriod,selectedDate:null},`[data-memory-period="${button.dataset.memoryPeriod}"]`)));
 detail.querySelectorAll('[data-memory-mode]').forEach(button=>button.addEventListener('click',()=>onChange({mode:button.dataset.memoryMode},`[data-memory-mode="${button.dataset.memoryMode}"]`)));
 const {points,mode}=detailData(group,history,state);if(!points.length)return;
 const coords=geometry(points,mode).coords;
 const slider=detail.querySelector('[data-memory-date]'),svg=detail.querySelector('[data-memory-chart]');
 const select=index=>{
  const point=points[index];state.selectedDate=point.date;
  detail.querySelector('[data-memory-observation]').innerHTML=observation(points,index,mode);
  if(slider){slider.value=String(index);slider.setAttribute('aria-valuetext',date(point.date)+' '+money(point.value));}
  const marker=detail.querySelector('[data-memory-marker]'),crosshair=detail.querySelector('[data-memory-crosshair]');
  marker.setAttribute('cx',coords[index].x);marker.setAttribute('cy',coords[index].y);
  crosshair.setAttribute('x1',coords[index].x);crosshair.setAttribute('x2',coords[index].x);
 };
 slider?.addEventListener('input',()=>select(Number(slider.value)));
 const selectPointer=event=>{
  const rect=svg.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width*width;
  const index=coords.reduce((best,point,i)=>Math.abs(point.x-x)<Math.abs(coords[best].x-x)?i:best,0);select(index);
 };
 svg?.addEventListener('pointerdown',selectPointer);
 svg?.addEventListener('pointermove',event=>{if(event.buttons===1)selectPointer(event);});
}
