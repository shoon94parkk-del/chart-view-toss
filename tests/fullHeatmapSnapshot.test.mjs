import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateFullHeatmapSnapshot} from '../src/fullHeatmapSnapshot.js';

// Actual bounded canonical full-API capture, 2026-10-07. Deterministic validation
// time keeps observations unchanged; production values are never pinned here.
const captured={
 generatedAt:"2026-10-08T00:21:25.922761+09:00",source:"canonical-provider-full-heatmap",
 counts:{KR:20,US:40},complete:true,snapshotVersion:1,snapshotCapturedAt:'2026-10-07T15:30:00Z',
 results:[
{"ticker":"NVDA","name":"NVIDIA Corporation","market":"US","marketCap":5776928145408,"sector":"Technology","sectorSource":"미국 히트맵 산업 분류","price":237.145,"change":-0.88,"asOf":"2026-10-07T15:23:02+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"home-canonical","stale":false},
{"ticker":"GOOGL","name":"Alphabet Inc.","market":"US","marketCap":4252103868416,"sector":"Communication","sectorSource":"미국 히트맵 산업 분류","price":345.56,"change":-0.61,"asOf":"2026-10-07T15:23:03+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"home-canonical","stale":false},
{"ticker":"AMZN","name":"Amazon.com, Inc.","market":"US","marketCap":2764424347648,"sector":"Consumer Cyclical","sectorSource":"미국 히트맵 산업 분류","price":256.755,"change":0.18,"asOf":"2026-10-07T15:22:57+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"home-canonical","stale":false},
{"ticker":"BRK-B","name":"Berkshire Hathaway Inc. New","market":"US","marketCap":1078559571968,"sector":"Financial","sectorSource":"미국 히트맵 산업 분류","price":504.642,"change":-0.18,"asOf":"2026-10-07T15:20:58+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"LLY","name":"Eli Lilly and Company","market":"US","marketCap":1031736852480,"sector":"Healthcare","sectorSource":"미국 히트맵 산업 분류","price":1192.58,"change":3.03,"asOf":"2026-10-07T15:21:01+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"WMT","name":"Walmart Inc.","market":"US","marketCap":897743060992,"sector":"Consumer Defensive","sectorSource":"미국 히트맵 산업 분류","price":108.68,"change":1.38,"asOf":"2026-10-07T15:21:01+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"XOM","name":"ExxonMobil Holdings Corporation","market":"US","marketCap":676327260160,"sector":"Energy","sectorSource":"미국 히트맵 산업 분류","price":164.015,"change":-0.28,"asOf":"2026-10-07T15:20:57+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"GE","name":"GE Aerospace","market":"US","marketCap":333752107008,"sector":"Industrials","sectorSource":"미국 히트맵 산업 분류","price":304.54,"change":-1.57,"asOf":"2026-10-07T15:21:02+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"LIN","name":"Linde plc","market":"US","marketCap":198587875328,"sector":"Materials","sectorSource":"미국 히트맵 산업 분류","price":486.065,"change":-0.79,"asOf":"2026-10-07T15:20:57+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"NEE","name":"NextEra Energy, Inc.","market":"US","marketCap":166692077568,"sector":"Utilities","sectorSource":"미국 히트맵 산업 분류","price":76.87,"change":-1.3,"asOf":"2026-10-07T15:20:59+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"PLD","name":"Prologis, Inc.","market":"US","marketCap":118514139136,"sector":"Real Estate","sectorSource":"미국 히트맵 산업 분류","price":127.53,"change":-0.89,"asOf":"2026-10-07T15:21:01+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"industry":"통신 및 방송 장비 제조업","mainProducts":"통신 및 방송 장비 제조(무선) 제품, 반도체 제조(메모리) 제품, 전자부품 제조(디스플레이) 제품, 영상 및 음향기기 제조(영상기기) 제품 등","sectorSource":"KRX 업종·주요제품","ticker":"005930.KS","name":"삼성전자","market":"KR","price":269000,"change":-1.1,"marketCap":1797596687368192,"asOf":"2026-10-07T20:20:23+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"home-canonical","stale":false},
{"industry":"반도체 제조업","mainProducts":"반도체,컴퓨터,통신기기 제조,도매","sectorSource":"KRX 업종·주요제품","ticker":"000660.KS","name":"SK하이닉스","market":"KR","price":1715000,"change":-3.27,"marketCap":1247226424721408,"asOf":"2026-10-07T20:20:24+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"home-canonical","stale":false},
{"industry":"기초 의약물질 제조업","mainProducts":"바이오의약품","sectorSource":"KRX 업종·주요제품","ticker":"207940.KS","name":"삼성바이오로직스","market":"KR","price":1278000,"change":-2.44,"marketCap":60100500783104,"asOf":"2026-10-07T20:20:23+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"home-canonical","stale":false},
{"industry":"자동차용 엔진 및 자동차 제조업","mainProducts":"자동차(승용차,버스,트럭,특장차),자동차부품,자동차전착도료 제조,차량정비사업","sectorSource":"KRX 업종·주요제품","ticker":"005380.KS","name":"현대차","market":"KR","price":336500,"change":-3.3,"marketCap":89285424316416,"asOf":"2026-10-07T20:20:25+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"home-canonical","stale":false},
{"industry":"자동차용 엔진 및 자동차 제조업","mainProducts":"승용차,중대형버스,트럭,민수특수차량,군수차량 제조,판매,정비","sectorSource":"KRX 업종·주요제품","ticker":"000270.KS","name":"기아","market":"KR","price":109300,"change":-2.93,"marketCap":43024222519296,"asOf":"2026-10-07T20:20:23+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"home-canonical","stale":false},
{"industry":"일차전지 및 이차전지 제조업","mainProducts":"2차전지 (소형,ESS,자동차전지)","sectorSource":"KRX 업종·주요제품","ticker":"373220.KS","name":"LG에너지솔루션","market":"KR","price":387000,"change":-0.77,"marketCap":91728002416640,"asOf":"2026-10-07T20:20:21+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"home-canonical","stale":false},
{"industry":"자료처리, 호스팅, 포털 및 기타 인터넷 정보매개 서비스업","mainProducts":"포털 서비스 및 온라인 광고","sectorSource":"KRX 업종·주요제품","ticker":"035420.KS","name":"NAVER","market":"KR","price":188100,"change":-1.57,"marketCap":28522745692160,"asOf":"2026-10-07T20:20:20+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"home-canonical","stale":false},
{"industry":"기초 의약물질 제조업","mainProducts":"램시마, 트룩시마, 허쥬마","sectorSource":"KRX 업종·주요제품","ticker":"068270.KS","name":"셀트리온","market":"KR","price":182600,"change":0.11,"marketCap":41911159095296,"asOf":"2026-10-07T20:20:22+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"home-canonical","stale":false},
{"industry":"기초 화학물질 제조업","mainProducts":"유화/기능/합성수지,재생섬유소,산업재,리튬이온전지,평광판,PVC 제조,도매","sectorSource":"KRX 업종·주요제품","ticker":"051910.KS","name":"LG화학","market":"KR","price":274500,"change":-1.61,"marketCap":21603928768512,"asOf":"2026-10-07T20:20:23+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"provider-canonical","stale":false},
{"industry":"일차전지 및 이차전지 제조업","mainProducts":"2차전지, 전자재료 제조 판매","sectorSource":"KRX 업종·주요제품","ticker":"006400.KS","name":"삼성SDI","market":"KR","price":557000,"change":-3.13,"marketCap":45170145886208,"asOf":"2026-10-07T20:20:20+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"provider-canonical","stale":false},
{"industry":"기타 금융업","mainProducts":"금융지주회사","sectorSource":"KRX 업종·주요제품","ticker":"055550.KS","name":"신한지주","market":"KR","price":103000,"change":-0.58,"marketCap":48640286523392,"asOf":"2026-10-07T20:20:21+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"provider-canonical","stale":false},
{"industry":"기타 금융업","mainProducts":"-","sectorSource":"KRX 업종·주요제품","ticker":"105560.KS","name":"KB금융","market":"KR","price":168300,"change":0.84,"marketCap":59126268821504,"asOf":"2026-10-07T20:20:22+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"provider-canonical","stale":false},
{"industry":"자료처리, 호스팅, 포털 및 기타 인터넷 정보매개 서비스업","mainProducts":"인터넷 서비스(인터넷 광고)","sectorSource":"KRX 업종·주요제품","ticker":"035720.KS","name":"카카오","market":"KR","price":32900,"change":-1.79,"marketCap":14888517763072,"asOf":"2026-10-07T20:20:24+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"provider-canonical","stale":false},
{"industry":"기타 금융업","mainProducts":"기타 금융","sectorSource":"KRX 업종·주요제품","ticker":"086790.KS","name":"하나금융지주","market":"KR","price":128200,"change":-0.39,"marketCap":34510257258496,"asOf":"2026-10-07T20:20:22+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"provider-canonical","stale":false},
{"industry":"통신 및 방송 장비 제조업","mainProducts":"이동통신단말기,C-TV,V.C.R.,컴퓨터,완전평면 TV,플라즈마 디스플레이 패널 TV,전자제품(세탁기외),CDMA(코드분할다중접속)이동통신,전자교환기,전송기기","sectorSource":"KRX 업종·주요제품","ticker":"066570.KS","name":"LG전자","market":"KR","price":209000,"change":-10.11,"marketCap":40635880964096,"asOf":"2026-10-07T20:20:23+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"provider-canonical","stale":false},
{"industry":"기타 금융업","mainProducts":"지주회사","sectorSource":"KRX 업종·주요제품","ticker":"003550.KS","name":"LG","market":"KR","price":110500,"change":-4.25,"marketCap":17517483393024,"asOf":"2026-10-07T20:20:21+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"provider-canonical","stale":false},
{"industry":"일차전지 및 이차전지 제조업","mainProducts":"내화물, 생석회, 음극재 및 양극재","sectorSource":"KRX 업종·주요제품","ticker":"003670.KS","name":"포스코퓨처엠","market":"KR","price":190100,"change":-7.04,"marketCap":17362295193600,"asOf":"2026-10-07T20:20:18+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"provider-canonical","stale":false},
{"industry":"전자부품 제조업","mainProducts":"수동소자 (MLCC, Inductor, Chip Resistor 등), 모듈(카메라모듈, 통신모듈), 반도체패키지 기판","sectorSource":"KRX 업종·주요제품","ticker":"009150.KS","name":"삼성전기","market":"KR","price":1607000,"change":-4.06,"marketCap":125483979112448,"asOf":"2026-10-07T20:20:25+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"provider-canonical","stale":false},
{"industry":"컴퓨터 프로그래밍, 시스템 통합 및 관리업","mainProducts":"IT서비스, 물류BPO","sectorSource":"KRX 업종·주요제품","ticker":"018260.KS","name":"삼성에스디에스","market":"KR","price":207000,"change":-5.69,"marketCap":16591614902272,"asOf":"2026-10-07T20:20:22+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"provider-canonical","stale":false},
{"industry":"기타 전문 도매업","mainProducts":"도소매, 건설, 남자용 정장 제조업 등","sectorSource":"KRX 업종·주요제품","ticker":"028260.KS","name":"삼성물산","market":"KR","price":335500,"change":-1.9,"marketCap":56454132269056,"asOf":"2026-10-07T20:20:22+09:00","sessionDate":null,"previousSessionDate":null,"source":"Naver Finance KRX/Koscom","quoteBasis":"provider-canonical","stale":false},
{"ticker":"AAPL","name":"Apple Inc.","market":"US","marketCap":4869056364544,"sector":"Technology","sectorSource":"미국 히트맵 산업 분류","price":335.493,"change":0.56,"asOf":"2026-10-07T15:23:02+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"home-canonical","stale":false},
{"ticker":"MSFT","name":"Microsoft Corporation","market":"US","marketCap":3930341244928,"sector":"Technology","sectorSource":"미국 히트맵 산업 분류","price":526.813,"change":-0.47,"asOf":"2026-10-07T15:23:03+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"home-canonical","stale":false},
{"ticker":"META","name":"Meta Platforms, Inc.","market":"US","marketCap":1882301399040,"sector":"Communication","sectorSource":"미국 히트맵 산업 분류","price":723.8,"change":-2.04,"asOf":"2026-10-07T15:23:04+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"home-canonical","stale":false},
{"ticker":"TSLA","name":"Tesla, Inc.","market":"US","marketCap":1503513673728,"sector":"Consumer Cyclical","sectorSource":"미국 히트맵 산업 분류","price":375.455,"change":-1.37,"asOf":"2026-10-07T15:23:05+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"home-canonical","stale":false},
{"ticker":"AVGO","name":"Broadcom Inc.","market":"US","marketCap":1793977876480,"sector":"Technology","sectorSource":"미국 히트맵 산업 분류","price":373,"change":-0.75,"asOf":"2026-10-07T15:23:03+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"home-canonical","stale":false},
{"ticker":"JPM","name":"JP Morgan Chase & Co.","market":"US","marketCap":880603955200,"sector":"Financial","sectorSource":"미국 히트맵 산업 분류","price":327.165,"change":-1.24,"asOf":"2026-10-07T15:21:18+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"V","name":"Visa Inc.","market":"US","marketCap":695822974976,"sector":"Financial","sectorSource":"미국 히트맵 산업 분류","price":371.45,"change":0.22,"asOf":"2026-10-07T15:21:17+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"ORCL","name":"Oracle Corporation","market":"US","marketCap":569971572736,"sector":"Technology","sectorSource":"미국 히트맵 산업 분류","price":143.45,"change":-0.91,"asOf":"2026-10-07T15:21:18+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"MA","name":"Mastercard Incorporated","market":"US","marketCap":496329719808,"sector":"Financial","sectorSource":"미국 히트맵 산업 분류","price":569.39,"change":0.5,"asOf":"2026-10-07T15:21:07+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"JNJ","name":"Johnson & Johnson","market":"US","marketCap":613993938944,"sector":"Healthcare","sectorSource":"미국 히트맵 산업 분류","price":259.47,"change":1.84,"asOf":"2026-10-07T15:20:59+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"BAC","name":"Bank of America Corporation","market":"US","marketCap":378237779968,"sector":"Financial","sectorSource":"미국 히트맵 산업 분류","price":53.27,"change":-1.52,"asOf":"2026-10-07T15:21:13+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"ABBV","name":"AbbVie Inc.","market":"US","marketCap":471272521728,"sector":"Healthcare","sectorSource":"미국 히트맵 산업 분류","price":272.78,"change":2.28,"asOf":"2026-10-07T15:21:14+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"NFLX","name":"Netflix, Inc.","market":"US","marketCap":286021025792,"sector":"Communication","sectorSource":"미국 히트맵 산업 분류","price":68.505,"change":-0.27,"asOf":"2026-10-07T15:21:19+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"COST","name":"Costco Wholesale Corporation","market":"US","marketCap":377364054016,"sector":"Consumer Defensive","sectorSource":"미국 히트맵 산업 분류","price":946.105,"change":1.11,"asOf":"2026-10-07T15:20:58+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"AMD","name":"Advanced Micro Devices, Inc.","market":"US","marketCap":1060161912832,"sector":"Technology","sectorSource":"미국 히트맵 산업 분류","price":643.02,"change":-0.99,"asOf":"2026-10-07T15:22:59+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"home-canonical","stale":false},
{"ticker":"HD","name":"Home Depot, Inc. (The)","market":"US","marketCap":344835227648,"sector":"Consumer Cyclical","sectorSource":"미국 히트맵 산업 분류","price":284.54,"change":-0.75,"asOf":"2026-10-07T15:21:20+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"PG","name":"Procter & Gamble Company (The)","market":"US","marketCap":333963853824,"sector":"Consumer Defensive","sectorSource":"미국 히트맵 산업 분류","price":148.885,"change":0.32,"asOf":"2026-10-07T15:21:08+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"CSCO","name":"Cisco Systems, Inc.","market":"US","marketCap":308620001280,"sector":"Technology","sectorSource":"미국 히트맵 산업 분류","price":117.47,"change":-0.4,"asOf":"2026-10-07T15:21:21+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"KO","name":"Coca-Cola Company (The)","market":"US","marketCap":370750652416,"sector":"Consumer Defensive","sectorSource":"미국 히트맵 산업 분류","price":86.395,"change":0.26,"asOf":"2026-10-07T15:21:19+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"WFC","name":"Wells Fargo & Company","market":"US","marketCap":302020427776,"sector":"Financial","sectorSource":"미국 히트맵 산업 분류","price":80.045,"change":-1.8,"asOf":"2026-10-07T15:21:20+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"CVX","name":"Chevron Corporation","market":"US","marketCap":407189618688,"sector":"Energy","sectorSource":"미국 히트맵 산업 분류","price":205.45,"change":-1.03,"asOf":"2026-10-07T15:21:15+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"UNH","name":"UnitedHealth Group Incorporated","market":"US","marketCap":337782898688,"sector":"Healthcare","sectorSource":"미국 히트맵 산업 분류","price":380.28,"change":1.05,"asOf":"2026-10-07T15:21:22+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"MS","name":"Morgan Stanley","market":"US","marketCap":286957305856,"sector":"Financial","sectorSource":"미국 히트맵 산업 분류","price":187.3,"change":-1.95,"asOf":"2026-10-07T15:21:16+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"CAT","name":"Caterpillar, Inc.","market":"US","marketCap":396901679104,"sector":"Industrials","sectorSource":"미국 히트맵 산업 분류","price":807.27,"change":-6.51,"asOf":"2026-10-07T15:21:23+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"GS","name":"Goldman Sachs Group, Inc. (The)","market":"US","marketCap":261233147904,"sector":"Financial","sectorSource":"미국 히트맵 산업 분류","price":876,"change":-2.36,"asOf":"2026-10-07T15:21:14+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"AXP","name":"American Express Company","market":"US","marketCap":265026748416,"sector":"Financial","sectorSource":"미국 히트맵 산업 분류","price":301.955,"change":-0.85,"asOf":"2026-10-07T15:21:11+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"MRK","name":"Merck & Company, Inc.","market":"US","marketCap":261567873024,"sector":"Healthcare","sectorSource":"미국 히트맵 산업 분류","price":143.17,"change":0.87,"asOf":"2026-10-07T15:20:49+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"CRM","name":"Salesforce, Inc.","market":"US","marketCap":251927756800,"sector":"Technology","sectorSource":"미국 히트맵 산업 분류","price":223.45,"change":-0.68,"asOf":"2026-10-07T15:21:21+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false},
{"ticker":"RTX","name":"RTX Corporation","market":"US","marketCap":248954535936,"sector":"Industrials","sectorSource":"미국 히트맵 산업 분류","price":180.24,"change":-1.66,"asOf":"2026-10-07T15:21:21+00:00","sessionDate":"2026-10-07","previousSessionDate":"2026-10-06","source":"Yahoo Chart regularMarketPrice + official previousClose","quoteBasis":"provider-canonical","stale":false}
 ]};
const now=Date.parse('2026-10-07T16:00:00Z');
const copy=()=>structuredClone(captured);
const validate=payload=>validateFullHeatmapSnapshot(payload,{now});

test('complete real canonical 20/40 snapshot preserves every numeric value, provenance and timestamp, marking only rows stale',()=>{
 const input=copy(),before=copy(),result=validate(input);
 assert.ok(result);assert.equal(result.results.length,60);
 assert.deepEqual(input,before,'validation does not mutate the API/file response');
 assert.deepEqual(result,{...before,results:before.results.map(row=>({...row,stale:true}))});
 assert.equal(result.snapshotCapturedAt,before.snapshotCapturedAt);
 assert.equal(result.generatedAt,before.generatedAt);
 assert.ok(result.results.some(row=>row.quoteBasis==='home-canonical'));
 assert.ok(result.results.some(row=>row.quoteBasis==='provider-canonical'));
});

test('optional sessions stay absent or null rather than being invented from capture dates',()=>{
 const input=copy();delete input.results[0].sessionDate;input.results[0].previousSessionDate=null;
 const result=validate(input);assert.ok(result);
 assert.equal(Object.hasOwn(result.results[0],'sessionDate'),false);
 assert.equal(result.results[0].previousSessionDate,null);
});

test('missing, partial, duplicate, wrong budget and legacy envelopes fail closed as whole snapshots',()=>{
 for(const input of [undefined,null,[],{}, {...copy(),snapshotVersion:true}, {...copy(),snapshotVersion:2},
  {...copy(),complete:false},{...copy(),source:'legacy-heatmap.json'},{...copy(),results:copy().results.slice(1)},
  {...copy(),counts:{KR:20,US:39}},{...copy(),counts:{KR:20,US:40,OTHER:0}},
  {...copy(),counts:{KR:'20',US:40}}])assert.equal(validate(input),null);
 const duplicate=copy();duplicate.results[1]=structuredClone(duplicate.results[0]);assert.equal(validate(duplicate),null);
 const market=copy();market.results.find(row=>row.market==='US').market='KR';assert.equal(validate(market),null);
 assert.equal(validateFullHeatmapSnapshot(copy(),{now:NaN}),null);
});

test('any malformed or noncanonical row rejects all sixty observations',()=>{
 const cases={
  price:[null,0,-1,'100',true,NaN,Infinity],change:[null,'',true,NaN,Infinity],
  marketCap:[null,0,-1,'1000',false,Infinity],source:[null,'','   ','legacy heatmap.json'],
  quoteBasis:[undefined,'daily-cache','provider'],market:[null,'OTHER'],ticker:['',' nvda','nvda','AAPL.KS'],
  stale:['false',1,null],asOf:[null,'2026-10-07','2026-10-07T15:00:00','2026-02-30T15:00:00Z',
   '2026-10-07T24:00:00Z','2026-10-07T15:60:00Z','2026-10-07T15:00:60Z',
   '2026-10-07T15:00:00+25:00','2026-10-07T15:00:00+01:60'],
  sessionDate:['2026-02-30','2026-1-1',1,'2026-10-08'],previousSessionDate:['invalid','2026-10-07','2026-10-08'],
 };
 for(const [field,values] of Object.entries(cases))for(const value of values){
  const input=copy();input.results[0][field]=value;assert.equal(validate(input),null,field+'='+String(value));
 }
 for(const row of [null,1,[]]){const input=copy();input.results[0]=row;assert.equal(validate(input),null);}
});

test('capture, generation and every observation must be recent and chronological without rollover or local-time parsing',()=>{
 for(const field of ['snapshotCapturedAt','generatedAt'])for(const value of [
  '2026-10-07T16:00:00.001Z','2026-10-05T15:59:59Z','2026-10-07T15:30:00','2026-02-30T15:30:00Z',
  '2026-10-07T15:30:00+24:00','bad-date',null,
 ]){const input=copy();input[field]=value;assert.equal(validate(input),null,field+'='+value);}
 const afterCapture=copy();afterCapture.generatedAt='2026-10-07T15:30:01Z';assert.equal(validate(afterCapture),null);
 const futureObservation=copy();futureObservation.results[0].asOf='2026-10-07T15:30:00.000001Z';assert.equal(validate(futureObservation),null,'microsecond after capture is future');
 const oldRow=copy();oldRow.results[0].asOf='2026-10-05T15:59:59Z';oldRow.results[0].sessionDate='2026-10-05';oldRow.results[0].previousSessionDate='2026-10-02';
 assert.equal(validate(oldRow),null,'one expired row cannot produce an apparently complete map');
});

test('48-hour boundary is accepted without making old quotes fresh or refreshing any original dates',()=>{
 const input=copy();input.snapshotCapturedAt=input.generatedAt='2026-10-05T16:00:00Z';
 input.results=input.results.map(row=>({...row,asOf:'2026-10-05T16:00:00+00:00',sessionDate:'2026-10-05',previousSessionDate:'2026-10-02'}));
 const result=validate(input);assert.ok(result);assert.equal(result.results[0].asOf,'2026-10-05T16:00:00+00:00');assert.equal(result.results[0].stale,true);
 assert.equal(validateFullHeatmapSnapshot(input,{now:now+1}),null);
});

test('session validation uses Korean and New York market dates, including offset and DST, not UTC or capture day',()=>{
 const input=copy(),us=input.results.find(row=>row.market==='US'),kr=input.results.find(row=>row.market==='KR');
 us.asOf='2026-10-07T01:00:00Z';us.sessionDate='2026-10-06';us.previousSessionDate='2026-10-05';
 kr.asOf='2026-10-06T23:00:00Z';kr.sessionDate='2026-10-07';kr.previousSessionDate='2026-10-06';
 assert.ok(validate(input));
 us.sessionDate='2026-10-07';assert.equal(validate(input),null,'UTC tomorrow is still yesterday in New York');
 us.sessionDate='2026-10-06';kr.sessionDate='2026-10-08';assert.equal(validate(input),null,'Korean session cannot be later than local observation');
});

