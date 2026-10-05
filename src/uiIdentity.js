// Decorative, local SVGs: labels remain the source of meaning for every action.
const paths = {
 analysis: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><path d="M14 20v-3m3 3v-6m4 6v-9"/>',
 exports: '<path d="M3 15h18l-3 5H6l-3-5Z"/><path d="M6 15V9h12v6M8 9V6h8v3M12 6V3"/><path d="M3 22h18"/>',
 filter: '<path d="M4 6h16M4 12h16M4 18h16"/><rect x="7" y="4" width="4" height="4" rx="1" fill="currentColor"/><rect x="14" y="10" width="4" height="4" rx="1" fill="currentColor"/><rect x="6" y="16" width="4" height="4" rx="1" fill="currentColor"/>',
 ledger: '<rect x="5" y="4" width="15" height="17" rx="2"/><path d="M9 3v3M16 3v3M9 10h7M9 14h4M3 8h4M3 13h4M3 18h4"/>',
 market: '<path d="M3 19h18M5 15V7m5 10V4m5 11V8m5 9V3"/><path d="M3 10h4M8 8h4M13 11h4M18 7h4"/>',
 compare: '<path d="M4 20V4m0 16h17M7 16l4-7 4 3 5-6M7 12l4 3 4-8 5 3"/>',
 watch: '<path d="m12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.03l-5.5 2.89 1.05-6.12L3.1 9.47l6.15-.9L12 3Z"/>',
 evidence: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10h6M10 7v6"/>',
 guide: '<path d="M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4V4Zm9 3a3 3 0 0 1 3-3h5v15h-4a4 4 0 0 0-4 2"/>',
};
export function uiIcon(name, size = 22) {
 return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.analysis}</svg>`;
}
const identities = {
 home: ['market', '시장과 내 종목', 'market'],
 chart: ['compare', '기간 수익률 비교', 'compare'],
 watch: ['watch', '내 종목 관리', 'watch'],
 more: ['analysis', '목적별 분석 도구', 'analysis'],
 discover: ['filter', '조건으로 종목 찾기', 'find'],
 gurus: ['guide', '투자 원칙으로 재무 조건 확인', 'find'],
 ideas: ['filter', '거래 패턴 관찰', 'find'],
 picks: ['ledger', '과거 선정 기록 점검', 'records'],
 exports: ['exports', '품목·국가별 수출 분석', 'exports'],
 memory: ['evidence', 'TrendForce 공개 시장가격', 'evidence'],
 heatmap: ['market', '시장 등락 탐색', 'market'],
 valuation: ['compare', '재무지표 비교', 'compare'],
 consensus: ['compare', '기간별 실적 추정치', 'compare'],
 bands: ['compare', '과거 밸류에이션', 'compare'],
 macro: ['evidence', '경제 지표와 기준', 'evidence'],
 news: ['evidence', '종목 관련 기사', 'evidence'],
 info: ['guide', '데이터와 이용 안내', 'guide'],
 tools: ['analysis', '외부 분석 도구', 'analysis'],
};
export function surfaceIdentity(route) {
 const [icon, label, tone] = identities[route] || ['evidence', '종목과 데이터', 'neutral'];
 return {icon, label, tone};
}
export function featureLabel(route) {
 return {chart:'수익률 비교',discover:'조건별 종목 찾기',exports:'수출 데이터',picks:'선정 기록·성과'}[route] || '';
}
