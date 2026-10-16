import {earningsEventsData} from './api.js';
import {earningsCallsHtml} from './releaseReading.js';
import './releaseReading.css';
export function mountEarningsEvents(host,{symbols=[],nameFor,bindNav=()=>{},isCurrent=()=>true}={}){
 let disposed=false,sequence=0;
 const alive=()=>!disposed&&host.isConnected&&isCurrent();
 const load=async(force=false)=>{
  const run=++sequence;
  host.innerHTML='<p role="status">공식 콜 일정을 확인하고 있어요.</p>';
  try{
   const data=await earningsEventsData({force});
   if(!alive()||run!==sequence)return;
   host.innerHTML=earningsCallsHtml(data,symbols,{nameFor});
   bindNav();
  }catch{
   if(!alive()||run!==sequence)return;
   host.innerHTML='<p role="status">공식 콜 일정을 불러오지 못했어요. 실적 추정치는 아래에서 계속 확인할 수 있어요.</p><button type="button" class="retry" data-retry-earnings>일정 다시 확인</button>';
   host.querySelector('[data-retry-earnings]').onclick=()=>void load(true);
  }
 };
 void load();
 return ()=>{disposed=true;sequence++;};
}
