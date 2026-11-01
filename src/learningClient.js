export const LEARNING_SESSION_KEY = 'chartview-toss-learning-session-v1';
export class LearningError extends Error { constructor(message,{status=0,code='REQUEST_FAILED',detail}={}){super(message);this.name='LearningError';this.status=status;this.code=code;this.detail=detail;} }
const errorMessage=status=>status===409?'다른 창에서 기록이 변경됐어요. 작성 내용을 유지했어요. 최신 기록을 확인한 뒤 다시 저장해 주세요.':status===401?'로그인이 만료됐어요. 복구 키로 다시 연결해 주세요.':status===503?'영구 저장소가 연결되지 않았어요. 서버 설정 후 다시 시도해 주세요.':'저장·조회하지 못했어요. 작성 내용을 유지했어요. 다시 시도해 주세요.';
// Dependencies keep account isolation testable without importing the native SDK in Node.
export function createLearningClient({base='',fetchImpl=(...args)=>fetch(...args),read=()=>null,write=()=>{},getContext=()=>0,isContextCurrent=()=>true,timeoutMs=15000}={}) {
 let generation=0;
 const readSession=()=>{try{const raw=read(),session=typeof raw==='string'?JSON.parse(raw):raw;if(typeof session?.accountId!=='string'||!session.accountId||typeof session.token!=='string'||!session.token||typeof session.expiresAt!=='string')return null;return session;}catch{return null;}};
 const getSession=()=>{const session=readSession();return session&&Number.isFinite(Date.parse(session.expiresAt))&&Date.parse(session.expiresAt)>Date.now()?session:null;};
 const assertExpected=options=>{const saved=readSession();if((options?.expectedAccountId&&saved?.accountId!==options.expectedAccountId)||(options?.expectedToken&&saved?.token!==options.expectedToken))throw new LearningError('공부 계정이 변경됐어요. 이전 계정의 요청을 보내지 않았어요.',{code:'STALE_ACCOUNT'});};
 const clearSession=(options)=>{assertExpected(options);generation++;return Promise.resolve(write('null'));};
 const setSession=async session=>{const context=getContext(),epoch=++generation;if(!session?.accountId||!session.token||!session.expiresAt)throw new LearningError('계정 응답을 확인하지 못했어요.');await write(JSON.stringify({accountId:session.accountId,token:session.token,expiresAt:session.expiresAt}));if(epoch!==generation||!isContextCurrent(context))throw new LearningError('기기 계정이 변경됐어요.',{code:'STALE_ACCOUNT'});};
 const request=async(path,{method='GET',body,public:publicRequest=false,signal,token:explicitToken,expectedAccountId,expectedToken,...options}={})=>{
  if(!/^\/[a-z0-9/_.-]*(?:\?[^#]*)?$/i.test(path)||path.includes('..'))throw new LearningError('올바르지 않은 요청이에요.');
  const epoch=generation,context=getContext(),session=getSession(),storedSession=readSession(),token=explicitToken||expectedToken||session?.token;
  if(!publicRequest)assertExpected({expectedAccountId,expectedToken});
  const credentialCurrent=()=>{const saved=readSession();return saved?.accountId===storedSession?.accountId&&saved?.token===storedSession?.token;};
  if(!publicRequest&&(!token||(!explicitToken&&!session)))throw new LearningError(errorMessage(401),{status:401,code:'UNAUTHORIZED'});
  const controller=new AbortController(),onAbort=()=>controller.abort();signal?.addEventListener('abort',onAbort,{once:true});if(signal?.aborted)controller.abort();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetchImpl(base.replace(/\/$/,'')+'/api/learning'+path,{...options,method,headers:{'Content-Type':'application/json',...(token&&!publicRequest?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
   if(epoch!==generation||!isContextCurrent(context)||!credentialCurrent())throw new LearningError('기기 계정이 변경됐어요.',{code:'STALE_ACCOUNT'});
   if(controller.signal.aborted)throw new LearningError('요청이 중단됐어요. 저장 여부를 확인해 주세요.',{code:signal?.aborted?'ABORTED':'TIMEOUT'});
   let data=null;try{data=await response.json();}catch{if(response.ok&&response.status!==204)throw new LearningError('서버 응답 형식을 확인하지 못했어요.');}
   if(epoch!==generation||!isContextCurrent(context)||!credentialCurrent())throw new LearningError('기기 계정이 변경됐어요.',{code:'STALE_ACCOUNT'});
   if(controller.signal.aborted)throw new LearningError('요청이 중단됐어요. 저장 여부를 확인해 주세요.',{code:signal?.aborted?'ABORTED':'TIMEOUT'});
   if(!response.ok){if(response.status===401&&!publicRequest)await clearSession({expectedAccountId:session?.accountId,expectedToken:session?.token});throw new LearningError(errorMessage(response.status),{status:response.status,detail:data?.detail});}
   return data;
  }catch(error){if(error instanceof LearningError)throw error;if(signal?.aborted)throw new LearningError('화면을 닫았어요.',{code:'ABORTED'});throw new LearningError('응답을 확인하지 못했어요. 저장 여부가 불확실해요. 작성 내용을 유지했어요. 같은 요청으로 다시 시도할 수 있어요.',{code:controller.signal.aborted?'TIMEOUT':'NETWORK'});}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort);}
 };
 const authenticate=async(recoveryKey,options={})=>{const context=getContext(),epoch=generation;const result=await request(recoveryKey?'/auth':'/accounts',{method:'POST',public:true,body:recoveryKey?{recoveryKey}:{},signal:options.signal});if(epoch!==generation||!isContextCurrent(context))throw new LearningError('기기 계정이 변경됐어요.',{code:'STALE_ACCOUNT'});await setSession(result);return result;};
 const logout=async(options)=>{assertExpected(options);const session=getSession();await clearSession(options);if(session?.token)await request('/auth',{method:'DELETE',token:session.token});};
 return {getSession,setSession,clearSession,request,authenticate,logout,getContext};
}
let runtime;
async function runtimeClient(){
 if(!runtime)runtime=import('./storage.js').then(storage=>createLearningClient({base:(import.meta.env?.VITE_CHARTVIEW_API_BASE||'https://chart-view-pkv8.onrender.com'),read:()=>storage.readStored(LEARNING_SESSION_KEY),write:value=>storage.writeStored(LEARNING_SESSION_KEY,value,{confirmed:true}),getContext:storage.getStorageContext,isContextCurrent:storage.isStorageContextCurrent}));
 return runtime;
}
export const getLearningSession=async()=> (await runtimeClient()).getSession();
export const clearLearningSession=async(options)=> (await runtimeClient()).clearSession(options);
export const learningRequest=async(path,options)=>(await runtimeClient()).request(path,options);
export const authenticateLearning=async(key,options)=>(await runtimeClient()).authenticate(key,options);
export const logoutLearning=async(options)=>(await runtimeClient()).logout(options);
export const setLearningSession=async(session)=>(await runtimeClient()).setSession(session);
export const getLearningStorageContext=async()=>(await runtimeClient()).getContext();
