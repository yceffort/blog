---
title: '체결 한 건은 어떤 길로 <em>브라우저</em>까지 오는가'
tags:
  - networking
  - backend
  - browser
  - rust
published: true
date: 2026-11-23 13:14:00
series: '증권 체결 웹소켓 서버 만들기'
seriesOrder: 2
description: '체결 한 건이 서버에서 브라우저까지 지나는 길, 그 끝에서 로그인 없이 받을 수 있는 체결 프레임에서 읽을 수 있는 것, 그 길에 나오는 프로세스와 커널, 소켓 버퍼, epoll, 공유 메모리를 프론트엔드 개발자에게 익숙한 것에 빗대고 직접 재 본 값과 함께 정리한다.'
art:
  undraw: server-cluster
---

종목 화면의 가격은 매수 주문과 매도 주문의 가격이 맞아 체결이 생길 때마다 바뀐다. 이때 브라우저는 압축을 풀면 400바이트 남짓한 웹소켓 메시지를 받는다. 프론트엔드에서는 `onmessage` 핸들러가 받은 `MessageEvent`의 `data`를 읽으면 된다. 하지만 이 메시지를 어디서 만들었고 어떤 과정을 거쳐 보냈는지는 프론트엔드 코드만 봐서는 알 수 없다.

[증권 체결 웹소켓 서버 만들기](/series/websocket-trade-server) 시리즈의 두 번째 편에서는 체결 한 건이 브라우저에 도착하기까지의 과정을 따라가 본다. 먼저 그 길을 그림 하나로 그리고, 길의 끝에서 토스증권 웹 화면이 로그인 없이 받는 체결 프레임을 분석한다. 프레임만으로 확인할 수 없는 서버 내부는 내가 상상해서 직접 만든 서버를 기준으로 설명한다.[^1]

서버 내부의 길에는 프로세스와 커널, 소켓 버퍼, 공유 메모리처럼 프론트엔드 개발을 하면서 직접 다룰 일이 드문 운영체제 개념이 나온다. 이 개념들을 프론트엔드에서 익숙한 것에 빗대어 정리하고, 그 비용을 직접 재 본 값과 함께 살펴본다. 프록시와 로드 밸런서, 배포가 웹소켓 연결에 하는 일은 5편에서 다룬다.

## Table of Contents

## 체결 한 건이 지나는 길

서버 내부는 브라우저가 받는 프레임만으로는 볼 수 없으므로, 체결 시세를 다루는 시스템에서 흔히 쓰는 구성을 참고해 아래와 같이 만들었다. 굵은 선은 프레임으로 관찰한 구간이고 점선은 내가 상상해서 만든 구간이다.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=path" title="체결 한 건이 지나는 길. 번호는 아래 목록의 순서와 같다" height={665} />

체결 한 건은 다음 순서로 움직인다.

1. **feed 프로세스**가 거래소에서 체결을 받아 내부 형식으로 바꾼다. 내가 만든 서버에는 거래소가 없으므로 feed가 가짜 체결을 만든다.
2. feed는 체결을 **공유 메모리의 링 버퍼**에 쓴다. 링 버퍼는 끝까지 쓰면 처음으로 돌아가 덮어쓰는 고정 크기의 버퍼다.
3. **gateway 프로세스**는 사용자의 웹소켓 연결을 받는 프로세스다. 이 프로세스의 스레드 하나가 링을 읽는다.
4. gateway는 **구독 색인**에서 그 종목을 구독한 연결을 찾아, 연결마다 하나씩 있는 **큐**에 체결을 넣는다.
5. 연결을 맡은 **태스크**가 큐에서 체결을 꺼내 `MESSAGE` 프레임을 만들고 `send`를 호출한다.
6. **커널**이 그 바이트를 TCP로 보내고, 브라우저에서는 여러 탭이 함께 쓰는 SharedWorker가 받아 탭에 넘긴다.

**feed와 gateway**는 이 시리즈에서 만드는 시세 서버의 두 프로세스에 붙인 이름이다. [1편](/2026/11/websocket-trade-server-securities-basics#시세가-오는-길)에서 정리했듯 증권사는 거래소의 시세를 받아 자기 서버에서 앱과 웹으로 다시 보낸다. 체결이 생길 때마다 끊이지 않고 들어오는 이런 데이터를 피드라고 부르고, 바깥의 클라이언트가 시스템에 들어올 때 처음 붙는 서버를 게이트웨이라고 부른다(API 게이트웨이가 익숙한 예다). 두 이름은 여기서 따왔다. Socket.IO로 비유하면 브라우저가 붙는 Socket.IO 서버가 gateway이고, 외부에서 데이터를 받아 이 서버에 이벤트를 넘기는 별도의 워커가 feed다.

feed와 gateway를 프로세스 두 개로 나누면 하나가 종료돼도 다른 하나는 계속 실행할 수 있다. 두 프로세스가 다루는 연결의 성격도 다르다. 거래소와의 연결은 하나뿐이고 끊기면 모든 사용자의 화면이 멈춘다. 사용자 연결은 수가 많고, 개별 연결은 언제든 끊길 수 있다.

사용자 연결에는 Node.js로 만든 API 서버와 가장 크게 다른 점이 있다. 웹소켓 연결은 **상태를 가진 연결**이다. Express로 만든 API 서버가 사용자 정보를 데이터베이스나 Redis에 두고 요청마다 필요한 정보를 읽는다면, 다음 요청이 다른 서버로 가거나 그사이 서버가 재시작돼도 같은 결과를 돌려줄 수 있다. 이런 서버를 무상태(stateless) 서버라고 한다. 웹소켓 연결은 몇 시간씩 이어지고, 서버는 그동안 이 연결이 어떤 종목을 구독했는지와 다음 `message-id`가 몇 번인지를 자기 메모리에 보관한다. 프로세스가 끝나면 이 상태도 사라지고, 살아 있는 연결을 다른 서버로 옮길 수도 없다.

사용자 연결을 다루는 코드는 자주 바꾸고 배포할 텐데, 그때마다 거래소와의 연결까지 다시 맺고 싶지는 않다. 반대로 feed를 고쳐서 다시 띄울 때 사용자 1만 명의 웹소켓이 끊기는 것도 피하고 싶다. 프로세스를 나누면 사용자가 늘 때 gateway만 여러 개로 늘릴 수도 있다. 실제 구성은 5편에서 확인한다.

이 그림에서 밖에서 직접 볼 수 있는 구간은 굵은 선, 곧 브라우저가 받는 프레임뿐이다. 다음 절에서 그 프레임을 먼저 살펴보고, 그다음에 점선으로 그린 서버 내부로 들어간다.

## 프레임에서 읽을 수 있는 것

종목 페이지를 열고 Network 탭에서 WS만 걸러 보면 목록이 비어 있다. 이 화면에서는 SharedWorker가 소켓을 열기 때문이다. SharedWorker는 같은 출처의 여러 탭이 함께 쓰는 워커이고[^2], Chrome에서는 `chrome://inspect/#workers`에서 워커용 DevTools를 따로 열어야 그 안의 네트워크가 보인다. 나는 CDP(Chrome DevTools Protocol, DevTools가 브라우저와 주고받는 프로토콜)로 워커에 자동으로 붙어 핸드셰이크와 프레임을 기록하는 스크립트를 만들어 캡처했다.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=sw" title="탭 여러 개가 SharedWorker 하나의 웹소켓 연결을 함께 쓴다" height={303} />

탭을 하나 더 열어 봐도 웹소켓 연결은 하나였다. 둘째 탭의 구독은 같은 연결 위에서 다음 번호의 구독 id로 추가됐고, id는 0부터 30까지 한 번도 재사용되지 않았다. 둘째 탭이 열린 지 0.14초 뒤에는 첫째 탭이 쓰던 구독 13개 중 12개가 해지됐고, 둘째 탭을 닫은 지 0.14초 뒤에는 첫째 탭 종목의 구독이 다시 생겼다. 화면에 보이지 않는 탭의 구독은 해지하는 것으로 보인다. 서버에서 보면 연결 수는 탭 수가 아니라 브라우저 수이고, 구독과 해지는 사용자가 탭을 바꾸기만 해도 일어나는 흔한 일이다.

### 프레임 안의 프레임

DevTools가 한 줄로 보여 주는 메시지는 여러 단계로 포장되어 있다. 맨 바깥은 TCP가 나르는 바이트의 흐름이고, 그 안에 웹소켓 프레임이 있다. 웹소켓 메시지 하나는 프레임 여러 개로 나눠 보낼 수도 있고, 브라우저는 다시 합친 메시지의 데이터를 `onmessage`에 넘긴다.[^3]

**STOMP**는 Simple Text Oriented Messaging Protocol의 약자로, 클라이언트와 서버가 주고받을 메시지의 명령과 형식을 정한 프로토콜이다. 웹소켓으로 텍스트나 바이너리 데이터를 주고받을 수는 있지만, 그 데이터가 구독 요청인지 새 체결인지는 애플리케이션에서 정해야 한다. 이 글에서 살펴보는 서비스는 그 약속으로 STOMP를 쓴다.

예를 들어 클라이언트는 `SUBSCRIBE` 명령에 구독할 종목의 경로를 붙여 보내고, 서버는 새 체결이 생기면 `MESSAGE` 명령과 함께 체결 데이터를 보낸다. 이렇게 명령과 데이터를 정해진 형식으로 묶은 메시지 하나를 STOMP 프레임이라고 한다. 이 서비스는 체결 데이터를 JSON으로 만들어 `MESSAGE` 프레임의 본문에 담는다. 웹소켓에 STOMP가 필수인 것은 아니며, 애플리케이션이 메시지 형식을 직접 정해도 된다.

아래 그림은 메시지 하나가 웹소켓 프레임 하나에 담긴 경우의 포장 단계다.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=frame" title="메시지 하나가 웹소켓 프레임 하나에 담긴 경우의 포장 단계" height={385} />

웹소켓 연결은 HTTP 요청 하나로 시작한다. 캡처한 요청과 응답에서 연결의 성격을 정하는 헤더만 추리면 다음과 같다.

```text
GET /ws HTTP/1.1
Host: realtime-socket.tossinvest.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Version: 13
Sec-WebSocket-Protocol: v12.stomp, v11.stomp, v10.stomp
Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits

HTTP/1.1 101 Switching Protocols
upgrade: websocket
connection: upgrade
sec-websocket-protocol: v12.stomp
sec-websocket-extensions: permessage-deflate
```

`Sec-WebSocket-Protocol`은 웹소켓으로 메시지를 주고받을 때 사용할 프로토콜을 합의하는 헤더다. 여기서는 클라이언트가 STOMP의 세 버전을 제안했고 서버가 1.2를 골랐다.

웹소켓 프레임 자체의 헤더는 작다. 기본은 2바이트이고, 내용물이 126바이트 이상 65,535바이트 이하이면 길이를 2바이트에 더 적는다.[^4] 압축하지 않은 403바이트를 그대로 싣는다면 헤더는 4바이트이고, 압축해서 126바이트 아래로 줄어들면 2바이트다. 클라이언트가 보내는 프레임에는 4바이트짜리 마스킹 키가 더 붙는다. 명세가 클라이언트에게는 모든 프레임을 마스킹하라고 하고 서버에게는 마스킹하지 말라고 하기 때문이고[^5], 캡처에서도 보낸 프레임은 전부 마스킹되어 있었고 받은 프레임은 전부 아니었다.

`Sec-WebSocket-Extensions`의 `permessage-deflate`는 메시지를 압축해서 보내겠다는 합의다. CDP가 넘겨주는 프레임에는 압축을 푼 뒤의 텍스트만 들어 있어서, 실제로 오간 크기는 Chrome의 NetLog로 따로 기록했다. NetLog는 압축을 풀기 전의 프레임 헤더를 남기고, 그 헤더에는 프레임이 압축됐는지를 나타내는 비트(RSV1)와 페이로드 길이가 들어 있다.[^6] 11월 23일 장중에 같은 페이지를 25초 동안 다시 캡처해 보니, 서버가 보낸 프레임 1,529개가 모두 압축된 채 왔다. `MESSAGE` 1,509개의 크기 중앙값은 압축을 풀면 405바이트, 실제로 온 페이로드는 48바이트였다. 이 글에 적은 프레임 크기는 모두 압축을 푼 STOMP 텍스트의 바이트 수다.

이만큼 줄어드는 것은 앞선 메시지를 사전으로 이어 쓰기 때문이다. 체결 프레임은 키 이름과 종목 코드가 매번 같아서, 같은 프레임을 메시지마다 사전을 비우고 압축하면 중앙값이 292바이트까지만 준다. 서버의 응답에는 사전을 이어 쓰지 않겠다는 표시(`server_no_context_takeover`)가 없으므로 이어 쓰는 것이 허용된 상태이고[^7], 실제로도 이어 쓰고 있었다. 받은 프레임을 순서대로 zlib의 압축 수준 1(가장 빠른 설정)로 사전을 이어 가며 압축하면, 1,526개 모두 NetLog에 남은 크기와 같았다.[^8] 사전을 이어 쓰려면 연결마다 압축 상태를 메모리에 보관해야 한다. 이 메모리 비용은 4편에서 측정한다.

### 구독에서 체결까지

웹소켓 위에서 오가는 STOMP는 명령 한 줄, `키:값` 헤더 여러 줄, 빈 줄, 본문, 그리고 NUL 문자(아래에서는 `^@`로 적었다)로 프레임 하나를 만드는 텍스트 프로토콜이다.[^9] 이번 캡처에서는 주고받은 웹소켓 메시지 712건(heartbeat 제외)이 모두 STOMP 프레임을 정확히 하나씩 담고 있었다. 연결이 열린 뒤의 대화는 다음 순서로 진행된다.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=stomp" title="연결이 열린 뒤 STOMP 프레임이 오가는 순서" height={606} />

첫 프레임은 `CONNECT`다. 인증과 기기 식별에 쓰이는 값은 지웠다.

```text
CONNECT
device-id:<지움>
connection-id:00000000-0000-4000-8000-000000000000
authorization:<지움>
platform:Web/wts
accept-version:1.2,1.1,1.0
heart-beat:5000,5000

^@
```

```text
CONNECTED
version:1.2
heart-beat:5000,5000

^@
```

`connection-id`는 클라이언트가 만들어 보내는 UUID이고, 뒤에서 `MESSAGE`의 번호에 다시 나온다. `heart-beat:5000,5000`은 "나는 5초마다 살아 있다는 신호를 보낼 수 있고, 상대도 5초마다 보내 주길 바란다"는 뜻이다. 서버도 같은 값으로 답했고, 실제로 클라이언트와 서버가 5초마다 줄바꿈 한 글자를 보냈다. 체결이 없는 종목만 구독한 연결은 몇 분 동안 아무것도 오가지 않을 수 있는데, 이 신호가 없으면 연결이 조용한 것인지 끊어진 것인지 구분할 수 없다.

구독을 요청하는 프레임과 그 응답은 다음과 같다. 클라이언트는 구독마다 `id`를 직접 붙이고, `receipt` 헤더로 처리 확인을 요청한다.

```text
SUBSCRIBE
id:0
receipt:0-sub_receipt
destination:/topic/v1/kr/stock/trade/A005930

^@
```

```text
RECEIPT
receipt-id:0-sub_receipt
message:subscribe success
response-code:200

^@
```

그 뒤로는 체결이 생길 때마다 `MESSAGE`가 온다. 아래 프레임은 헤더와 키의 순서, 값의 자료형은 캡처한 그대로이고 값은 임의로 바꾼 것이다.

```text
MESSAGE
message-id:00000000-0000-4000-8000-000000000000-42
subscription:0
content-length:273
content-type:application/json

{"code":"A005930","dt":"2026-11-19T04:55:12Z","currency":"KRW","exchange":"krx","session":"REGULAR","base":70000,"close":70300,"volume":12,"tradeType":"BUY","changeType":"UP","tradingStrength":104.2857142857142857,"cumulativeVolume":8123456,"cumulativeAmount":571234567800}^@
```

본문의 키 13개가 각각 어떤 제도에서 나온 값인지는 [1편](/2026/11/websocket-trade-server-securities-basics)에서 다뤘다. 요약하면 다음과 같다.

| 키                                     | 예시 값                       | 뜻                                                                                  |
| -------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `code`                                 | `"A005930"`                   | 종목 코드(단축코드)                                                                 |
| `dt`                                   | `"2026-11-19T04:55:12Z"`      | 체결 시각. UTC이고 초 단위까지만 있다                                               |
| `currency`, `exchange`, `session`      | `"KRW"`, `"krx"`, `"REGULAR"` | 통화, 체결된 거래소(한국거래소 또는 넥스트레이드), 거래 시간 구간                   |
| `base`, `close`                        | `70000`, `70300`              | 기준가격(보통 전날 종가)과 이번 체결의 가격                                         |
| `volume`                               | `12`                          | 이번 체결의 수량                                                                    |
| `tradeType`, `changeType`              | `"BUY"`, `"UP"`               | 매수 체결인지 매도 체결인지, 기준가격보다 올랐는지 내렸는지(상한가면 `UPPER_LIMIT`) |
| `tradingStrength`                      | `104.2857142857142857`        | 체결강도(증권사 HTS의 지표). 유효 숫자가 최대 19자리까지 왔다                       |
| `cumulativeVolume`, `cumulativeAmount` | `8123456`, `571234567800`     | 그날 그 종목의 누적 거래량과 누적 거래대금                                          |

프론트엔드에서 눈여겨볼 값은 `tradingStrength`다. JavaScript의 숫자는 유효 숫자를 17자리 정도까지만 담을 수 있어서, 위 값을 `JSON.parse`로 읽으면 `104.28571428571429`가 된다. 캡처한 686건 중 640건은 `JSON.parse`를 거치면 자릿수가 바뀌었다.

이 값이 double(JavaScript 숫자의 형식)로 계산한 결과를 길게 출력한 것인지도 확인했다. 캡처에서 유효 숫자가 18자리 이상인 571건 중 568건은 가장 가까운 double을 같은 자릿수로 출력한 값과 달랐다.[^10] 이 자릿수로 어디서 계산했는지는 프레임만으로 알 수 없지만, 일반적인 `JSON.parse`와 `Number`로는 받은 자릿수를 보존할 수 없다는 점은 분명하다. 내가 만든 서버에서 이 자릿수를 유지한 방법은 3편에서 설명한다.

### 프레임이 알려 주는 서버의 상태

23.8초 동안 구독 12개로 받은 `MESSAGE` 686건에서 관찰한 내용을 정리했다. 마지막 열에는 같은 동작을 재현하기 위해 내가 고른 구현을 적었다. 같은 프레임을 만들 수 있는 방법은 여러 가지이므로, 실제 서버도 이렇게 만들었다고 볼 근거는 없다.

| 관찰한 것                                                             | 근거                                                                                              | 이 관찰을 재현하려고 내가 고른 구현                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `message-id`는 `connection-id` 뒤에 1부터 빠짐없이 느는 번호가 붙는다 | 686건이 1부터 686까지 이어졌다                                                                    | 연결마다 카운터를 하나 두고, 그 연결에 프레임을 쓰는 태스크 한 곳에서만 번호를 매긴다               |
| `MESSAGE`에는 `destination`이 없고 `subscription`만 있다              | 모든 프레임의 헤더가 위 네 개뿐이다                                                               | 연결마다 구독 id가 어느 종목을 가리키는지 저장한다                                                  |
| 같은 종목을 두 번 구독하면 같은 체결이 두 번 온다                     | id 0과 id 11이 같은 종목이었고, 체결 207건이 연속한 번호의 프레임 두 개로 왔다                    | 구독자 목록을 종목 단위가 아니라 구독 단위로 만든다                                                 |
| 체결마다 모든 필드가 온다                                             | 국내 종목은 키 13개, 미국 종목은 15개가 매번 같은 순서로 왔다. 프레임 크기의 중앙값은 403바이트다 | 누적 거래량과 누적 거래대금은 feed가 종목마다 계산해 체결에 담고, gateway는 받은 값을 그대로 옮긴다 |
| 이번 캡처에서는 구독 직후에 현재 값이 오지 않았다                     | 구독을 요청한 뒤 첫 `MESSAGE`까지 0.16초에서 10.8초가 걸렸고, 구독 3개는 한 건도 받지 못했다      | 구독 직후에는 아무것도 보내지 않고 다음 체결을 기다린다                                             |

표의 첫째 줄에 있는 번호는 이 연결에서 나간 메시지의 순서를 나타낸다. 서버가 빈틈없이 번호를 매긴다고 보장한다면, 중간 번호가 빠졌을 때 번호를 붙인 이후에 메시지가 누락됐다는 것을 알아챌 수 있다. 하지만 번호를 붙이기 전에 잃은 체결이나 재접속하는 동안 놓친 체결은 알 수 없다. 내가 만든 서버에서도 gateway가 링에서 뒤처져 체결을 건너뛰면, 송신 태스크는 남은 메시지에 연속해서 번호를 붙인다.[^11][^12]

STOMP 명세도 `message-id`의 고유성만 요구하며 연속 증가는 요구하지 않는다.[^13] 따라서 이 번호는 이번 캡처에서 관찰한 연결 안의 메시지 순번으로 봐야 한다. 체결 유실을 검증하는 번호로 쓸 수는 없다. 체결 시각이 초 단위여서 같은 초의 여러 체결은 수신 순서로만 구분할 수 있지만, 이 순서가 거래소의 체결 순서와 일치하는지도 프레임만으로는 알 수 없다.

이번 캡처에서는 구독 직후 현재 가격을 보내 주는 프레임이 없었다. 따라서 화면에 처음 보이는 가격은 다른 경로로 받아야 한다. 이후에 도착하는 체결 프레임에는 화면을 그리는 데 필요한 값이 모두 들어 있으므로, 클라이언트는 마지막 프레임만 있으면 된다. 이전 프레임을 기억해 뒀다가 합칠 필요가 없다.

`destination` 헤더가 없는 것은 명세와 다르다. STOMP 1.2는 `MESSAGE` 프레임이 이 헤더를 반드시 포함해야 한다고 규정한다.[^13] 이 헤더가 있었다면 `destination:/topic/v1/kr/stock/trade/A005930`과 줄바꿈까지 45바이트가 프레임마다 더 붙는다. 압축 전 403바이트 프레임의 11%에 해당하는 크기다. 다만 앞에서 본 대로 서버는 사전을 이어 쓰며 압축하므로, 매번 같은 이 헤더는 전송량을 거의 늘리지 않는다. 11월 23일 캡처의 `MESSAGE` 1,509건에 이 헤더를 넣고 서버와 같은 설정으로 압축하면 크기의 중앙값은 48바이트 그대로이고 전체는 1.6% 늘었다.[^14] 전송량을 줄이려고 뺐다고 보기는 어렵고, 뺀 이유는 프레임만으로 알 수 없다.

구독 확인(`RECEIPT`)은 항상 그 구독의 첫 `MESSAGE`보다 먼저 왔고, 해지 확인이 온 뒤에는 그 구독의 `MESSAGE`가 한 건도 오지 않았다. 구독자 목록을 고치는 일과 프레임을 보내는 일이 서로 다른 스레드에서 일어난다면, 두 작업의 순서를 맞춰야 이 동작을 지킬 수 있다. 내가 만든 서버에서 이 순서를 맞춘 방법은 3편에서 설명한다.

## 서버 내부에 나오는 운영체제 개념

여기부터는 그림의 점선, 곧 서버 내부다. feed가 쓴 체결은 공유 메모리를 통해 gateway로 전달된다. gateway에서는 스레드 몇 개가 연결 1만 개를 나눠 맡고, 각 연결로 보낼 체결을 시스템 콜로 커널에 넘겨 소켓 버퍼에 넣는다. 이 과정의 비용을 재기 전에, 이 글과 다음 두 편에 계속 나오는 운영체제 개념 네 가지를 프론트엔드에서 익숙한 것에 빗대어 정리한다. 이미 아는 내용이라면 다음 절로 넘어가도 된다.

**프로세스**는 실행 중인 프로그램 하나다. 프로세스마다 자기만의 메모리 공간이 있고, 다른 프로세스의 메모리는 읽을 수도 쓸 수도 없다. Chrome에서 탭 하나가 멈춰도 다른 탭이 멀쩡한 것은 Chrome이 사이트마다 프로세스를 따로 띄우기 때문이다.

**스레드**는 프로세스 안에서 코드를 실행하는 흐름이다. 프로세스 하나에 스레드가 여러 개 있을 수 있고, 코어가 여러 개면 실제로 동시에 실행된다. 프론트엔드에서는 Web Worker를 떠올리면 이해하기 쉽다. 다만 워커끼리 값을 주고받는 방식에는 차이가 있다. `postMessage`로 일반 객체를 보내면 복사본이 전달된다. `ArrayBuffer`는 복사 대신 소유권을 넘길 수 있고, 교차 출처 격리(cross-origin isolation)를 갖춘 페이지에서는 `SharedArrayBuffer`로 메모리를 함께 쓸 수도 있지만, 따로 지정하지 않으면 복사다.[^15] 운영체제의 스레드는 같은 프로세스의 메모리를 기본으로 공유한다. 두 스레드가 같은 변수를 동시에 고칠 수 있으므로, 메인 스레드에서만 JavaScript를 실행할 때와는 달리 접근 순서를 신경 써야 한다.

**커널**은 운영체제의 중심에 있는 프로그램으로, CPU 시간과 메모리, 네트워크 카드 같은 하드웨어를 프로세스들에게 나눠 준다. 어느 스레드를 어느 코어에서 실행할지도 커널이 정한다.

**시스템 콜**은 프로세스가 커널에 하는 요청이다. 프로세스는 네트워크 카드나 디스크에 직접 손댈 수 없어서, 데이터를 보내거나 파일을 열려면 커널에 요청해야 한다. 코드에서는 함수 호출처럼 보이지만, CPU가 프로세스의 코드를 실행하던 상태(사용자 모드)에서 커널의 코드를 실행하는 상태(커널 모드)로 넘어갔다가 돌아와야 해서 더 비싸다. JavaScript에서 DOM API를 호출하면 엔진 밖으로 나갔다 와야 해서 순수한 함수 호출보다 느린 것과 비슷하다. 이 글에 나오는 `send`, `recv`, `mmap`이 모두 시스템 콜이다.

여기까지의 네 개념을 한 그림으로 그리면 다음과 같다.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=os" title="프로세스 두 개와 커널. 프로세스끼리는 서로의 메모리를 볼 수 없고, 하드웨어가 필요하면 시스템 콜로 커널에 요청한다" height={524} />

## 시스템 콜 한 번의 비용

**소켓**은 네트워크 연결의 한쪽 끝이다. 브라우저에서 `new WebSocket(url)`을 실행하면 서버와 TCP 연결이 하나 만들어지고, 서버 프로세스에는 그 연결을 가리키는 소켓이 하나 생긴다. 프로세스는 소켓을 **파일 디스크립터**(fd)라는 정수로 다룬다. fd는 그 프로세스가 열어 둔 파일과 소켓의 목록에서 몇 번째인지를 가리키는 번호이고, 목록 자체는 커널이 관리한다.

먼저 gateway에 연결 1,000개를 붙여 놓고 운영체제의 도구로 스레드와 소켓 수를 세어 봤다.

| 센 것          | 값      | 센 방법                                 |
| -------------- | ------- | --------------------------------------- |
| 스레드         | 12개    | `ps -M -p <pid>`                        |
| 열려 있는 소켓 | 1,001개 | `lsof -a -p <pid>`에서 종류가 IPv4인 것 |

연결이 1,000개인데 스레드는 12개뿐이다. 코어 10개에 맞춰 만든 워커 스레드 10개, 링을 읽는 스레드 1개, 프로그램을 시작한 스레드 1개다. 적은 스레드로 많은 연결을 처리하는 방법은 뒤에서 살펴본다.

소켓 1,001개는 연결 1,000개와 새 연결을 기다리는 소켓 1개다. 소켓 하나가 fd 하나이므로, 연결을 많이 받으려면 프로세스가 열 수 있는 fd 수의 한도(`ulimit -n`)부터 올려야 한다. 같은 목록에는 kqueue라는 종류의 fd도 3개 있었다. 이것도 여러 연결을 기다리는 데 쓰이며, 뒤에서 함께 설명한다.

프로세스가 프레임을 내보낼 때는 `send` 시스템 콜을 사용한다. 한 번 호출하는 과정은 다음과 같다.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=send" title="send 시스템 콜을 한 번 호출할 때 일어나는 일" height={401} />

시스템 콜이 함수 호출보다 얼마나 비싼지 직접 쟀다. 같은 프로그램 안에서 네 가지 일을 수백만 번씩 반복하고, 반복 전체에 걸린 시간을 횟수로 나눠 한 번의 평균을 구했다.[^16]

| 한 번에 하는 일                                  | 맥      | Linux |
| ------------------------------------------------ | ------- | ----- |
| 함수 호출                                        | 1.7ns   | 1.6ns |
| 가벼운 시스템 콜(`fstat`, 열린 파일의 정보 읽기) | 240ns   | 202ns |
| 공유 메모리 링에 체결 레코드(63바이트) 쓰기      | 30ns    | 37ns  |
| TCP 소켓에 프레임(370바이트) `send`              | 1,915ns | 381ns |

커널에 다녀오기만 하는 가벼운 시스템 콜도 함수 호출보다 100배 넘게 비싸다. `send`는 커널에 들어간 뒤 프레임을 복사하고 TCP 처리도 해야 하므로 더 오래 걸렸다. 같은 기계에서도 `send`는 맥이 Linux보다 5배 느렸지만, 어느 운영체제에서든 함수 호출보다 200배 넘게 비싸다는 점은 같다.

공유 메모리 링에 쓰는 비용도 표에 넣었지만, 이 값과 `send`를 곧바로 비교할 수는 없다. 링은 읽는 프로세스 없이 쓰기 비용만 잰 것이다. 읽는 비용과 기다리는 시간이 빠져 있고, 데이터 크기도 `send`에 쓴 프레임과 다르다.

연결이 많아지면 이 비용이 쌓인다. 연결 1만 개가 같은 종목을 구독하고 있으면 체결 한 건을 소켓 1만 개에 각각 써야 한다. 내가 만든 gateway는 프레임마다 쓰기를 요청하므로[^17] 체결 한 건에 쓰기 요청이 1만 번 생긴다. 요청 하나가 실제로 `send`를 몇 번 호출하는지는 송신 버퍼의 상태와 묶어 쓰는 방식에 따라 다르다.

요청 하나가 `send` 한 번이라고 가정하고, 소켓 하나에 연달아 쓴 평균 시간에 1만을 곱하면 맥에서 19ms, Linux에서 4ms 가까이 된다. 체결 한 건을 내보내는 데 연결 수에 비례해 밀리초 단위의 시간이 든다. 다만 소켓 1만 개에 나눠 쓰는 조건에서 잰 값이 아니고 CPU가 일한 시간만 따로 잰 것도 아니므로, 규모를 가늠하는 값으로만 쓴다.

4편에서 Linux로 잰 실제 지연도 같은 방향이었다. 연결이 1만 개일 때 프레임의 절반은 체결이 기록된 지 13.4ms 안에 클라이언트에 도착했고, 연결이 100개일 때는 0.2ms 안에 도착했다. 이 지연 가운데 `send`가 얼마를 차지하는지는 위의 곱셈으로 알아낼 수 없고, 4편에서 따로 측정한다.

## 소켓과 버퍼

**버퍼**는 데이터가 다음 단계로 넘어가기 전에 잠시 머무는 메모리다. 커널은 소켓마다 보낼 데이터를 쌓아 두는 송신 버퍼와 받은 데이터를 쌓아 두는 수신 버퍼를 둔다. `send`는 보낼 바이트를 송신 버퍼에 복사해 넣는 호출이고, 성공했다면 커널이 반환값만큼의 바이트를 받아들인 것이다.

`send`로 송신 버퍼에 넣은 바이트는 커널이 TCP의 규칙에 따라 전송한다. 전송이 반드시 `send`가 돌아온 뒤에 시작되는 것은 아니다. Linux는 송신 버퍼에 복사한 뒤 `send`가 돌아오기 전에 전송을 시도한다. 상대가 더 받을 수 없는 상태라면 TCP의 규칙에 따라 전송을 뒤로 미룬다.[^18] 어느 경우든 `send`가 돌아왔다는 사실만으로 상대 애플리케이션이 받았다고 볼 수는 없다.

받는 기계에서도 커널이 먼저 수신 버퍼에 쌓아 두고, 애플리케이션이 `recv`로 가져간다. 프레임 하나는 서버 프로세스의 메모리에서 서버 커널의 송신 버퍼로, 네트워크를 건너 사용자 기계 커널의 수신 버퍼로, 다시 브라우저의 메모리로 옮겨진다.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=buf" title="프레임 하나가 두 기계의 버퍼를 거쳐 가는 길" height={308} />

TCP가 그 사이에서 해 주는 일은 세 가지다. 바이트가 보낸 순서대로 도착하게 하고, 중간에 잃어버린 것은 다시 보내고, 받는 기계가 감당할 수 있는 만큼만 보낸다. 셋째가 위 그림의 점선이다. 받는 커널은 수신 버퍼에 남은 공간을 응답에 실어 계속 알려 주고, 보내는 커널은 그 공간을 넘겨서 보내지 않는다.

### 읽지 않는 상대에게 보내기

받는 애플리케이션이 `recv`를 호출하지 않으면 수신 버퍼가 찬다. 남은 공간이 0이라는 것을 알게 된 보내는 커널이 전송을 멈추면 이번에는 송신 버퍼가 찬다. 그러면 `send`는 공간이 생길 때까지 멈추거나, 기다리지 않도록 설정한 소켓에서는 더 넣을 곳이 없다는 오류를 바로 돌려준다.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=bp" title="읽지 않는 상대에게 계속 send하면 일어나는 일" height={347} />

이렇게 수신자가 읽지 못해 보내는 프로세스까지 멈추게 되는 현상을 백프레셔라고 부른다. Node.js로도 확인할 수 있다. 아래 스크립트는 한 바이트도 읽지 않는 상대에게 403바이트 프레임을 계속 보내고, 커널이 받아 준 프레임이 몇 개인지 센다.

```js
import net from 'node:net'

const frame = Buffer.alloc(403, 'x')
// 받는 프로그램: 연결은 받지만 한 바이트도 읽지 않는다
const server = net.createServer({pauseOnConnect: true}, () => {})

server.listen(0, '127.0.0.1', () => {
  const client = net.connect(server.address().port, '127.0.0.1')
  let accepted = 0
  let last = Date.now()
  // write의 콜백은 그 데이터가 커널의 송신 버퍼로 넘어갔을 때 불린다
  const send = () =>
    client.write(frame, () => {
      accepted++
      last = Date.now()
      send()
    })
  client.on('connect', send)

  setInterval(() => {
    if (Date.now() - last < 1000) return
    console.log(
      `프레임 ${accepted}개(${accepted * frame.length}바이트)까지 받고 멈췄다`,
    )
    process.exit(0)
  }, 100)
})
```

```text
프레임 1365개(550095바이트)까지 받고 멈췄다
```

이 글을 쓴 맥에서 세 번 돌려 세 번 모두 1,365개였다. 송신 버퍼와 수신 버퍼가 합쳐서 55만 바이트를 받아 준 뒤 더는 받지 않았다. 두 버퍼의 기본 크기는 각각 131,072바이트지만(`sysctl net.inet.tcp.sendspace`, `net.inet.tcp.recvspace`) 커널이 필요에 따라 4,194,304바이트까지 키울 수 있게 되어 있어서(`net.inet.tcp.autosndbufmax`) 기본값의 합보다 많이 들어갔다.

브라우저에서는 `WebSocket.bufferedAmount`로 송신이 밀린 정도를 볼 수 있다. `send()`로 넣었지만 아직 네트워크로 나가지 못한 바이트 수다.[^19] 위 스크립트에서 커널이 더 받지 못하는 상태로 `write`를 계속 호출하면 Node.js가 데이터를 자기 메모리에 쌓는다. 브라우저에서도 아직 보내지 못한 데이터가 쌓이고, 그 양이 `bufferedAmount`로 보인다.

연결이 1만 개라면 그중 일부가 느려질 때 어떻게 처리할지 정해야 한다. 해당 연결로 보낼 데이터를 메모리에 계속 쌓아 두거나, 버리거나, 연결을 끊을 수 있다. 압축하지 않고 프레임을 보내는 내 서버에서, 초당 체결이 15건인 종목이라면 프레임 1,365개는 91초 분량이다. 91초 동안 읽지 않은 클라이언트를 위해 그 이후의 체결도 보관할지 판단해야 한다. 내가 고른 방법은 3편에서 설명하고, 읽지 않는 클라이언트를 일부러 섞어 잰 결과는 4편에서 다룬다.

### 작은 프레임과 Nagle 알고리즘

TCP에는 작은 데이터를 바로 보내지 않고 모았다가 보내는 Nagle 알고리즘이 기본으로 켜져 있다. 키보드 입력처럼 몇 바이트짜리 `send`가 연달아 올 때 패킷 수를 줄이려는 장치다. 체결 프레임은 400바이트 안팎으로 작고 하나하나가 빨리 도착해야 하므로, 이렇게 모아서 보내면 지연이 생길 수 있다. 소켓에 `TCP_NODELAY` 옵션을 켜면 Nagle 알고리즘이 꺼지고, 데이터가 적어도 가능한 한 바로 보낸다.[^20] gateway는 연결을 받자마자 이 옵션을 켠다. 해당 코드는 다음 절에 나온다.

## 연결 1만 개를 기다리는 방법

`recv`는 기본적으로 읽을 것이 올 때까지 돌아오지 않는다. 그동안 그 스레드는 멈춰 있다. 그래서 가장 단순한 서버는 연결마다 스레드를 하나씩 만들고 각자 `recv`에서 기다리게 한다.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=thr" title="연결마다 스레드를 하나씩 두는 서버" height={242} />

연결이 수백 개일 때는 이 방식으로 충분하다. 1만 개가 되면 스레드도 1만 개가 필요한데, 스레드마다 스택으로 쓸 메모리를 따로 잡아야 하고(Rust 표준 라이브러리의 기본값은 2MiB다[^21]) 커널이 스레드를 번갈아 실행시키는 비용도 든다. 게다가 체결 시세 서버의 연결은 대부분의 시간 동안 클라이언트에게서 받을 것이 없다. 스레드 1만 개가 거의 내내 자고 있게 된다. 서버 한 대로 동시 연결 1만 개를 받는 방법은 1999년부터 "C10K 문제"라는 이름으로 불렸다.[^22]

스레드를 늘리는 대신, 커널이 읽거나 쓸 수 있는 소켓을 알려 주게 할 수도 있다. 소켓을 읽을 것이 없으면 바로 돌아오는 모드(논블로킹)로 바꾸고, 확인할 fd를 커널에 등록한다. Linux의 epoll[^23]과 macOS의 kqueue는 등록된 fd 중 읽거나 쓸 수 있게 된 것의 목록을 돌려준다. 스레드 하나가 이 목록을 받아 차례로 처리하고, 처리할 것이 없을 때만 커널 안에서 잠든다. 앞에서 gateway의 fd를 셀 때 나온 kqueue 3개도 이 용도로 쓰인다.

이 구조가 이벤트 루프다. Node.js가 스레드 하나로 연결 수만 개를 받는 것도 libuv가 epoll과 kqueue를 감싸 이 루프를 돌리기 때문이고[^24], 큐에서 일을 꺼내 실행하고 큐가 비면 기다린다는 점에서 브라우저의 이벤트 루프와도 구조가 같다.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=ep" title="커널이 준비된 소켓을 알려 주고, 적은 수의 워커 스레드가 태스크를 실행한다" height={367} />

내가 만든 gateway는 Rust의 비동기 런타임인 tokio를 쓴다. 새 연결을 받는 코드는 다음이 전부다.[^25]

```rust
tokio::spawn(async move {
    let mut conn = 0;
    loop {
        match listener.accept().await {
            Ok((stream, _)) => {
                conn += 1;
                // 작은 프레임을 하나씩 flush하므로 Nagle이 켜져 있으면 상대의 지연 ACK를 기다린다. 실패해도 지연만 늘어난다.
                let _ = stream.set_nodelay(true);
                let (heartbeat_ms, queue_capacity) = (config.heartbeat_ms, config.queue_capacity);
                tokio::spawn(connection::serve(stream, accept_hub.clone(), heartbeat_ms, queue_capacity, conn));
            }
            Err(error) => {
                eprintln!("accept 실패: {error}");
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            }
        }
    }
});
```

`listener.accept().await`는 새 연결이 올 때까지 이 함수를 멈춰 두고, 그동안 스레드는 다른 일을 한다. `tokio::spawn`은 `async` 함수를 런타임에 맡겨 따로 실행시키는 호출이고, 이렇게 맡겨진 실행 하나를 **태스크**라고 부른다. `await`에서 멈췄다가 준비되면 이어서 실행된다는 점은 JavaScript의 `async` 함수와 같다. gateway는 연결 하나에 태스크 하나를 만든다.

JavaScript와 다른 점은 루프를 도는 스레드가 여러 개라는 것이다. tokio는 기본 설정에서 CPU 코어 수만큼 워커 스레드를 띄우고, 한가한 워커가 바쁜 워커의 일을 가져가 실행한다.[^26]

|                           | 브라우저 메인 스레드의 JavaScript | gateway의 tokio             |
| ------------------------- | --------------------------------- | --------------------------- |
| 이벤트를 기다리는 곳      | 브라우저 내부                     | 커널의 epoll, kqueue        |
| 루프를 도는 스레드        | 메인 스레드 1개                   | 코어 수만큼. 이 맥에서 10개 |
| 일의 단위                 | 콜백, `async` 함수                | 태스크                      |
| 두 일이 동시에 실행되는가 | 아니다                            | 그렇다                      |
| 공용 데이터를 지키는 장치 | 필요 없다                         | 필요하다                    |

연결이 1만 개여도 스레드는 코어 수만큼이고, 태스크 하나가 쓰는 메모리는 스레드의 스택보다 훨씬 작다. 4편에서 잰 값으로는 연결 하나에 13KB였다.

워커가 여러 개면 여러 코어를 쓸 수 있지만, 두 태스크가 서로 다른 워커에서 동시에 실행될 수도 있다. 따라서 구독자 목록 같은 공용 데이터를 아무 태스크나 고치게 두면 안 된다. 3편에서 구독 색인을 태스크 하나만 수정하도록 만든 이유다.

태스크가 `await` 없이 오래 걸리는 일을 하면 그 워커는 다른 태스크를 실행하지 못한다. JavaScript에서 긴 동기 작업이 메인 스레드를 막는 것과 같다. 4편에서는 워커 10개가 모두 `send` 시스템 콜 안에서 멈춰 있던 상황을 측정 결과로 확인한다.

## 프로세스끼리 메모리 나눠 쓰기

**가상 메모리**는 프로세스마다 자기만의 주소 공간을 갖게 하는 장치다. 프로세스가 쓰는 메모리 주소는 실제 메모리의 주소가 아니고, 그 주소가 실제 메모리의 어디에 해당하는지는 커널이 **페이지**라는 고정 크기의 조각 단위로 표에 적어 관리한다. 프로세스마다 표가 달라서 서로의 메모리를 볼 수 없는데, 두 프로세스의 표에 같은 페이지를 연결해 주면 그 부분만은 함께 볼 수 있다. 이것이 공유 메모리이고, 프론트엔드에서는 `SharedArrayBuffer`가 가장 가깝다.

feed와 gateway는 같은 파일을 공유 메모리로 연결해 체결을 주고받는다. 파일을 프로세스의 주소 공간에 연결해 달라고 커널에 요청하는 시스템 콜이 `mmap`이다. 두 프로세스가 같은 파일을 공유 모드로 `mmap` 하면 두 프로세스의 표에 같은 실제 페이지가 연결된다. 한 프로세스가 쓴 내용을 다른 프로세스에서도 볼 수 있는 이유다.[^27] 연결은 페이지 단위로 이루어지며, 이 글을 쓴 맥에서 페이지 하나는 16,384바이트다(`getconf PAGESIZE`).

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=mm" title="두 프로세스가 같은 파일을 mmap 해서 같은 페이지를 본다" height={327} />

feed는 읽고 쓸 수 있게, gateway는 읽기만 할 수 있게 같은 파일을 연결한다.[^28]

```rust
pub fn map(file: &File) -> io::Result<Region> {
    Ok(Region::File(MmapRaw::map_raw(file)?))
}

pub fn map_read_only(file: &File) -> io::Result<Region> {
    Ok(Region::File(MmapOptions::new().map_raw_read_only(file)?))
}
```

공유 메모리에 쓴 값은 파일을 읽어서도 확인할 수 있다. feed를 띄워 놓고 링 파일의 앞 32바이트를 2초 간격으로 두 번 읽어 봤다.

```text
$ wc -c < ws-trade-feed.ring
 1048640

$ xxd -l 32 ws-trade-feed.ring
00000000: 5753 5249 4e47 3031 0000 1000 0000 0000  WSRING01........
00000010: 2807 0000 0000 0000 2807 0000 0000 0000  (.......(.......

$ xxd -l 32 ws-trade-feed.ring
00000000: 5753 5249 4e47 3031 0000 1000 0000 0000  WSRING01........
00000010: b80f 0000 0000 0000 b80f 0000 0000 0000  ................
```

첫 줄은 이 파일이 링이라는 표시(`WSRING01`)와 데이터 영역의 크기(1,048,576바이트)이고 변하지 않는다. 둘째 줄의 두 숫자는 feed가 어디까지 썼는지를 나타내는 위치로, 2초 사이에 1,832에서 4,024로 늘었다. feed는 체결을 쓸 때 파일에 쓰는 시스템 콜을 부르지 않는다. 링 파일을 새로 만들 때만 머리말을 파일에 쓰고, 체결은 매핑된 메모리에 값을 저장한다.[^29] 자기 메모리에 값을 썼을 뿐인데, 그 메모리가 이 파일과 같은 페이지라서 파일을 읽는 도구에도 바뀐 값이 보인다. gateway가 보는 것도 같은 페이지다.

### 복사와 공유

워커에 일반 객체를 `postMessage`로 보내면 보내는 스레드가 값을 직렬화하고, 받는 스레드가 그 값으로 복사본을 만든다. 프로세스끼리 소켓으로 데이터를 주고받을 때도 복사가 필요하며, 시스템 콜과 커널 버퍼를 거친다.

`SharedArrayBuffer`를 쓰면 두 스레드가 복사 없이 같은 메모리를 볼 수 있다. 프로세스끼리 `mmap`으로 메모리를 공유하는 것도 이와 비슷하다. 한번 연결해 두면 그 뒤로는 시스템 콜 없이 메모리를 쓰고 읽는 것으로 데이터를 주고받는다.

소켓을 공유 메모리로 바꾸면 송수신 시스템 콜을 줄일 수 있다. feed와 gateway 사이에는 모든 체결이 지나간다. 소켓을 쓰면 보내는 프로세스가 `send`를, 받는 프로세스가 `recv`를 호출해야 하지만 공유 메모리를 쓰면 이 호출이 필요 없다.

몇 번을 줄일 수 있는지는 묶어서 처리하는 방식에 따라 달라진다. TCP는 바이트를 순서대로 이어 나르는 흐름이라서 체결 하나가 호출 하나에 대응하지 않는다.[^30] 여러 체결을 한 번의 `send`로 보내거나 한 번의 `recv`로 읽을 수 있고, 체결 하나를 두 번에 나눠 읽을 수도 있다. 앞의 측정에서도 읽는 스레드는 64KiB 버퍼로 한 번에 읽을 수 있는 만큼 읽었다.[^16]

앞의 표에서 링에 쓰는 비용은 30ns였다. 다만 읽는 프로세스 없이 쓰기 비용만 잰 값이므로, 체결을 전달하는 데 걸리는 시간으로 볼 수는 없다. 실제 gateway는 링이 비어 있으면 200us(기본값)를 잤다가 다시 확인한다.[^11] 따라서 체결이 gateway에 닿기까지의 지연은 쓰기 비용보다 폴링 간격에 좌우된다. 폴링 간격에 따라 지연이 어떻게 달라지는지는 4편에서 측정한다.

### 반쯤 쓰인 값

메모리를 공유하면 읽기와 쓰기의 순서도 맞춰야 한다. 한 스레드가 값을 쓰는 도중에 다른 스레드가 읽으면 반쯤 쓰인 값을 볼 수 있다. `SharedArrayBuffer`를 쓸 때 `Atomics`로 접근 순서를 맞추는 이유도 같다. 커널은 페이지를 연결해 줄 뿐이고, 그 위에서 누가 언제 읽고 쓰는지는 관여하지 않는다. 링에 레코드를 "길이, 내용" 순서로 쓴다고 하면 다음과 같은 일이 일어날 수 있다.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=torn" title="길이와 내용을 따로 쓸 때 gateway가 반쯤 쓰인 레코드를 읽는 순서" height={375} />

gateway는 오류 없이 63바이트를 읽었지만, 새 체결과 이전 체결이 섞인 값이었다. 소켓으로 주고받을 때는 커널이 보낸 바이트의 순서를 지켜 준다. 공유 메모리에서는 feed가 체결을 다 쓰기 전에 gateway가 읽지 않도록 두 프로세스가 규칙을 정해 지켜야 한다. 3편에서는 이 규칙을 정한 과정을 설명한다. 처음 구현했을 때는 틀린 곳이 다섯 군데 있었다.

## 프레임 한 장이 넘어온 경계

처음의 `MESSAGE` 프레임에 담긴 체결은 feed에서 gateway로, gateway에서 커널로, 서버 기계에서 사용자 기계로 전달된다. feed와 gateway 사이에서는 공유 메모리를 쓰므로 체결마다 시스템 콜을 호출할 필요가 없다. 하지만 gateway가 폴링 간격마다 새 체결을 확인하므로 기다리는 시간은 생긴다. gateway에서 커널로 보낼 때는 그 종목을 구독한 연결마다 따로 쓰기를 요청해야 한다. 이 횟수는 연결 수에 비례해 늘어난다.

서버를 만들고 측정하면서 문제가 생긴 곳도 대부분 이 경계였다. 공유 메모리에서는 읽기와 쓰기의 순서를 잘못 정했고(3편), 커널의 경계에서는 연결 수에 따라 늘어나는 호출이 지연이 됐다(4편). 프레임을 받기만 할 때는 보이지 않던 일들이다.

[^1]: 서버와 캡처 도구, 측정 결과는 [yceffort/ws-trade-server](https://github.com/yceffort/ws-trade-server)에 있다. 이 글에 인용한 코드와 gateway를 띄워 잰 값은 커밋 `05ae6632` 기준이다. 저장소에는 그 뒤로 기능을 더했기 때문에 최신 코드는 인용한 코드와 모양이 다르고, 같은 방법으로 센 스레드 수도 이 글의 값보다 많다. 프레임은 2026년 11월 19일에 로그인하지 않은 임시 프로필의 헤드리스 Chrome Beta 159로 받았다. 캡처에 들어 있던 인증 헤더와 기기 식별자, 실제 시세 값은 저장소와 이 글에 옮기지 않았다.

[^2]: [MDN, SharedWorker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker)

[^3]: [RFC 6455, 5.4. Fragmentation](https://www.rfc-editor.org/rfc/rfc6455#section-5.4)과 [WHATWG WebSockets Standard, Feedback from the protocol](https://websockets.spec.whatwg.org/#feedback-from-the-protocol). 후자의 원문은 "When a WebSocket message has been received with type type and data data, the user agent must queue a task to follow these steps"로 시작하고, 이 단계에서 `message` 이벤트를 `MessageEvent`로 보낸다.

[^4]: [RFC 6455, 5.2. Base Framing Protocol](https://www.rfc-editor.org/rfc/rfc6455#section-5.2)

[^5]: [RFC 6455, 5.1. Overview](https://www.rfc-editor.org/rfc/rfc6455#section-5.1). 원문은 "a client MUST mask all frames that it sends to the server", "A server MUST NOT mask any frames that it sends to the client"이다.

[^6]: CDP의 `WebSocketFrame`에는 `opcode`, `mask`, `payloadData`만 있다([ChromeDevTools/devtools-protocol `62afb853` `pdl/domains/Network.pdl` L516-L525](https://github.com/ChromeDevTools/devtools-protocol/blob/62afb853b4629b6059542166e4eeb2975ce52f58/pdl/domains/Network.pdl#L516-L525)). NetLog는 Chromium이 받은 프레임의 헤더를 압축을 풀기 전 단계에서 `WEBSOCKET_RECV_FRAME_HEADER` 이벤트로 기록하고([chromium/chromium `6011ccf8` `net/websockets/websocket_basic_stream.cc` L380-L383](https://github.com/chromium/chromium/blob/6011ccf8866a1c703e3b15d4e5cc0a109163134f/net/websockets/websocket_basic_stream.cc#L380-L383)), 이벤트에는 `reserved1`과 `payload_length`가 들어간다(같은 파일 [L119-L128](https://github.com/chromium/chromium/blob/6011ccf8866a1c703e3b15d4e5cc0a109163134f/net/websockets/websocket_basic_stream.cc#L119-L128)). 캡처는 CDP 캡처 스크립트로 띄운 헤드리스 Chrome Beta 159.0.8154.13에 `--log-net-log`를 더해 2026년 11월 23일 12시 9분(KST)에 했다.

[^7]: [RFC 7692, 7.1.1.1. Server No Context Takeover](https://www.rfc-editor.org/rfc/rfc7692#section-7.1.1.1). 사전을 비우는 계산은 `MESSAGE`마다 새 압축기로 zlib의 raw deflate를 하고, RFC 7692가 정한 대로 끝 4바이트를 뺀 크기다.

[^8]: NetLog의 수신 프레임 헤더 1,529개와 CDP의 `webSocketFrameReceived` 1,526개를 순서대로 짝지었다. 같은 순번끼리 시각 차이는 1ms 안이었고, NetLog에만 있는 3개는 CDP 기록을 마친 뒤 26ms 안에 도착한 프레임이다. `MESSAGE`뿐 아니라 `CONNECTED`, `RECEIPT`, heartbeat까지 받은 순서대로 Python `zlib`(시스템 zlib 1.2.12)의 raw deflate(창 2^15)에 넣고, 메시지마다 `Z_SYNC_FLUSH`로 끊은 뒤 끝 4바이트를 뺀 크기를 비교했다. 압축 수준 2~9에서는 크기가 같은 프레임이 263개 이하였고, 창을 2^12 이하로 줄이면 125개 이하였다. 바이트가 아니라 크기만 비교한 결과다. Node 24에 들어 있는 zlib은 같은 입력에서 다른 압축 결과를 내서 Python으로 비교했다. 비교 스크립트는 [yceffort/ws-trade-server `14c7d84` `capture/compression-check.py`](https://github.com/yceffort/ws-trade-server/blob/14c7d84fedceceeab3e45e2ebfeb158015d6a40c/capture/compression-check.py)다.

[^9]: [STOMP Protocol Specification, Version 1.2, STOMP Frames](https://stomp.github.io/stomp-specification-1.2.html#STOMP_Frames)

[^10]: 자릿수가 길다는 것만으로 double보다 정밀하게 계산했다고 볼 수는 없다. double도 `(0.1).toFixed(19)`로 출력하면 `0.1000000000000000056`이라는 19자리가 나오고, 이 뒷자리는 double의 이진 값에 따라 정해진다. 비교 방법은 다음과 같다. 프레임 텍스트에서 `tradingStrength`의 숫자를 문자열 그대로 꺼내 `s`라 하고 소수점 아래 자릿수를 `d`라 할 때, `Number(s).toFixed(d) === s`인지 확인했다. `Number(s)`는 `s`에 가장 가까운 double이고, `toFixed`는 그 double의 정확한 값을 소수점 아래 `d`번째 숫자까지 반올림해 출력하므로([ECMA-262 16.0, 21.1.3.3 Number.prototype.toFixed](https://262.ecma-international.org/16.0/#sec-number.prototype.tofixed)) double로 계산한 결과를 길게 출력한 문자열이라면 같게 나온다. 합성 입력으로 확인하면 `'0.1000000000000000056'`은 같게 나오고, `'104.2857142857142857'`은 `Number(s).toFixed(16)`이 `'104.2857142857142918'`이라서 다르게 나온다. 유효 숫자가 적은 값은 어떻게 만든 값이든 같게 나오기 쉬워서 18자리 이상인 값만 셌다.

[^11]: 링이 비면 `poll`만큼 자고, 덮어쓰여 뒤처지면 로그만 남기고 다음 레코드로 넘어간다. [yceffort/ws-trade-server `05ae6632` `src/bridge.rs` L18-L19](https://github.com/yceffort/ws-trade-server/blob/05ae66329025da3cd67b05957f21c4d3d613e11f/src/bridge.rs#L18-L19). `poll`의 기본값 200us는 같은 커밋의 [`src/lib.rs` L32](https://github.com/yceffort/ws-trade-server/blob/05ae66329025da3cd67b05957f21c4d3d613e11f/src/lib.rs#L32)에 있다.

[^12]: 번호는 실제로 내보내는 `MESSAGE`마다 하나씩 매긴다. [yceffort/ws-trade-server `05ae6632` `src/connection.rs` L125-L133](https://github.com/yceffort/ws-trade-server/blob/05ae66329025da3cd67b05957f21c4d3d613e11f/src/connection.rs#L125-L133)

[^13]: [STOMP Protocol Specification, Version 1.2, MESSAGE](https://stomp.github.io/stomp-specification-1.2.html#MESSAGE). 원문은 "The MESSAGE frame MUST include a destination header indicating the destination the message was sent to."이고, `message-id`는 "The MESSAGE frame MUST also contain a message-id header with a unique identifier for that message"라고 고유성만 요구한다.

[^14]: `SUBSCRIBE` 프레임의 `id`와 `destination`으로 각 `MESSAGE`의 `subscription` 줄 뒤에 `destination` 줄을 넣고, 받은 프레임 전부를 받은 순서대로 zlib 압축 수준 1, 창 2^15로 사전을 이어 가며 압축해 넣기 전과 비교했다. 압축 전에는 프레임마다 중앙값 45바이트가 늘고, 압축 후에는 중앙값이 그대로였으며 평균 0.79바이트, 전체 73,463바이트에서 74,651바이트로 늘었다.

[^15]: [MDN, Worker: postMessage() method](https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage)의 `transfer` 인자와 [MDN, SharedArrayBuffer의 Security requirements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements)

[^16]: 측정 코드는 [yceffort/ws-trade-server `47563840` `examples/boundary_cost.rs`](https://github.com/yceffort/ws-trade-server/blob/47563840775daf4ac94ab106452730e7beac9a28/examples/boundary_cost.rs)이고, 그 커밋에서 `cargo run --release --example boundary_cost`로 실행했다. 이 파일은 각주 1의 `05ae6632` 뒤에 추가했으므로 `05ae6632`에는 없다. 맥은 Apple M5(10코어)의 macOS이고, Linux는 같은 기계의 OrbStack 가상 머신(Linux 7.0.14, aarch64)에서 코어 4개에 고정해 돌렸다. 컴파일러는 rustc 1.95.0이다. 각 값은 반복 전체의 경과 시간(`Instant::elapsed`)을 횟수로 나눈 것이고 CPU 시간만 따로 잰 것은 아니다. 세 번씩 돌렸고 `send`를 뺀 값은 세 번이 거의 같았다. Linux의 `send`는 347ns, 381ns, 443ns였고 표에는 가운데 값을 적었다. 링 쓰기는 읽는 프로세스가 없는 상태에서 63바이트 레코드를 쓰기만 반복한 조건이고, `send`는 370바이트 프레임을 소켓 하나에 `write_all`로 연달아 쓰는 동안 다른 스레드가 계속 읽어 주는 조건이다.

[^17]: 프레임 하나를 만들 때마다 `writer.send`를 부르고 그 완료를 기다린다. [yceffort/ws-trade-server `05ae6632` `src/connection.rs` L139-L141](https://github.com/yceffort/ws-trade-server/blob/05ae66329025da3cd67b05957f21c4d3d613e11f/src/connection.rs#L139-L141). 지금의 `main`(`5270364`)은 같은 연결로 나갈 프레임을 4개까지 모아 한 번에 쓴다([`src/connection/batch.rs` L11](https://github.com/yceffort/ws-trade-server/blob/527036486bb8fe2a5654916d133bfd2ab0587aef/src/connection/batch.rs#L11)).

[^18]: [torvalds/linux `v7.0` `net/ipv4/tcp.c` L1425-L1436](https://github.com/torvalds/linux/blob/028ef9c96e96197026887c0f092424679298aae8/net/ipv4/tcp.c#L1425-L1436). `tcp_sendmsg_locked`는 복사한 바이트가 있으면 반환하기 전에 `tcp_push`를 부르고, `tcp_push`(같은 파일 L751-L784)는 쌓여 있는 세그먼트의 전송을 시도한다. 실제로 내보낼지는 `net/ipv4/tcp_output.c`의 `tcp_write_xmit`이 혼잡 제어, 상대의 수신 창, Nagle 알고리즘 같은 조건을 확인해 정한다.

[^19]: [MDN, WebSocket: bufferedAmount property](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/bufferedAmount)

[^20]: [Linux man-pages, tcp(7)](https://man7.org/linux/man-pages/man7/tcp.7.html)의 `TCP_NODELAY`

[^21]: [Rust 1.95.0 표준 라이브러리, std::thread의 Stack size 절](https://doc.rust-lang.org/1.95.0/std/thread/index.html#stack-size)

[^22]: [Dan Kegel, The C10K problem](https://www.kegel.com/c10k.html)

[^23]: [Linux man-pages, epoll(7)](https://man7.org/linux/man-pages/man7/epoll.7.html)

[^24]: [libuv 문서, Design overview](https://docs.libuv.org/en/v1.x/design.html)

[^25]: [yceffort/ws-trade-server `05ae6632` `src/lib.rs` L54-L71](https://github.com/yceffort/ws-trade-server/blob/05ae66329025da3cd67b05957f21c4d3d613e11f/src/lib.rs#L54-L71)

[^26]: [tokio 1.54.1 문서, tokio::runtime](https://docs.rs/tokio/1.54.1/tokio/runtime/index.html#multi-thread-scheduler)

[^27]: [Linux man-pages, mmap(2)](https://man7.org/linux/man-pages/man2/mmap.2.html). `MAP_SHARED`의 설명은 "Updates to the mapping are visible to other processes mapping the same region"이다.

[^28]: [yceffort/ws-trade-server `05ae6632` `src/region.rs` L16-L22](https://github.com/yceffort/ws-trade-server/blob/05ae66329025da3cd67b05957f21c4d3d613e11f/src/region.rs#L16-L22)

[^29]: [yceffort/ws-trade-server `05ae6632` `src/ring.rs` L81-L126](https://github.com/yceffort/ws-trade-server/blob/05ae66329025da3cd67b05957f21c4d3d613e11f/src/ring.rs#L81-L126). 파일이 비어 있을 때만 `write_all_at`으로 머리말을 쓰고(L88-L91), 레코드의 바이트와 쓴 위치는 매핑된 메모리에 원자적 저장(`store`)으로 쓴다(L124-L126).

[^30]: [RFC 9293, 2.2 Key TCP Concepts](https://www.rfc-editor.org/rfc/rfc9293#section-2.2)는 TCP를 "a reliable, in-order, byte-stream service"라고 설명한다. [3.9.1.2 Send](https://www.rfc-editor.org/rfc/rfc9293#section-3.9.1.2)에는 "the data may be combined with data from subsequent SENDs for transmission efficiency"라는 문장과 "The PSH bit is not a record marker"라는 문장이 있다.
