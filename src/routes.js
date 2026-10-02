import { SHOW_SPOTLIGHT } from './releaseScope.js';

const routes = new Set(['home','chart','watch','valuation','macro','exports','discover','ideas','news','detail','info','more','heatmap','consensus','bands','tools','notfound']);
if (SHOW_SPOTLIGHT) routes.add('picks');
const aliases = {chartviewHome:'chart',search:'chart',compare:'chart',stock:'detail'};
export function resolveRoute({pathname='/',hash=''}) {
  const raw = hash ? hash.replace(/^#/,'') : pathname.replace(/^\//,'');
  let parts;
  try { parts=raw.split('/').filter(Boolean).map(decodeURIComponent); }
  catch { return {tab:'notfound',detailSymbol:null}; }
  if (!hash && parts[0]==='chartview') parts.shift();
  const tab=aliases[parts[0]] || parts[0] || 'home';
  if(!routes.has(tab)) return {tab:'notfound',detailSymbol:null};
  if(tab==='detail') {
    const symbol=(parts[1]||'').toUpperCase();
    if(!/^[A-Z0-9^][A-Z0-9.^=\-]{0,29}$/.test(symbol)) return {tab:'notfound',detailSymbol:null};
    return {tab,detailSymbol:symbol};
  }
  if(tab==='news'&&parts[1]){const symbol=parts[1].toUpperCase();return /^[A-Z0-9^][A-Z0-9.^=\-]{0,29}$/.test(symbol)?{tab,detailSymbol:null,newsSymbol:symbol}:{tab:'notfound',detailSymbol:null};}
  if(tab==='news')return {tab,detailSymbol:null,newsSymbol:null};
  return {tab,detailSymbol:null};
}
