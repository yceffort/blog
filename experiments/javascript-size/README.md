# 실행하지 않는 JavaScript의 비용: Codespaces 실측

블로그 글 작성을 위한 실험 코드와 원본 데이터다. 측정은 GitHub Codespaces 안에서 브라우저와 서버를 함께 실행해 수행한다. 로컬 Mac에서는 코드 작성, 결과 집계와 그림 생성을 한다.

실측 결과와 해석은 [FINDINGS.md](FINDINGS.md)에 정리했다.

## 질문과 범위

화면과 사용자가 실행하는 버튼 동작을 고정하고, 추가로 로드하는 JavaScript의 크기와 코드 형태만 바꾼다.

- 함수 본문을 한 번도 실행하지 않아도 준비 시간과 메인 스레드 점유가 늘어나는가?
- 같은 바이트 수의 주석, 미호출 함수, 초기화 코드가 같은 비용을 만드는가?
- 준비 지연과 입력 지연은 함께 증가하는가?
- 캐시가 있는 재방문에서 무엇이 달라지는가?

기하급수적 저하를 전제로 하지 않는다. 관측한 크기 구간과 환경 안에서의 관계를 보고한다. 이 실험은 프레임워크나 실제 서비스의 전체 페이지 성능 벤치마크가 아니다.

## 환경

- 실험 전용 Codespace: `js-unused-cost-benchmark-j4pgppg7w6gcqxvw`
- GitHub 머신: `basicLinux32gb`, 2 vCPU / 8 GB
- CPU 표시: AMD EPYC 9V74 80-Core Processor. VM에 할당된 CPU는 2개다.
- Ubuntu 24.04.4 LTS, x86-64
- Chrome for Testing 153.0.8010.12, 전체 Chromium 바이너리의 headless 모드
- Playwright 1.63.0, Node.js 24.20.0
- 브라우저와 서버는 Codespace 내부 loopback으로 통신한다. Mac으로 포트를 전달해 브라우저를 실행하지 않는다.
- 실행별 정확한 버전, 소스 SHA-256, CPU, 메모리, 시작 시각은 `results/*/environment.json`에 있다.

SSH 세션에 `CODESPACE_NAME`이 전달되지 않아 실행 메타데이터의 `codespace` 필드는 null이다. Codespace 이름과 GitHub 머신 사양은 인증된 GitHub API 응답을 별도로 저장한 `results/codespace-provenance.json`으로 확인한다.

Codespaces의 가상 CPU는 실제 모바일 하드웨어가 아니다. CPU 4배 제한도 이 VM에 대한 상대적 제한이며, 특정 휴대전화 모델을 재현한다고 해석하지 않는다. headless 환경의 프레임 간격을 디스플레이의 FPS로 해석하지 않는다.

## 입력 데이터

추가 파일의 압축 전 크기: 128 KiB, 512 KiB, 1 MiB, 2 MiB, 5 MiB, 10 MiB. 기준선은 추가 기능 없이 공통 초기화와 종료 마커만 있는 작은 스크립트다. 표의 0 MiB는 정확히 0바이트를 뜻하지 않는다. 실제 바이트 수는 manifest에 기록한다.

| 종류          | 내용                                                           | 실행되는 것                                  |
| ------------- | -------------------------------------------------------------- | -------------------------------------------- |
| `comment`     | 함수 코드와 유사한 내용을 하나의 블록 주석 안에 넣음           | 공통 계측 코드만 실행                        |
| `functions`   | 고유한 이름과 상수를 가진 최상위 함수 선언을 추가              | 선언 처리는 수행하지만 함수 본문 호출 수는 0 |
| `initialized` | 비슷한 함수 선언 뒤 각 함수를 호출해 객체를 만들어 배열에 보관 | 기능을 사용하지 않아도 최상위 초기화 실행    |

함수 본문은 숫자 계산, 문자열, 객체와 배열 생성으로 구성한다. 시간 지연용 busy loop는 넣지 않는다. 입력 크기는 생성한 코드 끝에 짧은 주석을 채워 정확히 맞춘다. `initialized`는 호출문도 공간을 차지하므로 같은 MiB의 `functions`보다 함수 수가 적다. 각 파일의 함수 개수도 manifest에 기록한다.

함수 본문에 있는 호출 카운터로 매번 호출 수를 검증한다. `functions`의 카운터는 반드시 0이어야 한다. 빌드 도구를 거치지 않고 생성한 파일을 그대로 제공하므로 tree shaking으로 제거되지 않는다. Resource Timing의 decodedBodySize가 manifest와 다르면 측정을 실패시킨다.

주석은 비용이 없는 기준선이 아니다. 큰 주석도 전송과 소스 스캔 비용이 있다. 반복 공백보다 내용 차이를 줄이기 위해 함수 코드와 유사한 텍스트를 사용했다. 세 종류는 토큰 수, 함수 수, 초기화 여부가 다르므로 "바이트당 보편적 JS 비용"을 추정하는 실험으로 해석하지 않는다.

## 시나리오

| 이름         | CPU              | 전송                                    | 캐시 |
| ------------ | ---------------- | --------------------------------------- | ---- |
| `local-1x`   | 제한 없음        | Codespace 내부 loopback, 압축 없음      | cold |
| `local-4x`   | CDP 4배 slowdown | Codespace 내부 loopback, 압축 없음      | cold |
| `network-4x` | CDP 4배 slowdown | gzip level 6, CDP 4 Mbps, latency 80 ms | cold |

`local`은 사용자의 로컬 Mac을 뜻하지 않고, **Codespace 내부 loopback**을 뜻한다. 네트워크 제한은 CDP의 패킷 수준 에뮬레이션이며 실제 통신사의 회선은 아니다. gzip은 모든 측정 전에 미리 생성한다. 모든 파일을 서버 메모리에 올려 두므로 요청 처리 중 코드 생성, 압축, 파일 읽기를 하지 않는다.

`cold`는 매 케이스 새 브라우저 context, HTTP 캐시 비활성화, `Cache-Control: no-store`, 고유한 URL을 사용한다. 브라우저 프로세스는 한 실행 안에서 재사용한다. 매 케이스마다 OS 전체나 브라우저 프로세스를 재시작한 "완전히 차가운 시스템"은 아니다.

`warm`은 새 context에서 캐시를 허용한 동일 URL로 3회 준비 방문한 뒤 4번째 방문을 측정한다. HTML은 매번 새로 로드한다. 각 준비 방문의 원본도 `priming.jsonl`로 저장한다. HTTP 캐시 적중은 Resource Timing의 transferSize로 확인한다. 코드 캐시 적중 여부는 별도 트레이스의 증거가 없으면 단정하지 않는다.

## 측정 절차

1. 동일한 HTML과 버튼을 로드하고 2회 requestAnimationFrame을 기다린다.
2. `experiment-start` 마커를 기록하면서 외부 classic script를 동적으로 추가한다.
3. 파일 전체가 평가되고 script의 load 이벤트가 발생할 때 `experiment-ready`를 기록한다.
4. 브라우저와 같은 VM에서 실행되는 Node 타이머로 CDP 입력을 주입한다. 시작 응답을 받은 뒤 약 25 ms, 100 ms에 입력을 보내고 실제 주입 시각도 저장한다.
5. 로딩 완료와 두 입력 처리를 확인하고 150 ms 뒤부터 같은 버튼에 3회 추가 입력한다.
6. 원본 PerformanceObserver, Resource Timing, CDP Performance 지표를 저장하고 카운터와 바이트 수를 검증한다.
7. 각 반복 블록 안의 케이스 순서를 고정 seed로 섞는다. 브라우저 측정은 동시에 실행하지 않는다.

별도 `pulse` 실행에서는 준비 완료까지 50 ms 간격으로 입력을 보낸다. 초기 고정 시점 두 번의 입력이 나중의 긴 작업을 놓칠 수 있기 때문이다. 펄스 입력 자체의 영향과 표본 수가 달라 이 데이터는 주 측정의 시간 통계에 합치지 않는다. `trace`와 `coverage` 실행도 계측 영향 때문에 분리한다.

## 지표를 읽는 법

- `readyMs`: 스크립트를 추가한 시점부터 load 이벤트까지. 문서 navigation 시간이나 LCP가 아니다.
- `resourceMs`: Resource Timing의 요청 지속 시간. 실제 loopback 전송, 브라우저의 리소스 처리 등이 포함된다.
- `afterResponseMs`: responseEnd부터 ready까지 남은 시간. 스트리밍 파싱과 다운로드가 겹치므로 전체 파싱·컴파일 시간을 뜻하지 않는다.
- `mainThreadTaskMs`: 시작 직전부터 ready를 확인한 직후까지 CDP TaskDuration 증가량. 버튼·계측·렌더링 작업도 포함되며 백그라운드 작업 시간은 포함하지 않는다.
- `scriptDurationMs`: 같은 구간의 CDP ScriptDuration 증가량. 전체 JS 파싱·컴파일 비용으로 해석하지 않는다.
- `blockingOver50Ms`: 측정 중 시작한 긴 작업마다 `max(duration - 50, 0)`을 합산한다. Lighthouse의 FCP~TTI 구간 TBT와는 다른 실험 구간이다.
- `inputDelayMs`: trusted pointerdown의 타임스탬프부터 이벤트 핸들러 진입까지. 이벤트 처리와 다음 페인트를 포함한 INP가 아니다. VM의 입력 전달·스케줄링 비용도 포함된다.
- `heapDeltaMiB`: 시작 직전 대비 ready 시점의 JSHeapUsedSize 차이. 강제 GC 없이 관측한 값이며 브라우저 전체 RSS, 유지 메모리, 최대 메모리가 아니다.
- 프레임 간격과 Event Timing 원본은 보조 자료다. Event Timing은 최소 duration threshold가 있어 빠른 입력은 기록되지 않을 수 있다. 누락을 0으로 대체하지 않는다.

각 케이스 중앙값과 IQR, 최솟값·최댓값, bootstrap 중앙값 95% 구간을 제공한다. 극단값을 임의로 제거하지 않는다. 소수의 반복 측정으로 실사용 p95나 전체 사용자 분포를 주장하지 않는다. 선형 회귀는 이 구간의 기술적 요약이며 지수 모델을 통계적으로 기각했다는 뜻이 아니다.

## 재현

실험 코드를 Codespace 안에 복사하고 이 디렉터리에서 실행한다. 모노레포 전체 의존성을 설치할 필요는 없다.

```sh
npm install --ignore-scripts --no-audit --no-fund
npx playwright install --with-deps chromium
node scripts/generate.mjs
node scripts/measure.mjs --run=cold --repetitions=15
node scripts/measure.mjs --run=pulse --repetitions=10 --profiles=local-4x --sizes=0,1024,5120,10240 --interaction=pulse
node scripts/measure.mjs --run=warm --repetitions=10 --profiles=local-4x,network-4x --sizes=0,5120,10240 --kinds=functions --mode=warm
node scripts/measure.mjs --run=trace --repetitions=1 --profiles=local-4x --sizes=0,5120 --trace=true
node scripts/measure.mjs --run=coverage --repetitions=1 --profiles=local-1x --sizes=5120 --kinds=functions,initialized --coverage=true
```

결과 디렉터리가 이미 있으면 덮어쓰거나 이어 붙이지 않고 실패한다. 다시 측정할 때 `--run`에 새 이름을 사용한다. `--seed`, `--sizes`, `--kinds`, `--profiles`로 별도 실험을 구성할 수 있다. 중간에 실패한 실행에는 `complete.json`이 없어 주 통계에서 제외된다.

결과를 로컬로 회수한 뒤 집계한다.

```sh
python3 -m venv .venv
.venv/bin/pip install -r analysis-requirements.txt
.venv/bin/python scripts/analyze.py cold warm
.venv/bin/python scripts/analyze-diagnostics.py
```

생성물: `analysis/summary.csv`, `analysis/summary.json`, `analysis/tables.md`, PNG·SVG 차트. `results/*/raw.jsonl`이 실행별 원본이다. `fixtures`와 압축하지 않은 트레이스는 Git 추적에서 제외한다. 실제 수집한 트레이스는 `results/trace/traces/*.json.gz`로 보존한다.

블로그 본문은 미호출 함수와 최상위 초기화에 집중한다. `.venv/bin/python scripts/plot-article.py`로 이 두 조건을 표시한 그래프를 `analysis/article/`에 생성한다. 0 MiB 위치는 공통 계측 코드 101 B 기준선이다. 주석 대조군을 포함한 기존 집계와 전체 그래프는 그대로 보존한다.

## 해석 참고 자료

- [V8: Explicit Compile Hints](https://v8.dev/blog/explicit-compile-hints) — 가벼운 파싱, 지연 컴파일, 백그라운드 컴파일.
- [V8: Lazy parsing](https://v8.dev/blog/preparser) — 미호출 함수의 사전 파싱과 스코프 처리.
- [V8: Improved code caching](https://v8.dev/blog/improved-code-caching) — HTTP 캐시와 별도로 존재하는 코드 캐시.
- [Chrome: CPU throttling](https://developer.chrome.com/docs/devtools/settings/throttling) — 호스트에 상대적인 CPU 제한과 보정.
- [W3C: Event Timing](https://www.w3.org/TR/event-timing/) — 입력 지연, 이벤트 duration, 기록 threshold.

실측 결과에 대한 글의 주장은 원본 데이터와 트레이스가 뒷받침하는 범위로 한정한다. 실제 서비스 번들, ESM 모듈 그래프, 모바일 실기기, 다른 브라우저 엔진은 이 실험에서 직접 검증하지 않는다.
