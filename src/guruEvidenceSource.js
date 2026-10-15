// A result may reach the data CDN before a manually deployed API revision.
// Only the displayed version's immutable proof can bridge that interval.
export async function readGuruEvidence(ticker,version,{readApi,readPublished}){
 if(!/^\d{6}\.(KS|KQ)$/.test(ticker)||!/^[A-Za-z0-9_-]{1,64}$/.test(version))throw new Error('Invalid evidence identity');
 try{return await readApi();}
 catch(error){
  if(error?.status!==409)throw error;
  try{
   const value=await readPublished();
   if(value?.snapshotVersion===version&&value?.symbol===ticker&&value?.strategies&&typeof value.strategies==='object')return value;
  }catch{}
  throw error;
 }
}
