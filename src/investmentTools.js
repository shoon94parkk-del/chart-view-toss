// Keep this list in step with the original Chart View investment-tools page.
export const INVESTMENT_TOOLS = [
  {name:'Finviz',short:'FZ',domain:'finviz.com',url:'https://finviz.com/',description:'미국 주식 스크리너',tone:'navy'},
  {name:'FRED',short:'FR',domain:'fred.stlouisfed.org',url:'https://fred.stlouisfed.org/',description:'금리·유동성·거시',tone:'green'},
  {name:'Investing',short:'IN',domain:'investing.com',url:'https://www.investing.com/',description:'시황·경제 캘린더',tone:'orange'},
  {name:'TradingView',short:'TV',domain:'tradingview.com',url:'https://www.tradingview.com/',description:'차트·기술분석',tone:'blue'},
  {name:'DART',short:'D',domain:'dart.fss.or.kr',url:'https://dart.fss.or.kr/',description:'한국 기업 공시',tone:'blue'},
  {name:'KRX',short:'KRX',domain:'data.krx.co.kr',url:'https://data.krx.co.kr/',description:'한국거래소 데이터',tone:'navy'},
  {name:'Yahoo Finance',short:'Y!',domain:'finance.yahoo.com',url:'https://finance.yahoo.com/',description:'해외 시세·재무',tone:'purple'},
  {name:'네이버 금융',short:'N',domain:'finance.naver.com',url:'https://finance.naver.com/',description:'국내 시세·뉴스',tone:'green'},
  {name:'Koyfin',short:'KY',domain:'koyfin.com',url:'https://www.koyfin.com/',description:'멀티자산 대시보드',tone:'navy'},
  {name:'Macrotrends',short:'MT',domain:'macrotrends.net',url:'https://www.macrotrends.net/',description:'장기 재무·밸류',tone:'orange'},
  {name:'Trading Economics',short:'TE',domain:'tradingeconomics.com',url:'https://tradingeconomics.com/',description:'글로벌 거시 데이터',tone:'blue'},
  {name:'Seeking Alpha',short:'SA',domain:'seekingalpha.com',url:'https://seekingalpha.com/',description:'실적·리서치',tone:'navy'},
];

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));

export function investmentToolsMarkup(){
  return `<div class="investment-tool-grid">${INVESTMENT_TOOLS.map(tool=>`<button type="button" class="investment-tool-card" data-external-url="${esc(tool.url)}" aria-label="${esc(tool.name)} 외부 사이트 열기"><span class="investment-tool-logo ${esc(tool.tone)}"><span>${esc(tool.short)}</span><img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(tool.domain)}&sz=128" width="34" height="34" loading="lazy" referrerpolicy="no-referrer" alt=""></span><strong>${esc(tool.name)}</strong><small>${esc(tool.description)}</small><i aria-hidden="true">↗</i></button>`).join('')}</div><p class="investment-tool-note">사이트 로고가 제공되지 않으면 약칭을 표시해요. 외부 사이트의 정보와 이용 조건은 해당 서비스에서 확인해주세요.</p>`;
}

export function bindInvestmentToolLogos(root){
  root.querySelectorAll('.investment-tool-logo img').forEach(image=>{
    image.addEventListener('error',()=>{image.hidden=true;},{once:true});
    if(image.complete && !image.naturalWidth)image.hidden=true;
  });
}
