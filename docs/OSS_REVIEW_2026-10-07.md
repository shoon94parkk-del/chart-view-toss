# GitHub 오픈소스로 보완한 Chart View 품질 검사

2026-10-07에 실제 GitHub 저장소의 최근 커밋·릴리스·라이선스·의존성을 조회했다. 기존 vanilla Vite/Lightweight Charts, 모바일 UI, 공유 백엔드의 데이터 수집·계산, Render 배포 경로를 유지하면서 사용자에게 도움이 되는 문제를 찾는 것이 목적이다.

## 검토한 프로젝트

모두 조회 시점에 archived 상태가 아니었다. 아래 버전과 유지관리 날짜는 이번 조회의 기록이며, 향후에도 최신이라는 뜻은 아니다.

| 프로젝트 | 확인한 안정 버전 / 최근 유지관리 | 라이선스 / 실행 의존성 | Chart View 활용 판단 |
| --- | --- | --- | --- |
| [dequelabs/axe-core](https://github.com/dequelabs/axe-core) | v4.14.0, 2026-10-05 릴리스 / 2026-10-06 push | MPL-2.0 / 없음 | 실제 렌더링한 DOM의 이름·ARIA·텍스트 대비 문제를 찾는 데 채택. CI에서는 adapter와 일치하는 4.13.0 엔진 사용 |
| [dequelabs/axe-core-npm](https://github.com/dequelabs/axe-core-npm) | `@axe-core/playwright` 4.13.0, 2026-08-11 릴리스 / 2026-10-06 push | MPL-2.0 / `axe-core ~4.13.0`; peer `playwright-core >=1.0.0` | 기존 Playwright 1.55에 devDependency로 통합. 배포 앱에 분석 엔진을 포함하지 않음 |
| [dubzzz/fast-check](https://github.com/dubzzz/fast-check) | v4.10.2, 2026-09-19 릴리스 / 2026-10-07 push | MIT / `pure-rand ^8.0.0` | 결측·수익률·수출 단위 변환의 속성 검사에 유용한 후속 후보. 이번에는 기존 API→가공→UI 검사와 실제 접근성 오류 수정을 우선 |
| [krisk/Fuse](https://github.com/krisk/Fuse) | v7.5.0, 2026-07-13 릴리스 / 2026-08-09 push | Apache-2.0 / 없음 | 오타 허용 검색 후보. 검증된 국내 종목 집합과 한글 오매칭 평가 없이 기존 검색·티커 확인을 대체하면 다른 회사를 선택할 수 있어 보류 |
| [leeoniya/uFuzzy](https://github.com/leeoniya/uFuzzy) | 1.0.19, 2025-08-22 릴리스 / 2026-09-08 push | MIT / 없음 | 작은 검색 엔진이지만 기본 설정이 Latin 문자에 최적화됨. 한글 Unicode 설정과 회사 식별 검증이 먼저 필요해 보류 |
| [GoogleChrome/web-vitals](https://github.com/GoogleChrome/web-vitals) | v6.2.3, 2026-10-05 tag / 2026-10-06 push | Apache-2.0 / 없음 | LCP·CLS·INP 진단 후보. 같은 환경의 성능 기준과 측정 결과를 사용할 목적부터 정한 뒤 적용. 공유 CI의 시간 변동이나 불필요한 운영 telemetry를 늘리지 않음 |

차트 라이브러리/프레임워크 교체, 공유 백엔드 수집기 교체, LLM 키가 필요한 AI CI 프로젝트는 이번 개선에 추가하지 않았다. 현재 문제를 해결하는 근거 없이 기존 기능을 넓게 바꾸지 않는다.

## 실제로 내려받고 검토한 소스

GitHub에서 아래 고정 버전을 clone했고 README, LICENSE, package.json 및 Playwright adapter의 실행 소스를 읽었다. upstream 저장소의 install/build/prepare 스크립트는 실행하지 않았다.

| 소스 | 고정 commit SHA | 이번 세션 다운로드 경로 |
| --- | --- | --- |
| [axe-core v4.14.0](https://github.com/dequelabs/axe-core/tree/e797173108eadfa4355fe06af331791734e1757f) | `e797173108eadfa4355fe06af331791734e1757f` | `/workspace/scratch/chartview-oss-research/axe-core-v4.14.0` |
| [axe-core v4.13.0](https://github.com/dequelabs/axe-core/tree/1cc54b900413660610180d631feb73c9e74f4dc9) | `1cc54b900413660610180d631feb73c9e74f4dc9` | `/workspace/scratch/chartview-oss-research/axe-core-v4.13.0` |
| [axe-core-npm v4.13.0](https://github.com/dequelabs/axe-core-npm/tree/70dca949a4e55e2fb83e4e6896fbbf788c56b6fd) | `70dca949a4e55e2fb83e4e6896fbbf788c56b6fd` | `/workspace/scratch/chartview-oss-research/axe-core-npm` |

가장 최근 core 소스도 조사했지만, 실제 회귀 검사는 안정 adapter 4.13.0과 맞는 core 4.13.0으로 재검토했다. `package.json`의 `@axe-core/playwright`는 정확한 `4.13.0`이고, `package-lock.json`이 실제 core 버전과 배포 파일의 integrity를 고정한다. moving `develop`, beta 또는 Git URL 의존성은 사용하지 않는다. 기존 Node 24와 Playwright 1.55를 유지한다.

새 환경에서 소스 검토를 재현하려면 앱 저장소 밖에 다운로드한다.

```bash
mkdir -p ../chartview-oss-review
git clone --depth 1 --branch v4.13.0 https://github.com/dequelabs/axe-core.git ../chartview-oss-review/axe-core-v4.13.0
git -C ../chartview-oss-review/axe-core-v4.13.0 rev-parse HEAD
git clone --depth 1 --branch v4.13.0 https://github.com/dequelabs/axe-core-npm.git ../chartview-oss-review/axe-core-npm-v4.13.0
git -C ../chartview-oss-review/axe-core-npm-v4.13.0 rev-parse HEAD
git clone --depth 1 --branch v4.14.0 https://github.com/dequelabs/axe-core.git ../chartview-oss-review/axe-core-v4.14.0
git -C ../chartview-oss-review/axe-core-v4.14.0 rev-parse HEAD
```

출력 SHA가 위 기록과 일치하는지 확인한다. CI와 개발 환경에서는 앱의 lockfile로 `npm ci`를 실행하며, 내려받은 upstream 저장소를 설치하거나 빌드할 필요는 없다. 불필요한 upstream 코드 vendoring은 하지 않았다. MPL-2.0 라이선스가 포함된 원본 패키지를 수정하지 않은 개발 의존성으로 사용한다.

다른 후보의 확인한 stable commit은 다음과 같다.

- fast-check v4.10.2: `c77afa8277a67250d798c52e61343b8ed5fd268b`
- Fuse v7.5.0: `45bac9fe2e71fe8c680c861a35a8b226c4ae6d5a`
- uFuzzy 1.0.19: `4d89651ea5acba2f448df58d7c4f6165c7474924`
- web-vitals v6.2.3: `400d01968abffcd91a6f0307c9aaac97c5f7a76a`

## 도구로 찾고 실제 앱에서 보완한 문제

기존 고정 API fixture를 사용하는 실제 브라우저에 axe를 주입해 검사했다. 실제 표시 문구·ARIA·스타일을 대조하고 키보드 동작도 직접 확인했다.

- **보이는 문구와 버튼 이름 불일치:** 홈 변화의 축약 설명, 선정 카드의 수익률·상태·이유, 히트맵의 fallback 문자·축약명/티커, 상세 관심 등록 문구와 수출 품목의 표시 수치가 기존 `aria-label`에서 빠져 있었다. 실제 보이는 문구를 이름에 포함하거나 자연스러운 DOM 이름을 사용한다. 기존 날짜·근거·전체 종목명은 이름 또는 설명으로 보존한다. 선정 카드의 비동기 상태 변경도 현재 DOM 이름에 반영된다.
- **탭의 키보드 이동과 활성화:** 수출·반도체 가격·밸류에이션 탭에 좌우 방향키, Home/End, 선택 탭의 한 Tab 진입점과 tab/tabpanel 관계를 추가한다. 방향키는 초점만 옮기고 Enter/Space가 기존 클릭 경로로 선택한다. lazy 데이터 요청이 방향키마다 실행되지 않으며, 화면을 다시 그리는 선택 뒤에도 키보드 초점을 복원한다.
- **작은 글자의 대비:** 기준일·출처·보조 정보와 히트맵 등락률 등 밝은 배경에서 읽기 어려운 텍스트를 더 어두운 색으로 보완한다. 기존 레이아웃·글자 크기·차트/히트맵 배경 구간과 상승/하락 의미는 유지한다.
- **추가 데이터 검토에서 확인한 가짜 0 표시:** `returnPct:null`인 홈 선정 카드와 PER `null`/빈 문자열인 비교 행이 `Number()` 변환으로 `0.00%`/`0배`를 표시했다. 전체 지표와 비교 행도 서로 달랐다. 기존 `finiteNumber` 계약을 재사용해 결측/비정상 값은 기존 대시로, 실제 0은 0으로 표시한다. 이 문제는 axe의 판단 범위가 아니므로 API 응답→표시·막대 관계와 기존 presenter 단위 테스트로 보호한다. 공급자 수집/재무 산식은 바꾸지 않는다.

실행 결과는 [AUTOMATED_QA](AUTOMATED_QA.md) 참조. 기존 숫자 정합성·실패 복구·모바일 geometry 검사와 새 접근성/키보드 검사를 함께 실행한다. 앱 데이터 수집이나 재무 산식은 이번 개선으로 변경하지 않는다.

## 자동 검사 범위와 수동 확인

axe는 렌더링된 화면의 적용 가능한 WCAG 규칙을 검사한다. loading이 끝난 상태뿐 아니라 메뉴/검색 dialog, 선택한 탭 등의 동적 화면도 별도로 검사해야 한다. 접근성 이름·설명과 키보드 초점은 실제 브라우저 assertion으로 보완한다. `incomplete` 결과는 자동 통과 근거가 아니며 사람이 확인해야 한다.

upstream README는 자동으로 찾을 수 있는 WCAG 문제가 평균 약 57%라고 설명한다. 따라서 통과 결과는 앱 전체의 접근성 인증이 아니다. 실제 TalkBack/VoiceOver, 음성 조작, 기기 글꼴·색각·동적 글자 크기, Toss WebView의 키보드/네이티브 뒤로가기/복귀 동작은 실기기 확인이 필요하다. 기존 [P0_RELEASE_GATE](P0_RELEASE_GATE.md)를 유지한다.

### 기존 확대 제한의 검사 예외

`meta-viewport`의 사용자 확대 제한은 기존 Toss 심사 대응 계약이다. 근거는 [REVIEW_FIXES_20260921](REVIEW_FIXES_20260921.md)의 실제 콘솔 반려 항목 **“핀치 확대·축소”**와 대응 **“viewport, touch/gesture, 차트 pinch 설정 모두 차단”**이다. 이번 접근성 작업에서는 이 동작을 임의로 해제하지 않는다.

해당 규칙의 예외는 저장소에 기록된 특정 플랫폼 요구를 유지하기 위한 것이며, 확대 제한이 일반적인 WCAG 기준을 만족한다는 의미가 아니다. 다른 label/ARIA/대비 위반을 이 예외로 숨기지 않는다. 기존 실기기 검증 항목에도 핀치 차단 확인이 남아 있다.

## API 호출·비용·배포 영향

axe adapter/engine은 개발 의존성으로만 사용하며 브라우저 내부에서 DOM을 분석한다. OpenAI·외부 LLM API, API 키, 분석 서버, telemetry 전송을 추가하지 않는다. 결과의 도움말 URL은 문서 링크이며 검사 중 별도 분석 요청을 보내지 않는다. 이 통합에 API 사용 비용은 없다.

프로덕션 앱은 axe 패키지를 import하지 않는다. 공유 백엔드, 데이터 제공자, Render 플랜을 바꾸지 않았으며 신규 유료 서비스를 만들지 않는다. 기존 GitHub Actions 실행·artifact 보관에는 계정의 기존 한도와 요금 정책이 적용된다. 수동 live 검사는 기존 Chart View 백엔드 조회라는 기존 범위를 유지한다.
