# post-5 사전 검증·인프라 노트 (2026-08-09)

환경: 3·4편과 동일 (kind v0.32.0 / K8s v1.36.1 / Node v24.19.0 / Next 16.2.12 / colima 4CPU/8GB).

## 구축 완료 인프라

- `manifests/autoscale-lab.yaml`: 4편 조립본 계승(preStop 3s, surge1/unavail0, readiness 5s). requests 500m/256Mi
- `manifests/hpa-cpu.yaml`: cpu 70%, min 3 / max 12
- `manifests/mem-lab.yaml` + `hpa-mem.yaml`: memory requests 128Mi(유휴 52%/부하 109% 설계), 미적용 상태
- `scripts/spike-load.js` v2: 베이스라인 개루프(고정 요청률) + 스파이크 폐루프(동시성 워커). client 파드에 주입해 실행
- `scripts/watch-scaleout.sh`(0.35s 폴링) + `collect-timeline.sh`(파드 conditions·이벤트·HPA describe)
- KEDA v2.20.2 설치 완료(operator/metrics-apiserver Running). cron 트리거 스모크: 1→3 확장 실증 후 정리
- 로컬 레지스트리 kind-registry(:5001, kind 네트워크). 노드 3대 containerd(v2.3.1)에
  `config_path=/etc/containerd/certs.d` 패치 + 재시작. hosts.toml → http://kind-registry:5000.
  push 완료: k8s-fe-lab:standalone(91.5MB), :naive(591MB). 풀 검증: Pulled 12ms(레이어 캐시 상태)

## 스모크 실측 수치 (results/smoke-*)

- 부하기 v1(폐루프 4→48동시, 결함 있음): 3→5→9→11 스케일 아웃 관찰. HPA 이벤트 rescale 5(9m31s), 9(9m16s)
- 파드 배치(생성 시각): 47:11 x2 → 47:26 x4 → 47:56 x2(Pending), 15초 배수 간격 = HPA 주기 가시화
- Scheduled→Ready: 여유 시 1초, CPU 포화 시 6초(readiness 5s 주기 포함)
- desired 11 중 ready 8에서 정지: requests 합이 노드 allocatable 초과 → Pending 2. 1편의 "태울 노드가 없다" 실물
- p95: 베이스라인 26ms → 스파이크 직후 219ms → +60~120s 262ms (물리 4코어 포화라 스케일 아웃으로도 회복 안 됨)
- 62,251요청 에러 0
- 스케일 다운: 부하 제거 후 안정화 창(기본 300s)을 거쳐 3으로 복귀 확인

## 측정 함정 (본 실험 설계에 반영할 것)

1. **폐루프 베이스라인 금지.** 4동시 폐루프만으로 ~150rps(사용률 96%)가 나와 스파이크 전에 HPA가 깨어난다.
   v2에서 베이스라인을 개루프 10rps로 교체, 사용률 3% 실측 확인. SPIKE 마커 전 desired 변동이 없어야 유효한 회차다.
2. **물리 CPU 4코어가 상한.** limit 1코어 파드 8개면 물리 포화라 그 뒤로는 파드를 늘려도 p95가 회복되지 않는다.
   본 실험은 "스케일 아웃이 실제로 p95를 회복시키는" 규모로: spike 동시성 16~24, maxReplicas 6~8,
   다른 실험 Deployment(k8s-fe-lab 3, graceful-lab 3, internal-api 2, hostname-trap 1)를 실측 전 0~1로 축소.
3. 시계 skew는 -3ms로 무시 가능(client 파드 vs 호스트). T0는 client의 SPIKE 마커 기준으로 통일해도 된다.
4. 실측 회차 시작 전 desired=minReplicas 정착 확인(직전 회차의 스케일 다운 안정화 창 300s 대기).

## 판정 사항

- **tolerance 필드는 v1.36에서 살아 있다.** `spec.behavior.scaleUp.tolerance: 0.2` patch가 수용·저장됨("200m").
  HPAConfigurableTolerance 게이트가 기본 활성이라는 뜻. 컨트롤러가 실제 반영하는지는 본 실측에서 확인.
- HPA 기본 behavior 덤프: scaleUp policies 4pods/15s·100%/15s Max, stabilization 0 / scaleDown 100%/15s, 안정화 300s(기본)
- 콜드 풀 실측 설계: 레이어 공유 때문에 단순 재풀은 12ms로 나온다. 본 실험은 worker2에서
  crictl rmi(앱 이미지 + import-*)로 레이어를 지운 뒤 localhost:5001 경유 풀로 standalone(69MB) vs naive(590MB) 대조.
  로컬 레지스트리라 네트워크 왕복이 없는 조건임을 본문에 명시(압축 해제 비용 중심의 하한값).

## 남은 실측 (본 세션)

- [ ] 킬러 타임라인: 정착 상태에서 스파이크, T0→메트릭 반영→desired→Scheduled→Started→Ready→첫 트래픽 구간 분해 (3회 반복)
- [ ] 콜드 노드 대조(레지스트리 풀 포함 타임라인)
- [ ] 단축 실험: 프리로드/minReplicas/behavior 튜닝별 총 소요
- [ ] 스케일 다운 타임라인 정밀 실측(안정화 창)
- [ ] 메모리 HPA 불발 재현(mem-lab 적용 → 부하 → 제거 → 사용률 눌러앉음 관찰)
- [ ] KEDA cron+cpu 이중 트리거로 선제 확장 유/무 p95 대조

## 본 실측 결과 (2026-08-09 오후, 집필용 확정 수치)

부하기 이력 주의: run1은 v2(개루프 베이스라인 + 폐루프 스파이크, 유입 상한 없음), run2 이후는 v3(개루프+개루프, inflight 상한 600).
**run1과 run5b는 부하 모형이 달라 직접 비교 금지.** 경계 정량화는 run1b/run5b(143rps 쌍)와 run6/run7(222rps 쌍)로.

- run2 (온건 121rps, 킬러 타임라인): 감지+판단 +22.5s → 생성 +21s → Ready +22~23s(기동 1~2s) → 첫 트래픽 +31.5s.
  p95 9ms→74ms 피크→60ms 정착, 에러 0/24,265. desired 3→6→8 정착(util 60~65%).
  분포: 스파이크 2분 뒤 기존 3파드가 54%, 최대/최소 파드 3.4배(1,940 vs 577) = 3편 keep-alive 연결.
- run3 (min6 선제): p95 첫 버킷 75ms로 run2(74ms)와 동일 = 온건 스파이크에선 이득 관측 불가. 가치는 한계 상황 여유.
- run4 (behavior 12/15s 일괄): ready6 +43.9s로 기본(+23.5s)보다 느림, 일괄 기동 구간(+30~45s) p95 421ms 스파이크.
  기동 경합(물리 4코어). 단 +0~15s 363ms는 원인 미상(시작 오염 가능성) → 본문에는 미사용, 기동 구간 수치만 사용.
- run1 (v2 부하, 실명 발견): desired 146.7s 동결, "did not receive metrics ... pods might be unready" x10/5m20s,
  readyReplicas 0 관찰, p95 18.7s, 실패 27%(TIMEOUT 5,255/REFUSED 149/RESET 48 of 20,138). 복구 후 889ms.
  플래핑: Ready lastTransition이 첫 트래픽보다 늦음 = Ready 수회 반전.
- run1b (개루프 143rps, probe 1s): 실명 없음. 감지 +32.2s, ready6 +52.9s, p95 피크 1,615ms, 에러 0/30,064.
  → 143rps에서는 확장 경주가 probe 붕괴보다 빠르다. 실명은 더 깊은 과부하에서.
- run5b (개루프 143rps, probe 3s): 감지 +27.4s, ready6 +33.2s, p95 피크 572ms, 에러 0/30,281.
  run1b와의 차이는 회차 분산 범위로 볼 것(위상 운). probe 효과 단정 금지 → 222rps 쌍(run6/7)으로 판정.
- 스케일 다운 (run1 꼬리): 부하 제거 후 304s간 12 유지 → +304s 12→8 → +319s 8→3. 안정화 창 300s 롤링 맥스의 계단.
- KEDA (cron 선제 9개 + 개루프 143rps): 에러 0/30,094, p95 68~101ms 유지. 워밍업 p95 10ms.
- 메모리 HPA 1차(목표 70%): 목표 미달로 확장 사이클 불발. 대신 핵심 습성 실측: RSS 유휴 35~38Mi(28%) →
  부하 84~87Mi(67%) → 부하 소멸 10분 뒤에도 59~63Mi(48%)에 고정. 2차(목표 40%)로 확장→불발 사이클 재실행 중.
- 콜드 풀 1차 실패(dash에 time 없음). 2차는 bash + 나노초 타이밍 + 콘텐츠 prune으로 재실행 중.
- KEDA cron 창 이슈 없음(분 계산 wrap 회피 로직 동작).

## 추가 확정 수치 (2026-08-09 저녁)

- run7 (개루프 222rps, probe 3s): **실명이 3s로도 재현.** desired +197.0s 동결, unready 이벤트, p95(성공분) 1.4~2.3s
  + 클라이언트 TIMEOUT(10s) 7,184개 꼬리, 실패 19.1%(7,342/38,399). → 타임아웃 상향은 경계를 밀 뿐 구조 못 바꿈.
  결론 프레임: 실명은 "감지 창 vs probe 붕괴의 경주". 143rps에서는 경주를 이기고(에러 0), 222rps에서는 짐.
- mem2 (메모리 HPA 목표 40%): 유휴 36Mi(28%) → 부하 3분 71~89Mi(54%) → desired 2→5→8(max) →
  부하 제거 후 부푼 파드 58~64Mi 고착 + 새 파드 40Mi 희석으로 평균 39~40% = tolerance 띠 안 →
  **10분+ 스케일 인 없음(8개 고착).** 이중 메커니즘(V8 미반납 + 평균 희석) 확보.
- 콜드 풀 2차: standalone 231ms vs naive 7,726ms (로컬 레지스트리, 압축 해제 중심 하한값. bash+나노초 타이밍).
- run6 (222rps, probe 1s): 재실행 중 (probe1 대조).

## 적대적 리뷰 → run8 결정 실험 (2026-08-09 밤, 본문 교정 완료)

- **실명의 진짜 메커니즘 = HPA cpuInitializationPeriod(기동 후 5분).** v1.36.1 replica_calculator.go groupPods:
  CPU 메트릭에서 NotReady 파드가 표본 제외되는 것은 startTime+5분 이내일 때뿐. 5분 지난 파드는 중간에
  NotReady로 뒤집혀도 표본에 남는다. 실측 해동 시각이 전부 "서빙 파드 생성+5분"과 초 단위 일치:
  run1 +146.7s(파드 08:04:01~08 → 해동 08:09:13), run7 +197.0s(10:00:15 → **10:05:15 정각**),
  run6 +196.8s(10:14:55~56 → 10:20:01). "감지 창 vs probe 붕괴의 경주" 프레임은 폐기.
  올바른 프레임: **실명 = 배포 직후 5분 창 × probe 붕괴의 곱.**
- **run6 최종 raw 확정치**: desired 첫 변화 +196.8s(부하 210s 종료 전), 실패 26.3%(8,112/30,838, TIMEOUT 7,950),
  p95 최악 5.6s(+165~180s). 초안이 인용했던 "동결 210s 내내, 27.0%(7,017/25,972), p95 4.5s"는 재현 불가
  (무효 구회차 추정) → 본문 전량 교체. probe 1s/3s는 해동 시각 동일, 피해만 26.3%→19.1%.
- **run8-probe3-222-aged (결정 실험)**: 같은 222rps·probe 3s, 파드만 생후 62~63분(3개 전부 worker2)으로 실행.
  desired 3→6 **+26.8s**(정상 감지 창)→9 +41.7s→12 +72.1s, ready12 +194.3s. 실패 **7.4%**(1,711/22,993).
  p95 최악 11.4s(+15~30s, 성공분 기준. run7 2.3s와의 직접 비교는 실패율 차로 무의미, 본문 미사용).
  → 늙은 파드에서는 같은 부하로 실명 없음. 가설 실증.
- run6의 xhpl6(생후 10분, 서빙 참여)는 규칙상 표본에 남았어야 하나 동결 지속 = 노드 포화로 메트릭 수집
  자체가 소실된 2차 경로. 본문에 "덧붙여 둘 것" 한 문단으로 수록(단일 머신 특성 명시).
- **run4 재해석**: behavior 12/15s에서도 desired는 계단 3→5(+22.6s)→7(+37.4s)→10(+82.5s)→12(+128s).
  첫 계단 5=ceil(3×101/70)(첫 관찰 101%, run2는 142% = 위상 운), 둘째 7=ceil(3×153/70)(새 파드 메트릭 공백).
  "단번에 3→12"는 오류였음 → 본문 교정. 421ms(+30~45s)·ready6 +43.9s는 유효.
- run1 잔여 수치 분석기 검증 완료: ready6 +172.4s, 신규 첫 트래픽 +157.1~179.8s, p95 889ms(+225~240s),
  실패 5,452/20,138=27.07%.

## 사고 기록: ctr content rm이 pause 이미지를 지움

E2의 고아 콘텐츠 정리(ctr -n k8s.io content ls -q | content rm)가 worker2의 pause:3.10 config blob까지 제거,
이후 worker2의 모든 신규 파드가 FailedCreatePodSandBox("content digest ... not found")로 실패.
복구: crictl pull registry.k8s.io/pause:3.10 + 파드 재생성. 교훈: 콜드 연출 시 rmi는 앱 이미지 ref에 한정하고
전역 content prune은 금지. (run6 1·2차 실패의 원인이기도 함: 첫 실패는 9레플리카 순차 롤아웃 120s 타임아웃,
둘째는 pause blob 소실로 worker2 스케줄 파드가 영구 ContainerCreating.)

## 실험 잔여물 상태

- KEDA v2.20.2 설치 유지, kind-registry(:5001) 유지, containerd config_path 패치 3노드 유지
- k8s-fe-lab/graceful-lab/internal-api/hostname-trap replicas=0 (원복은 kubectl scale)
- autoscale-lab: probe timeoutSeconds=3 원복 완료(run8도 3s로 실행), requests 200m/limit 400m, 레지스트리 이미지 참조. run8 후 12개는 안정화 창 거쳐 3으로 자동 복귀
- worker2의 docker.io/library/k8s-fe-lab:* 태그는 kind load로 재적재 완료
