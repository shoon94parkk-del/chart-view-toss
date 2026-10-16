# 경제지표 예상치 API 발급 확인 — 2026-10-16

사용자의 “필요한 경제지표 API를 발급받을 수 있으면 받고, 안 되면 알려 달라”는 요청에 따라 공식 가입·인증 경로를 확인했다. **실제 발급 키 0개, 가입·인증·문의 폼 제출 0건**이다. 현재 실행 환경에는 사용할 수 있는 공급자 키나 사용자 로그인 연결이 없었다. 별도 운영 계정의 존재까지 부정하는 결과는 아니다.

## 공식 실제치와 시장 예상치

CPI·근원 CPI·PPI·근원 PPI의 공식 발표는 [BLS](https://www.bls.gov/schedule/news_release/), PCE·근원 PCE는 [BEA](https://www.bea.gov/news/schedule)에서 확인한다. 이 실제 통계·발표 일정과 민간 경제학자 조사 컨센서스는 별도 데이터다. BLS·BEA·FRED 실제 통계를 연결했다고 시장 예상치까지 제공되지는 않는다. 현재 수정 지수로 계산한 변화율도 최초 발표 실제값과 구분한다.

[앞선 조사](MONEYTORING_RESEARCH_2026-10-16.md)에서 CPI 네 가지 예상치를 공급자의 공개 과거 표에서 실제 조회했다. 컨센서스는 존재하지만 해당 조사값은 **운영 데이터에 가져오지 않았다**. 공개 열람, API 호출 권한, 공개 앱 표시·재배포, 과거 데이터 영구 보관은 각각 확인해야 한다. 사후 조회 시각을 발표 전 수집 시각으로 바꾸지 않는다.

## 공급자별 발급 결과와 남은 조건

| 공급자 | 확인한 공식 경로 | 진행에 필요한 정보·권한 |
|---|---|---|
| FMP | [가입](https://site.financialmodelingprep.com/register): “Get your free API key. No card required.” 이메일·비밀번호 또는 Google 로그인 | 사용자 이메일·인증 가능한 계정이 없어 가입하지 않았다. 가입 뒤 이메일 확인 절차는 미검증이다. 무료 키의 [경제 캘린더](https://site.financialmodelingprep.com/developer/docs/stable/economics-calendar) 접근·미국 물가 범위도 미검증이다. [공식 가격](https://site.financialmodelingprep.com/developer/docs/pricing)은 공개 표시·재배포에 별도 **Data Display and Licensing Agreement**를 요구한다. [상업 이용 경로](https://site.financialmodelingprep.com/pricing-plans?planType=commercial). |
| Finnhub | [가입](https://finnhub.io/register): 이름·이메일·비밀번호, 개인 비전문 이용자 또는 상업 이용 서면승인 자격 확인 | 사용자 계정 정보와 상업 이용 서면승인이 없다. [경제 캘린더 문서](https://finnhub.io/docs/api/economic-calendar)는 **Premium Access Required**, 과거 이벤트·surprise는 Enterprise로 명시한다. [무료 플랜](https://finnhub.io/pricing)은 Personal Use이며 공개 앱 권한을 뜻하지 않는다. [기업용 경로](https://finnhub.io/pricing-startups-and-enterprise). |
| Trading Economics | [개발자 포털](https://developer.tradingeconomics.com/) → [공식 로그인·가입](https://sso.tradingeconomics.com/sso/login?returnurl=developer.tradingeconomics.com/): 이메일 인증 코드 후 이름·성·비밀번호·확인, 국가 선택 | 사용자 이메일·인증 코드 또는 승인된 로그인 계정이 없다. [인증 문서](https://docs.tradingeconomics.com/get_started/authentication/)는 플랜 가입 후 키 발급을 안내한다. 확인한 [가격표](https://tradingeconomics.com/api/pricing.aspx)에서 Economic Calendar와 공개 표시·배포는 Enterprise/custom 경로다. [공식 Enterprise 문의](https://tradingeconomics.com/api/contact.aspx?subject=enterprise)는 제출하지 않았다. |

FMP의 무료 가입 가능성과 차트뷰 공개 앱에 사용할 수 있는 무료 컨센서스 API 확보는 다르다. 세 곳 모두 **무료 키로 공개 앱 표시와 과거 저장까지 허용된 연결을 확보했다는 근거는 없다**. [FMP 약관](https://site.financialmodelingprep.com/terms-of-service)과 [Finnhub 약관](https://finnhub.io/terms-of-service)은 표시·공유와 종료 후 데이터 이용을 제한하므로 보관 범위도 확인해야 한다.

## 준비된 연결과 다음 단계

TE 공식 응답 계약을 바탕으로 서버 어댑터 연결 준비를 했지만 **키·권한 없는 공급자 연결은 비활성 상태**다. [공식 스키마](https://docs.tradingeconomics.com/economic_calendar/schema/)의 `Forecast`/`ForecastValue`는 조사 컨센서스, `TEForecast`/`TEForecastValue`는 TE 자체 모형이므로 서로 대체하지 않는다. 공식 예제의 `CalendarId`와 필드표의 `CalendarID` 표기 차이를 고려한다. `LastUpdate`는 최근 갱신·삽입 시각이며 예상치 최초 공개 시각의 증거가 아니다. [과거 시점 문서](https://docs.tradingeconomics.com/economic_calendar/point-in-time/)만으로 임의 발표 전 vintage 조회가 검증된 것은 아니다.

연결을 활성화하려면 사용자 소유 계정으로 인증을 완료하고, 경제 캘린더 접근·차트뷰 공개 표시·역사 저장 범위를 확인한 뒤 실제 CPI/PPI/PCE 응답의 지표·관측월·전년/전월·단위·계절조정·발표시각을 검증한다. 키는 서버에만 둔다. 그 전까지 화면은 예상치 출처 미연결 상태를 유지한다.

가상 이메일·계정, 임시 수신함, 유료 신청·계약 수락, 공급자 연락, CAPTCHA 우회는 사용하지 않았다. 이 문서 작성으로 계정·키·운영 환경을 변경하지 않았다.
