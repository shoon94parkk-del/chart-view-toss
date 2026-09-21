# 앱인토스 재등록 준비 (2026-09-21)

## 확인한 반려 사유와 반영

| 실제 콘솔 반려 항목 | 변경 |
| --- | --- |
| `intoss://chartviewHome`에서 번들을 못 찾음 | 기능 스킴은 `intoss://chartview/chartviewHome`. 클라이언트에 `/chartviewHome` 차트 화면 별칭 추가 |
| 공통 내비게이션 아이콘 누락 | SDK 3.5.0, `navigationBar.withTitle: true`, light 테마. SDK 3는 콘솔 앱 이름/로고를 사용 |
| 핀치 확대·축소 | viewport, touch/gesture, 차트 pinch 설정 모두 차단 |
| iPhone16/iOS18.4 입력값 흰색 | 입력 색상 및 `-webkit-text-fill-color`, placeholder 색상 명시, 16px 입력 |
| 로고 배경 모서리 | `public/chartview-logo-600.png`: 정사각형 불투명 600×600 PNG |

## 구현과 운영

- 기존 토스 전용 저장소를 유지하며 화면을 정적 `.ait`에 번들링한다. 외부 웹사이트 iframe/리다이렉트는 사용하지 않는다.
- API: `https://chart-view-pkv8.onrender.com`.
- 서버 CORS에 `https://chartview.web.tossmini.com`, `https://chartview.private-web.tossmini.com`을 추가하고 실제 OPTIONS 응답을 확인했다.
- 토스 런타임에서는 SDK Storage로 관심·비교 목록을 저장한다. 읽기 실패 시 시작을 재시도하며 기본값으로 덮어쓰지 않는다. 웹 미리보기의 localStorage는 유지한다.
- 토스 로그인/클라우드 동기화는 이 버전에서 사용하지 않는다. 콘솔에 기존 로그인 설정이 있지만 별도 개인정보 제공 동의를 실행하지 않는다.
- 최초 기능 딥링크에서 네이티브 뒤로가기 시 미니앱을 닫고, 앱 내부 이동 뒤에는 이전 화면으로 돌아간다.
- 개인정보·이용 안내에 운영자 박상훈, 고객문의 kimtang89@naver.com 반영.

## 검증

- `npm test`: 기존 AIT 계약 검사 + SDK 저장소 복원/쓰기/삭제/실패/웹 미리보기 테스트.
- `npm run build:ait`: 웹 빌드와 SDK `.ait` 생성.
- `tests/mobile_release_qa.mjs`: 320/360/390/430px, 종목 선택창, 5xx, 시간초과, 오프라인. QA 실행은 `VITE_CHARTVIEW_API_TIMEOUT_MS=300` 빌드에서 수행하며 배포 번들은 기본 12초로 다시 빌드한다.
- `tests/live_api_contract.mjs`: 실제 API 시세·차트·경제지표 계약.
- `tests/capture_release.mjs`: mock 없이 실제 데이터로 등록용 636×1048 스크린샷 생성.
- 서버: SDK3 프로덕션/프리뷰와 기존 도메인 허용 및 무관한 도메인 거부 테스트.

## 제출 전 남은 확인

1. 실제 Android/iPhone 토스 앱에서 QR 실행: 네이티브 아이콘·닫기·뒤로가기·검색 키보드·재실행 저장·핀치 차단 확인. 브라우저 테스트가 이를 대신하지 않는다.
2. 콘솔 주요 기능 경로를 위의 정상 스킴으로 등록한다.
3. 앱 정보 제출에는 인허가/신고 완료 확인과 위반 시 손해보상 약정이 포함된다. 운영자가 실제 충족 여부와 동의를 확인해야 한다.
4. 기존 `DATA_PROVIDER_INVENTORY.md`의 데이터 상업 이용·재배포 조건 검토는 미완료다. 공개 데이터라는 이유만으로 권리가 확보되는 것은 아니다.
5. API는 현재 Render Free이다. 절전/콜드스타트는 실제 출시 운영 품질에 영향을 줄 수 있다. 요금제 변경은 별도 비용 승인 후 진행한다.

## 공식 참고 문서

- [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame)
- [SDK 3.x 변경 및 CORS](https://developers-apps-in-toss.toss.im/documentation/integration/sdk-3.x)
- [앱 정보·로고·스크린샷 규격](https://developers-apps-in-toss.toss.im/guide/operation/console-workspace)
- [서비스 오픈 정책](https://developers-apps-in-toss.toss.im/intro/guide)
- [미니앱 테스트](https://developers-apps-in-toss.toss.im/guide/operation/toss)
