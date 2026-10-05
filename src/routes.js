import { SHOW_SPOTLIGHT } from './releaseScope.js';

const routes = new Set(['home','chart','watch','valuation','macro','exports','memory','discover','gurus','ideas','news','detail','info','more','heatmap','consensus','bands','tools','notfound']);
if (SHOW_SPOTLIGHT) routes.add('picks');
const aliases = {favorites:'watch',chartviewHome:'chart',search:'chart',compare:'chart',stock:'detail'};
export function resolveRoute({pathname='/',hash=''}) {
  const raw = hash ? hash.replace(/^#/,'') : pathname.replace(/^\//,'');
  let parts;
  try { parts=raw.split('/').filter(Boolean).map(decodeURIComponent); }
  catch { return {tab:'notfound',detailSymbol:null}; }
  if (!hash && parts[0]==='chartview') parts.shift();
  const tab=aliases[parts[0]] || parts[0] || 'home';
  if(!routes.has(tab)) return {tab:'notfound',detailSymbol:null};
  if(tab==='gurus'){const strategy=parts[1]||'buffett';return ['buffett','lynch'].includes(strategy)?{tab,detailSymbol:null,guruStrategy:strategy}:{tab:'notfound',detailSymbol:null};}
  if(tab==='detail') {
    const symbol=(parts[1]||'').toUpperCase();
    if(!/^[A-Z0-9^][A-Z0-9.^=\-]{0,29}$/.test(symbol)) return {tab:'notfound',detailSymbol:null};
    return {tab,detailSymbol:symbol};
  }
  if(tab==='news'&&parts[1]){const symbol=parts[1].toUpperCase();return /^[A-Z0-9^][A-Z0-9.^=\-]{0,29}$/.test(symbol)?{tab,detailSymbol:null,newsSymbol:symbol}:{tab:'notfound',detailSymbol:null};}
  if(tab==='news')return {tab,detailSymbol:null,newsSymbol:null};
  if(tab==='discover')return {tab,detailSymbol:null,screenerPreset:['volume-surge','rsi-oversold','momentum','golden-cross','uptrend','near-high','pullback','macd-bullish'].includes(parts[1])?parts[1]:null};
  if(tab==='picks')return {tab,detailSymbol:null,pickFocusKey:/^\d{4}-\d{2}-\d{2}:[A-Z0-9.^=\-]{1,30}$/.test(parts[1]||'')?parts[1]:null};
  const families=['dram-chip','nand-chip','nand-wafer','dram-module','gddr'];
  if(tab==='memory')return {tab,detailSymbol:null,memoryPriceGroup:families.includes(parts[1])?parts[1]:null};
  if(tab==='exports'&&parts[1]==='memory'&&families.includes(parts[2]))return {tab:'memory',detailSymbol:null,memoryPriceGroup:parts[2]};
  if(tab==='exports')return {tab,detailSymbol:null,exportFocus:['history','provisional','items','breadth','quadrant','countries','memory'].includes(parts[1])?parts[1]:null,memoryPriceGroup:null};
  return {tab,detailSymbol:null};
}
