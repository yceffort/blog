# 실제 라이브러리의 미사용 비용

[javascript-size 실험](../javascript-size)은 합성한 함수로 "선언만 남은 코드"와 "최상위에서 실행되는 코드"의 비용을 갈랐다. 이 실험은 같은 축을 실제 라이브러리로 확인한다. 측정 환경이 다르므로 두 실험의 수치를 한 표에 섞지 않는다.

## 조건

각 엔트리를 esbuild로 번들해 `fixtures/`에 넣고, 빈 페이지에 외부 스크립트로 주입한다. 페이지와 버튼은 javascript-size 실험과 같다.

| 조건               | 무엇을 보는가                                                                         |
| ------------------ | ------------------------------------------------------------------------------------- |
| `baseline`         | 계측 코드만. 기준선                                                                   |
| `msw-build-flag`   | 빌드 타임 상수 분기 안에서만 msw를 쓴다. 번들러가 조건을 접을 수 있다                 |
| `msw-runtime-flag` | 런타임 값으로 분기한다. 번들러가 접을 수 없어 msw가 남고, 분기 안쪽만 실행되지 않는다 |
| `msw-used`         | 핸들러를 실제로 만든다. `msw-runtime-flag`와 바이트가 거의 같고 실행 여부만 다르다    |
| `lodash-unused`    | `import _ from 'lodash'` 후 쓰지 않는다                                               |
| `lodash-used`      | 함수 하나를 호출한다                                                                  |
| `moment-unused`    | `import moment from 'moment'` 후 쓰지 않는다                                          |
| `moment-used`      | 포맷을 한 번 호출한다                                                                 |
| `moment-locales`   | 전체 로케일까지 import한다                                                            |
| `winston-unused`   | 서버 전용 로거가 클라이언트 번들에 실린 경우. 브라우저에서는 평가 도중 실패한다       |

`msw-runtime-flag`와 `msw-used`가 이 실험의 핵심 쌍이다. 같은 바이트가 번들에 들어 있고, 한쪽은 분기가 막혀 핸들러를 만들지 않는다.

winston은 Node 내장 모듈에 의존해 esbuild 브라우저 타깃에서 26개 오류로 빌드가 멈춘다. 그래서 webpack 이 클라이언트 빌드에서 하던 것처럼 Node 내장을 빈 모듈로 대체하고 최소 `process` 폴리필을 넣어 번들을 만든다. 실제 빌드 설정을 그대로 재현한 것은 아니다. 이 조건은 브라우저에서 평가가 중간에 끊겨 준비 시간과 메인 스레드 지표가 성립하지 않으므로 `--exclude=winston-unused` 로 본 측정에서 뺀다.

## 실행

```sh
cd experiments/library-side-effects
npm install --no-audit --no-fund
npx playwright install chromium
node scripts/build.mjs      # 번들 생성, fixtures/manifest.json 기록
node scripts/measure.mjs --run=main --repetitions=15
node scripts/analyze.mjs --run=main
node scripts/coverage.mjs   # 조건별로 실제 실행된 바이트 비율
```

`build.mjs`는 각 번들의 원본 바이트, gzip 바이트, SHA-256을 `fixtures/manifest.json`에 남긴다. `measure.mjs`는 매 실행을 새 브라우저 컨텍스트에서 캐시를 끄고 돌리며, 조건 순서를 매 반복마다 섞는다. 실행마다 수신 바이트가 생성물과 일치하는지 검사하고 어긋나면 중단한다.

## 지표

- `readyMs`: 스크립트를 추가한 시점부터 `load` 이벤트까지
- `mainThreadTaskMs`: CDP `Performance.getMetrics`의 `TaskDuration` 증가량. 계측과 버튼 처리도 포함한다
- `scriptDurationMs`: 같은 구간의 `ScriptDuration` 증가량
- `heapDeltaMiB`: 준비 전후 `JSHeapUsedSize` 차이. 강제 GC를 하지 않았다
- `loadingSamples`: 로딩 중 주입된 입력 수. 번들이 작아 로딩이 25ms 안에 끝나면 0이 된다

로딩 중 입력 지연은 이 실험에서 표본이 거의 잡히지 않는다. 번들이 수백 KB라 로딩이 너무 빨리 끝나기 때문이고, 억지로 해석하지 않는다.

## 자료

- `fixtures/manifest.json`: 조건별 바이트와 해시, 라이브러리 버전
- `results/{run}/raw.jsonl`: 실행별 원본값
- `results/{run}/environment.json`: 브라우저, Node, CPU, 라이브러리 버전과 스크립트 해시
- `analysis/summary.json`: 조건별 중앙값과 사분위
- `analysis/coverage.json`: 조건별 실행 함수 수와 실행 바이트
