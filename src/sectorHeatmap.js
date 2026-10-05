import {classifySupplyChain, comparisonGroup} from './industryContext.js';
const num=v=>v===null||v===undefined||v===''||typeof v==='boolean'?null:Number.isFinite(Number(v))?Number(v):null;
const US={Technology:'기술',Communication:'통신·미디어','Communication Services':'통신·미디어','Consumer Cyclical':'경기소비재',Financial:'금융','Financial Services':'금융',Healthcare:'헬스케어','Consumer Defensive':'필수소비재',Industrials:'산업재',Energy:'에너지',Materials:'소재','Basic Materials':'소재',Utilities:'유틸리티','Real Estate':'부동산'};
export function sectorForRow(row){
 if(row.market==='US')return US[row.sector]||null;
 if(row.market!=='KR')return null;
 if(comparisonGroup(row)?.key==='memory-chip')return '반도체';
 const industry=String(row.industry||'');
 const products=String(row.mainProducts||'').trim();
 // A product keyword identifies exposure, not necessarily the company's primary map sector.
 if(products==='지주회사')return '지주회사';
 if(/전자부품 제조업/.test(industry)||/세탁기|냉장고|가전/.test(products))return '전기·전자';
 const chain=classifySupplyChain(row);
 if(chain)return chain.chainLabel;
 for(const [pattern,label] of [[/금융|은행|보험|증권/,'금융'],[/자료처리|소프트웨어|인터넷|정보서비스|컴퓨터 프로그래밍|시스템 통합/,'인터넷·SW'],[/화학|철강|금속/,'화학·소재'],[/전자|전기장비|영상|방송 장비/,'전기·전자'],[/건설/,'건설'],[/도매|소매/,'상사·유통'],[/전기 공급|가스 공급/,'유틸리티'],[/석유|정유/,'에너지']])if(pattern.test(industry))return label;
 return industry&&industry!=='-'?industry:null;
}
export function aggregateSectors(payload,market){
 const unique=new Map();
 for(const row of payload?.results||[])if(row?.market===market&&row.ticker&&!unique.has(row.ticker))unique.set(row.ticker,row);
 const rows=[...unique.values()];
 const date=row=>String(row.sessionDate||row.asOf||'').slice(0,10);
 const eligible=rows.filter(row=>sectorForRow(row)&&num(row.change)!==null&&num(row.marketCap)>0&&!row.stale&&/^\d{4}-\d{2}-\d{2}$/.test(date(row)));
 const dates=new Map();for(const row of eligible)dates.set(date(row),(dates.get(date(row))||0)+1);
 const session=[...dates].sort((a,b)=>b[1]-a[1]||b[0].localeCompare(a[0]))[0]?.[0]||null;
 const groups=new Map();let used=0;
 for(const row of eligible){
  if(date(row)!==session)continue;
  const label=sectorForRow(row),group=groups.get(label)||{label,cap:0,sum:0,count:0,up:0,members:[]};
  const cap=num(row.marketCap),change=num(row.change);group.cap+=cap;group.sum+=cap*change;group.count++;group.up+=change>0?1:0;group.members.push(row);used++;groups.set(label,group);
 }
 const total=[...groups.values()].reduce((sum,g)=>sum+g.cap,0);
 return {market,session,used,total:rows.length,excluded:rows.length-used,groups:[...groups.values()].map(g=>({...g,change:g.sum/g.cap,share:g.cap/total*100,members:g.members.sort((a,b)=>b.marketCap-a.marketCap)})).sort((a,b)=>b.cap-a.cap)};
}
