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

export function memorySpotPlaceholder(){
  return [
    '<section id="export-memory-spot" class="export-section dram-spot-shell" aria-busy="true">',
      '<div class="export-section-head">',
        '<div><span>메모리 가격</span><h3>DRAM 현물가</h3></div>',
        '<small>공개 최신값 · 별도 로딩</small>',
      '</div>',
      '<div class="dram-spot-loading" role="status"><span></span><strong>DRAM 현물가를 확인하고 있어요.</strong></div>',
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

  const width=320;
  const height=108;
  const padX=18;
  const padTop=12;
  const padBottom=24;
  const values=points.map(point=>point.value);
  let min=Math.min(...values);
  let max=Math.max(...values);

  if(Math.abs(max-min)<0.000001){
    const margin=Math.max(Math.abs(max)*0.015,0.5);
    min-=margin;
    max+=margin;
  }else{
    const margin=(max-min)*0.12;
    min-=margin;
    max+=margin;
  }

  const times=points.map(point=>new Date(point.date+'T00:00:00Z').getTime());
  const minTime=Math.min(...times);
  const maxTime=Math.max(...times);
  const x=(time)=>maxTime===minTime?width/2:padX+(time-minTime)/(maxTime-minTime)*(width-padX*2);
  const y=(value)=>padTop+(max-value)/(max-min)*(height-padTop-padBottom);
  const coords=points.map((point,index)=>({
    x:x(times[index]),
    y:y(point.value),
    date:point.date,
    value:point.value,
  }));
  const path=coords.map((point,index)=>(index?'L ':'M ')+point.x.toFixed(1)+' '+point.y.toFixed(1)).join(' ');
  const last=coords.at(-1);

  return [
    '<div class="dram-spot-chart" role="img" aria-label="'+esc(name)+' 현물 평균가 추이, '+esc(points[0].date)+'부터 '+esc(points.at(-1).date)+'까지">',
      '<svg viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="none" aria-hidden="true">',
        '<line x1="'+padX+'" y1="'+padTop+'" x2="'+padX+'" y2="'+(height-padBottom)+'" class="dram-spot-axis"></line>',
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

function renderMemorySpot(data){
  const history=Array.isArray(data?.history)?data.history:[];
  const sourceDate=data?.sourceDate?dateLabel(data.sourceDate):'기준일 확인 필요';

  const cards=(data?.items||[]).map(row=>{
    const change=finite(row?.changePct);
    const changeText=change!==null
      ? (change>0?'+':'')+change.toFixed(2)+'%'
      : '변동률 미제공';
    const range=finite(row?.dailyLow)!==null&&finite(row?.dailyHigh)!==null
      ? spotPrice(row.dailyLow)+' ~ '+spotPrice(row.dailyHigh)
      : '-';

    return [
      '<article class="dram-spot-card">',
        '<div class="dram-spot-card-head">',
          '<div><span>세션 평균</span><strong>'+esc(row.name||row.key||'DRAM')+'</strong></div>',
          '<em class="'+(Number.isFinite(change)?yoyTone(change):'')+'">'+esc(changeText)+'</em>',
        '</div>',
        '<div class="dram-spot-price">'+esc(spotPrice(row.average))+'</div>',
        '<div class="dram-spot-range"><span>당일 고저가</span><strong>'+esc(range)+'</strong></div>',
        spotChart(history,row.key,row.name||row.key),
      '</article>',
    ].join('');
  }).join('');

  return [
    '<div class="export-section-head">',
      '<div><span>메모리 가격</span><h3>DRAM 현물가</h3></div>',
      '<small>'+esc(sourceDate)+' · '+(data?.stale?'마지막 확인값':'공개 최신값')+'</small>',
    '</div>',
    '<div class="dram-spot-intro">',
      '<strong>수출액과 함께 현물 가격 방향을 확인해보세요.</strong>',
      '<span>TrendForce 공개 최신 가격표의 세션 평균을 표시하고, 차트뷰가 확인한 공급자 기준일부터 자체 누적합니다.</span>',
    '</div>',
    '<div class="dram-spot-grid">'+cards+'</div>',
    '<div class="dram-spot-basis">',
      '<span>과거 유료 가격 이력은 가져오지 않으며 공개 최신값을 수집한 시점부터 그래프가 쌓입니다.</span>',
      '<button type="button" data-external-url="'+esc(data?.sourceUrl||'https://www.trendforce.com/price/dram/module_spot')+'">TrendForce 원문 보기</button>',
    '</div>',
  ].join('');
}

function renderError(message){
  return [
    '<div class="export-section-head">',
      '<div><span>메모리 가격</span><h3>DRAM 현물가</h3></div><small>별도 데이터</small>',
    '</div>',
    '<div class="dram-spot-error">',
      '<strong>현물가를 불러오지 못했어요.</strong>',
      '<span>'+esc(message||'기존 수출 데이터는 계속 이용할 수 있습니다.')+'</span>',
      '<button type="button" data-memory-spot-retry>현물가 다시 시도</button>',
    '</div>',
  ].join('');
}

export function mountMemorySpot(host,{bindNav}={}){
  if(!host)return ()=>{};
  let seq=0;

  const load=async(force=false)=>{
    const token=++seq;
    host.setAttribute('aria-busy','true');
    host.innerHTML=[
      '<div class="export-section-head">',
        '<div><span>메모리 가격</span><h3>DRAM 현물가</h3></div><small>공개 최신값 · 별도 로딩</small>',
      '</div>',
      '<div class="dram-spot-loading" role="status"><span></span><strong>DRAM 현물가를 확인하고 있어요.</strong></div>',
    ].join('');

    try{
      const data=await loadMemorySpot({force});
      if(token!==seq||!host.isConnected)return;
      host.removeAttribute('aria-busy');
      host.innerHTML=renderMemorySpot(data);
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
