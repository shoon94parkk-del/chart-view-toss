# 무료 운영 및 공개 출시 점검 — 2026-09-21

## 현재 결정

운영자는 별도 데이터 계약·허가가 없다고 확인했다. 유료 Render 전환은 승인되지 않았으며 변경하지 않았다. 토스 상담은 전송됐지만 아직 답변이 없다. 성능 개선과 플랫폼 허용은 별개다.

## 무료 운영 구조

화면은 AIT 번들 안에서 실행한다. 장마감 스크리너·히트맵은 기존 수집 작업이 만든 JSON을 정적 CDN에서 제공할 수 있다. 정적 호스팅에는 Python 프로세스가 없어 Render Free 웹서비스의 15분 휴면/약 1분 기동을 겪지 않는다. 실시간 시세·임의 종목 차트·뉴스 조회 API에는 이 해결이 적용되지 않는다.

Cloudflare Pages 무료 한도는 월 500회 빌드·파일당 25MiB·20,000파일이다. Workers 무료는 일 100,000요청·CPU 10ms·128MB이므로 현재 Python/pandas 서버를 그대로 이식할 수 없다. Python API를 프록시하기만 하면 원서버 콜드스타트는 남는다. 다른 무료 VM도 용량·휴면·가용성·결제수단 조건을 별도 검증해야 하며 무제한 무료 운영을 보장하지 않는다.

준비한 내보내기:

```sh
node scripts/build-data-cdn.mjs /path/to/chart_View/static/data
```

출력은 `artifacts/data-cdn`. JSON 두 개, 원자료 날짜를 담은 manifest, CORS/캐시 헤더와 404만 포함한다. JavaScript/HTML 앱을 외부에서 가져오지 않는다. 스크리너 추천 점수는 제외한다. 원본 날짜를 그대로 유지하며 내보낸 시각을 데이터 기준시각으로 둔갑시키지 않는다.

데이터 사용권 확보 후 Cloudflare Pages에 이 폴더를 Direct Upload하거나, 수집 저장소에 동일 빌드 단계를 배치한다. CORS·갱신 결과를 확인한 뒤 `VITE_CHARTVIEW_STATIC_DATA_BASE=https://실제-데이터-사이트`로 AIT를 다시 빌드한다. 설정이 없으면 기존 API를 사용한다. CDN이 잘못 응답하거나 실패하면 2.5초 후 기존 API로 대체한다. 현재 CDN 서비스 생성/연결은 하지 않았다. 정적 자료를 일 1~2회 갱신하는 운영은 기존 15분 수집마다 사이트를 재빌드하는 것과 다르며 월 빌드 한도 내에서 계획해야 한다.

## 정책·권리

- 토스 서비스 오픈 정책 3-5/3-6: 증권 관련 서비스/종목 추천·전략 제한. 조회형 예외 승인으로 해석하지 않는다. 상담 답변 대기.
- Finnhub는 서면 승인 없는 데이터 및 파생 결과 재배포를 제한한다. 일반 개인 요금제 구독만으로 앱 재배포 권리를 얻지 않는다. 현재 공개 출시 권리 미확보.
- Yahoo Finance 비공식 데이터 호출이 성공하는 것은 공개 제공 허가가 아니다. 적용 약관·데이터 공급자의 앱 표시/캐시/재배포 권한을 별도로 확보해야 한다. 현재 미확보.
- Naver Finance 데이터와 NAVER API HUB 뉴스 검색 계약을 구분해야 한다. API 인증키가 있다는 이유만으로 금융 데이터·기사 저작권을 취득하지 않는다. 실제 사용 API 계약 및 표시조건 확인 전 승인 처리하지 않는다.
- FRED는 시리즈마다 저작권 유형이 다르다. 출처 표시만으로 모든 시리즈의 공개 앱 재배포가 허용되는 것은 아니다. 원자료별 조건과 앱 제공 범위를 확인해야 한다.

## 0.9.1 기술 보완

- User.getAnonymousKey 식별값을 기기에 저장. 계정별 관심/비교 목록 분리, 최초·최근 접속시각과 실행 횟수 보존. 서버 전송·다른 기기 동기화 없음. 첫 사용자만 기존 기기 목록을 이관. 식별 실패 시 기존 목록을 보존하고 재시도 안내.
- 기존 저장소·키에 제한시간 적용, 익명 키·이용기록 개인정보 안내 반영.
- 기능 경로/해시 재진입 통합. 잘못된 URL 인코딩이 시작을 중단시키지 않도록 수정.
- 화면 반응/API/차트 완성 시간을 분리 계측. 200개 표본 제한, 세션 내 메모리만 사용. 진단 모드 `?diagnostics=1`에서 `window.chartviewDiagnostics()`로 count/failure/P50/P95 확인. URL 쿼리·종목·식별키·오류 원문 수집 없음. Sentry 등 외부 전송/자동 알림은 아직 연결하지 않았다. 테스트 표본 P95는 실사용자 P95가 아니다.
- 320px 큰 글씨, 잘못된 URL, 주요 기능 직접 진입 검사를 CI에 추가.

## 콘솔 및 실기기 남은 일

2026-09-21 재확인: 주요 기능은 `주식 차트 비교 / Stock Chart Time / intoss://chartviewHome`로 남아 있고 수정사항 반려. 수정할 값은 `주식 차트 비교 / Compare Stocks / intoss://chartview/chartviewHome`이다. 해당 화면은 저장 대신 검토 요청으로 제출되므로 정책 답변 후 실제 값으로 재검토한다. 앱 정보도 반려 상태다.

새 AIT의 Android/iPhone: 최초 실행, 뒤로가기/종료, 키보드, 사용자키 발급, 관심종목 재접속 복원, 계정 변경 시 분리, 초기화, 외부 뉴스, 오프라인, 백그라운드 복귀를 확인한다. 자동 브라우저 테스트는 네이티브 테스트 완료를 대신하지 않는다.

최종 순서: 토스 범위 답변 및 데이터 권한 → 무료 CDN 활성화 또는 허용된 상시 API → 양 플랫폼 실기기 확인 → 앱 정보/주요 기능 수정 심사 → 최신 번들 검토 요청 → 승인 후 출시. 서버 유료화는 필수 정책 자체가 아니며, 무료 구조로 기능·응답 기준을 충족하면 가능하다.

## 확인한 공식 자료

- https://developers-apps-in-toss.toss.im/intro/guide
- https://developers-apps-in-toss.toss.im/checklist/app-nongame
- https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/user/user.getanonymouskey
- https://render.com/docs/free
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/workers/platform/limits/
- https://finnhub.io/terms-of-service
- https://fred.stlouisfed.org/legal/terms/
- https://developers.naver.com/notice/article/32973
