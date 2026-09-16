---
title: 'CDN과 HTTP 캐시: 배포한 파일은 어디에 머무는가'
marp: true
paginate: true
theme: midnight
tags:
  - cdn
  - http
  - cache
  - performance
  - aws
  - cloudfront
date: 2026-09-11
description: 'CDN이 무엇인지, Cache-Control과 재검증이 어떻게 동작하는지, HTML과 JS와 이미지의 캐시 전략을 왜 다르게 가져가는지 실측 헤더와 CloudFront 설정으로 따라가는 주니어용 강의'
published: true
art:
  undraw: connected-world
---

# CDN과 HTTP 캐시

배포한 파일은 어디에 머무는가

<!-- _class: invert -->

@yceffort

---

## 배포 직후에 자주 받는 질문 세 가지

1. "배포했는데 사용자 화면은 아직 옛날 버전이에요"
2. "일부 사용자만 `ChunkLoadError`가 나요. 새로고침하면 돼요"
3. "이미지를 교체했는데 계속 옛 이미지가 나와요. 파일명은 같아요"

세 질문의 답은 전부 같은 곳에 있다. **파일이 사용자에게 오는 길 어딘가에 사본이 남아 있다.**

<!-- 손들기: 셋 중 하나라도 직접 겪어 본 사람? 거의 전원이 든다. 그 사본이 어디에, 왜, 얼마나 남는지가 오늘 주제. -->

---

## 이 덱의 목표

```text
200  (disk cache)   main-2kzkiswg.js     age: 151772   x-vercel-cache: HIT
304  0 B            /                    cache-control: max-age=0, must-revalidate
```

DevTools Network 탭의 이런 한 줄을 읽고 **왜 그렇게 나왔는지 설명할 수 있게** 되는 것.

그리고 새 프로젝트에서 HTML, JS, 이미지, API 응답의 캐시 헤더를 **직접 정할 수 있게** 되는 것.

---

## 이 덱에서 다루는 것

1. **CDN** : 왜 필요하고, 요청이 어떻게 가까운 서버로 가고, 그 서버가 무엇을 하는가
2. **HTTP 캐시 규칙** : `Cache-Control` 지시어, 신선도 계산, 재검증, `Vary`
3. **자산별 캐시 전략** : HTML, JS/CSS, 이미지, 폰트, API를 왜 다르게 다루는가
4. **함정** : 새로고침의 종류, DevTools 읽는 법, 개인화 응답이 CDN에 남는 사고
5. **실무에서는** : 새 프로젝트 기본값, 배포 순서, 코드 리뷰 체크리스트, 장애 신고 진단 순서

각 부 끝에 **중간 점검**, 마지막에 **종합 퀴즈 6문제**가 있다.

---

## 기준

- 캐시 규칙은 **RFC 9111 (HTTP Caching)** 기준. `immutable`은 RFC 8246, `stale-while-revalidate`는 RFC 5861
- 실측 헤더는 **2026-09-11에 `yceffort.kr`(Next.js 16.3.1, Vercel)** 에 `curl`로 직접 요청한 결과다. 지역은 서울(엣지 `icn1`)
- AWS 동작은 **CloudFront 개발자 가이드**에서 확인했고, 실측 헤더는 `awsstatic.com`(S3 + CloudFront)에서 받았다
- 브라우저 동작은 **Chrome** 기준으로 설명하고, Firefox/Safari가 다른 지점은 따로 표시한다
- 다루지 않는 것: 서비스 워커의 Cache API, react-query 같은 애플리케이션 캐시, CDN 벤더별 설정 화면

<!-- 구두 보충: CDN 벤더(Cloudflare, CloudFront, Vercel)는 설정 UI만 다르고 아래 규칙은 전부 같은 RFC를 따른다. 규칙을 알면 어느 벤더 문서든 읽힌다. -->

---

## Part 1 : CDN은 무엇을 해결하는가

<!-- _class: invert -->

---

## 요청 하나가 이동하는 거리

서울에서 미국 버지니아까지 약 11,000km, 광섬유 속 빛은 약 200,000km/s다.

```text
편도 이론값     55ms
왕복(RTT) 이론값 110ms
실제 RTT       180 ~ 200ms   (라우터, 경로 우회, 큐잉)
```

게다가 HTTPS는 첫 바이트까지 왕복이 한 번이 아니다.

```text
TCP 핸드셰이크   1 RTT   유실과 순서 꼬임에 대비해 양쪽이 순번을 맞춘다
TLS 핸드셰이크   1 RTT   서버 인증서를 확인하고 암호 키를 합의한다 (TLS 1.3)
HTTP 요청/응답   1 RTT   그제야 실제 요청이 나간다
─────────────────────
첫 바이트까지    3 RTT ≈ 550ms
```

이게 HTML 한 장 값이고, 그 HTML이 부르는 JS와 CSS가 다시 낸다.

---

## 같은 요청을 가까운 곳에서 받으면

서울 사무실에서 `yceffort.kr`의 JS 청크 하나를 요청한 `curl` 타이밍이다.

```text
dns=0.002  connect=0.007  tls=0.025  ttfb=0.065  total=0.144
```

- TCP 연결 **7ms**, TLS까지 **25ms**. 서버가 물리적으로 가깝다는 뜻이다
- 이 서버는 내 파일을 만든 서버(오리진)가 아니라, 오리진의 **사본을 들고 있는 서울의 서버**다

CDN(Content Delivery Network)은 이렇게 **전 세계에 흩어진 캐시 서버들의 네트워크**다. 각 서버를 엣지(edge) 또는 PoP(Point of Presence)라고 부른다.

---

## 요청은 어떻게 가까운 엣지로 가는가

같은 도메인인데 서울 사용자는 서울 엣지로, 도쿄 사용자는 도쿄 엣지로 간다. 방법은 둘이다.

- **DNS 기반** : DNS는 도메인 이름을 IP 주소로 바꿔 주는 단계다. 이때 물어본 리졸버의 위치를 보고 지역마다 다른 IP를 돌려준다
- **Anycast** : IP 하나는 보통 서버 한 대를 가리키는데, 여러 엣지가 **같은 IP**를 동시에 광고해 인터넷 라우팅(BGP)이 그중 가장 가까운 곳으로 보내게 한다. Cloudflare, Vercel이 이 방식이다

어느 엣지에 도착했는지는 응답 헤더에 남는다.

```text
$ curl -sI https://yceffort.kr/ | grep x-vercel-id
x-vercel-id: icn1::icn1::kb2hv-1789123883690-2280c10516e7

$ curl -s https://www.cloudflare.com/cdn-cgi/trace | grep colo
colo=ICN
```

`icn`, `ICN`은 인천공항 코드다. CDN 업계는 PoP 이름에 공항 코드를 쓴다.

---

## 엣지가 하는 일

```text
[브라우저] ──▶ [엣지 icn1] ──▶ [오리진]
                  │
                  ├─ 캐시에 있고 아직 유효하다 ─▶ HIT : 사본을 바로 준다
                  ├─ 캐시에 없다 ─────────────▶ MISS : 오리진에서 받아 저장하고 준다
                  └─ 있지만 만료됐다 ─────────▶ STALE : 오리진에 확인하거나 일단 준다
```

- 캐시를 찾는 열쇠(**캐시 키**)는 기본적으로 `호스트 + 경로 + 쿼리스트링`이다. 여기에 `Vary`로 지정한 요청 헤더가 추가된다(Part 2)
- 그래서 `/posts/1`과 `/posts/1?utm_source=x`는 **다른 키**다. 내용이 같아도 엣지에는 사본이 둘 생긴다
- 단 CloudFront는 기본 캐시 키가 **`도메인 + 경로`뿐**이라 위 둘이 같은 키가 된다. 쿼리스트링을 넣으려면 캐시 정책에 직접 지정한다
- 결과는 벤더마다 다른 이름의 헤더로 알려준다: `x-vercel-cache`, `cf-cache-status`, CloudFront는 `x-cache`

<!-- HIT/MISS/STALE 외에 벤더별로 BYPASS, REVALIDATED, PRERENDER 같은 값이 더 있지만 셋만 알면 나머지는 문서로 읽힌다. -->

---

## AWS로 보면 : CloudFront의 구조

```text
[브라우저] ──▶ [엣지 ICN80] ──▶ [리전 엣지 캐시] ──▶ [오리진 : S3 버킷, ALB, EC2]
```

- **배포(distribution)** 하나가 CDN 한 벌이다. 만들면 `d1234.cloudfront.net` 주소가 나오고, `cdn.example.com` 같은 내 도메인을 대체 도메인 이름으로 등록한 뒤 DNS에서 이 주소로 연결한다
- **오리진** : 사본의 출처. 정적 파일은 S3 버킷, 동적 응답은 ALB나 EC2
- **동작(behavior)** : 경로 패턴별 규칙. `/static/*`는 S3로, `/api/*`는 ALB로 보내고 각각 다른 캐시 정책을 붙인다
- **리전 엣지 캐시** : 엣지와 오리진 사이의 2차 캐시다. 엣지보다 용량이 커서 인기가 식어 엣지에서 밀려난 사본도 여기 남고, 한 리전의 엣지들이 이 캐시를 함께 쓴다
- 그래서 엣지에서 빠져도 오리진까지 안 가는 경우가 많다. 단 동적 요청, `POST` 같은 프록시 메서드, 오리진 S3가 같은 리전에 있는 요청은 여기를 건너뛴다

```text
$ curl -sI https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png
cache-control: max-age=31536000
server: AmazonS3
x-cache: Hit from cloudfront
x-amz-cf-pop: ICN80-P3
age: 4273830            ← 49일째 서울 엣지에 있는 사본
```

---

## MISS와 HIT의 차이를 직접 재 보면

아직 서울 엣지에 없는 이미지 변형(384px)을 네 번 연속 요청했다.

| 순서 | `x-vercel-cache` | TTFB  |
| ---- | ---------------- | ----- |
| 1    | MISS             | 372ms |
| 2    | HIT              | 261ms |
| 3    | HIT              | 60ms  |
| 4    | HIT              | 50ms  |

- 첫 요청은 오리진(이미지 최적화 함수)까지 다녀왔다
- 두 번째는 HIT인데도 느린데, 엣지 안에서 사본이 아직 퍼지는 중이라고 이해하면 된다(벤더 내부 구현이라 단정하지 않는다)
- 이후는 **6~7배** 빠르다. 이 차이가 전 세계 사용자에게, 모든 파일에 곱해진다

---

## 캐시는 하나가 아니다

```text
[브라우저 캐시]  ──▶  [CDN 엣지 캐시]  ──▶  [오리진]
  사설(private)          공유(shared)
  한 사용자 전용          모든 사용자가 공유
```

- **사설 캐시** : 브라우저. 내 컴퓨터에만 있고 나만 쓴다
- **공유 캐시** : CDN, 회사 프록시. 다른 사용자의 응답을 나에게 줄 수 있다

같은 `Cache-Control` 헤더 하나로 둘 다 지시한다. 그래서 지시어에 `private`, `s-maxage`처럼 **어느 캐시를 향한 말인지** 구분하는 것들이 있다.

로그인한 사용자의 페이지가 공유 캐시에 저장되면 다른 사용자에게 그대로 나간다. Part 4에서 실제 사고를 본다.

---

## 사본은 어디서 오는가 : pull과 push

- **Pull CDN** : 엣지가 오리진 앞에 서 있다가, 요청이 오면 그때 오리진에서 받아 저장한다. Cloudflare, Vercel, CloudFront가 기본으로 이렇게 동작한다
- **Push CDN** : 빌드 시점에 파일을 스토리지(S3 같은)에 올려 두고, CDN이 그 스토리지를 오리진으로 삼는다

실무에서는 보통 둘을 섞는다.

```text
HTML(동적, 자주 바뀜)  ──▶  애플리케이션 서버를 오리진으로 pull
JS/CSS/이미지(정적)    ──▶  빌드 때 스토리지에 push, CDN이 앞에 섬
```

Next.js를 Vercel에 올리면 이 구분이 자동으로 된다. 직접 배포(nginx, S3 + CloudFront)할 때는 이 구조를 손으로 만들어야 한다.

---

## CDN이 캐시 말고 하는 일

이 덱은 캐시만 다루지만, 실무에서 CDN을 켜면 같이 따라오는 것들이다.

- **TLS 종료** : 사용자의 암호 연결이 오리진이 아니라 엣지에서 끝난다는 뜻이다. 인증서를 엣지가 들고 핸드셰이크를 대신 처리한 뒤, 오리진과는 따로 연결한다
- **압축** : Brotli/gzip을 엣지에서 적용한다
- **HTTP/2, HTTP/3** : 오리진이 HTTP/1.1이어도 사용자와는 최신 프로토콜로 통신한다
- **DDoS 완화, WAF** : 오리진에 닿기 전에 걸러낸다
- **이미지 변환** : 크기와 포맷을 요청마다 만들어 캐시한다
- **엣지 함수** : 리다이렉트, A/B 분기 같은 가벼운 로직을 엣지에서 실행한다

---

## "국내 서비스인데 CDN이 왜 필요한가요"

**CDN은 멀어서 쓰는 게 아니다.** 서울에서 서울 리전 S3까지 TCP 연결이 10ms 안팎이다(실측). 거리를 줄이는 장치가 아니라 **오리진 앞에 두는 공유 캐시**다.

1. **오리진 부하 분리** : 같은 파일에 요청이 몰려도 오리진은 엣지마다 TTL에 한 번 응답하면 된다. 트래픽이 튈 때 서버 대신 엣지가 흡수한다
2. **응답을 만드는 비용** : 앞서 잰 MISS 372ms 대 HIT 50ms는 둘 다 서울 엣지에서 잰 값이다. 거리가 아니라 오리진 코드를 실행했느냐의 차이다
3. **전송 비용** : S3에서 CloudFront로 가는 전송은 무료이고, CloudFront 발신이 EC2나 ALB 발신보다 GB당 싸다
4. **가용성** : DDoS 완화와 WAF가 오리진에 닿기 전에 막고, 오리진이 5xx를 뱉어도 엣지가 옛 사본으로 버틸 수 있다(Part 2)

반대로 사내 도구처럼 트래픽이 작고 응답이 전부 개인화돼 캐시할 것이 없다면 CDN은 비용만 든다. 그때는 "커지면 붙인다"가 답이다.

---

## Part 1 정리

- 거리는 RTT로 바뀌고, HTTPS 첫 바이트까지는 RTT가 세 번 든다. 서울에서 미국은 0.5초다
- CDN은 사본을 사용자 가까이 두는 캐시 서버들의 네트워크다. 엣지 도착은 DNS 또는 Anycast로 정해진다
- 엣지는 캐시 키로 사본을 찾아 HIT/MISS/STALE로 응답한다. 실측으로 HIT는 MISS보다 6~7배 빨랐다
- 캐시는 브라우저(사설)와 CDN(공유) 둘이며, 하나의 헤더로 둘 다 지시한다

---

## 중간 점검 1-1

서울 사용자가 `https://shop.example.com/app.js`를 요청했다. 응답 헤더에 `x-cache: HIT`가 있고 TTFB는 40ms였다. 이때 확실히 말할 수 있는 것은?

1. 이 파일은 사용자의 브라우저 캐시에서 왔다
2. 오리진 서버가 서울에 있다
3. 서울 엣지가 이 파일의 사본을 이미 갖고 있었다
4. 이 파일은 앞으로 1년간 갱신되지 않는다

---

## 중간 점검 1-1 정답 : ③

- ① 브라우저 캐시에서 왔다면 네트워크 요청 자체가 없어서 `x-cache` 헤더를 새로 받을 일이 없다. DevTools에는 `(disk cache)`로 표시된다
- ② 엣지가 가까운 것이지 오리진 위치는 알 수 없다
- ④ 얼마나 유지되는지는 `Cache-Control`이 정한다. `HIT`는 "지금 있었다"는 뜻일 뿐이다

> 핵심: CDN 헤더는 **엣지에 있었는지**만 말한다. 브라우저 캐시와 유효 기간은 별개다.

---

## 중간 점검 1-2

마케팅팀이 `?utm_source=kakao`, `?utm_source=x` 같은 파라미터를 붙인 링크를 대량으로 뿌렸다. 어떤 링크로 들어와도 페이지 내용은 똑같은데, 오리진 부하가 눈에 띄게 늘었다.

이 CDN은 쿼리스트링을 캐시 키에 포함한다. 무슨 일이 벌어진 것인가?

---

## 중간 점검 1-2 정답 : 파라미터마다 캐시 키가 달라 전부 MISS였다

- 엣지는 본문을 비교하지 않는다. `?utm_source=kakao`와 `?utm_source=x`는 응답이 같아도 **서로 다른 객체**다
- 링크 종류만큼 MISS가 나고 그만큼 오리진이 실행된다. 엣지에는 같은 내용의 사본이 그 수만큼 쌓인다
- 캐시 키에 넣을 파라미터를 지정할 수 있다면 추적용 파라미터는 빼는 것이 답이다. CloudFront는 반대로 기본이 제외이므로, 응답이 파라미터에 따라 달라지는 페이지에서 반대 방향 사고가 난다

---

## 중간 점검 1-3

서울 사용자 A가 `/app.js`를 처음 요청해 `MISS`를 받았다. 잠시 뒤 도쿄 사용자 B가 같은 파일을 처음 요청했는데 역시 `MISS`였다.

A가 이미 받아 갔는데 왜 B도 MISS인가?

---

## 중간 점검 1-3 정답 : 캐시는 엣지마다 따로다

- A의 요청으로 사본이 생긴 곳은 **서울 엣지**다. 도쿄 엣지에는 아직 없다
- 엣지가 수십 곳이면 배포 직후 오리진은 같은 파일을 그만큼 여러 번 내보낸다. 배포 직후 오리진 부하가 튀는 이유다
- CloudFront처럼 리전 엣지 캐시가 있으면 같은 리전의 엣지끼리 사본을 나눠 쓰므로 오리진까지 가는 횟수가 줄어든다

> 핵심: `MISS`는 "이 엣지에 없었다"는 뜻이지 "어디에도 없었다"가 아니다.

---

## Part 2 : HTTP 캐시 규칙

<!-- _class: invert -->

---

## 캐시가 응답마다 던지는 세 가지 질문

```text
① 저장해도 되는가?              → no-store, private, public
② 저장한 것을 지금 써도 되는가?   → max-age, s-maxage, Age  (신선도)
③ 낡았다면 다시 받지 않고
   확인만 할 수 있는가?          → ETag, Last-Modified   (재검증)
```

브라우저와 CDN 둘 다 이 순서로 판단한다. `Cache-Control` 지시어는 전부 이 세 질문 중 하나에 대한 답이다.

---

## Cache-Control 지시어 : 저장과 신선도

| 지시어       | 뜻                                                            |
| ------------ | ------------------------------------------------------------- |
| `max-age=N`  | 응답 시점부터 N초 동안 신선(fresh)하다                        |
| `s-maxage=N` | 공유 캐시(CDN)에서만 쓰는 max-age. 있으면 CDN은 이쪽을 따른다 |
| `public`     | 공유 캐시가 저장해도 된다 (인증 헤더가 있는 응답까지도)       |
| `private`    | 브라우저만 저장. CDN은 저장하면 안 된다                       |
| `no-store`   | 어디에도 저장하지 마라                                        |
| `no-cache`   | 저장은 해도 되지만, **쓰기 전에 매번 서버에 확인**하라        |

```text
Cache-Control: public, max-age=0, s-maxage=300
   브라우저: 받자마자 낡음 → 매번 확인    CDN: 5분간 신선
```

브라우저가 매번 보내는 확인 요청은 **엣지에서 끝난다.** 엣지가 5분 동안 자기 사본으로 답하므로 오리진까지 가는 요청은 5분에 한 번이다.

---

## no-cache는 캐시를 끄지 않는다

가장 흔한 오해라 따로 한 장을 쓴다.

```text
Cache-Control: no-cache    저장한다. 다만 매번 서버에 "아직 같나요?"를 묻는다
Cache-Control: no-store    저장하지 않는다
```

- `no-cache`는 사실상 `max-age=0, must-revalidate`와 같은 효과다. 파일이 안 바뀌었으면 서버는 `304`만 보내고 본문은 캐시에서 쓴다
- "캐시 때문에 안 바뀌어요"의 해법으로 `no-cache`를 붙이면 **정상 동작**이다. 저장은 되지만 확인을 거치니 항상 최신이다
- 정말 저장을 막아야 하는 것은 개인정보가 담긴 응답이다. 그때만 `no-store`

> 둘 다 사용자는 늘 최신을 본다. 차이는 **매번 다시 받는 양**이다. `no-cache`는 안 바뀌었으면 `304` 헤더만 받고 본문은 캐시에서 쓰고, `no-store`는 매번 본문을 통째로 다시 받는다.

<!-- must-revalidate 단독은 "낡은 뒤에는 반드시 확인하라"이고, 낡기 전까지는 확인 없이 쓴다. no-cache는 낡았든 아니든 확인한다. -->

---

## 신선도 계산 : max-age와 Age

`max-age=300`을 받았다고 300초가 남은 것이 아니다. CDN이 이미 들고 있던 사본일 수 있고, 그 시간이 `Age`에 적혀 온다.

```text
Cache-Control: max-age=300     캐시해도 되는 총 시간은 300초
Age: 120                       그중 120초는 CDN이 이미 썼다
──────────────────────────
브라우저 몫 = 300 - 120 = 180초
```

- 이 180초 동안은 서버에 묻지 않고 쓴다. 브라우저가 들고 있는 시간이 쌓여 180초를 넘기면 그 사본은 **낡았다(stale)**
- 낡아도 버리지 않는다. 서버에 "아직 같나요"를 묻고(재검증), 같다면 받아 둔 본문을 그대로 쓴다

```text
$ curl -sI https://yceffort.kr/_next/static/immutable/chunks/2kzkiswgqacx4.js
cache-control: public,max-age=31536000,immutable
age: 151772                ← 서울 엣지가 1.76일 전에 받아 둔 사본
x-vercel-cache: HIT
```

<!-- RFC 9111 용어로는 총 시간이 freshness_lifetime, 지금 나이가 current_age이고 current_age < freshness_lifetime이면 신선하다. -->

---

## CloudFront는 오리진 헤더를 그대로 따르지 않는다

캐시 정책(cache policy)에 **Min, Default, Max TTL** 세 값이 있고, 오리진이 보낸 `Cache-Control`은 이 범위로 깎인다. 관리형 정책 `CachingOptimized`를 예로 보면 이렇다.

```text
CachingOptimized : Min 1초, Default 24시간, Max 1년

오리진이 max-age=60을 보내면   →  60초. Min과 Max 사이라 그대로
오리진이 헤더를 안 보내면      →  24시간. Default가 대신 정한다
오리진이 no-store를 보내도     →  1초. Min TTL만큼은 캐시된다
```

- 마지막 줄이 함정이다. `/api/me`에 `no-store`를 붙여도 그 경로의 Min TTL이 300초면 **A의 개인 응답이 5분간 엣지에 남아 B에게 나간다**(문서에도 경고가 있다)
- 동적 응답에는 세 값이 모두 0인 **CachingDisabled**, 오리진 헤더를 그대로 따르려면 Min 0, Default 0인 **UseOriginCacheControlHeaders**를 쓴다

---

## 재검증 : 다시 받지 않고 확인만 하기

낡은 사본이 있을 때 브라우저는 "이거 아직 같나요?"를 물을 수 있다. 응답에 **검증자**가 있어야 한다.

| 응답이 준 검증자                 | 확인 요청 헤더                       |
| -------------------------------- | ------------------------------------ |
| `ETag: "abc123"`                 | `If-None-Match: "abc123"`            |
| `Last-Modified: Thu, 10 Sep ...` | `If-Modified-Since: Thu, 10 Sep ...` |

같으면 서버는 **`304 Not Modified`, 본문 없이** 응답한다. 본문은 캐시에 있던 것을 쓴다.

```text
$ curl -s -o /dev/null -w "%{http_code} %{size_download}\n" \
    -H 'If-None-Match: "_next/static/immutable/chunks/2kzkiswgqacx4.js"' \
    https://yceffort.kr/_next/static/immutable/chunks/2kzkiswgqacx4.js
304 0
```

<!-- Vercel은 immutable 파일의 ETag를 경로 문자열 그대로 쓴다. 파일명에 이미 내용 해시가 있으니 경로가 곧 내용의 식별자다. -->

---

## 검증자가 없으면 재검증도 없다

같은 사이트의 HTML 응답 헤더에는 `ETag`도 `Last-Modified`도 없다.

```text
cache-control: public, max-age=0, must-revalidate
content-type: text/html; charset=utf-8
(etag 없음, last-modified 없음)
```

- `max-age=0`이라 매번 서버에 가야 하는데, 확인할 근거가 없으니 **매번 전체 본문(약 340KB)을 다시 받는다**
- 서버 입장에서는 `304`를 만들 재료가 없다

`max-age=0` 또는 `no-cache`를 쓸 거라면 검증자를 같이 주어야 그 설정이 싸진다. HTML처럼 매번 확인해야 하는 응답일수록 `ETag`가 중요하다.

<!-- 이 사이트의 경우 HTML 재검증이 안 되는 것이 실제 비용인지는 별개 문제다(스트리밍 RSC 응답이라 ETag 계산이 어렵다). 여기서는 "검증자 없는 max-age=0은 매번 풀 다운로드"라는 규칙만 가져간다. -->

---

## 헤더가 아무것도 없으면 : 휴리스틱 캐시

"캐시 헤더를 안 줬는데 왜 캐시되죠?"

- RFC 9111은 `Cache-Control`도 `Expires`도 없고 `Last-Modified`만 있으면, 캐시가 **스스로 신선도를 추정해도 된다**고 허용한다
- 권고 값은 `(응답 시각 - Last-Modified) × 10%`. Chrome과 Firefox가 그렇게 구현한다

```text
Last-Modified: 100일 전   →  10일 동안 확인 없이 캐시에서 쓴다
Last-Modified: 어제       →  약 2.4시간
```

nginx나 S3에서 정적 파일을 그냥 서빙하면 `Last-Modified`가 자동으로 붙는다. 그래서 헤더를 안 정해도 "가끔 안 바뀌는" 현상이 생긴다.

> 캐시 헤더를 정하지 않는 것은 "캐시 안 함"이 아니라 **"브라우저 마음대로"** 다.

---

## Vary : 같은 URL, 다른 응답

같은 URL이라도 요청 헤더에 따라 응답이 달라진다면, 캐시 키에 그 헤더를 포함시켜야 한다. 그 선언이 `Vary`다.

```text
$ curl -sI 'https://yceffort.kr/_next/image?url=...profile.jpeg&w=48&q=75'
content-type: image/jpeg        content-length: 975      vary: Accept

$ curl -sI -H 'Accept: image/avif,image/webp,*/*'  (같은 URL)
content-type: image/avif        content-length: 735      vary: Accept
```

- `Vary: Accept`가 있으니 CDN은 `URL + Accept 값`마다 사본을 따로 둔다. avif를 못 읽는 브라우저에 avif 사본이 가는 사고를 막는다
- `Vary: User-Agent`는 UA 문자열 종류만큼 사본이 쪼개져 HIT율이 무너진다. `Vary: Cookie`, `Vary: *`는 사실상 캐시 불가 선언이다

---

## CloudFront의 캐시 키는 캐시 정책이 정한다

오리진이 `Vary`를 보낸다고 CloudFront가 키를 넓히지 않는다. **캐시 정책에 넣은 헤더, 쿠키, 쿼리스트링만** 키에 들어간다.

```text
정책에 없는 헤더   →  오리진에 보내지도 않는다 (Accept, Accept-Language, Referer …)
                      응답 Vary에서도 그 이름을 지운다
정책에 없는 쿠키   →  요청의 Cookie를 지우고, 응답의 Set-Cookie도 지운다
Authorization      →  GET/HEAD에서 지운다. 키에 넣거나 오리진 요청 정책으로 따로 전달한다
```

- 이미지 포맷을 `Accept`로 나누는 오리진을 CloudFront 뒤에 두려면 캐시 정책에 `Accept`를 넣어야 avif와 jpeg 사본이 섞이지 않는다
- 반대로 키에 넣는 헤더마다 사본이 갈라진다. `User-Agent`는 문서가 "권장하지 않음"이라고 적었고, 디바이스 구분은 `CloudFront-Is-Mobile-Viewer` 같은 정규화 헤더로 한다

---

## stale-while-revalidate : 낡아도 일단 주고 뒤에서 갱신

```text
Cache-Control: max-age=60, stale-while-revalidate=600
```

```text
0 ~ 60초        fresh. 그냥 준다
60 ~ 660초      stale이지만 일단 옛 사본을 주고, 백그라운드에서 새로 받아 둔다
660초 이후      stale. 새로 받을 때까지 기다린다
```

- 사용자는 재검증을 기다리지 않는다. 대신 최대 10분 낡은 응답을 볼 수 있다
- CDN에서 특히 효과적이다. 사용자 한 명이 옛 사본을 받는 대신 **그 뒤 모든 사용자가 새 사본**을 받는다
- 형제 지시어 `stale-if-error=N`은 오리진이 5xx일 때 N초까지 옛 사본으로 버틴다

Chrome, Firefox 모두 지원한다. Next.js가 ISR 페이지에 내보내는 헤더가 바로 이 조합이다.

---

## immutable : 만료 전엔 확인조차 하지 마라

```text
Cache-Control: public, max-age=31536000, immutable
```

- `max-age`만 있으면 사용자가 **새로고침**할 때 브라우저가 "혹시 바뀌었나" 확인 요청(`If-None-Match`)을 보낸다. 304가 돌아와도 왕복은 든다
- `immutable`은 "이 URL의 내용은 절대 바뀌지 않으니 그 확인도 하지 마라"는 선언이다
- Firefox와 Safari가 구현했다. Chrome은 지시어를 무시하는 대신 **새로고침 동작 자체를 바꿨다**: 일반 새로고침 때 메인 리소스만 재검증하고 서브리소스는 캐시 규칙대로 쓴다(Part 4)

이 지시어를 붙일 수 있는 조건은 하나다. **URL이 내용을 식별해야 한다.** 파일명에 내용 해시가 들어간 빌드 산출물이 그 조건을 만족한다.

---

## 지시어 한 장 요약

| 지시어                   | 브라우저                 | CDN                   |
| ------------------------ | ------------------------ | --------------------- |
| `max-age=N`              | N초 신선                 | `s-maxage` 없으면 N초 |
| `s-maxage=N`             | 무시                     | N초 신선              |
| `private`                | 저장                     | 저장 안 함            |
| `public`                 | 저장                     | 저장 (인증 응답도)    |
| `no-store`               | 저장 안 함               | 저장 안 함            |
| `no-cache`               | 저장 후 매번 재검증      | 저장 후 매번 재검증   |
| `must-revalidate`        | 낡으면 반드시 재검증     | 같음                  |
| `stale-while-revalidate` | 낡아도 주고 뒤에서 갱신  | 같음 (효과 큼)        |
| `immutable`              | 새로고침에도 재검증 생략 | 대부분 무시           |

---

## Part 2 정리

- 캐시는 매 응답에 세 질문을 한다: 저장해도 되나, 지금 신선한가, 낡았다면 확인만 할 수 있나
- 신선도는 `max-age`(CDN은 `s-maxage`)에서 `Age`를 뺀 값이다. `no-cache`는 저장하되 매번 확인이고, 저장 금지는 `no-store`다
- 재검증은 `ETag`/`Last-Modified`가 있어야 가능하고, 없으면 `max-age=0`은 매번 전체 다운로드다
- 헤더가 없으면 휴리스틱(Last-Modified 경과의 10%)으로 캐시된다. `Vary`는 캐시 키를 넓히는 선언이다
- CloudFront는 캐시 정책의 Min/Default/Max TTL로 오리진 헤더를 자르고, 키에는 정책에 넣은 것만 들어간다. Min TTL > 0이면 `no-store`도 무시된다

---

## 중간 점검 2

CDN을 거쳐 브라우저에 도착한 응답 헤더다.

```text
Cache-Control: public, max-age=600
Age: 500
ETag: "v7"
```

브라우저가 이 사본을 **서버 확인 없이** 쓸 수 있는 시간은 앞으로 몇 초인가? 그리고 그 시간이 지나면 브라우저는 무엇을 보내는가?

---

## 중간 점검 2 정답 : 100초, 그 뒤 `If-None-Match: "v7"`

- 신선 기간 600초 중 CDN이 이미 500초를 썼다. 브라우저 몫은 **100초**
- 100초가 지나면 낡은 사본이 되지만 `ETag`가 있으니 버리지 않는다. 다음 요청에 `If-None-Match: "v7"`를 실어 보내고, `304`가 오면 캐시 본문을 그대로 쓴다

> 흔한 오답: "600초". `Age`를 빼먹으면 CDN 사본의 나이만큼 낡은 것을 신선하다고 보게 된다.

---

## Part 3 : 자산별 캐시 전략

<!-- _class: invert -->

---

## 왜 파일 종류마다 다르게 다루는가

캐시 정책을 정할 때 보는 축은 셋이다.

| 자산             | 얼마나 자주 바뀌나     | URL이 내용을 식별하나   | 개인화되나  |
| ---------------- | ---------------------- | ----------------------- | ----------- |
| HTML             | 배포마다, 또는 매 요청 | 아니오 (`/`는 항상 `/`) | 때때로      |
| JS / CSS         | 배포마다               | **예** (해시 파일명)    | 아니오      |
| 빌드 포함 이미지 | 거의 안 바뀜           | 예 (해시 파일명)        | 아니오      |
| 업로드 이미지    | 사용자가 바꿈          | 대개 아니오             | 아니오      |
| 폰트             | 거의 안 바뀜           | 예                      | 아니오      |
| API 응답         | 매 요청                | 아니오                  | **대개 예** |

"URL이 내용을 식별하는가"가 가장 중요한 축이다. 그렇다면 **무한히 캐시**해도 되고, 아니라면 **바뀔 수 있는 주기 안에서** 잘라야 한다.

---

## HTML : 짧게, 그러나 CDN은 길게

HTML은 진입점이다. 다른 모든 파일의 URL을 HTML이 들고 있다.

```text
Cache-Control: no-cache            (또는 max-age=0, must-revalidate)
ETag: "..."                        ← 304를 가능하게 하는 재료
```

- 브라우저는 매번 확인하되, 안 바뀌었으면 `304`로 본문을 아낀다
- **HTML만 최신이면 나머지는 따라온다.** HTML이 참조하는 JS 파일명이 바뀌었으니 브라우저는 새 파일을 새로 받는다

CDN에는 따로 길게 줄 수 있다.

```text
Cache-Control: public, max-age=0, must-revalidate, s-maxage=300, stale-while-revalidate=86400
```

오리진은 5분에 한 번만 HTML을 만들고, 그 사이 요청은 전부 엣지가 받는다. Next.js ISR이 이 헤더를 내보낸다.

---

## JS / CSS : 내용 해시 + 1년 + immutable

```text
/_next/static/immutable/chunks/2kzkiswgqacx4.js
Cache-Control: public, max-age=31536000, immutable
```

파일명 `2kzkiswgqacx4`는 내용의 해시다. 이 한 가지 사실에서 전략 전체가 나온다.

- 내용이 바뀌면 이름이 바뀐다. 그러니 **같은 URL의 내용은 영원히 같다**
- 영원히 같으니 1년(HTTP가 권고하는 상한) 동안 신선하다고 해도 되고, 새로고침 때 확인도 필요 없다(`immutable`)
- **무효화가 필요 없는 캐시**다. 바꾸고 싶으면 새 이름으로 새 파일을 올리면 된다

번들러(webpack, Vite, Turbopack)가 해시 파일명을 만드는 이유가 이것이다. 해시 없는 `app.js`에 1년 캐시를 주면 배포가 사용자에게 도달하지 않는다.

<!-- 1년은 RFC 9111이 "1년을 넘는 값은 1년으로 간주해도 된다"고 하는 데서 온 관행이다. -->

---

## 쿼리스트링 버저닝은 반쪽짜리다

해시 파일명 대신 `app.js?v=42`를 쓰는 프로젝트가 아직 많다.

- 브라우저는 쿼리스트링을 캐시 키에 넣으니 **브라우저 캐시는 갱신된다**
- 그러나 CDN 중에는 쿼리스트링을 무시하도록 설정된 곳이 있다(CloudFront의 관리형 정책 CachingOptimized가 그렇다). 그러면 `?v=42`도 `?v=41`도 같은 사본이다
- 반대로 CDN이 쿼리를 키에 넣으면 `?utm_source=...` 값마다 사본이 갈라져 HIT율이 떨어진다

파일명에 해시를 넣으면 이 양쪽 문제가 모두 없다. 쿼리 버저닝을 유지해야 한다면 CDN 캐시 정책에서 **버전 파라미터만** 키에 포함하도록 지정한다.

---

## 해시 파일명이 만드는 배포 순서 문제

```text
t0  사용자가 HTML(v1)을 열어 둔 상태. 화면은 app.a1b2.js를 로드해 두었다
t1  v2 배포. HTML(v2)은 app.c3d4.js를 참조. 서버에서 app.a1b2.js는 삭제됨
t2  사용자가 v1 화면에서 페이지 이동 → 아직 안 받은 청크 chunk-7.a1b2.js 요청
    → 404 → ChunkLoadError
```

첫 슬라이드의 두 번째 질문("일부 사용자만 ChunkLoadError")의 정체다. 새로고침하면 HTML(v2)을 받아 사라지니 재현이 안 된다.

해법은 세 겹으로 둔다.

1. **자산을 먼저 올리고 HTML을 나중에 바꾼다.** 새 HTML이 참조하는 파일이 없는 순간을 없앤다
2. **이전 배포의 자산을 한동안 남긴다.** Vercel은 이전 배포를 지우지 않고, S3 배포라면 정리 주기를 며칠로 둔다
3. **버전 불일치를 감지하면 새로고침을 유도한다.** 청크 로드 실패 시 한 번 `location.reload()`

<!-- Vercel의 "skew protection"은 3번을 플랫폼이 대신 해 주는 기능이다. 요청에 배포 ID를 실어 옛 배포의 자산을 옛 배포에서 가져온다. -->

---

## 이미지 : 두 종류를 나눠서 본다

**빌드에 포함된 이미지** (로고, 아이콘, `import logo from './logo.png'`)

- 번들러가 해시 파일명을 붙인다. JS와 같은 전략: 1년 + `immutable`

**런타임에 정해지는 이미지** (사용자 업로드, CMS)

- URL이 `/uploads/profile.jpg`처럼 고정이면 교체해도 캐시가 옛것을 준다. 첫 슬라이드의 세 번째 질문이다
- 해법은 둘 중 하나. **업로드마다 새 키**(`/uploads/8f3a...jpg`)를 만들거나, URL을 고정할 거면 **짧은 TTL + ETag**

```text
Next.js 16의 /_next/image 기본값:
  정적 import 이미지  → public, max-age=31536000, immutable   (실측)
  원격 URL 이미지     → minimumCacheTTL 14400초(4시간) 기준으로 max-age 결정
```

---

## 이미지 : 크기와 포맷마다 사본이 갈라진다

이미지 CDN(next/image, Cloudinary, imgix)은 한 원본에서 여러 변형을 만든다.

```text
/_next/image?url=/media/profile.jpeg&w=48&q=75    Accept: image/avif → avif 735B
/_next/image?url=/media/profile.jpeg&w=48&q=75    Accept: */*        → jpeg 975B
/_next/image?url=/media/profile.jpeg&w=384&q=75   ...
```

- 캐시 키는 `URL(원본, w, q) + Accept`다. `Vary: Accept`가 그 마지막 조각을 키에 넣는다
- 변형 수가 많을수록 **첫 사용자는 매번 MISS**를 맞는다. 앞서 잰 372ms가 그것이다. `sizes`와 `deviceSizes`를 줄여 변형 수를 통제하는 것이 HIT율을 올리는 방법이다

---

## 이미지 도메인을 분리하는 관행

`img.example.com`, `static.example.com`처럼 정적 자산을 다른 호스트로 빼는 이유는 성능보다 **정책 분리**에 가깝다.

- **쿠키가 안 실린다.** 메인 도메인의 세션 쿠키가 이미지 요청마다 따라가지 않는다. 요청이 작아지고, CDN이 쿠키 있는 요청을 캐시 대상에서 빼는 규칙에도 안 걸린다
- **TTL과 무효화 정책이 독립된다.** 이미지 CDN을 통째로 다른 벤더에 맡길 수 있다
- **보안 경계.** 사용자 업로드 파일이 메인 도메인의 쿠키와 동일 출처를 공유하지 않는다

주의할 점도 있다. HTTP/2 이후로 도메인을 쪼개는 것 자체는 성능 이득이 없고, DNS 조회와 TLS 핸드셰이크가 한 번 더 든다. 분리했다면 HTML에 `<link rel="preconnect" href="https://img.example.com">`을 넣어 그 비용을 먼저 치른다.

---

## 폰트 : immutable에 CORS까지

```text
$ curl -sI https://yceffort.kr/_next/static/immutable/media/03bda585a99c6450-s.p.0glcd8n2pdab0.woff2
cache-control: public,max-age=31536000,immutable
access-control-allow-origin: *
content-type: font/woff2
```

- 폰트 파일은 해시 파일명이고 거의 안 바뀐다. JS와 같은 전략이다
- 다른 점 하나: 폰트는 다른 출처에서 불러올 때 **CORS 모드로 요청**되도록 명세에 정해져 있다. `Access-Control-Allow-Origin`이 없으면 CDN에 있어도 브라우저가 버린다
- 정적 자산 도메인을 분리했다면 폰트만은 이 헤더를 빠뜨리기 쉽다. `crossorigin` 속성이 붙은 `<link rel="preload" as="font">`도 같은 이유다
- S3 오리진이면 버킷 CORS 설정에 허용 출처를 넣고, CloudFront 캐시 정책에 `Origin` 헤더를 포함해야 출처별 CORS 응답이 제대로 캐시된다

---

## API 응답 : 기본은 저장 금지, 예외만 열어 준다

```text
GET /api/me                  → Cache-Control: private, no-store
GET /api/products?page=1     → Cache-Control: public, s-maxage=60, stale-while-revalidate=600
```

- 사용자별로 다른 응답은 **`private` 또는 `no-store`** 다. CDN에 남으면 다른 사용자에게 나간다
- 모든 사용자에게 같은 공개 데이터(상품 목록, 환율, 공지)는 CDN에 짧게 두고 SWR로 갱신한다. 오리진 부하가 1/N로 준다

RFC 9111의 함정: `Authorization` 요청의 응답은 공유 캐시가 저장하지 않는 것이 기본이지만, 응답에 **`public`, `s-maxage`, `must-revalidate` 중 하나라도 있으면 저장한다.** 인증 API에 "일단 public" 습관이 위험한 이유다.

CloudFront의 함정: `Authorization`을 오리진 요청 정책으로 전달하면서 캐시 키에 넣지 않으면, 문서의 경고 그대로 "인증된 사용자와 안 된 사용자에게 같은 사본"이 나간다. 인증 API는 CachingDisabled 동작으로 뺀다.

---

## 자산별 전략 한 장 요약

| 자산                          | Cache-Control                         | 검증자 | 갱신 방법           |
| ----------------------------- | ------------------------------------- | ------ | ------------------- |
| HTML                          | `no-cache` (+ CDN용 `s-maxage`, SWR)  | ETag   | 다음 요청에 자동    |
| JS / CSS / 빌드 이미지 / 폰트 | `public, max-age=31536000, immutable` | 불필요 | 새 해시 파일명      |
| 업로드 이미지                 | 새 키, 또는 `max-age=짧게` + ETag     | ETag   | 새 키 또는 TTL 만료 |
| 개인화 API                    | `private, no-store`                   | 없음   | 캐시 없음           |
| 공개 API                      | `public, s-maxage=N` + SWR            | ETag   | TTL 또는 CDN purge  |

한 문장으로 줄이면: **URL이 내용을 식별하면 영원히, 아니면 짧게 확인하며, 개인화면 저장하지 않는다.**

---

## 무효화(purge)와 버저닝의 결정적 차이

"CDN 캐시를 비우면 되지 않나요?"

```text
purge      CDN API로 엣지의 사본을 지운다      →  브라우저 캐시는 그대로다
버저닝     URL을 바꾼다                        →  브라우저도 새 URL을 새로 받는다
```

- CDN은 내 것이라 지울 수 있지만, **사용자 브라우저의 캐시는 내 손이 닿지 않는다.** 만료되거나 URL이 바뀌어야만 갱신된다
- 그래서 "HTML은 짧게, 자산은 URL 버저닝으로 길게" 조합이 표준이다. 브라우저 캐시를 지울 방법이 없다는 전제 위에 세운 설계다
- purge는 HTML처럼 URL을 못 바꾸는 응답을 **CDN 쪽에서만** 급히 갱신할 때 쓴다. 브라우저 쪽은 `no-cache`가 알아서 확인한다

<!-- "사용자에게 캐시 지워 달라고 안내"는 해법이 아니다. 그 안내가 필요한 시점에 설계가 틀린 것이다. -->

---

## CloudFront 무효화(invalidation)

```bash
aws cloudfront create-invalidation --distribution-id E1ABC2DEF3 \
  --paths "/index.html" "/images/*"
```

- 엣지의 사본을 지운다. 다음 요청은 오리진으로 간다. 반영까지 보통 수십 초에서 몇 분
- 요금은 **경로 수** 기준이다. 한 달 1,000경로까지 무료, 넘으면 경로당 과금. `/images/*`처럼 와일드카드 한 줄은 파일이 수천 개여도 **1경로**로 센다
- 그래서 `--paths "/*"` 한 줄이 파일 열 개를 나열하는 것보다 싸다

AWS 문서도 무효화보다 **버전 파일명을 우선 쓰라**고 권한다. 이유는 앞 슬라이드와 같다. 무효화는 사용자 브라우저와 회사 프록시의 사본을 못 건드린다. 배포 파이프라인에서 무효화가 필요한 대상은 `index.html` 같은 고정 URL뿐이다.

---

## S3 + CloudFront로 손으로 만들기

**1. S3 업로드 때 객체별 `Cache-Control`을 넣는다.** S3가 이 메타데이터를 응답 헤더로 내보낸다.

```bash
aws s3 cp build/static s3://my-bucket/static --recursive \
  --cache-control "public, max-age=31536000, immutable"
aws s3 cp build/index.html s3://my-bucket/index.html --cache-control "no-cache"
```

**2. 동작(behavior)을 경로별로 나눈다.**

| 경로 패턴   | 오리진 | 캐시 정책                                                         |
| ----------- | ------ | ----------------------------------------------------------------- |
| `/static/*` | S3     | CachingOptimized                                                  |
| `/api/*`    | ALB    | CachingDisabled                                                   |
| `*` (기본)  | S3     | UseOriginCacheControlHeaders (`index.html`의 `no-cache`를 따르게) |

**3. 헤더 없이 올린 파일이 없는지 확인한다.** 없으면 CloudFront 24시간, 브라우저는 휴리스틱이다.

---

## Part 3 정리

- 정책은 세 축으로 정한다: 변경 빈도, **URL이 내용을 식별하는가**, 개인화 여부
- HTML은 `no-cache` + `ETag`로 매번 확인하되 본문은 아끼고, CDN에는 `s-maxage` + SWR로 길게 둔다
- JS/CSS/폰트/빌드 이미지는 해시 파일명 + 1년 + `immutable`. 무효화 대신 새 이름을 쓴다
- 업로드 이미지는 새 키를 만들거나 짧은 TTL, 이미지 변형은 `Vary: Accept`로 키가 갈라진다
- 개인화 API는 `private, no-store`. `public`은 인증 응답까지 CDN에 남긴다
- purge는 CDN만 비운다. 브라우저 캐시는 URL 변경이나 만료로만 갱신된다
- S3 + CloudFront는 업로드 때 `--cache-control`, 경로별 동작, 무효화는 `/*` 한 경로. AWS 문서도 버전 파일명을 우선하라고 한다

---

## 중간 점검 3

팀원이 웹팩 설정을 바꿔 `main.js`(해시 없음)를 내보내고, 성능을 위해 다음 헤더를 붙였다.

```text
Cache-Control: public, max-age=31536000, immutable
```

배포 다음 날 어떤 일이 벌어지는가? 그리고 CDN purge로 해결되는가?

---

## 중간 점검 3 정답 : 배포가 사용자에게 도달하지 않고, purge로도 안 된다

- 어제 방문한 사용자의 브라우저에는 `main.js`가 1년짜리 신선한 사본으로 남아 있다. `immutable`이라 새로고침해도 확인 요청조차 안 보낸다
- CDN purge는 엣지의 사본만 지운다. 사용자 브라우저는 여전히 어제 파일을 쓴다
- 유일한 해법은 **URL을 바꾸는 것**. HTML이 `main.abc123.js`를 참조하게 만들고, 이후로는 해시 파일명을 유지한다

> 규칙: `immutable`과 긴 `max-age`는 **URL이 내용을 식별할 때만** 붙인다.

---

## Part 4 : 함정과 도구

<!-- _class: invert -->

---

## 함정 1 : 개인화 응답이 공유 캐시에 남는다

2015년 12월 25일, Steam 상점이 DDoS 대응 중 캐시 설정을 잘못 적용해 약 한 시간 동안 **다른 사용자의 계정 페이지(이메일, 주소 일부, 구매 내역)** 를 보여 준 사고가 있었다. Valve가 공식 설명을 냈다.

메커니즘은 단순하다.

```text
GET /account  (사용자 A, 쿠키 있음)  →  오리진 응답, 헤더에 private 없음
                                     →  CDN이 저장
GET /account  (사용자 B)              →  CDN HIT, A의 페이지가 B에게
```

막는 규칙도 단순하다.

- 사용자별 응답에는 **반드시 `private` 또는 `no-store`**. 프레임워크가 세션을 읽는 페이지에 자동으로 붙여 주는지 확인한다
- CloudFront에서 이 사고가 나는 조합은 **오리진 요청 정책으로 쿠키를 전달하면서 캐시 정책에는 쿠키를 안 넣는 것**이다. 캐시는 되는데 키에 사용자가 없다

---

## 함정 2 : 새로고침은 한 종류가 아니다

같은 페이지를 다시 여는 방법이 넷이고, 브라우저는 각각 다르게 요청한다.

| 동작                        | 메인 HTML                 | JS/CSS/이미지              |
| --------------------------- | ------------------------- | -------------------------- |
| 링크 클릭, 주소창 Enter     | 캐시 규칙대로             | 캐시 규칙대로              |
| 일반 새로고침 (Cmd+R)       | 재검증 (`max-age=0`)      | 캐시 규칙대로 (Chrome 54+) |
| 강력 새로고침 (Cmd+Shift+R) | `Cache-Control: no-cache` | 전부 `no-cache`, 캐시 무시 |
| DevTools "Disable cache"    | 캐시 무시                 | 캐시 무시 (열려 있는 동안) |

- "제 브라우저에선 되는데요"의 절반은 DevTools를 열어 둔 채 테스트해서 그렇다. 사용자는 DevTools가 없다
- Chrome이 일반 새로고침에서 서브리소스 재검증을 끊은 것이 `immutable`을 구현하지 않은 이유다. 대신 Firefox/Safari는 `immutable`이 있어야 이 동작을 한다

<!-- 재현할 때는 시크릿 창 + DevTools 닫고 + 일반 새로고침으로 사용자 조건을 맞춘다. -->

---

## 함정 3 : DevTools Network 탭 읽기

| Status | Size 열            | 뜻                                                        |
| ------ | ------------------ | --------------------------------------------------------- |
| 200    | `(memory cache)`   | 이 탭이 이미 메모리에 들고 있던 것. 네트워크 안 나감      |
| 200    | `(disk cache)`     | 디스크 캐시에서 읽음. fresh라 서버에 묻지 않았다          |
| 304    | 수백 B             | 서버에 물었고 "같다"고 해서 본문은 캐시에서 씀            |
| 200    | 전체 크기          | 실제로 다시 받았다. 캐시 없음, 만료, 또는 검증자 없음     |
| 200    | `(prefetch cache)` | `<link rel=prefetch>`나 라우터 프리페치로 미리 받아 둔 것 |

확인하는 순서를 정해 두면 빠르다.

1. Size 열이 캐시 표시인가 → 그렇다면 헤더는 **저장 당시** 것이다
2. 200 전체 크기인데 캐시를 기대했다면 → 응답 헤더의 `Cache-Control`, `Age`, 검증자 유무
3. CDN이 개입했나 → `x-vercel-cache`, `cf-cache-status`, `x-cache`

---

## 함정 4 : 브라우저가 보는 헤더가 CDN이 따른 규칙은 아니다

같은 사이트의 HTML이다.

```text
$ curl -sI https://yceffort.kr/
cache-control: public, max-age=0, must-revalidate
age: 2945
x-vercel-cache: HIT
x-nextjs-stale-time: 300
```

- 브라우저 입장: `max-age=0`이니 받자마자 낡았다. 다음 방문 때 반드시 서버에 확인한다
- 그런데 `age: 2945`, `HIT`. CDN은 49분째 이 사본을 쓰고 있다

오리진(Next.js)이 내보낸 헤더에는 `s-maxage=300, stale-while-revalidate`가 있었다. Vercel CDN은 그 값을 **자기 규칙으로 쓰고 브라우저에는 지운 뒤** 보낸다(벤더 문서에 명시된 동작).

> DevTools의 `Cache-Control`은 **브라우저용 최종본**이다. CDN이 따른 규칙은 `Age`와 HIT/MISS 헤더로 역추적한다.

---

## 함정 5 : 공용 CDN의 라이브러리는 더 이상 공짜가 아니다

"jQuery를 `cdnjs`에서 불러오면 다른 사이트에서 이미 받아 둔 캐시를 재사용한다"는 조언이 오래 돌았다.

- Chrome 86(2020), Firefox 85, Safari(더 이전)부터 브라우저 캐시 키에 **최상위 사이트**가 들어간다(캐시 파티셔닝). `a.com`에서 받은 `cdnjs.../jquery.js`와 `b.com`에서 받은 같은 파일은 **다른 캐시 항목**이다
- 이유는 프라이버시다. 캐시 적중 여부로 사용자가 어떤 사이트를 방문했는지 알아낼 수 있었다

남는 건 비용뿐이다. 외부 도메인이니 DNS + TLS가 한 번 더 들고, 그 CDN 장애가 내 사이트 장애가 된다. 라이브러리는 **번들에 넣어 내 정적 자산 도메인에서** 서빙한다.

---

## 함정 6 : bfcache는 HTTP 캐시가 아니다

뒤로가기를 눌렀을 때 페이지가 즉시 뜨는 것은 HTTP 캐시가 아니라 **bfcache(back/forward cache)** 다. 페이지 전체(DOM, JS 힙)를 메모리에 얼려 두었다가 그대로 되살린다.

- HTTP 캐시가 아무리 잘 돼 있어도 bfcache에 못 들어가면 뒤로가기가 느리다
- 못 들어가는 대표 원인: `unload` 이벤트 핸들러, 열린 `IndexedDB` 트랜잭션, 그리고 **`Cache-Control: no-store`가 붙은 HTML** (Chrome은 최근 일부 조건에서 허용하기 시작했지만 여전히 보수적이다)
- 확인은 DevTools Application 탭 → Back/forward cache → Test back/forward cache

HTML에 습관적으로 `no-store`를 붙이면 HTTP 캐시가 아니라 bfcache를 잃는다. 개인정보가 없는 페이지라면 `no-cache`가 맞다.

---

## 함정 7 : 서비스 워커는 세 번째 캐시다

```text
[페이지] ──▶ [서비스 워커 fetch 핸들러] ──▶ [HTTP 캐시] ──▶ [CDN] ──▶ [오리진]
```

- 서비스 워커가 등록돼 있으면 모든 요청이 **HTTP 캐시보다 먼저** 워커의 `fetch` 이벤트를 지난다. 워커가 `caches.match()`로 응답하면 HTTP 캐시 규칙은 아예 적용되지 않는다
- 반대로 워커 안에서 `fetch()`를 호출하면 그때는 HTTP 캐시를 정상적으로 탄다. 그래서 워커의 Cache API에 넣은 응답이 **HTTP 캐시에서 온 낡은 사본**일 수 있다
- 워커 스크립트(`sw.js`) 자체는 브라우저가 24시간마다 강제로 재검증한다. 여기에 1년 캐시를 줘도 24시간 뒤에는 확인한다

"캐시를 다 지웠는데 옛 화면"이라면 Application 탭에서 서비스 워커를 먼저 본다. 이 주제는 별도 시리즈(서비스 워커 캐싱 딥다이브)에서 다룬다.

---

## 함정 8 : Vary와 쿠키가 캐시를 조용히 죽인다

의도치 않게 HIT율을 0으로 만드는 헤더들이다.

```text
Vary: User-Agent          UA 문자열 수만큼 사본이 갈라진다. 실질적으로 캐시 불가
Vary: Cookie              사용자마다 사본. 공유 캐시가 무의미해진다
Vary: *                   "어떤 요청도 같지 않다". 명세상 캐시 불가
Set-Cookie: ...           대부분의 CDN이 이 응답을 저장 대상에서 뺀다
```

- 정적 자산 응답에 세션 쿠키가 실려 나가는 서버 설정(세션 미들웨어가 전 경로에 걸린 Express 앱 등)은 CDN HIT율을 그대로 깎는다
- 디바이스별 응답이 필요하면 `Vary: User-Agent` 대신 CDN의 디바이스 분류 헤더(예: CloudFront의 `CloudFront-Is-Mobile-Viewer`)로 키를 두세 가지로 제한한다

---

## Part 4 정리

- 개인화 응답에 `private`/`no-store`가 빠지면 공유 캐시가 다른 사용자에게 준다. Steam 2015가 그 사례다
- 새로고침은 네 종류다. 일반 새로고침은 Chrome에서 서브리소스를 재검증하지 않고, DevTools "Disable cache"는 사용자 조건이 아니다
- Network 탭은 Size 열부터 본다. `(disk cache)`면 헤더는 저장 당시 것이다
- 공용 CDN 캐시 공유는 파티셔닝으로 끝났다. bfcache는 HTTP 캐시와 별개고 `no-store`가 막는다
- 서비스 워커는 HTTP 캐시 앞에 선다. `Vary: User-Agent`, `Vary: Cookie`, 정적 자산의 `Set-Cookie`는 HIT율을 없앤다

---

## 중간 점검 4

사용자가 "배포했는데 옛날 화면"이라고 한다. 다음 중 **가장 먼저** 확인할 것은?

1. CDN purge를 실행한다
2. 사용자에게 강력 새로고침을 안내한다
3. 사용자 브라우저에서 HTML 응답의 Size 열과 `Cache-Control`, 그리고 서비스 워커 등록 여부를 본다
4. `max-age`를 전부 0으로 바꿔 재배포한다

---

## 중간 점검 4 정답 : ③

- ①은 브라우저 캐시를 못 지우고, ②는 그 사용자 한 명만 고치며, ④는 문제를 못 찾은 채 성능만 버린다
- 진단 순서: HTML이 `(disk cache)`면 HTML 캐시 정책 문제(휴리스틱 캐시 가능성), `200` 전체 크기인데 옛 화면이면 CDN 사본(`Age`, HIT) 문제, 둘 다 아니면 서비스 워커가 응답한 것

> 원칙: 캐시 문제는 **어느 캐시**인지 먼저 특정한다. 브라우저, CDN, 서비스 워커 중 하나다.

---

## Part 5 : 실무에서는 이렇게

<!-- _class: invert -->

---

## 새 프로젝트를 시작할 때 정하는 기본값

**먼저 프레임워크와 번들러가 이미 해 둔 것을 확인한다.** Next.js, Vite, CRA는 전부 해시 파일명을 만들고, Vercel이나 Amplify 같은 플랫폼은 헤더까지 붙인다. 이걸 덮어쓰는 설정이 없는지부터 본다.

직접 배포한다면 이 네 줄을 인프라 코드(CloudFront 동작, nginx 설정)에 처음부터 넣는다.

```text
해시 파일명 자산  (/static/*, /_next/static/*)   public, max-age=31536000, immutable
HTML                                             no-cache  + ETag
API 기본값                                        private, no-store
공개 API만 예외                                   public, s-maxage=N, stale-while-revalidate=M
```

- 정적 자산과 API는 **경로 접두사로 분리**해 둔다. CDN 동작을 경로 패턴으로 나누는 것이 전부 여기서 시작된다
- 캐시 정책의 **키에 무엇이 들어가는지**(쿼리스트링, 쿠키, 헤더)를 문서에 한 줄로 적어 둔다. 6개월 뒤의 내가 가장 먼저 찾는 정보다

---

## 배포 파이프라인에 넣는 순서

```text
1. 자산 업로드      해시 파일명 파일을 먼저 올린다. 이전 배포 파일은 지우지 않는다 (--delete 금지)
2. HTML 교체        새 자산을 참조하는 HTML을 올린다
3. 무효화           고정 URL만 (index.html, /). 자산은 무효화할 필요가 없다
4. 검증             curl -sI 로 HTML, JS, 이미지 하나씩 헤더를 찍어 파이프라인 로그에 남긴다
5. 정리             N일 지난 이전 배포 자산을 별도 작업으로 지운다
```

배포 스크립트 끝에 이런 확인을 붙여 두면 "헤더가 어느 순간 사라졌다"를 그날 안다.

```bash
curl -sI https://example.com/ | grep -i cache-control        # no-cache 여야 한다
curl -sI https://example.com/static/main.abc123.js \
  | grep -i cache-control                                      # immutable 이어야 한다
```

앱 쪽에는 **청크 로드 실패 시 한 번 새로고침**하는 코드를 둔다. 배포 순서를 지켜도 오래 열어 둔 탭은 남는다.

---

## 코드 리뷰에서 보는 것

캐시 헤더가 들어간 PR에서 묻는다. 하나라도 "예"면 머지 전에 고친다.

| 질문                                           | 왜                                         |
| ---------------------------------------------- | ------------------------------------------ |
| 해시 없는 파일명에 1년 캐시를 붙였나           | 배포가 사용자에게 도달하지 않는다 (Part 3) |
| 사용자별 응답에 `public`이나 `s-maxage`가 있나 | 다른 사용자에게 나간다 (Part 4)            |
| `Vary: User-Agent`, `Vary: Cookie`를 붙였나    | HIT율이 0에 가까워진다                     |
| 정적 자산 응답에 세션 쿠키가 실려 나가나       | CDN HIT율이 무너진다                       |
| 업로드 이미지 URL이 고정인데 교체가 가능한가   | 교체해도 옛 이미지가 보인다                |
| HTML에 습관적으로 `no-store`를 붙였나          | bfcache를 잃는다 (Part 4)                  |

헤더 값을 외울 필요는 없다. **"이 URL의 내용이 바뀔 수 있는가"** 하나만 물으면 대부분 걸린다.

---

## "옛날 화면이 보여요"를 받았을 때

순서를 지키면 30분 안에 어느 캐시인지 특정된다. 순서를 건너뛰고 purge부터 하면 원인을 영영 모른다.

```text
1. 재현 조건 맞추기     시크릿 창, DevTools 닫기, 일반 새로고침. 사용자와 같은 조건인지 확인
2. 브라우저 캐시        Network 탭 Size 열. (disk cache) 면 브라우저, HTML 응답의 Cache-Control 확인
3. CDN 캐시             curl -sI 로 Age 와 HIT/MISS. Age 가 크고 HIT 면 CDN 사본
4. 서비스 워커          Application 탭 → Service Workers. 등록돼 있으면 여기가 응답했을 가능성
5. 그 다음에 purge      어느 캐시인지 알았을 때만. purge 는 CDN 만 비운다는 것을 기억
```

- 사용자에게 "캐시를 지워 보세요"라고 안내하게 됐다면, 그 자체가 **설계가 틀렸다는 신호**다. 안내가 아니라 URL 버저닝을 고친다
- 재발 방지는 헤더 수정이 아니라 **배포 파이프라인의 검증 단계**(앞 슬라이드)에 넣는다

---

## 유지하기 : 무엇을 보고, 누구에게 무엇을 묻나

**대시보드에서 보는 숫자**

- **CDN HIT율** : 정적 자산은 95% 이상이 정상이다. 갑자기 떨어지면 캐시 키가 넓어졌다(쿼리스트링, 헤더 추가)는 뜻
- **오리진 요청 수** : HIT율의 거울. 배포 직후 잠깐 오르는 것은 정상, 계속 높으면 TTL이 짧거나 키가 쪼개진 것
- **이미지 변형 수** : `sizes`, `deviceSizes`를 늘릴 때마다 첫 사용자가 MISS를 맞는다

**인프라 담당에게 묻는 것**

- 캐시 정책의 **키에 무엇이 들어가나** (쿼리스트링을 통째로 무시하나, 특정 파라미터만 보나)
- **`Set-Cookie`가 있는 응답**을 저장하나, 쿠키를 오리진에 전달하면서 키에는 안 넣는 동작이 있나
- **무효화 권한과 자동화** : 배포 파이프라인이 `index.html`만 무효화할 수 있나
- 브라우저에 가는 `Cache-Control`을 **CDN이 고쳐서 보내나** (Vercel처럼 `s-maxage`를 벗기는지)

---

## 종합 퀴즈

<!-- _class: invert -->

여섯 문제. 문제마다 대응하는 Part를 표시했다.

---

## 퀴즈 1 : 헤더 해석 (Part 2)

```text
HTTP/2 200
Cache-Control: private, max-age=0, no-cache
ETag: "x1"
```

이 응답에 대한 설명으로 **틀린** 것은?

1. 브라우저는 이 응답을 저장한다
2. CDN은 이 응답을 저장하지 않는다
3. 다음 요청에서 브라우저는 서버에 묻지 않고 캐시를 쓴다
4. 서버가 `304`를 돌려주면 브라우저는 캐시된 본문을 쓴다

---

## 퀴즈 1 정답 : ③

- `no-cache`는 저장은 하되 매번 확인이다. ①은 맞고 ③은 틀렸다
- `private`이 있으니 CDN은 저장하지 않는다(②)
- `ETag`가 있으니 확인 요청에 `If-None-Match: "x1"`가 실리고, `304`면 캐시 본문을 쓴다(④)

> `no-cache`는 "캐시 끔"이 아니다. "쓰기 전에 물어봄"이다.

---

## 퀴즈 2 : 신선도 계산 (Part 2)

브라우저가 12:00:00에 다음 응답을 받았다.

```text
Cache-Control: max-age=300
Age: 120
```

12:03:30에 같은 URL을 요청하면 브라우저는 네트워크에 나가는가?

---

## 퀴즈 2 정답 : 나간다

- 신선 기간 300초에서 `Age` 120초를 뺀 **180초**가 브라우저 몫이다. 12:03:00까지만 신선하다
- 12:03:30은 30초 지났으니 stale이다. 검증자가 없으므로 확인 요청이 아니라 **전체 재요청**이다

> `Age`를 빼고 계산한 사람은 "300초 안이니 캐시"라고 답한다. CDN 뒤에서 이 실수가 자주 나온다.

---

## 퀴즈 3 : 이미지 교체 (Part 3)

프로필 이미지 URL이 `/uploads/user-42.jpg`로 고정이고 응답은 `Cache-Control: public, max-age=86400`이다. 사용자가 이미지를 바꿨는데 하루 동안 옛 이미지가 보인다. **가장 근본적인** 해법은?

1. `max-age`를 60으로 줄인다
2. 업로드할 때 CDN purge를 호출한다
3. 업로드마다 새 파일 키(`/uploads/user-42-8f3a1c.jpg`)를 만들고 프로필 데이터에 그 URL을 저장한다
4. 응답에 `Vary: Cookie`를 붙인다

---

## 퀴즈 3 정답 : ③

- ①은 CDN HIT율을 깎으면서도 최대 1분은 여전히 옛 이미지다
- ②는 CDN만 비운다. 사용자 브라우저의 하루짜리 사본은 남는다
- ④는 사용자마다 사본을 쪼개 캐시를 무력화할 뿐 갱신과 무관하다
- ③은 URL이 내용을 식별하게 만든다. 그러면 `max-age`를 1년으로 늘려도 안전하다

> 브라우저 캐시를 갱신하는 방법은 만료와 URL 변경뿐이다.

---

## 퀴즈 4 : 배포 직후 오류 (Part 3)

SPA를 S3 + CloudFront로 배포한다. 빌드 스크립트가 `aws s3 sync --delete`로 이전 파일을 전부 지우고 새 파일을 올린다. HTML은 `no-cache`, JS는 해시 파일명 + `immutable`이다.

배포 직후 **이미 사이트를 열어 둔** 사용자에게 무슨 일이 생기는가? 헤더는 올바른데 왜 그런가?

---

## 퀴즈 4 정답 : 페이지 이동 시 `ChunkLoadError`

- 열어 둔 화면은 옛 HTML이 참조하는 옛 청크 이름을 알고 있다. 아직 안 받은 청크를 요청하는 순간 `--delete`로 지워진 파일이라 404다
- 헤더는 옳다. 문제는 **옛 배포의 자산을 지운 것**이다. 해시 파일명은 "새 이름을 추가"하는 전략이지 "옛 이름을 지워도 되는" 전략이 아니다
- 해법: `--delete`를 빼고 N일 뒤 정리, 자산 먼저 올리고 HTML 나중에, 청크 로드 실패 시 새로고침 유도

---

## 퀴즈 5 : 공유 캐시와 인증 (Part 3, 4)

`GET /api/orders`는 `Authorization: Bearer ...` 헤더로 인증한다. 응답 헤더는 다음과 같다.

```text
Cache-Control: public, max-age=60
```

CDN이 이 응답을 저장하는가? 저장한다면 무슨 일이 생기는가?

---

## 퀴즈 5 정답 : 저장한다. 다른 사용자의 주문 내역이 나간다

- RFC 9111은 `Authorization` 요청의 응답을 공유 캐시가 저장하지 않도록 하지만, **`public`, `s-maxage`, `must-revalidate`가 있으면 예외**다. 여기엔 `public`이 있다
- 캐시 키는 URL이다. `Authorization` 값은 `Vary`에 없으니 키에 안 들어간다. 60초 동안 첫 사용자의 응답이 모두에게 간다
- 고치는 법: `private, no-store`. 정말 CDN에 두고 싶다면 `Authorization`을 캐시 키에 넣고 HIT율을 포기한다
- CloudFront라면 GET의 `Authorization`이 기본으로 제거돼 오리진이 401을 내고, 그 401이 60초 캐시된다. 유출은 아니지만 장애다

> `public`은 "공개해도 되는 데이터"라는 뜻으로 붙이는 단어가 아니다. "공유 캐시에 저장하라"는 지시다.

---

## 퀴즈 6 : 진단 (Part 4)

DevTools Network 탭에서 `main.a1b2c3.js` 행이 이렇게 보인다.

```text
Status 200   Size 412 kB   Time 850 ms
응답 헤더: cache-control: public, max-age=31536000, immutable
           age: 0
           x-vercel-cache: MISS
```

이 사용자는 두 번째 방문이고, 파일은 어제 배포된 것 그대로다. 세 개의 캐시 중 무엇이 빠졌고, 무엇이 빠지지 않았나?

---

## 퀴즈 6 정답 : 브라우저 캐시도 CDN 캐시도 비어 있었다

- Size가 `(disk cache)`가 아니라 실제 크기이니 **브라우저 캐시에 없었다.** 두 번째 방문인데도 없다면 DevTools "Disable cache"가 켜져 있거나, 시크릿 창이거나, 사용자가 캐시를 지웠거나, 어제 방문 때 이 청크를 로드하지 않은 경로였다
- `MISS`, `age: 0`이니 **이 엣지에도 없었다.** 어제 배포 이후 이 지역에서 아무도 이 파일을 요청하지 않았거나, 엣지가 용량 정책으로 내보냈다
- 헤더 자체는 정상이다. 이 요청이 사본을 채웠으니 다음부터는 양쪽 다 HIT다

> 850ms 중 얼마가 캐시 부재 때문인지는 Timing 탭의 Waiting(TTFB)이 답한다. 헤더만 보고 "캐시가 안 된다"고 결론내지 않는다.

---

## 전체 요약 : 다섯 문장

1. CDN은 사본을 사용자 가까이 두는 캐시 서버들이고, 캐시는 브라우저(사설)와 CDN(공유) 둘이다
2. 캐시는 저장 가능 여부, 신선도(`max-age`에서 `Age`를 뺀 값), 재검증(`ETag`) 세 질문으로 응답을 다룬다
3. URL이 내용을 식별하면(해시 파일명) 1년 + `immutable`, 아니면 `no-cache` + `ETag`로 매번 확인한다
4. 개인화 응답은 `private` 또는 `no-store`. `public`은 인증 응답까지 공유 캐시에 남긴다
5. 브라우저 캐시는 purge할 수 없다. 갱신은 만료와 URL 변경뿐이고, 그래서 HTML은 짧게, 자산은 버저닝으로 길게 둔다

---

## 참고 자료

- [RFC 9111 : HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111) (+ [RFC 8246 immutable](https://www.rfc-editor.org/rfc/rfc8246), [RFC 5861 stale-while-revalidate](https://www.rfc-editor.org/rfc/rfc5861)) : 저장 조건, 신선도, `Authorization` 예외의 원문
- [MDN : HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching) : 지시어별 브라우저 동작 정리
- Chrome : [Reload, reloaded](https://blog.chromium.org/2017/01/reload-reloaded-faster-and-leaner-page_26.html), [Partitioning the HTTP cache](https://developer.chrome.com/blog/http-cache-partitioning), [bfcache](https://web.dev/articles/bfcache)
- [CloudFront : Manage how long content stays in the cache](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html) : TTL 합성 표와 Min TTL 경고문
- CloudFront : [Managed cache policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html), [Request and response behavior](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorCustomOrigin.html), [Invalidate files](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)
- [Vercel Docs : Edge Cache](https://vercel.com/docs/edge-cache) : `s-maxage`를 브라우저 응답에서 제거하는 동작
- [Steam : Update on Christmas Issues (2015)](https://store.steampowered.com/news/post/1978855) : 캐시 설정 오류 사고의 공식 설명

---

# 감사합니다

<!-- _class: invert -->

@yceffort
