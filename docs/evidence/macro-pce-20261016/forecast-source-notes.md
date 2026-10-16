# 미국 물가 비교 자료 — 구현 범위와 출처 한계

확인일: 2026-10-16 UTC. 이 조사 기록을 6종 물가 화면과 선택적 비교 검증의 소스 변경에 포함한다. 예상치 공급자 도입은 미완료이며, 운영 수집·게시 성공을 선언하지 않는다. [화면 구현 기록](../../MACRO_PCE_2026-10-16.md)을 함께 읽는다.

## 현재 제공 가능한 범위

BLS의 CPI·PPI, BEA의 PCE·근원 PCE는 공식 실제치와 발표 정보를 제공한다. 이 자료에서 시장 예상치를 얻을 수는 없다. 기존 저장 캐시는 현재 시점의 수정된 지수일 수 있으므로 최초 발표값과 구분한다.

현재 저장소에는 미국 경제지표 조사 예상치 공급자 계약·설정·발표 전 수집 이력이 없다. 기존 `/api/consensus`는 기업 EPS·매출 전망용이다. 확인한 공개 문서상의 Trading Economics·FMP·Finnhub 경제 캘린더 경로는 인증 없이 모두 HTTP 401을 반환했다. 새 유료 계약이나 API 키 발급은 진행하지 않았다.

따라서 지금은 예상치·차이·비교 신호를 미확인 상태로 표시한다. 이전 달 실제치, 수정된 지수, 임의 추정값을 예상치로 채우지 않는다. 조사 중 발견한 보도상의 예상치도 제품용으로 승인·검증된 입력으로 취급하지 않는다.

## 관측월과 발표일

2026-10-14 08:30 미국 동부시간에 발표된 CPI는 **2026년 9월 관측치**다. UTC 발표 시각은 `2026-10-14T12:30:00Z`, 관측월은 `2026-09`다. 이를 ‘10월 실제 물가’로 표시하면 안 된다. 10월 관측치의 모형 예상도 9월 최초 발표값이나 시장 조사 예상치와 섞지 않는다.

2026-10-15 발표 PPI는 9월 관측치이고, 2026-09-30 발표 PCE는 8월 관측치다. 예정 발표일과 실제 공표 시각, 수집 시각도 서로 다른 필드로 보존한다.

## 현재 선택적 비교 입력 계약

공급자와 사용 권한이 확인된 범위에서만 지표별 `row.comparisons` 배열에 비교 증거를 전달한다. 현재 UI가 읽는 필드는 다음과 같다. 아래는 자료형 설명이며 실제 공급자 예상값이 아니다.

```typescript
{
  month: string; // YYYY-MM, 관측월. observationMonth가 아님
  rate: 'mom' | 'yoy';
  basis: 'SA' | 'NSA';
  unit: '%';
  expected: number;
  actual: number;
  actualVintage: 'first_release';
  publishedAt: string; // 실제 발표의 명시적 시간대 포함 시각
  forecastPublishedAt: string;
  forecastCapturedAt: string;
  source: {
    forecastName: string;
    forecastUrl: string; // HTTPS
    actualUrl: string; // HTTPS
  };
}
```

관측월·변화 기준·단위·계절조정·대상 정의가 모두 일치해야 한다. CPI·PPI는 MoM SA / YoY NSA, PCE·근원 PCE는 MoM·YoY 모두 SA다. 근원 PPI의 식품·에너지 제외와 식품·에너지·무역서비스 제외를 같은 지표로 합치지 않는다.

`forecastPublishedAt ≤ forecastCapturedAt < publishedAt ≤ 현재`를 확인한다. 알려진 공식 발표 시각은 정확히 일치해야 하고, 날짜만 알려졌다면 영수증 발표의 미국 동부 날짜가 그 날짜와 같아야 한다. 유한한 두 값, `first_release`, 출처 이름·두 HTTPS 원문 URL이 없거나 같은 관측월·변화 기준의 증거가 중복되면 회색으로 남긴다. 공식 발표 정밀도에 맞춰 소수점 한 자리에서 half-up(동률이면 0에서 멀어지는 방향)으로 양쪽을 반올림한 뒤 비교하며 0을 누락으로 처리하지 않는다.

현재 지수 계산값은 `지수 계산값`, 검증된 최초 발표값은 `최초 발표값`으로 구분한다. 현재 수정 지수를 최초 발표 비교값으로 덮어쓰지 않는다. 실제 공급자를 연결할 때는 이 입력 검증 외에도 원시 응답 해시·수집 원문·이벤트 식별자·권한 근거를 보존하는 수집 절차가 필요하다. UI 검증만으로 그런 수집 이력을 확보한 것은 아니다.

사후에 찾은 보도나 역사 자료는 별도 출처 유형으로만 검토한다. 과거 시각을 만들어 `forecastCapturedAt`에 넣거나 자체 발표 전 수집본으로 소급 생성하지 않는다. 승인되지 않은 수치 후보는 제품 입력으로 옮기지 않는다.

## 색상과 의미

| 상태 | 표시 | 의미 |
|---|---|---|
| 실제치 < 예상치 | 초록 | 예상보다 낮은 물가 상승률 |
| 실제치 = 예상치 | 노랑 | 발표 정밀도에서 예상과 같음 |
| 실제치 > 예상치 | 빨강 | 예상보다 높은 물가 상승률 |
| 예상치·최초 발표값·비교 근거 미확인 | 회색 | 비교할 근거 부족 |

색상은 물가 발표와 예상의 수치 비교다. 매수·매도·호재·악재 판단이 아니며 기존 투자 판단이나 PICK 계산에 연결하지 않는다. 수치와 설명을 함께 표시한다.

## 확인한 출처와 사용 권한의 공백

- [BLS CPI 최초 발표](https://www.bls.gov/news.release/archives/cpi_10142026.htm), [BLS PPI 최초 발표](https://www.bls.gov/news.release/archives/ppi_10152026.htm), [BEA PCE 최초 발표](https://www.bea.gov/news/2026/personal-income-and-outlays-august-2026). [BLS 이용 안내](https://www.bls.gov/bls/linksite.htm)와 [BEA 재사용 안내](https://www.bea.gov/help/faq/145)는 공식 통계 재사용·출처 표기 근거다. 민간 조사 예상치의 이용권까지 제공하지는 않는다.
- [Trading Economics 필드 문서](https://docs.tradingeconomics.com/economic_calendar/schema/)는 조사 예상 `Forecast`와 자체 모형 `TEForecast`를 구분한다. API 인증과 앱 재배포 권한은 별도 확인 대상이다.
- [FMP 약관](https://site.financialmodelingprep.com/terms-of-service), [Finnhub 약관](https://finnhub.io/terms-of-service)은 일반 계정의 개인 이용과 외부 표시·재배포를 구분한다. 무료 키만으로 공개 앱 사용 권한이 확인되지는 않는다.
- [Reuters 약관](https://www.reuters.com/info-pages/terms-of-use/)은 데이터·정보를 포함한 콘텐츠의 상업적 이용, 수동·자동 데이터 수집, 복제·재배포·보관을 제한한다. 개별 숫자 사실에 대한 법적 적용을 단정하지 않으며 공급자 재배포 허가를 확보했다고 주장하지 않는다. 원문 기사 직접 읽기는 401이었고, 검색 색인과 Reuters 표시가 있는 제휴 게시물의 본문 확인을 구분해 기록했다. 원문 검증이 끝나지 않은 후보는 제품 입력으로 사용하지 않는다.
- [클리블랜드 연은 nowcast](https://www.clevelandfed.org/indicators-and-data/inflation-nowcasting)는 CPI·근원 CPI·PCE·근원 PCE의 모형 예상이며 시장 조사 예상이나 PPI 예상이 아니다. [해당 이용 조건](https://www.clevelandfed.org/privacy)은 출처를 밝힌 비상업·개인·교육 목적의 복제를 허용하지만 공개 앱의 상업적 재배포 권한은 확인되지 않았다. URL 인용·참조 허용과 데이터 재배포 허용을 구분한다. 이 조건을 Reuters 자료에 대신 적용하지 않는다.

남은 사용자 확인은 **이미 사용 권한이 확인된 예상치 공급자 또는 수동 입력 자료가 있는지**다. 출처·사용 권한·관측월과 기준·발표 전 증거가 확인된 범위부터 연결한다. 확인 전에는 예상치를 비워 두고 실제치 그래프와 공식 출처를 제공한다.
