import { expect } from '@playwright/test';

export async function observeWatchRuntimeErrors(context){
  const errors=[],pageErrors=[];
  const observe=page=>{
    page.on('pageerror',error=>pageErrors.push({message:error.message,stack:error.stack,url:page.url()}));
    page.on('crash',()=>errors.push({kind:'crash',message:'Page crashed',url:page.url()}));
  };
  context.pages().forEach(observe);
  context.on('page',observe);
  await context.exposeBinding('__watchQARuntimeError',(_source,error)=>errors.push(error));
  await context.addInitScript(()=>{
    const report=(kind,reason)=>{
      const message=reason?.message||String(reason);
      // The binding sends the event before a reload replaces this document.
      void window.__watchQARuntimeError({kind,message,stack:reason?.stack||'',url:location.href}).catch(()=>{});
    };
    window.addEventListener('error',event=>report('error',event.error||event.message));
    window.addEventListener('unhandledrejection',event=>report('unhandledrejection',event.reason));
  });
  return {errors,pageErrors};
}

export function assertNoWatchRuntimeErrors(runtime){
  expect(runtime.errors,'No uncaught JavaScript errors, unhandled rejections, or page crashes').toEqual([]);
}
