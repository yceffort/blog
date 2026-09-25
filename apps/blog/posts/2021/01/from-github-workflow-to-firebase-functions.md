---
title: 'GitHub Actions cron이 제시간에 실행되지 않는 이유와 대안'
tags:
  - ci-cd
  - git
  - devops
  - backend
  - debugging
published: true
date: 2021-01-24 21:16:38
description: 'GitHub Actions schedule은 왜 수십 분씩 밀리는가. 구조적 원인과 정시 실행이 가능한 대안 정리.'
---

GitHub Actions의 `schedule` 트리거로 cron job을 돌리다가, 실행 시간이 수십 분에서 최대 2시간까지 밀리는 문제를 겪었다. 원인을 찾아보니 버그가 아니라 구조적 한계였고, 결국 Firebase Cloud Functions로 옮겼다. 왜 이런 일이 생기는지, 왜 고쳐지기 어려운지, 그리고 정시 실행이 필요할 때 쓸 수 있는 대안은 무엇이 있는지 정리한다.

## 문제

GitHub Actions의 `schedule` 트리거로 cron job을 돌리고 있었다.

```yaml
name: cron

on:
  schedule:
    - cron: '0 5 * * 1-5'

jobs:
  cron:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - uses: actions/setup-node@v1
        with:
          node-version: '12'
          check-latest: true

      - name: CI
        run: |
          npm ci
      - name: Run Cron
        run: |
          npm run job
```

처음에는 잘 돌아갔다. 그런데 어느 시점부터 실행 시간이 40~50분씩 밀리기 시작했고, UTC 00시(한국 시간 09시)에 걸어둔 작업이 2시간 뒤에야 실행되는 경우도 있었다.

![workflow-cron](./images/workflow-cron.png)

> 00시에 걸어둔 작업이 실제로는 02시 30분에 실행되었다.

나만 겪는 문제는 아니었다.

- https://stackoverflow.com/questions/65132563/why-is-github-actions-workflow-scheduled-with-cron-not-triggering-at-the-right-t
- https://github.community/t/github-actions-on-schedule-executed-in-delay/152972

## 왜 제시간에 실행되지 않는가

GitHub 공식 문서에 답이 있다.

> Note: The `schedule` event can be delayed during periods of high loads of GitHub Actions workflow runs. High load times include the start of every hour. If the load is sufficiently high enough, some queued jobs may be dropped.
>
> — [GitHub Docs: Events that trigger workflows](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#schedule)

문서가 짧게 쓰여 있어서 보충하면, 지연의 원인은 러너가 아니라 **GitHub 내부의 job 디스패치 단계**에 있다. self-hosted runner를 써도 지연이 발생한다. [한 사례 분석](https://dev.to/devactivity/unpacking-github-actions-delays-when-self-hosted-runners-go-idle-but-workflows-stay-queued-547n)에서 이를 직접 확인할 수 있는데, 내용을 요약하면 이렇다.

- 워크플로우가 `queued` 상태에서 7~8분간 머물렀다.
- GitHub API로 확인한 결과 러너는 `online`, `idle` 상태였고, `runner_id=0` — 즉 러너가 배정되지 않은 상태였다.
- 러너 호스트의 네트워크도 정상이었고, GitHub Actions 브로커로의 연결도 문제없었다.
- 결론: 러너나 네트워크 문제가 아니라, **GitHub의 job 디스패치 또는 브로커 메시징 단계**에서 지연이 발생한 것이다.

러너가 아무리 빨라도 GitHub이 job을 보내주지 않으면 실행이 시작되지 않는다.

여기에 정시 집중 문제가 겹친다. 대다수 레포지토리가 매 시 정각(`:00`)에 cron을 건다. 문서에서도 "high load times include the start of every hour"라고 명시하고 있다. 정각마다 디스패치 큐가 한꺼번에 몰리고, 이 지연은 GitHub Actions 사용량이 늘면서 계속 심해지는 추세다. [커뮤니티 보고](https://github.com/orgs/community/discussions/156282)에 따르면 수개월 사이에 평균 지연이 9분에서 25~30분으로 늘어난 사례도 있다.

그리고 이건 무료 플랜만의 문제가 아니다. 공식 문서 어디에도 유료 플랜(Team, Enterprise)에서 스케줄 실행 타이밍에 대한 SLA를 제공한다는 언급은 없다. 스케줄 트리거는 모든 플랜에서 best-effort다.

## 왜 근본적으로 고치기 어려운가

GitHub Actions는 CI/CD 플랫폼이다. 핵심 가치는 코드 변경에 반응하는 것이지, 정해진 시간에 작업을 실행하는 게 아니다. 공유 러너 풀에 부하가 걸렸을 때, push/PR 이벤트와 스케줄 이벤트 중 어디에 먼저 자원을 배정할지는 플랫폼의 존재 이유를 생각하면 자명하다.

지연이 발생하는 지점이 러너가 아니라 GitHub 내부의 디스패치 계층이라는 점도 문제를 어렵게 만든다. self-hosted runner를 붙여도 해결이 안 되는 이유가 여기 있다. 디스패치 큐의 처리 용량을 늘리거나 스케줄 전용 경로를 별도로 만들어야 하는데, 이건 GitHub 인프라 자체의 변경이다.

한편, 이 글을 처음 쓴 2021년 당시에는 `schedule` 트리거에 타임존 설정이 불가능했다. UTC로만 동작해서 한국 시간 기준 cron을 계산해야 하는 번거로움이 있었는데, [2026년 3월에 `timezone` 필드가 추가](https://github.blog/changelog/2026-03-19-github-actions-late-march-2026-updates/)되면서 이 문제는 해결되었다.

```yaml
on:
  schedule:
    - cron: '30 5 * * 1-5'
      timezone: 'Asia/Seoul'
```

타임존 문제는 해결되었지만, 실행 타이밍의 정확도 문제는 여전하다. 결국 GitHub Actions의 `schedule`은 "대략 이 시간대에 돌면 되는" 작업에만 적합하다. 정시 실행이 필요하면 다른 곳을 써야 한다.

## 대안: 정시 실행이 가능한 무료 플랫폼

당시에는 Firebase Cloud Functions로 옮겼다.

```javascript
exports.cronJob = functions.pubsub
  .schedule('0 14 * * 1-5')
  .timeZone('Asia/Seoul')
  .onRun((_) => {
    job()
  })
```

타임존을 직접 설정할 수 있고, 실행 시간도 정확했다. `firebase init`으로 초기화하면 기본 디렉토리가 `./functions`로 잡히는데, 이건 `firebase.json`에서 바꿀 수 있다.

**firebase.json**

```json
{
  "functions": {
    "source": ".",
    "runtime": "nodejs12"
  }
}
```

![functions](./images/functions-cron.png)

Firebase 외에도 cron job을 돌릴 수 있는 선택지는 몇 가지 더 있다.

| 플랫폼                                                                                                    | 무료 범위                                    | 타임존   | 비고                                                                        |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| **[Firebase Cloud Functions](https://cloud.google.com/functions/pricing-1stgen)**                         | 월 200만 회 호출                             | 지원     | Google Cloud Scheduler 기반. Blaze 플랜(종량제) 필요하지만 무료 범위가 넓다 |
| **[Google Cloud Scheduler](https://cloud.google.com/scheduler/pricing)**                                  | 빌링 계정당 3개 job 무료                     | 지원     | HTTP, Pub/Sub, App Engine 타겟. Firebase 없이 단독으로 쓸 수 있다           |
| **[Cloudflare Workers Cron Triggers](https://developers.cloudflare.com/workers/platform/cron-triggers/)** | Workers 무료 플랜 내 (일 10만 요청 공유)     | UTC 고정 | Worker 코드 안에서 실행. cold start가 거의 없다                             |
| **[Vercel Cron Jobs](https://vercel.com/docs/cron-jobs/usage-and-pricing)**                               | Hobby 플랜에서 프로젝트당 100개, 일 1회 실행 | UTC 고정 | 정밀도 ±59분. 빈도가 낮고 정확도가 덜 중요한 작업에 적합                    |

Vercel Cron Jobs의 Hobby 플랜은 일 1회 실행만 가능하고 정밀도가 ±59분이라서, 사실상 GitHub Actions `schedule`과 비슷한 한계가 있다. 정시 실행의 정확도가 필요하다면 Google Cloud Scheduler나 Cloudflare Cron Triggers가 적합하다.
