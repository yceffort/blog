---
title: 'Next.js turbopack에서 싱글톤이 두 개가 됐다: scope hoisting 버그와 순환 import'
tags:
  - turbopack
  - nextjs
  - bundler
  - javascript
  - singleton
  - debugging
published: true
date: 2026-08-19 12:00:00
description: 'Next.js 16 turbopack 프로덕션 빌드에서 모듈 스코프 싱글톤이 런타임에 두 개가 됐다. 같은 동기 구간에서 조건 판정이 뒤집히고, 응답이 도착해도 타임아웃이 나는 증상을 번들 산출물로 추적한 기록. scope hoisting의 부분 병합, 순환 import, 이미 고쳐져 있던 upstream 버그, 그리고 뒤늦게 돌린 단일 변수 실험까지.'
thumbnail: /thumbnails/2026/08/turbopack-scope-hoisting-singleton-split.png
---

## Table of Contents

## 코드상 불가능한 관측

이런 분기가 있다. 실시간 연결을 관리하는 사내 공통 패키지의 전송 함수인데, 연결이 준비되지 않았으면 요청을 큐에 쌓는 평범한 코드다.

```ts
if (!socket.client || !isSocketOpen()) {
  // 연결이 없거나 닫혀 있으면 큐에 적재
}
```

이 분기에 들어왔다는 것은 `socket.client`가 없거나 연결이 열려 있지 않다는 뜻이다. 그런데 분기 안에서 `isSocketOpen()`을 다시 호출하면 `true`가 나왔다. 사이에 `await`도 없고 상태를 바꾸는 코드도 없다. `isSocketOpen`은 `socket.client?.readyState === WebSocket.OPEN`을 반환하는 세 줄짜리 함수다. 같은 `socket`을 읽는다면 `socket.client`가 falsy인데 `isSocketOpen()`이 true일 수는 없다.

이 관측 때문에 소스를 몇 번이고 다시 읽었지만 소스는 끝까지 정상이었다. 하루를 통째로 쓴 조사의 결론은 이렇다. **모듈 스코프 싱글톤 객체가 런타임에 두 벌 있었다.** `socket.client`를 읽은 코드와 `isSocketOpen()`이 서로 다른 `socket` 객체를 보고 있었던 것이다. 원인은 turbopack의 scope hoisting이 순환 import가 있는 모듈 그룹을 부분 병합하면서 만든 이중 접근 경로였고, 같은 구조를 겨냥한 결함이 조사 시점 기준 2주 전에 이미 upstream에 보고되어 다음 날 수정까지 끝나 있었다.

그리고 이 조사에는 사실 지름길이 있었다. 문제가 나타나기 직전에 바뀐 것은 Next.js 버전업뿐이었다. 그런데도 "설마 프레임워크 버전업 때문이겠어, 버그라면 당연히 내 코드에 있겠지"라며 그 사실을 넘겼다. 조사가 하루짜리가 된 원인의 대부분은 이 한 번의 판단이었고, 뒤에서 같이 정리한다.

> 이 장애는 Next.js `16.2.3`의 turbopack 프로덕션 빌드에서 겪었다. 사내 코드라 패키지·서비스 이름은 일반화했고, 인용한 번들 산출물은 실제 빌드 결과를 옮기되 모듈 ID와 식별자는 구조를 보존한 채 치환했다. upstream 근거로 인용한 vercel/next.js의 이슈·PR·커밋은 2026-08-18 기준 GitHub API로 존재와 머지 여부, 버전 태그 포함 여부를 직접 확인했다.

## 모듈 스코프 싱글톤이라는 관행

문제의 패키지는 상태를 이렇게 들고 있었다. 특별할 것 없는 구조다.

```ts
// socket.ts
const socket = {
  client: null,
  state: {
    requestCallbacks: {},
    // ...
  },
}

export default socket
```

이 패턴이 성립하는 근거는 ESM의 평가 의미론이다. 같은 모듈은 모듈 그래프 안에서 한 번만 평가되고, 이후의 모든 import는 캐시된 같은 인스턴스를 받는다. 그래서 어디서 import하든 `socket`은 같은 객체이고, 모듈 스코프에 객체를 하나 두는 것만으로 앱이 공유하는 싱글톤이 된다. React context 객체, ORM 커넥션 매니저, 이벤트 버스, 요청 콜백 레지스트리가 전부 이 보증 위에 서 있고, 번들러도 이 의미론을 보존하도록 만들어져 있다.

정확히 말하면 이 보증의 단위는 하나의 모듈 그래프다. 서버와 클라이언트처럼 그래프가 갈리거나, 버전 불일치로 패키지가 이중 설치되면 결함 없이도 인스턴스는 합법적으로 여러 개가 될 수 있다. 이번 사건이 이상했던 것은 그런 합법적 경로가 아니라, 하나의 클라이언트 그래프 안에서(뒤에서 보듯 심지어 하나의 청크 안에서) 분열이 일어났다는 점이다.

어느 경로로든 같은 모듈의 인스턴스가 두 벌이 되면, 들고 있던 상태의 종류에 따라 증상이 갈린다.

| 모듈 스코프 상태     | 두 벌이 되면                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------- |
| 연결 객체            | 중복 생성 가드가 다른 쪽 인스턴스의 연결을 못 봐서 연결이 2개 생긴다                         |
| 요청 콜백 레지스트리 | 등록과 조회가 다른 인스턴스에서 일어나, 응답이 도착해도 콜백을 못 찾고 타임아웃까지 매달린다 |
| 이벤트 리스너 참조   | `removeEventListener`가 다른 인스턴스의 참조로 실패해, 죽은 연결의 리스너가 영구 잔존한다    |
| React context        | provider와 consumer가 다른 context 객체를 잡아 `useContext`가 `undefined`를 반환한다         |

이번 사건에서는 위 두 줄이 실측으로 확인됐다. 요청 응답이 27–35ms에 도착했는데도 5초 뒤 타임아웃이 났고(콜백 레지스트리 분열), 연결이 2개 떴다(가드 분열). 셋째 줄은 직접 관측하지는 못했지만 같은 분열 구조에서 함께 진행됐을 것으로 본다. 여기에 전송이 연결을 자동으로 열지 않도록 막는 가드, 즉 증상 지점을 겨냥한 방어 코드를 넣자, 이번에는 즉시 실패와 3초 간격 재시도가 30회 넘게 반복되는 다른 증상이 나왔다. 근본을 모르는 채 증상 지점에 방어를 쌓으면 실패 모드만 바뀐다는 것을 몸으로 배웠다. 상태 자체를 수렴시키는 다른 종류의 방어는 해법에서 다시 나온다. 네 번째 줄의 React context는 뒤에 나올 upstream 이슈의 증상인데, 같은 결함이 터진 자리만 다른 경우다.

## 동기 구간에서 판정이 뒤집혔다

서론의 분기로 돌아가면, 저 관측을 잡은 것은 임시 진단 로그였다. 분기 안에서 세 가지를 같이 찍었다.

```text
[core] send:queue-branch {sendSaysOpen: true, openConstSame: true, sameSocketObject: false}
```

- `sendSaysOpen`: 분기 진입 직후 같은 `isSocketOpen()`을 다시 호출한 값. `true`인데 분기에 들어왔다는 것은 첫 번째 조건 `!socket.client`가 `true`였다는 뜻이다
- `openConstSame`: `WebSocket.OPEN` 전역 상수가 오염되지 않았는지. `true`라서 "계측 코드가 전역을 깨뜨렸다"는 가설은 죽었다
- `sameSocketObject`: 두 코드 경로가 읽는 `socket`의 객체 동일성(`===`) 비교. **`false`**

`sameSocketObject: false`가 결정적이었다. 여기서 얻은 교훈 하나는, 모듈 분열은 소스를 아무리 읽어도 보이지 않고 **런타임 객체 동일성 비교로만 잡힌다**는 것이다. 동기 구간에서 코드상 성립할 수 없는 판정 역전이 관측되면, 코드를 다시 읽는 대신 두 경로가 정말 같은 객체를 읽는지부터 찍어보는 편이 빠르다.

## 청크 가설, 그리고 반증

두 벌이라는 사실까지는 확정했는데, 어떻게 두 벌이 됐는지가 남았다. 첫 추측은 청크 분할이었다. 이 패키지는 rollup의 `preserveModules`로 파일별 mjs 50개를 배포한다. 단일 번들이었다면 청크가 어떻게 쪼개지든 `socket`은 한 파일 안에 있었을 테니, 파일이 나뉘어 있다는 것이 분열의 필요조건으로 보였다. 그래서 "작은 유틸 모듈이 공통 청크로 빠지면서 자기 의존성인 `socket.mjs`를 함께 담았고, 결과적으로 socket이 두 청크에 각각 들어간 것 아닐까"라는 가설을 세웠다.

검증은 로컬 재현 빌드로 했다. 배포된 청크를 직접 뒤지는 대신, 문제가 재현되던 패키지 버전으로 고정하고 같은 환경 변수의 빌드 스크립트를 turbopack으로 돌리면 문제의 socket이 담긴 청크를 포함해 **파일명이 배포본과 일치하는 산출물**이 나온다. 산출물의 청크 277개를 전부 grep했다.

```python
import glob, os

files = glob.glob('.next/static/chunks/**/*.js', recursive=True)
for marker in ['client:null', 'isSocketOpen']:
    hits = [(os.path.basename(f), open(f, encoding='utf-8', errors='ignore').read().count(marker))
            for f in files if marker in open(f, encoding='utf-8', errors='ignore').read()]
    print(marker, hits)
```

결과는 가설의 반증이었다. `socket`의 객체 리터럴(`client:null`)도, `isSocketOpen`의 본문도, 전송 함수도 **전부 같은 청크 하나에 각각 1번씩**만 있었다. 청크는 갈리지 않았다. 소스에 객체 리터럴이 1개, 산출물에도 1개인데 런타임에 객체가 2개인 상황이 된 것이다.

## 한 팩토리 안의 두 접근 경로

답은 그 청크 하나를 열어보고 나왔다. turbopack은 프로덕션 빌드에서 scope hoisting(webpack의 `concatenateModules`에 해당하는 최적화로, 여러 모듈을 하나의 함수 스코프로 병합해 모듈 간 참조를 일반 변수 접근으로 바꾸는 것)을 하는데, 이 패키지의 모듈 8개가 하나의 팩토리로 병합되어 있었다.

산출물을 읽기 전에 표기를 하나만 짚어두면, turbopack 런타임은 모듈 ID를 키로 각 모듈의 팩토리와 export를 보관하는 테이블을 둔다(이 글에서는 모듈 레지스트리라 부른다). 인용에 나오는 `e.s(exports, id)`는 그 테이블에 export를 등록하는 호출이고, `e.i(id)`는 ID로 다른 모듈의 export 객체를 조회하는 호출이다.

```text
748291, 130476, 862115, 57204, 495833, 620148, 379566, 214905, e => {
  "use strict";
  e.s(["default", () => el /* ... */], 748291)          // socket 모듈의 export 등록
  var i = e.i(503112), r = e.i(291503) /* ... */        // ← 291503 = checkStatus
  e.s(["send", () => ei], 379566)
  e.s(["openSocket", () => Z], 620148)
  // ...
  let el = {client: null, state: {/* ... */}}           // socket 객체 리터럴
}
```

그런데 `isSocketOpen`이 들어 있는 `checkStatus` 모듈(`291503`)만 이 병합에서 빠져 별도 모듈로 남았고, 그 안에서 socket을 **모듈 레지스트리를 경유해** 다시 가져온다.

```text
291503, e => {
  "use strict";
  e.s(["checkSocketConnected", () => n, "isSocketLoggedIn", () => r, "isSocketOpen", () => i])
  var t = e.i(748291)                                   // ← 레지스트리 경유로 socket을 참조
  let i = () => t.default.client?.readyState === WebSocket.OPEN
  // ...
}
```

그래서 같은 청크 안에 socket으로 가는 경로가 둘이 된다.

| 코드                                               | socket 접근 경로                      |
| -------------------------------------------------- | ------------------------------------- |
| 전송 함수, 연결 함수, 로그인 함수 (병합 그룹 내부) | `el` 변수 직접 접근                   |
| `isSocketOpen` (병합에서 제외된 291503)            | `e.i(748291).default` 레지스트리 조회 |

서론의 분기를 번들 기준으로 다시 쓰면 이렇다. 첫 번째 조건은 `el`을 직접 읽고, `isSocketOpen()`은 레지스트리를 읽는다.

```js
if (!el.client || !(0, r.isSocketOpen)()) {
```

`(0, fn)()`은 번들러가 this 바인딩 없이 함수를 호출할 때 쓰는 관용구이고, `r`은 위 팩토리가 `e.i(291503)`로 가져온 checkStatus 모듈이다. 즉 뒤쪽 호출은 레지스트리를 한 번 더 경유한다.

여기에 전제가 하나 더 있다. 소스 기준으로 `checkStatus.ts`는 `socket.ts`를 import하고, 병합 그룹 쪽에서는 전송 함수(`send.ts`)가 `checkStatus`를 import한다. 모듈 단위로는 `send → checkStatus → socket`의 사슬인데, send와 socket이 한 팩토리로 병합되어 있으므로 팩토리 기준으로는 자기 자신으로 되돌아오는 **순환**이다. 병합 팩토리가 평가되는 도중에 그룹 밖의 checkStatus로 나갔다가, 그 모듈이 다시 `e.i(748291)`로 그룹에 재진입하는 구조인 것이다.

여기까지가 산출물에서 직접 확인한 사실이다. 두 접근 경로의 존재, 순환 구조, 그리고 런타임에서 두 경로가 서로 다른 객체를 반환했다는 것까지는 확정이다. 남은 것은 마지막 한 고리, "재진입 시점에 정확히 어떤 런타임 동작으로 살아있는 객체가 두 개 만들어지는가"다. 가장 그럴듯한 추정은 재진입 경로에서 병합 팩토리가 한 번 더 평가되어 socket 리터럴이 두 번 실행됐고, 두 경로가 서로 다른 실행의 결과를 붙잡았다는 것이다. 다만 이 고리는 turbopack 런타임 내부를 끝까지 따라가지 못해 추정으로 남았다.

## 2주 전에 이미 고쳐진 버그였다

기전이 나왔으니 upstream에 알려진 문제인지 찾을 차례였다. 처음에는 못 찾았다. "module evaluated twice", "duplicate module instance", "circular import singleton" 같은 검색어가 전부 0건이었는데, 지금 보면 당연하다. 이 검색어들은 전부 **내가 겪은 증상의 어휘**다. 같은 번들러 결함이라도 이슈 제목은 그 결함이 터진 자리의 어휘로 붙는다. 검색어를 증상어에서 기전어로 바꿔 "turbopack scope hoisting"으로 훑자 한 번에 나왔다.

- [vercel/next.js#96648](https://github.com/vercel/next.js/issues/96648) "Turbopack scope hoisting breaks React context identity: …" (2026-08-04 제보, 08-05 close). 제보자의 증상은 provider가 위에 있는데 `useContext`가 `undefined`를 반환하는 것. context 객체의 동일성이 깨진, 같은 결함의 다른 얼굴이다. 제보자 스스로 "context 모듈이 병합 그룹들 사이에서 중복된 것 아닌가"라는 모듈 중복 가설을 적어두기도 했다
- [PR #96691](https://github.com/vercel/next.js/pull/96691) "Don't scope hoist partial strongly connected components". 폐기됐지만 제목이 이번 구조를 그대로 명명한다. 순환 그룹(strongly connected component)의 **일부만** 병합하는 것 자체를 버그 조건으로 다뤘다. 모듈 8개가 병합되고 순환 고리의 한 모듈만 빠진 이번 배치가 정확히 이것이다
- [PR #96697](https://github.com/vercel/next.js/pull/96697) "Raise registration calls in hoisted modules to the top". 채택된 수정이다

채택된 PR의 기전 서술은 산출물에서 읽어낸 구조와 같은 그림이다.

> Line 26 of scope-hoisting group A enters scope-hoisting group B, then on line 95 we re-enter scope-hoisting group A. Because our first execution of group A hadn't reached Line 29 yet to register schemas.js (which B depends on schemas.js). On non-scope hoisted modules with cycles we already raise the module registration call to the start of the factory. But when we scope hoist, we lose that.

병합 그룹 평가 도중 그룹 밖으로 나갔다가 재진입하는데, 그 시점에는 그룹의 export 등록이 아직 안 끝나 있다는 것이다. 순환이 있는 일반 모듈에서는 등록 호출을 팩토리 최상단으로 끌어올리는 처리를 원래 하고 있었는데, scope hoisting 경로에서 그것을 잃어버렸다고 한다. 수정은 병합 팩토리에서도 등록을 최상단으로 올리는 방식이다. PR 설명의 예시 귀결(등록 전에 심볼을 읽어 `undefined`)과 이번 관측(살아있는 객체 2개) 사이에는 팩토리 재평가라는 고리가 하나 더 필요한데, 그것이 앞 절 끝의 추정이다. 반면 이슈 쪽 관측(동일성 분열, 중복 가설)은 이번 증상과 같은 계열이다.

문제는 버전이다. 이 수정이 어느 릴리스에 들어 있는지를 릴리스 노트 대신 커밋과 태그의 조상 관계로 확인했다. `gh api`의 compare 엔드포인트로 `behind_by`가 0이면 그 태그에 커밋이 포함된 것이다.

```bash
$ gh api "repos/vercel/next.js/compare/40680b95...v16.2.12" --jq '{status, behind_by}'
{"status":"diverged","behind_by":1778}   # 16.2 라인 최신에도 미포함

$ gh api "repos/vercel/next.js/compare/fc7ae172...v16.3.1" --jq '{status, behind_by}'
{"status":"ahead","behind_by":0}         # 16.3.1에 포함
```

| 버전                         | 수정 포함 여부                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| 16.2.3 (장애 당시 사용 버전) | 미포함                                                                                  |
| 16.2.12 (16.2 라인 최신)     | 미포함                                                                                  |
| 16.3.1 이상                  | 포함 ([#97308](https://github.com/vercel/next.js/pull/97308) backport, 커밋 `fc7ae172`) |

backport는 `next-16-3` 브랜치로만 갔고 16.2 라인에는 들어오지 않았다. 16.2에 머무는 한 이 결함 위에서 산다는 뜻이다.

그리고 여기가 복선을 회수할 자리다. 제보일이 2026-08-04, 수정 머지가 08-05였고, 내 조사는 그로부터 2주 뒤였다. 조사를 시작한 시점에 이미 "바뀐 것은 Next.js 버전뿐"이라는 사실을 알고 있었다. 그런데 "설마 프레임워크 버전업이 원인이겠어"라고 넘기고 애플리케이션과 패키지 코드부터 팠다. 이 경험칙("컴파일러/프레임워크 탓이 아니다")은 십중팔구 옳아서 신뢰가 쌓여 있는데, 바로 그래서 틀리는 순간에 가장 비싸다. 실제로 #96648 제보자는 `experimental.turbopackScopeHoisting: false`와 `--webpack` 빌드를 대조하는 단일 변수 실험으로 원인을 turbopack에 고정했다. 나는 조사 당시 이 실험을 하지 않은 채 산출물 분석으로 우회했다. 물론 당시에는 증상 판독 자체가 흔들리고 있었으니(수신 로그 오독은 뒤에서 다룬다) 실험 한 번으로 깨끗하게 갈렸으리란 보장은 없다. 그래도 갈라보는 실험을 용의 목록에 올리는 비용은 0이었고, 그것조차 하지 않은 것이 문제였다. 그 실험은 결국 이 글을 정리하면서 뒤늦게 돌렸다.

## 빠져 있던 실험을 마저 하다

조건은 장애 당시 그대로다. Next.js 16.2.3(수정 미포함)에 문제가 재현되던 패키지 버전을 고정하고, `experimental.turbopackScopeHoisting: false` 하나만 토글해 빌드를 비교했다.

|                         | hoisting ON (장애 조건) | hoisting OFF            |
| ----------------------- | ----------------------- | ----------------------- |
| socket 모듈             | 8개 병합 팩토리         | 단독 팩토리 (병합 없음) |
| socket 리터럴 직접 접근 | 41곳                    | 0곳                     |
| 레지스트리 경유 접근    | 3곳                     | 44곳                    |

켜면 socket 접근이 직접 41곳과 레지스트리 3곳으로 갈리고, 끄면 44곳 전부가 레지스트리 단일 경로로 수렴한다. `sameSocketObject: false`가 나올 구조적 전제(두 접근 경로)는 scope hoisting의 산물이 맞다는 것이 단일 변수로 확인된 셈이다.

upstream 수정이 실제로 무엇을 바꾸는지도 산출물로 확인했다. 문제 버전 산출물에서 socket 자체의 등록은 팩토리 최상단에 있었지만, 같은 팩토리의 등록 4개(send, openSocket 포함)는 순환 이탈 지점(checkStatus를 가져오는 `e.i` 호출)보다 뒤에 있었다. 16.3.1로 올려 빌드하면 이 넷이 전부 이탈 지점 앞으로 올라온다. #96697이 말한 "등록을 최상단으로 올린다"가 이 산출물에서 실물로 일어난다.

정리하면 이렇다. 이중 경로가 hoisting의 산물이라는 것은 확인됐고, 상류 수정이 등록 순서를 실제로 교정한다는 것도 확인됐다. 다만 로컬 청크는 브라우저의 turbopack 런타임 없이는 평가할 수 없어서, 재진입 시 팩토리 평가가 실제로 몇 번 일어나는지, 즉 앞 절의 재평가 추정은 여전히 검증하지 못했다. 확인과 추정의 경계는 여기다.

## 해법은 셋이다

서로 결이 다른 해법이 셋 있고, 셋 다 유효하다.

가장 먼저 넣은 것은 `globalThis` 싱글톤이다. 모듈 스코프 대신 `globalThis`에 상태를 고정하면, 모듈 팩토리가 한 번 돌든 몇 번 돌든 상태는 하나로 수렴한다.

```ts
// internal/shared.ts
const SHARED_KEY = Symbol.for('@my-scope/realtime-core.shared/v2')

function createShared() {
  return {
    socket: {client: null, state: {requestCallbacks: {}}},
    pendingRequests: new Map(),
  }
}

const g = globalThis as {[SHARED_KEY]?: ReturnType<typeof createShared>}

export const shared = (g[SHARED_KEY] ??= createShared())
```

키를 `Symbol()`이 아니라 `Symbol.for()`로 만드는 것이 핵심이다. `Symbol()`은 모듈 사본마다 다른 심볼이 되어 방어가 무력해지고, `Symbol.for()`는 전역 심볼 레지스트리에서 같은 문자열이 항상 같은 심볼을 돌려주므로 어느 사본이 실행되든 같은 슬롯을 본다. 키에 메이저 버전을 넣어두는 것도 권하고 싶다. `globalThis`는 모듈 시스템보다 스코프가 넓어서, 소비자 앱에 이 패키지의 v2와 v3가 공존하게 되면 서로 다른 버전의 구현이 같은 상태 객체를 만지는 사고가 날 수 있기 때문이다.

이 방식은 중복 로드 자체를 막지는 않고 상태 분열만 막는 방어라는 점은 분명히 해두어야 한다. 그래도 이번 사건에서 가치가 증명됐다. 기전을 규명하기 전에 이 방어부터 넣었는데, 원인을 모르는 상태에서도 증상이 사라졌다. 앞에서 실패 모드만 바꿨던 증상 지점의 가드와 달리, 상태 자체를 한 슬롯으로 수렴시키는 방어라서 분열이 어떤 경로로 오든 막히기 때문이다.

원인 제거 쪽은 순환 import 끊기다. `checkStatus`가 `socket`을 import하지 않도록, 상태를 인자로 받게 바꾸면 순환이 사라진다.

```ts
// 순환을 만드는 형태
import socket from '../socket'
export const isSocketOpen = () => socket.client?.readyState === WebSocket.OPEN

// 순환을 끊은 형태
export const isSocketOpen = (socket: SocketState) =>
  socket.client?.readyState === WebSocket.OPEN
```

다만 이 패키지처럼 중앙 상태를 거의 모든 모듈이 참조하는 구조에서는 순환이 다시 생기기 쉽다. 하나를 끊었다고 끝나는 문제가 아니라서, 순환 제거는 진행하되 방어와 별개로 두는 것이 맞다고 생각한다.

마지막은 Next.js 16.3.1 이상으로 올리는 것이다. 등록 순서를 교정하는 수정이 들어 있고, 우리 산출물 기준으로 등록 4개가 이탈 지점 앞으로 올라오는 것까지 앞 절에서 확인했다. 부수 비용이 하나 있었는데, 재현 환경에서는 버전만 올리자 번들러와 무관하게 잠복해 있던 타입 오류가 먼저 터져 나왔다. 업그레이드에는 이런 정리가 선행된다.

그러면 업그레이드하고 나서 `globalThis` 방어를 걷어내도 될까. 걷어내지 않기로 했다. 라이브러리는 소비자의 번들러와 프레임워크 버전을 통제할 수 없다. 16.2 라인에는 backport가 없으니 16.2에 머무는 소비자는 여전히 결함 위에 있고, 번들러의 모듈 병합은 모듈 그래프 전체 형상에 의존하는 최적화라 같은 계열의 다음 결함이 어떤 조합에서 나올지 예측하기 어렵다. 모듈이 몇 벌로 로드되든 상태를 하나로 수렴시키는 방어는, 내가 아는 범위에서는 이것뿐이다. 산출물 스냅샷 검사나 객체 동일성 스모크 테스트는 결함을 탐지할 수는 있어도 증상을 막지는 못한다. "패키지가 싱글톤을 갖는다면 `globalThis`에 고정한다"를 컨벤션으로 두는 편이 현실적이라는 것이 이번 사건의 결론이다.

한 가지 덧붙이면, 이 방어를 코드에 남길 때는 "이것은 워크어라운드가 아니라 설계 판단"이라는 주석이나 문서를 같이 남겨두는 것이 좋다. 그렇지 않으면 몇 달 뒤 누군가 "upstream이 고쳐졌으니 이 전역 제거하자"는 PR을 올리고, 맥락을 모르는 리뷰어가 승인하는 경로가 열린다.

## 남는 것들

기술적인 결론은 위에서 끝났는데, 이 조사가 하루짜리가 된 이유는 따로 정리해둘 가치가 있다. 원인이 어려워서가 아니라 관측이 계속 거짓말을 했기 때문이다.

가장 큰 것은 이미 쓴 대로 용의자 선정의 실패인데, 그 뿌리에 "버그는 당연히 내 코드에 있다"는 직감이 있었다. 이 직감은 십중팔구 옳아서, 프레임워크와 번들러는 애초에 용의선상에 오르지도 않았다. 그래서 코드상 불가능한 관측을 앞에 두고도 의심의 방향이 계속 안쪽(내 소스, 내 계측, 내 설정)만 향했고, 가장 최근에 바뀐 것(프레임워크 버전)은 검증 없이 용의선상에서 내려갔다. 관측이 불가능해 보이면 보일수록 "내가 뭘 잘못 읽었겠지"로 회귀해 같은 소스만 계속 다시 읽게 되는데, 정작 답은 소스 바깥(번들 산출물)에 있었다. 경험칙이 대개 옳다는 사실이 검증을 생략할 이유는 되지 않는다는 것, 특히 실험을 용의 목록에 올려보는 비용이 0일 때는 더욱 그렇다는 것을 배웠다.

디버그 로그도 거짓말을 했다. 수신 이벤트 로그가 응답 도착 27ms에 찍혀 있어서 "응답은 정상 수신·처리됐다"고 읽었는데, 그 로그는 콜백 유무와 무관하게 항상 찍히는 위치에 있었다. 실제로는 콜백을 못 찾았고 5초 뒤 타임아웃이었다. **수신 로그는 수신의 증거이지 처리의 증거가 아니다.** 로그를 읽을 때는 그 로그가 어느 분기 안에서 찍히는지까지 봐야 한다.

잘못된 반증도 했다. "스택트레이스 오프셋이 같으니 모듈은 한 벌"이라고 판단했는데, 같은 코드를 공유하면서 모듈 레코드만 별개일 수 있으므로 틀렸다. 방법의 한계를 사실로 취급한 오판이었고, 이 오판 때문에 정답(인스턴스가 두 벌)을 한 번 버렸다가 되찾았다.

반대로 이번에 얻은 무기도 있다. 배포본을 긁는 대신 **같은 조건(버전, 환경 변수, 번들러)으로 로컬 빌드하면 핵심 청크의 파일명까지 일치하는 산출물이 재현된다**는 것. upstream 이슈를 찾을 때는 내 증상의 어휘가 아니라 기전의 어휘(scope hoisting)로 먼저 훑어야 한다는 것. 그리고 "같은 청크에 있다"와 "같은 인스턴스다"는 다른 이야기라는 것이다. 번들러의 모듈 병합과 런타임의 모듈 레지스트리는 서로 다른 단계에서 일어나는 일이고, 한 청크 안에서도 접근 경로는 갈릴 수 있다.

모듈 스코프에 가변 상태(Map, Set, 레지스트리, 캐시)를 두고 export하는 패키지라면 어디든 같은 함정 위에 있다. 이번에 크게 터진 것은 상태가 많고 그 정합성이 곧 기능인 패키지였기 때문이지, 이 패키지가 특별해서가 아니다.

사족 하나. 실무를 잠시 떠나 있다가 오랜만에 복귀했는데, 돌아와서 처음 제대로 맞은 버그가 하필 이것이었다. app router를 처음 쓰던 시절 온갖 버그를 맞아가며 버전을 올리던 기억이 고스란히 되살아났고, 썩 즐거운 재회는 아니었다.

## 참고

- [vercel/next.js#96648 - Turbopack scope hoisting breaks React context identity](https://github.com/vercel/next.js/issues/96648)
- [vercel/next.js#96697 - \[turbopack\] Raise registration calls in hoisted modules to the top](https://github.com/vercel/next.js/pull/96697)
- [vercel/next.js#96691 - \[turbopack\] Don't scope hoist partial strongly connected components](https://github.com/vercel/next.js/pull/96691)
- [vercel/next.js#97308 - \[backport\] \[turbopack\] Raise registration calls in hoisted modules to the top](https://github.com/vercel/next.js/pull/97308)
- [webpack ModuleConcatenationPlugin (scope hoisting)](https://webpack.js.org/plugins/module-concatenation-plugin/)
