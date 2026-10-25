// Error strings and check timestamps do not identify a report. A comparison
// can still carry new source evidence when its numeric result is unavailable.
export function reviewConditionEvidence(value){
 if(!value||typeof value!=='object'||!(typeof value.matched==='boolean'||Array.isArray(value.sourceUrls)&&value.sourceUrls.some(url=>typeof url==='string'&&url)))return null;
 const fields=['id','type','year','quarter','label','basis','currency','sourceUrls','value','reference','matched'];
 return Object.fromEntries(fields.filter(key=>Object.hasOwn(value,key)).map(key=>[key,value[key]]));
}
