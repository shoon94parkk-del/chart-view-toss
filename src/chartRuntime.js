let loading;

export function loadChartRuntime(){
  if(!loading)loading=import('lightweight-charts').catch(error=>{loading=null;throw error;});
  return loading;
}
