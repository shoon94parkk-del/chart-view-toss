const SPREAD_SYMBOLS = new Set(['T10Y2Y','T10Y3M','BAMLH0A0HYM2']);
const RATE_SYMBOLS = new Set(['DFII10','T10YIE','PCEPI','PCETRIM12M159SFRBDAL','UNRATE','FEDFUNDS']);

export function formatKst(value, { dateOnly = false } = {}) {
  if (!value) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [y,m,d] = String(value).split('-');
    return dateOnly ? `${y}.${m}.${d}` : `${m}.${d} 관측`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: dateOnly ? 'numeric' : undefined,
    month: '2-digit',
    day: '2-digit',
    hour: dateOnly ? undefined : '2-digit',
    minute: dateOnly ? undefined : '2-digit',
    hour12: false,
  }).format(date) + (dateOnly ? '' : ' KST');
}

export function formatCurrencyPrice(value, currency) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  if (currency === 'KRW') return `${Math.round(n).toLocaleString('ko-KR')}원`;
  if (currency === 'USD') return `$${n.toLocaleString('ko-KR',{maximumFractionDigits:2})}`;
  return `${n.toLocaleString('ko-KR',{maximumFractionDigits:2})}${currency ? ` ${currency}` : ''}`;
}

export function formatMacroValue(row) {
  const n = Number(row?.value);
  if (!Number.isFinite(n)) return '-';
  const symbol = row.original_symbol || row.symbol;
  if (SPREAD_SYMBOLS.has(symbol)) return `${n.toLocaleString('ko-KR',{maximumFractionDigits:2})}%p`;
  if (RATE_SYMBOLS.has(symbol)) return `${n.toLocaleString('ko-KR',{maximumFractionDigits:2})}%`;
  if (symbol === '^VIX') return n.toLocaleString('ko-KR',{maximumFractionDigits:2});
  if (symbol === 'RRPONTSYD') return `$${n.toLocaleString('ko-KR',{maximumFractionDigits:2})}B`;
  if (symbol === 'WALCL' || symbol === 'WTREGEN') return `$${(n/1_000_000).toLocaleString('ko-KR',{maximumFractionDigits:2})}T`;
  if (symbol === 'M2SL') return `$${(n/1_000).toLocaleString('ko-KR',{maximumFractionDigits:2})}T`;
  if (symbol === 'RSAFS') return `$${(n/1_000).toLocaleString('ko-KR',{maximumFractionDigits:1})}B`;
  return n.toLocaleString('ko-KR',{maximumFractionDigits:2});
}

export function formatMacroChange(row) {
  const symbol = row.original_symbol || row.symbol;
  const display = Number(row.displayChange);
  if (Number.isFinite(display) && row.changeUnit) {
    if (row.changeUnit === 'bp') return `${display > 0 ? '+' : ''}${display.toFixed(Math.abs(display)<1?1:0)}bp`;
    if (row.changeUnit === 'pt') return `${display > 0 ? '+' : ''}${display.toFixed(2)}pt`;
    return `${display > 0 ? '+' : ''}${display.toFixed(2)}%`;
  }
  const delta = Number(row.delta);
  const change = Number(row.change);
  if ((SPREAD_SYMBOLS.has(symbol) || RATE_SYMBOLS.has(symbol)) && Number.isFinite(delta)) return `${delta>0?'+':''}${(delta*100).toFixed(1)}bp`;
  if (symbol === '^VIX' && Number.isFinite(delta)) return `${delta>0?'+':''}${delta.toFixed(2)}pt`;
  if (Number.isFinite(change)) return `${change>0?'+':''}${change.toFixed(2)}%`;
  return '비교값 없음';
}

export function observationLabel(row) {
  const symbol = row.original_symbol || row.symbol;
  if ((symbol === 'PCEPI' || symbol === 'PCETRIM12M159SFRBDAL') && row.asOf) {
    return `${String(row.asOf).slice(0,7).replace('-','년 ')}월 관측`;
  }
  return row.asOf ? `${String(row.asOf).slice(0,10)} 관측` : '관측일 미제공';
}

export function macroCategory(row) {
  const symbol = row.original_symbol || row.symbol;
  const map = {
    T10Y2Y:'금리',T10Y3M:'금리',DFII10:'금리',FEDFUNDS:'금리',
    T10YIE:'물가',PCEPI:'물가',PCETRIM12M159SFRBDAL:'물가',
    RRPONTSYD:'유동성',WALCL:'유동성',WTREGEN:'유동성',M2SL:'유동성',
    BAMLH0A0HYM2:'위험', '^VIX':'위험', UNRATE:'고용', RSAFS:'경기',
  };
  return map[symbol] || '기타';
}

export function newsRelation(row) {
  if (row?.relationType === 'direct') return { label: '직접 관련', className: 'direct' };
  if (row?.relationType === 'related') return { label: '업종 관련', className: 'related' };
  return { label: '관련 기사', className: 'related' };
}

export function translatedTag(tag) {
  const map = {
    earnings:'실적', orders:'수주', guidance:'전망', dividend:'배당', buyback:'자사주',
    lawsuit:'소송', regulation:'규제', merger:'인수합병', acquisition:'인수',
    product:'제품', ai:'AI', semiconductor:'반도체', macro:'거시경제',
  };
  return map[String(tag || '').toLowerCase()] || String(tag || '');
}

export function titleLanguage(title) {
  const text = String(title || '');
  const korean = (text.match(/[가-힣]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return latin > korean * 2 ? '영문 원문' : '한국어';
}

export function macroPublicationLabel(row) {
  const symbol = row?.original_symbol || row?.symbol;
  if (symbol === 'PCEPI' || symbol === 'PCETRIM12M159SFRBDAL') {
    return row?.publishedAt ? `발표 ${formatKst(row.publishedAt,{dateOnly:true})}` : '발표일 메타데이터 미제공';
  }
  return row?.publishedAt ? `발표 ${formatKst(row.publishedAt,{dateOnly:true})}` : '';
}

export function macroSourceUrl(row) {
  const symbol = String(row?.original_symbol || row?.symbol || '');
  if (!symbol || symbol.startsWith('^')) return '';
  return `https://fred.stlouisfed.org/series/${encodeURIComponent(symbol)}`;
}

export function changeBasisLabel(value) {
  const map = {
    'previous observation': '이전 관측 대비',
    'previous monthly observation': '이전 월 관측 대비',
    'previous trading close': '전 거래일 종가 대비',
  };
  return map[String(value || '').toLowerCase()] || value || '이전 관측 대비';
}
