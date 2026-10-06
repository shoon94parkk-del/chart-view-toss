import {marketRows,layoutTreemap} from './heatmapView.js';
import {sectorForRow} from './sectorHeatmap.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>`${v>0?'+':''}${Number(v).toFixed(2)}%`;
const tone=v=>Math.abs(v)<.25?'flat':(v>0?'up':'down')+'-'+(Math.abs(v)>=3?3:Math.abs(v)>=1?2:1);
const rowBasis=row=>{
 if(row.sessionDate)return '거래일 '+row.sessionDate;
 if(row.asOf&&Number.isFinite(Date.parse(row.asOf)))return '시세 기준 '+new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(row.asOf))+' KST';
 return '기준일 미제공';
};
export function marketMapGroups(payload,market){
 const groups=new Map();
 for(const row of marketRows(payload,market,'full')){
  const label=sectorForRow(row)||'분류 미확인';
  const group=groups.get(label)||{label,members:[],weight:0};
  group.members.push(row);group.weight+=market==='KR'?Math.pow(row.marketCap,.58):row.marketCap;
  groups.set(label,group);
 }
 return [...groups.values()].sort((a,b)=>b.weight-a.weight);
}
export function renderMarketMap(payload,{market='KR',cached=false,selected=null}={}){
 const groups=marketMapGroups(payload,market);
 const count=groups.reduce((sum,g)=>sum+g.members.length,0);
 const height=Math.max(480,Math.min(680,count*17));
 // Sector frames have a readability floor; stock areas within each frame retain the documented weighting.
 const rects=layoutTreemap(groups.map(item=>({item,weight:Math.sqrt(item.weight)})),0,0,340,height);
 const group=groups.find(g=>g.label===selected);
 const stamp=payload.generatedAt||payload.updatedAt;
 const date=stamp&&Number.isFinite(Date.parse(stamp))?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(stamp)):'시각 미제공';
 return `<div class="market-map-meta" role="status"><strong>${market==='KR'?'한국 주요':'미국 시총 상위'} ${count}종목</strong><span>${cached?'저장 시세 · ':''}수집 ${esc(date)} KST</span></div>
 <div class="market-map-sector-list" aria-label="업종별 종목 선택">${groups.map(g=>`<button type="button" data-map-sector="${esc(g.label)}" aria-expanded="${selected===g.label}" aria-controls="market-map-members">${esc(g.label)} 종목 목록</button>`).join('')}</div>
 ${group?`<section class="market-map-members" id="market-map-members" role="region" aria-label="선택한 업종 종목 목록"><div><h3>${esc(group.label)} · ${group.members.length}종목</h3><button class="text-button" data-map-sector="${esc(group.label)}">닫기</button></div>${group.members.map(row=>`<button type="button" data-stock-detail="${esc(row.ticker)}" data-stock-name="${esc(row.name)}"><span><strong>${esc(row.name)}</strong><small>${esc(rowBasis(row))} · ${row.price==null?'가격 미제공':Number(row.price).toLocaleString('ko-KR',{maximumFractionDigits:2})+(market==='KR'?'원':' 달러')}</small></span><b class="${row.change>0?'up':row.change<0?'down':''}">${pct(row.change)}</b></button>`).join('')}</section>`:''}
 <div class="market-map" style="--map-height:${height}px" aria-label="업종별 종목 등락 지도">${rects.map(({item:g,x,y,width,height:h})=>{
  const cells=layoutTreemap(g.members.map(item=>({item,weight:market==='KR'?Math.pow(item.marketCap,.58):item.marketCap})),0,0,width,Math.max(1,h-25));
  return `<section class="market-map-sector" style="left:${x/340*100}%;top:${y/height*100}%;width:${width/340*100}%;height:${h/height*100}%"><button type="button" class="market-map-sector-head" data-map-sector="${esc(g.label)}" aria-expanded="${selected===g.label}" aria-label="${esc(g.label)} ${g.members.length}종목 자세히"><strong>${esc(g.label)}</strong><span>›</span></button><div class="market-map-sector-body">${cells.map(({item,x:cx,y:cy,width:cw,height:ch})=>{
   const tight=cw<60||ch<44;
   const label=market==='KR'?item.short:item.ticker;
   return `<button type="button" class="market-map-stock map-${tone(item.change)} ${tight?'is-tight':''}" style="left:${cx/width*100}%;top:${cy/(h-25)*100}%;width:${cw/width*100}%;height:${ch/(h-25)*100}%" data-stock-detail="${esc(item.ticker)}" data-stock-name="${esc(item.name)}" aria-label="${esc(item.name)} ${pct(item.change)}"><strong>${esc(label)}</strong><span>${pct(item.change)}</span></button>`;
  }).join('')}</div></section>`;
 }).join('')}</div>
 <div class="market-map-legend" aria-label="등락 색상 범례"><span>하락</span>${[-3,-2,-1,0,1,2,3].map(v=>`<i class="map-${tone(v)}">${v>0?'+':''}${v}%</i>`).join('')}<span>상승</span></div>

 <details class="market-map-basis"><summary>지도 기준 · 주요 종목만 표시</summary><p>전일 기준 대비 개별 종목 등락이에요. 업종은 위치를 묶는 기준이며 공식 섹터 지수가 아니에요. 업종 영역은 가독성을 위해 시총 영향을 완화해요. 각 업종 안의 타일 크기는 한국 시총 0.58승, 미국 시총 비중이에요. 전체 상장 종목을 포함하지 않아요. 업종 이름을 누르면 작은 타일까지 이름·가격·기준일을 확인할 수 있어요.</p></details>`;
}
