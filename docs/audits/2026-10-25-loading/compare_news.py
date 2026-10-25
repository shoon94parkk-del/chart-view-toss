import asyncio,sys,json,time
from copy import deepcopy
sys.path.insert(0,sys.argv[1])
from fastapi import FastAPI
import httpx
import news_service_v37 as n

def receipt(s):
 return {'items':[{'symbol':s,'title':f'Verified {s} earnings','url':f'https://example.com/{s}','score':70,'publishedTs':100,'investmentRelevant':True}],'error':None,'provider':'controlled'}
n.NEWS_CACHE={};n._NEWS_OWNERS={}
n.NEWS_CACHE['AAPL|AAPL']={'cachedAt':time.time(),'data':receipt('AAPL')}
calls=[]
def provider(s,name):
 calls.append(s);time.sleep(1);return receipt(s)
n._fetch_finnhub_news=provider
async def main():
 app=FastAPI();app.include_router(n.router)
 async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://test') as c:
  start=time.perf_counter();r=await c.get('/api/personalized-news',params={'tickers':'AAPL,NVDA','names':'AAPL|NVDA','delivery':'first_available'});b=r.json();first=time.perf_counter()-start
  final=await c.get('/api/personalized-news',params={'tickers':'AAPL,NVDA','names':'AAPL|NVDA'});f=final.json()
  print(json.dumps({'repo':sys.argv[1],'controlled':True,'slowProviderSeconds':1,'firstResponseSeconds':first,'allResponseSeconds':time.perf_counter()-start,'firstReadyGroups':sum(g['status']=='success' for g in b['groups']),'firstPending':b.get('pendingSymbols',[]),'finalReadyGroups':sum(g['status']=='success' for g in f['groups']),'providerCalls':calls,'errors':f['errors']}))
asyncio.run(main())
