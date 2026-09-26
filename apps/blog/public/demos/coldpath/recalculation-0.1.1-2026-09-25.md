# coldpath 0.1.1로 저장된 기록 재계산하기

2026년 9월 25일에 수집한 블로그의 실행 기록을 [coldpath 0.1.1](https://github.com/yceffort/coldpath/tree/c626144e621edf139855be01cd0b3d78fe83b0ce)로 재분석했다. 새로 브라우저를 방문해 얻은 성능 측정값은 아니다. 당시 npm 배포본과 같은 버전의 분석기를 사용했고, 배포본만 설치한 빈 디렉터리에서도 분석기가 실행되는지 확인했다.

## 블로그 입력과 합계

당시 커버리지 3개는 그대로 남아 있었다. 없어진 빌드 파일은 블로그 커밋 `0e20da2c`의 별도 작업 디렉터리를 빌드하고 기존 파일 사본도 검색해 복원했다. JS 109개와 소스맵 연결 105개는 모두 당시 보고서의 SHA-256과 일치해야 입력으로 채택했다. 다른 빌드의 비슷한 파일에 예전 커버리지를 붙이지 않았다.

| 검사한 대상 | 결과 |
| --- | --- |
| 전체 생성 코드 | 7,203,611B로 동일 |
| 합집합의 실행 관찰 | 605,518B로 동일 |
| 합집합의 미실행 | 865,016B로 동일 |
| 합집합의 미측정 | 5,733,077B로 동일 |
| 청크별 원본 행 1,725개 | 크기와 세 상태 모두 동일 |
| 세 시나리오의 원본별 집계 | 모두 동일 |

재분석 전후 모두 경고는 42건이다. 이 개수에는 별도로 보관한 import 그래프의 경고도 포함된다. [검사 결과 JSON](/demos/coldpath/recalculation-0.1.1-2026-09-25.json)에 파일 해시와 시나리오별 합계, 아래 매핑 진단을 남겼다.

## SiteSearch가 들어 있는 청크의 매핑 경고

대상은 `chunks/1_9z-p7yjs_u0.js`다. 제외된 매핑은 3개이며, 모두 `Provider.tsx`를 가리킨다. 좌표는 0부터 시작하며 열은 UTF-16 단위다.

| 제외된 열 | 첫 줄 길이 | 인접한 유효 매핑 열 | 검사할 UTF-8 범위 |
| ---: | ---: | ---: | --- |
| 70,441 | 70,440 | 70,439 | `[70722, 70723)` |
| 70,454 | 70,440 | 70,439 | `[70722, 70723)` |
| 70,455 | 70,440 | 70,439 | `[70722, 70723)` |

세 진단의 검사 구간은 같은 1B이고 현재 `Provider.tsx`에 귀속돼 있다. `SiteSearch.tsx`에 귀속한 생성 구간은 `[28902, 33481)` 안에 있어 겹치지 않는다. 검색 파일의 실행 관찰량은 첫 진입 837B, 검색 4,181B, 확대 837B로 유지됐다.

`inspectRegion`은 오류가 입증된 바이트가 아니라 주변 코드를 검사할 범위다. 이 대조는 위 3개 경고와 검색 파일의 관계를 확인한다. 다른 매핑과 원본별 귀속 전체의 정확성을 증명하지는 않는다.

## 보존한 블로그 입력으로 실행하기

[입력 묶음](/demos/coldpath/blog-replay-0.1.1-2026-09-25.tar.gz)은 약 9.24MB다. JS와 소스맵, 원래 커버리지 3개, 해시 목록, 기대한 합계를 포함한다. 그래프와 블로그 서버는 필요 없다.

아래 명령은 `@yceffort/coldpath@0.3.1`을 쓴다. 2026년 9월 26일 이 묶음을 0.3.1로 다시 분석했을 때 전체 합계와 세 시나리오의 합계, `SiteSearch.tsx`의 837B, 4,181B, 837B, 위 매핑 진단 3건과 검사 구간이 모두 `expected.json`과 같았다. 경고 수는 import 그래프 없이 38건이다. 0.1.1 자체를 쓰려면 [v0.1.1 태그](https://github.com/yceffort/coldpath/tree/v0.1.1)에서 Rust로 직접 빌드해야 한다.

```bash
tar -xzf blog-replay-0.1.1-2026-09-25.tar.gz
cd blog-replay
npx @yceffort/coldpath@0.3.1 analyze --dir files \
  --coverage coverage/initial.coverage.json \
  --coverage coverage/search.coverage.json \
  --coverage coverage/zoom-diagram.coverage.json \
  --initial-scenario initial \
  --scenario-order initial,search,zoom-diagram \
  --json report.json
```

`expected.json`과 합계 및 `SiteSearch`의 매핑 진단을 비교할 수 있다. 측정된 파일은 coldpath가 커버리지의 JS 및 소스맵 해시도 검사한다. 미측정 파일을 포함한 전체 목록은 `manifest.json`에 있다. 이 묶음에는 import 그래프를 넣지 않았으므로 import 경로와 그래프 경고는 재현 범위에서 제외된다.
