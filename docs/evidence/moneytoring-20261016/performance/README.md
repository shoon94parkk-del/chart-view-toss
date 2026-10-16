# 동일 조건 성능 비교

기준 `95d6b8361e22958f9cea6773afcf6ca446c2447a`와 이 PR의 runtime-source.json을 비교했다. 변경 전→후(AB) 7회, 후→전(BA) 7회를 유지해 빌드별·화면별 14개, 총 84개 성공 관측이다. 각 순서/화면/빌드마다 준비 실행 1회는 버렸다.

Chromium 390×844, CPU 제한 없음, 매번 새 브라우저 context, service worker와 외부 통신 차단, 동일한 고정 fixture와 요청당 인위적 80ms 지연이다. 정상 숫자가 화면에 표시돼야 준비 완료이며 오류·가로 넘침은 성공 시간이 아니다. 네 raw JSON과 첫 순서/역순 비교를 모두 보존했다. 작은 로컬 표본의 중앙값·최댓값이며 운영 p95·모바일 실기기·제공처 속도를 측정하지 않았다.

| 실제 표시 | 전 중앙값 / 최대 | 후 중앙값 / 최대 | 중앙값 차이 | 시작 데이터 요청 |
|---|---:|---:|---:|---:|
| 홈 | 137 / 220ms | 152 / 221ms | +15ms | 9→9 |
| 종목 상세 현재가 | 331 / 461ms | 342.5 / 418ms | +11.5ms | 10→10 |
| 기존 경제지표 | 246 / 327ms | 262.5 / 394ms | +16.5ms | 2→2 |
| 6종 물가 그래프 | 330ms | 367ms | +37ms | 위 경제지표 요청 재사용 |

첫 AB만 보면 홈146→176ms였고 역순 BA에서는132→137ms였다. 이런 실행 순서 변동 때문에 첫 측정을 숨기지 않고 합산했다. 속도 향상을 주장하지 않는다. 화면 추가에 따른 작은 절대 시간 증가와 표본 변동이 있으며 요청 수는 증가하지 않았다. 전체 main JS는327,103→332,473B, gzip108,947→110,732B(+1,785B)다. 뉴스·차트 날짜·체크포인트 스타일은 필요한 화면에서 로드한다. 현재가 API/시세 신선도/제공처는 변경하지 않았다.

재현: 저장소 npm 의존성을 설치하고 기준·PR 소스를 별도 디렉터리에 빌드한다. `PERF_PLAYWRIGHT_PACKAGE`에는 설치된 프런트의 절대 package.json을 지정할 수 있다. 아래 `HARNESS`, `BASELINE_DIST`, `RELEASE_DIST`는 실제 절대 경로다.

```bash
node "$HARNESS/measure.mjs" before "$BASELINE_DIST" 7
node "$HARNESS/measure.mjs" after "$RELEASE_DIST" 7
# 역순 결과 경로: 동일 스크립트·fixture만 복사해 경로를 구분한다.
cp "$HARNESS/measure.mjs" "$HARNESS/compare.mjs" "$HARNESS/fixture-macro.json" "$HARNESS/reverse/"
cp -r "$HARNESS/fixtures" "$HARNESS/reverse/"
node "$HARNESS/reverse/measure.mjs" after "$RELEASE_DIST" 7
node "$HARNESS/reverse/measure.mjs" before "$BASELINE_DIST" 7
node "$HARNESS/compare.mjs"
node "$HARNESS/reverse/compare.mjs"
node "$HARNESS/summarize-balanced.mjs"
```

`balanced.json`는 입력 파일 SHA와 조건·성공 표본·요청 수를 검사한 합산 결과다. 운영 Render의 기동·네트워크·실제 시세 지연과는 구분한다.
