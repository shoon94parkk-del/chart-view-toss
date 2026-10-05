import { loadMemorySpot } from './exportMomentumData.js';
import { yoyTone } from './exportMomentumModel.js';

const esc=(value='')=>String(value).replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));

const dateLabel=(value)=>{
  if(!value)return '';
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return String(value);
  return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'numeric',day:'numeric'}).format(date);
};

const finite=(value)=>{
  if(value===null||value===undefined||value==='')return null;
  const number=Number(value);
  return Number.isFinite(number)?number:null;
};

const spotPrice=(value)=>{
  const number=finite(value);
  return number!==null
    ? '$'+number.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:3})
    : '-';
};

const GROUP_ORDER=['dram-chip','nand-chip','nand-wafer','dram-module','gddr'];

export function memorySpotPlaceholder(){
  return [
    '<section id="export-memory-spot" class="export-section dram-spot-shell" aria-busy="true">',
      '<div class="export-section-head">',
        '<div><span>메모리 시장가격</span><h3>DRAM · NAND 가격</h3></div>',
        '<small>반도체 탭에서만 로딩</small>',
      '</div>',
      '<div class="dram-spot-loading" role="status"><span></span><strong>메모리 시장가격을 확인하고 있어요.</strong></div>',
    '</section>',
  ].join('');
}

function spotChart(history,key,name){
  const points=(Array.isArray(history)?history:[])
    .map(row=>({date:String(row?.date||''),value:finite(row?.values?.[key])}))
    .filter(row=>row.date&&row.value!==null)
    .sort((a,b)=>a.date.localeCompare(b.date));

  if(!points.length){
    return '<div class="dram-spot-chart-empty">차트뷰 누적 데이터가 아직 없어요.</div>';
  }

  const width=320,height=96,padX=18,padTop=10,padBottom=22;
  const values=points.map(point=>point.value);
  let min=Math.min(...values),max=Math.max(...values);
  if(Math.abs(max-min)<0.000001){
    const margin=Math.max(Math.abs(max)*0.015,0.5);min-=margin;max+=margin;
  }else{
    const margin=(max-min)*0.12;min-=margin;max+=margin;
  }
  const times=points.map(point=>new Date(point.date+'T00:00:00Z').getTime());
  const minTime=Math.min(...times),maxTime=Math.max(...times);
  const x=(time)=>maxTime===minTime?width/2:padX+(time-minTime)/(maxTime-minTime)*(width-padX*2);
  const y=(value)=>padTop+(max-value)/(max-min)*(height-padTop-padBottom);
  const coords=points.map((point,index)=>({x:x(times[index]),y:y(point.value),...point}));
  const path=coords.map((point,index)=>(index?'L ':'M ')+point.x.toFixed(1)+' '+point.y.toFixed(1)).join(' ');
  const last=coords.at(-1);

  return [
    '<div class="dram-spot-chart" role="img" aria-label="'+esc(name)+' 가격 추이">',
      '<svg viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="none" aria-hidden="true">',
        '<line x1="'+padX+'" y1="'+(height-padBottom)+'" x2="'+(width-padX)+'" y2="'+(height-padBottom)+'" class="dram-spot-axis"></line>',
        coords.length>1?'<path d="'+path+'" class="dram-spot-line"></path>':'',
        '<circle cx="'+last.x.toFixed(1)+'" cy="'+last.y.toFixed(1)+'" r="3.5" class="dram-spot-dot"></circle>',
      '</svg>',
      '<div class="dram-spot-chart-labels">',
        '<span>'+esc(dateLabel(points[0].date))+'</span>',
        '<b>'+(coords.length===1?'수집 시작':esc(String(points.length)+'회 누적'))+'</b>',
        '<span>'+esc(dateLabel(points.at(-1).date))+'</span>',
      '</div>',
    '</div>',
  ].join('');
}

function itemCard(row,history){
  const change=finite(row?.changePct);
  const changeText=change!==null?(change>0?'+':'')+change.toFixed(2)+'%':'변동률 미제공';
  const low=finite(row?.dailyLow),high=finite(row?.dailyHigh);
  const range=low!==null&&high!==null?spotPrice(low)+' ~ '+spotPrice(high):'-';
  return [
    '<article class="dram-spot-card">',
      '<div class="dram-spot-card-head">',
        '<div><span>세션 평균</span><strong>'+esc(row.name||row.key||'메모리')+'</strong></div>',
        '<em class="'+(change!==null?yoyTone(change):'')+'">'+esc(changeText)+'</em>',
      '</div>',
      '<div class="dram-spot-price">'+esc(spotPrice(row.average))+'</div>',
      '<div class="dram-spot-range"><span>고저가</span><strong>'+esc(range)+'</strong></div>',
      spotChart(history,row.key,row.name||row.key),
    '</article>',
  ].join('');
}

function groupView(group,history){
  if(!group)return '<div class="dram-spot-chart-empty">표시할 가격 그룹이 없어요.</div>';
  return [
    '<div class="memory-price-group-head">',
      '<div><strong>'+esc(group.name)+'</strong><span>'+esc(group.sourceDate?dateLabel(group.sourceDate):'기준일 확인 필요')+'</span></div>',
      '<em>'+(group.stale?'마지막 확인값':'공개 최신값')+'</em>',
    '</div>',
    '<div class="dram-spot-grid">'+(group.items||[]).map(row=>itemCard(row,history)).join('')+'</div>',
    '<button type="button" class="memory-price-source" data-external-url="'+esc(group.sourceUrl||'https://www.trendforce.com/price')+'">TrendForce 원문 보기</button>',
  ].join('');
}

function unavailableView(rows){
  if(!Array.isArray(rows)||!rows.length)return '';
  return [
    '<details class="memory-price-unavailable">',
      '<summary>직접 가격이 공개되지 않은 메모리</summary>',
      '<div>',
        rows.map(row=>'<p><strong>'+esc(row.name)+'</strong><span>'+esc(row.reason)+'</span></p>').join(''),
      '</div>',
    '</details>',
  ].join('');
}

function renderShell(data,activeKey){
  const groups=(Array.isArray(data?.groups)?data.groups:[])
    .sort((a,b)=>GROUP_ORDER.indexOf(a.key)-GROUP_ORDER.indexOf(b.key));
  const active=groups.find(group=>group.key===activeKey)||groups[0]||null;
  const history=Array.isArray(data?.history)?data.history:[];
  return [
    '<div class="export-section-head">',
      '<div><span>메모리 시장가격</span><h3>DRAM · NAND 가격</h3></div>',
      '<small>TrendForce 공개 최신값</small>',
    '</div>',
    '<div class="dram-spot-intro">',
      '<strong>가격과 수출을 같은 화면에서 비교합니다.</strong>',
      '<span>공개 숫자가 있는 제품만 표시하며 HBM·MCP처럼 직접 가격이 없는 품목은 추정하지 않습니다.</span>',
    '</div>',
    '<div class="memory-price-tabs" role="tablist" aria-label="메모리 가격 종류">',
      groups.map(group=>'<button type="button" role="tab" data-memory-price-group="'+esc(group.key)+'" aria-selected="'+String(group.key===active?.key)+'">'+esc(group.name.replace(' 현물',''))+'</button>').join(''),
    '</div>',
    '<div class="memory-price-active" data-memory-price-active>'+groupView(active,history)+'</div>',
    unavailableView(data?.unavailablePriceSeries),
    '<div class="dram-spot-basis"><span>유료 과거 이력은 가져오지 않으며, 공개 최신값을 확인한 공급자 기준일부터 차트뷰가 자체 누적합니다.</span></div>',
  ].join('');
}

function renderError(message){
  return [
    '<div class="export-section-head"><div><span>메모리 시장가격</span><h3>DRAM · NAND 가격</h3></div><small>별도 데이터</small></div>',
    '<div class="dram-spot-error">',
      '<strong>메모리 가격을 불러오지 못했어요.</strong>',
      '<span>'+esc(message||'관세청 수출 데이터는 계속 이용할 수 있습니다.')+'</span>',
      '<button type="button" data-memory-spot-retry>가격 다시 시도</button>',
    '</div>',
  ].join('');
}

export function mountMemorySpot(host,{bindNav,activeGroup='dram-chip',onGroupChange}={}){
  if(!host)return ()=>{};
  let seq=0;
  let data=null;
  let activeKey=GROUP_ORDER.includes(activeGroup)?activeGroup:'dram-chip';

  const bindGroupTabs=()=>{
    host.querySelectorAll('[data-memory-price-group]').forEach(button=>{
      button.addEventListener('click',()=>{
        activeKey=button.dataset.memoryPriceGroup;
        host.innerHTML=renderShell(data,activeKey);
        bindGroupTabs();
        bindNav?.();
        onGroupChange?.(activeKey);
      });
    });
  };

  const load=async(force=false)=>{
    const token=++seq;
    host.setAttribute('aria-busy','true');
    host.innerHTML=[
      '<div class="export-section-head"><div><span>메모리 시장가격</span><h3>DRAM · NAND 가격</h3></div><small>공개 최신값 · 별도 로딩</small></div>',
      '<div class="dram-spot-loading" role="status"><span></span><strong>메모리 시장가격을 확인하고 있어요.</strong></div>',
    ].join('');
    try{
      data=await loadMemorySpot({force});
      if(token!==seq||!host.isConnected)return;
      host.removeAttribute('aria-busy');
      host.innerHTML=renderShell(data,activeKey);
      bindGroupTabs();
      bindNav?.();
    }catch(error){
      if(token!==seq||!host.isConnected)return;
      host.removeAttribute('aria-busy');
      host.innerHTML=renderError(error?.message);
      host.querySelector('[data-memory-spot-retry]')?.addEventListener('click',()=>void load(true));
    }
  };

  void load();
  return ()=>{seq+=1;};
}
