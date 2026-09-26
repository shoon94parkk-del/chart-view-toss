import { homeLive, visitorActivity } from './api.js';

export const HOME_LIVE_POLL_MS = 10_000;
export const DEFAULT_HEARTBEAT_MS = 20_000;

export function activitySurface(tab='other'){
  if(tab==='home') return 'home';
  if(tab==='watch') return 'watchlist';
  if(tab==='chart') return 'chart';
  if(tab==='discover') return 'screener';
  if(tab==='picks') return 'pick';
  if(tab==='heatmap') return 'market';
  return 'other';
}

export function mergeLiveRows(baseRows=[], liveRows=[]){
  const live=new Map(
    (Array.isArray(liveRows)?liveRows:[])
      .filter(row=>row?.ticker)
      .map(row=>[String(row.ticker).toUpperCase(),row])
  );
  return (Array.isArray(baseRows)?baseRows:[]).map(row=>{
    const ticker=String(row?.ticker||'').toUpperCase();
    const next=live.get(ticker);
    if(!next)return row;
    return {
      ...row,
      name:next.name??row.name,
      price:next.price??row.price,
      change:next.change??row.change,
      asOf:next.asOf??row.asOf,
      sessionDate:next.sessionDate??row.sessionDate,
      previousSessionDate:next.previousSessionDate??row.previousSessionDate,
      source:next.source??row.source,
      stale:next.stale??row.stale,
    };
  });
}

let visitorId='';
let surface='other';
let started=false;
let heartbeatMs=DEFAULT_HEARTBEAT_MS;
let livePollMs=HOME_LIVE_POLL_MS;
let heartbeatTimer=null;
let liveTimer=null;
let heartbeatBusy=false;
let liveBusy=false;

const visible=()=>typeof document==='undefined'||document.visibilityState!=='hidden';
const online=()=>typeof navigator==='undefined'||navigator.onLine!==false;
const canRun=()=>started&&Boolean(visitorId)&&visible()&&online();

function clearTimers(){
  if(heartbeatTimer){clearTimeout(heartbeatTimer);heartbeatTimer=null;}
  if(liveTimer){clearTimeout(liveTimer);liveTimer=null;}
}

function scheduleHeartbeat(delay=heartbeatMs){
  if(!canRun())return;
  if(heartbeatTimer)clearTimeout(heartbeatTimer);
  heartbeatTimer=setTimeout(()=>{heartbeatTimer=null;void sendHeartbeat();},delay);
}

export function pollDelayForVisitor(id=''){
  let hash=0;
  for(const ch of String(id))hash=(hash*31+ch.charCodeAt(0))>>>0;
  return 9_000+(hash%3_001);
}

function scheduleLive(delay=livePollMs){
  if(!canRun()||surface!=='home')return;
  if(liveTimer)clearTimeout(liveTimer);
  liveTimer=setTimeout(()=>{liveTimer=null;void pullHomeLive();},delay);
}

async function sendHeartbeat(){
  if(!canRun()||heartbeatBusy)return;
  heartbeatBusy=true;
  try{
    const payload=await visitorActivity(visitorId,surface);
    const serverMs=Number(payload?.heartbeatSec)*1000;
    if(Number.isFinite(serverMs)&&serverMs>=10_000&&serverMs<=60_000)heartbeatMs=serverMs;
  }catch{}
  finally{
    heartbeatBusy=false;
    scheduleHeartbeat();
  }
}

async function pullHomeLive(){
  if(!canRun()||surface!=='home'||liveBusy)return;
  liveBusy=true;
  try{
    const payload=await homeLive();
    if(Array.isArray(payload?.results)&&payload.results.length){
      document.dispatchEvent(new CustomEvent('chartview:home-live',{detail:payload}));
    }
  }catch{}
  finally{
    liveBusy=false;
    scheduleLive();
  }
}

function reschedule({immediate=false}={}){
  clearTimers();
  if(!canRun())return;
  scheduleHeartbeat(immediate?0:heartbeatMs);
  if(surface==='home')scheduleLive(immediate?250:HOME_LIVE_POLL_MS);
}

export function setLiveSurface(tab){
  const next=activitySurface(tab);
  const changed=next!==surface;
  surface=next;
  if(started&&(changed||next==='home'))reschedule({immediate:true});
}

export function startHomeLiveSync(id){
  visitorId=String(id||'').trim();
  if(!visitorId)return false;
  livePollMs=pollDelayForVisitor(visitorId);
  if(!started){
    started=true;
    document.addEventListener('visibilitychange',handleLifecycle);
    window.addEventListener('online',handleLifecycle);
    window.addEventListener('offline',handleLifecycle);
  }
  reschedule({immediate:true});
  return true;
}

export function stopHomeLiveSync(){
  started=false;
  clearTimers();
  if(typeof document!=='undefined')document.removeEventListener('visibilitychange',handleLifecycle);
  if(typeof window!=='undefined'){
    window.removeEventListener('online',handleLifecycle);
    window.removeEventListener('offline',handleLifecycle);
  }
}

function handleLifecycle(){
  if(!canRun()){clearTimers();return;}
  reschedule({immediate:true});
}
