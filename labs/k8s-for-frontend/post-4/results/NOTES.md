# post-4 실측 노트 (집필용 수치 정리)

측정일 2026-08-08. 환경: kind v0.32.0 / K8s v1.36.1 / Node v24.19.0 / Next 16.2.12 / colima 4CPU/8GB.
그 외 3편과 동일 (kube-proxy iptables 모드).

## 사전 검증 결과 (계획서 5건)

1. **Next 16.2.12 standalone의 SIGTERM 처리 원문** (`next/dist/server/lib/start-server.js`):
   cleanup에서 `server.close()`로 신규 수신을 막고 in-flight를 기다린 뒤 nextServer.close, exit 143(SIGTERM)/130(SIGINT).
   `if (isDev) server.closeAllConnections()` — **강제 커넥션 종료는 dev 전용**. prod는 close() 의미론에 의존.
   `if (!process.env.NEXT_MANUAL_SIG_HANDLE) { process.on('SIGINT'|'SIGTERM', cleanup) }`
   → 통설("standalone은 SIGTERM에 즉사, exit 0")은 이 버전 기준으로 낡음. 드레인은 기본 내장.
2. **NEXT_MANUAL_SIG_HANDLE=true + 핸들러 미등록**: PID 1 node가 SIGTERM 완전 무시(핸들러 없는 신호에 대한 PID 1 커널 규칙).
   docker: TERM 후 4초에도 running, stop 시 exitCode **137**.
3. **CrashLoopBackOff 기본값(v1.36)**: 10초 시작, 최대 5분 **유지** (KEP-4603 기본 미적용, kubelet crashLoopBackOff: {} 빈 설정).
4. **네이티브 preStop sleep(v1.34 GA)**: kind v1.36에서 동작. sleep 5초 파드 delete 총 6.97초.
5. **rollout restart 중 실패 재현**: C(기본 graceful)에서도 배포당 실패 발생. 재현 확정.

## 도커 수준 신호 실험 (원리 확인)

| 구성                                        | SIGTERM 후                           | in-flight(5초 지연)     | exit          |
| ------------------------------------------- | ------------------------------------ | ----------------------- | ------------- |
| standalone (node가 PID 1)                   | server.close, in-flight 완주 후 종료 | **200 완주** (총 5.07s) | 143           |
| standalone + 드레인 중 신규 커넥션          | 리스너 닫힘                          | 빈 응답/거부            | -             |
| naive (`CMD ["npm","start"]`, npm이 PID 1)  | 0.72초 만에 트리 붕괴                | **절단** (1.5s에 RST)   | 1             |
| standalone + MANUAL_SIG_HANDLE(핸들러 없음) | 신호 무시, 계속 서빙                 | -                       | 137 (SIGKILL) |

- naive 프로세스 트리: PID 1 npm → sh -c next start → next-server. npm은 TERM에 반응해 죽지만
  (통설의 "30초 행"이 아님) next-server는 TERM을 받지 못한 채 PID 1 붕괴와 함께 SIGKILL.
  npm 로그: "npm error signal SIGTERM".

## 인질 드레인 메커니즘 (킬러 발견)

- server.close()는 **그 순간 유휴인 커넥션만** 닫는다. 그 순간 요청을 처리 중이던 keep-alive 소켓은
  이후로도 계속 요청을 받는다 (응답에 Connection: close도 안 실림 — 클러스터 실측에서 소켓당 54요청 추가 처리).
- 도커 단건 실험: TERM 시점까지 2건 → TERM 후 6초간 같은 소켓으로 19건 추가 처리 →
  클라이언트가 쉬는 순간 즉시 드레인 완료, exit 143.
- k8s에서는 클라이언트(BFF)가 쉬지 않으므로: SIGTERM → (라우팅은 ~1초에 수렴, 3편 SLI 0.76s) →
  conntrack 고정 커넥션으로 30초 내내 서빙 → grace 만료 SIGKILL(137) → RST.
- C run1 실측 (구간별 ka 응답 파드): 배포 후 8~~34s 구간에서 옛 파드 3개가 각각 53~~54요청 처리,
  34s+에서 RST 3건 후 새 파드로 전환.

## 표: 시나리오별 rollout 실패 (배포당) — 확정

sampler 120ms 간격 × 2모드 동시(new/ka), RESPONSE_DELAY_MS=400, 런당 표본 각 ~360-414개(관찰창 ~45s).

| 시나리오                   | 반복 | rollout | drained             | new 실패 (유형)                       | ka 실패 (유형)                        |
| -------------------------- | ---- | ------- | ------------------- | ------------------------------------- | ------------------------------------- |
| A naive(npm PID 1)         | 5    | 3s      | ~4s(보충 실측 예정) | 0/0/2/5/5 (RESET 위주, REFUSED 1×2회) | 4/5/4/5/5 (거의 전부 RESET)           |
| B 신호 무시(MANUAL+미등록) | 3    | 3-8s    | **34/34/38s**       | **0/0/0** (리스너 생존)               | RESET 3/3/3 (grace 만료 시점)         |
| C Next 기본 graceful       | 4+1  | 3-4s    | **33-34s** (인질)   | REFUSED 4/1/2/1 (+300s관찰 run 6)     | RESET 3 안정 (+REFUSED 1×2회)         |
| D C+preStop sleep 3s       | 5    | 3s      | 32-34s              | **0 전부 (5/5)**                      | RESET 3/3/3/3/3                       |
| E D+클라이언트 멱등 재시도 | 5    | -       | -                   | (실측 대기, 예상 0)                   | (실측 대기, 예상 retried_ok=3, err 0) |

- 실패 시각: A는 배포 창(t+5~~7s), B/C/D의 ka RESET은 **grace 만료(t+33~~36s)**에 집중.
- C의 결정적 관찰: graceful을 붙여도 ka 트래픽이 있으면 drained가 B와 같은 34초.
  "우아한 종료 = 빠른 배포"가 아니다. 옛 파드는 인질 커넥션을 쥔 채 30초를 산다.
- D의 preStop 3초가 REFUSED를 5회 전부 지웠다 (근거: 3편 전파 SLI 평균 0.76s < 3s).

## 표: liveness 오배선 (동일 다운스트림 장애 100초)

|              | deep-live (liveness가 다운스트림 검사)              | deep-ready (readiness가 검사) |
| ------------ | --------------------------------------------------- | ----------------------------- |
| 재시작       | **4~5회**, CrashLoopBackOff 진입(back-off 40s 관측) | 0회                           |
| Ready        | 재시작 반복 중 오르내림                             | False (트래픽만 이탈)         |
| 복구(45s 후) | 백오프 대기 후 복귀 (restarts=5)                    | 즉시 Ready=True, 재시작 0     |

첫 재시작: T0+~15s (period 5s x failureThreshold 3). 이벤트 원문: "Container app failed liveness probe, will be restarted".

## 표: CrashLoopBackOff 간격 (즉시 exit 1 파드, 13분 관찰)

재시작(컨테이너 기동) 상대 시각: 0, 0, +13s, +40s, +86s, +172s, +337s, 이후 "back-off 5m0s".
간격 수열 ≈ 10 → 20 → 40 → 80 → 160 → 300(상한) + 기동/감지 오버헤드 3~7초.
v1.36 기본값이 여전히 10s 시작/5m 상한임의 실측 증거. (KEP-4603이 1s/1m으로 낮추는 변경을 진행 중 — 게이트로 확인)

## 후속 실측 결과 (전부 완료)

- E(D+ka-retry) 5회: new err 0 전부, ka err 0 전부 (retried_ok 3/2/1/3/3). **계단의 0 도달.**
- A drained 보충: 4초 (즉사 확인).
- 종료 타임라인 C+new (delete 단건): 마지막 실트래픽 +0.12s, KUBE-SEP 소멸 +0.19s,
  EndpointSlice r=false/s=true/t=true 전환 +0.20s, 컨테이너 exit 143 관찰 +0.75s 이내,
  오브젝트 소멸 +1.6s, 에러 0.
- 종료 타임라인 C+ka (인질): 오브젝트 소멸 +30.4s, 인질 구간(0~30s)에 그 파드가 61요청 처리
  (마지막 200이 +29.1s), +29.5s ECONNRESET 1건, 컨테이너 exit **137**.
  인질 구간 동안 kubelet readiness probe는 connection refused (리스너는 닫혔는데 서빙은 계속되는 상태).
- PDB(minAvailable 3): eviction API → 429 TooManyRequests "Cannot evict pod as it would violate
  the pod's disruption budget" / delete → 통과 / rollout restart → 통과.
- 전략: surge=1/unavail=0 → 교체 중 ready 3 유지(total 최대 4), 3.4s.
  surge=0/unavail=1 → 교체 중 ready 2로 감소, 3.3s. 이 랩에선 총 시간 차이 없음, 수용량 곡선이 차이.

## 집필 반영

초안: apps/blog/posts/2026/08/k8s-for-frontend-4.md (2026-08-08, published: false, 부검 구조).
계획 대비 달라진 것: "사인 2(Next 즉사)"는 실측으로 무죄 판명되어 "무죄로 판명된 용의자" 절로 전환,
대신 인질 드레인(busy keep-alive가 server.close를 붙잡는 것)이 킬러 사인으로 승격.
naive의 통설(30초 행)도 실측(0.7s 절단, exit 1)으로 교정. 30초 행의 실주인은 핸들러 없는 PID 1.

## 추가 실측 (2026-08-09): PDB 롤링 업데이트 재실험 (pdb-demo2.txt)

- 기존 pdb-demo(19:04:15)는 strategy 실험(19:04:19~)보다 먼저라 기본 보폭(3레플리카 반올림 후 surge=1/unavail=0)이었음.
  Ready가 3 밑으로 안 내려가 예산 위반 자체가 없었고, 롤링 업데이트 통과의 증거로는 비결정적.
- 재실험: minAvailable=3 PDB + maxSurge=0/maxUnavailable=1 (교체 중 Ready가 2로 내려가 예산을 실제로 위반하는 보폭).
  결과: eviction은 여전히 거부(TooManyRequests), rollout restart는 Ready 2까지 내려가면서도 그대로 완료.
  → "PDB는 eviction API만 게이트, 배포(delete 경로)는 심사하지 않음"의 결정적 증거. 본문 반영 완료.
