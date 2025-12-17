---
title: '웹 서비스 성능 분석 (2)'
tags:
  - web-performance-analysis
  - web
published: true
date: 2025-05-12 09:44:34
description: '관심 가져주셔서 감사합니다. 🙇🏻‍♂️'
series: '웹 서비스 성능 분석'
seriesOrder: 2
---

## 실제 개발자 피드백

### 글이 많이 도움이 되었는지

실질적으로 많은 도움이 되었습니다. lodash와 같이 트리쉐이킹이 되지 않는 라이브러리의 대체, 네임스페이스 사용 등은 바로 적용하여 테스트 해볼 수 있는 최적화 방안이라는 생각이 들었습니다. 답변주신 다른 방안들도 차례로 적용 및 비교해 볼 예정입니다.

### 다른 개발자에게 이 성능 분석을 추천할 수 있을지

결론부터 말씀 드리면 다른 분들에게 추천 가능하고, 또 추천할 예정입니다. 사이트의 최적화에 대해서 막연하게 필요성은 느끼고 있지만 적확한 분석 방안과 최적화 방안에 대해 알지 못해 부분적인 처리만 하는 경우가 많다고 생각 됩니다. 각 사이트 별로 적절한 방안을 제안 받을 수 있기 때문에 실제로 추천할 예정입니다.

### 추가적으로 궁금한 내용

> 현재 Admin 서비스도 운영 중인데, 이런 에디터/ B2B 중심 웹서비스에서 성능 최적화를 할 때 서비스와 전략이 달라지는 부분이 있다면 어떤 것이 있을까요?

어드민 서비스의 경우 사용자의 특성, 패턴, 그리고 목표가 다르기 때문에 조금 다른 전략이 필요합니다. 물론 모든 웹서비스가 똑같이 성능을 위해 모든 방면에서 최선을 다하면 좋겠지만, 현실적으로 업무에 쏟는 시간이나 인력이 제한적이기 때문에 (어드민이라면 특히 관심 밖일 수도 있습니다.) 다음의 것을 고려해보시면 좋을 것 같습니다.

1. 가장 중요한 것: 로그인 후 주요 기능 사용시에 인터랙션 및 성능 (INP, TTI 위주)

   어드민의 경우 에디터를 통한 글자 입력, 파일 업로드 등을 사용하는 경우가 많기 때문에 이 기능을 이용하는 동안 버벅임이나 입력지연, 느린 화면 전환등이 없어야 합니다. 복잡한 계산이나 DOM 조작으로 인하여 메인스레드에 부담을 주지 않으시는 것을 고려해보시기 바랍니다.

2. 공격적인 코드 분할 및 지연 로딩

   아무래도 글자입력, 파일업로드 등의 라이브러리는 다른 라이브러리 대비 무겁기 마련입니다. 라우트, 컴포넌트, 권한 등 다양한 기준으로 공격적으로 코드 분할을 하시어 불필요한 코드가 로드 되는 것을 줄이시고, 핵심 기능만 로드 되도록 세심하게 주의를 기울이시길 바랍니다.

3. 데이터 처리 및 렌더링

   어드민의 경우 보여줘야할 데이터가 많기 때문에 대량의 데이터를 처리해야할 필요성도 많을 것입니다. 반드시 화면을 그리는데 필요한 데이터만 가져오시어 렌더링하는 HTMLElement 요소의 수를 줄이시고, 렌더링 성능을 향상 시켜주세요. API 응답 역시 이에 맞춰 필요한 것만 가져오셔야 하며, 입력이 잦으므로 디바운스 및 스로틀도 공격적으로 사용해보시기 바랍니다.

4. 캐싱

   어드민 사용자의 경우 주로 반복적으로 계속해서 서비스를 방문하게 됩니다. 따라서 애플리케이션 데이터, 정적 에셋(이미지 등) 주요 API 응답등을 캐싱하시어 가급적으로 네트워크 요청을 줄이시고, 사용자 경험을 향상 시켜주세요. 특히 캐싱은 사용자가 자주 방문하는 페이지에서 효과를 볼 수 있습니다.

결국 어드민 및 B2B 서비스에서의 성능 최적화는 사용자의 작업 효율성과 직결되므로, 언급된 전략들을 중심으로 지속적인 관심과 개선 노력을 기울이시는 것이 중요합니다.

> 이 질문은 연관이 크게 없다고 생각하실 수도 있어서 불편하시거나 어려운점 있으시면 편하게 말씀해 주셔도 됩니다. 저희 팀에서는 사내 공통 라이브러리를 만들 계획인데, 번들러, lodash 같은 유틸리티 함수 구성 등에서 단순한 코드 재사용을 넘어서 번들 크기, DX, 성능을 고려한 구조를 만들기 위해 어떤 점을 가장 우선적으로 고려하면 좋을지 혹시 알려주실 수 있는 부분이 있을까요?

사내 공통 라이브러리를 만드는 작업은 재밌어보입니다 저도 이전 회사와 현재 회사에서 사내 공통라이브러리 (디자인 시스템, 패키지 등)을 만드는 일을 했었는데요. 이 작업은 재밌긴 하지만, 목표가 명확하지 않으면 같이 개발하시는 분이 적극적으로 도와주시지 않거나, 의욕을 잃으실 수 도 있습니다. 그래서 다음과 같은 점을 고려해보시면 좋을 것 같습니다.

1. 마이크로 서비스 분리: 현재 제공되고 있는 웹 서비스를 탭 별로 별도의 주소와 서비스로 분리해보시는 건 어떨까요? 현재 구조는 모든 서비스가 하나의 저장소에 있다보니 버전 업, 배포, 테스트 등이 어려우실 것 같습니다. 또한 이전에 언급드렸던 결제 모듈, excel 모듈 등이 웹서비스 전체에 포함되어 있는 것도 아마 그런 이유가 아닐 까 싶습니다. 홈, 상품 목록, 로그인한 사용자가 보는 서비스 등으로 분리하시면 다음과 같은 이점이 있을 것 같습니다.
   - 서비스 안정성 향상: 서비스 장애를 전체 서비스로 확대하지 않고, 해당 서비스에만 국한시킬 수 있습니다.
   - 공통라이브러리 구축: 말씀 하신 공통 라이브러리를 적극적으로 사용하실 수 있고, 또 서비스 분리시에 만든 공통라이브러리를 사용해보실 수 있습니다.
   - 코드 품질 향상: 서비스가 분리되면 각 서비스에 대한 테스트를 독립적으로 진행할 수 있어, 코드 품질을 높일 수 있습니다.
   - 배포 및 유지보수 용이: 각 서비스가 독립적으로 배포되므로, 특정 서비스에 대한 업데이트나 버그 수정을 더 쉽게 수행할 수 있습니다.
   - 신규 프로젝트 시작 용이: 새로운 서비스나 기능을 추가할 때, 기존 서비스와의 의존성을 최소화하여 더 빠르게 개발할 수 있습니다.

   다만 새로운 서버를 운영하는 것과 동일하기 때문에, 서버 운영 비용이 증가할 수 있습니다. 또한 서비스가 분리되면 각 서비스 간의 통신 및 데이터 공유를 위한 추가적인 작업이 필요할 수 있습니다. 따라서 서비스 분리의 장단점을 잘 고려하셔야 할 것 같습니다.

2. 모노레포 구조 및 패키지 빌드와 배포: 공통 라이브러리를 효과적으로 개발 하시기 위해서는 선행되어야 하는 것이 모노레포 구조 설계와 패키지 빌드 입니다. 생각보다 이 두작업 하는게 손이 많이 가서요. 미리 한번 효과적인 구조가 무엇일지 고민해보시고 작업하시면 좋을 것 같습니다.
3. 브라우저 지원 범위: 제공하시는 서비스 및 공통라이브러리가 효과적으로 관리되기 위해서는 브라우저 지원 범위가 명확하고 통일되어 있어야 합니다. 그래야 불필요한 폴리필/트랜스파일을 줄일 수 있습니다. https://github.com/NaverPayDev/browserslist-config 와 같은 형태로 지원범위를 하나의 browserslist로 관리하시면 좋을 것 같습니다.

사내 공통 라이브러리 구축은 단순한 코드 재사용을 넘어 번들 크기, 개발자 경험(DX), 그리고 애플리케이션 성능 전반에 큰 영향을 미치는 중요한 과제입니다. 제시된 고려 사항들을 바탕으로 명확한 목표를 설정하고 체계적으로 접근하신다면, 기술 자산으로서 가치 있는 결과물을 만드실 수 있을 것입니다.

### 기타 수정되거나 더 보완되었으면 하는 내용

> 모두 적용을 하면 좋겠지만, 어떤 항목부터 먼저 적용해야 효과적인지 우선순위가 있으면 좀 더 좋을 것 같습니다

가장 손쉽게 하면서도 큰 효과를 볼 수 있는 것은 다음과 같습니다.

- `lodash` 등 트리쉐이킹 되지 않는 라이브러리 제거 또는 변경
- `__app.tsx`의 불필요한 코드 내지는 이관
- 서드파티 라이브러리 삭제 또는 `async` `defer` 속성 추가
- CLS 를 일으키는 제목을 리액트에서 css 미디어 쿼리로 변경

위에 제시된 우선순위 항목들은 비교적 적은 노력으로도 체감 가능한 성능 향상을 가져올 수 있는 좋은 출발점입니다. 이들을 시작으로 점진적인 개선을 통해 웹사이트의 사용자 경험을 더욱 향상시켜 나가시기를 바랍니다.

---

> 다음은 실제 개발자 분에게 전달 드린 글 입니다. 사이트 주소와 이미지 등의 정보는 가려져 있습니다.

# https://example.com/ko 성능 분석

> **Disclaimer**
>
> 본 요약 내용은 제공된 `example.com` 웹사이트 성능 분석 보고서(2025년 5월 10일 18시 기준)를 바탕으로 주요 사항을 간추린 것입니다. 분석 시점 이후 웹사이트의 업데이트나 환경 변화에 따라 실제 상태와는 차이가 있을 수 있습니다. **또한, 본 분석은 실제 작성된 원본 소스 코드가 아닌, 브라우저에 배포되고 번들된 결과물을 기준으로 하였기에 코드의 내부 구조나 로직 추론에 있어 실제 구현과 다소 차이가 발생할 수 있음을 알려드립니다.**
>
> 제시된 성능 병목 지점 및 개선 방안은 일반적인 권장 사항이며, 실제 적용 시 효과는 웹사이트의 구체적인 구현 방식, 서버 환경, 트래픽 패턴 등 다양한 요인에 따라 달라질 수 있습니다. 본 요약은 정보 제공을 목적으로 하며, 제안된 내용을 적용함에 따른 최종적인 결정과 그 결과에 대한 책임은 웹사이트 관리 주체에게 있습니다.
>
> 보다 상세한 분석 내용, 방법론, 그리고 전체 컨텍스트는 원본 분석 보고서를 참고해주시기 바랍니다.

# 1. 요약

안녕하세요! `example.com` 웹사이트의 잠재력을 최대한 발휘하여 사용자분들께 더욱 쾌적한 경험을 제공해 드릴 수 있도록, 성능 분석 결과를 핵심 위주로 요약해 보았습니다.

`example.com` 웹사이트는 로딩 속도 및 사용자 경험 개선의 여지가 있으며, 특히 초기 자바스크립트 로딩과 리소스 처리 효율성, 레이아웃 안정성 측면에서 개선이 필요한 상태입니다.

주요 성능 병목 지점은 다음과 같습니다.

- **자바스크립트 과부하**: 초기 로딩에 불필요하게 많은 자바스크립트(`_app.js` 포함) 및 최적화되지 않은 서드파티 스크립트가 로딩을 지연시키고 있습니다.
- **주요 리소스 비효율**: 과도한 다국어 데이터 전송 및 최적화되지 않은 이미지/폰트 로딩으로 성능이 저하되고 있습니다.

다음과 같은 개선 방안을 우선적으로 제안합니다.

- **자바스크립트 최적화 및 로딩 개선**:
  - `_app.js` 최적화, 코드 분할, 불필요한 라이브러리 제거 및 서드파티 스크립트에 `defer/async` 적용.
- **주요 리소스 최적화**:
  - 다국어 데이터, 이미지, 폰트 로딩 방식을 최적화하고 관련 CLS(누적 레이아웃 이동)를 개선합니다.

이 권장 사항들을 적용하시면 웹사이트의 성능과 사용자 만족도를 크게 높일 수 있을 것으로 기대합니다. 자세한 내용은 보고서 본문을 참고해주세요.

# 2. 분석 개요

2025년 5월 10일 18시 기준 배포된 웹사이트를 분석해보았습니다.

![image.png](/2025/05/images/web-performance-analysis-2/image.png)

![image.png](/2025/05/images/web-performance-analysis-2/image1.png)

![image.png](/2025/05/images/web-performance-analysis-2/image2.png)

분석에 사용한 도구는 다음과 같습니다.

- chrome dev tool
- webpagetest

# 3. 웹사이트 분석

## 3-1. 주요 프레임워크 및 라이브러리

- Next.js: `__app.js` `__buildManifest.js` `__ssgManifest.js` 등은 next.js 기반 프로젝트에서 볼 수 있는 자바스크립트 라이브러리 입니다. 추가로 `window.__NEXT_DATA__` 전역 변수의 존재를 확인했으며, 이는 next.js 의 page router 를 사용하고 있다는 증거 입니다.
- react: 다수의 자바스크립트에서 리액트를 사용하는 것으로 보이는 패턴이 확인 되었으며, `framework.js` 에서 확인한 리액트 버전은 17.0.2 입니다.
- emotion: 스타일을 위해 css-in-js 인 emotion 을 사용하고 있는 것으로 보입니다.
- Apollo: `GraphQL`과 연동하기 위한 Apollo Client 의 흔적을 엿볼 수 있었습니다.
- react-query: 데이터 페칭을 위해 react-query 를 사용하는 것 또한 볼 수 있었습니다.
- axios: `fetch` 라이브러리인 axios 를 사용하고 있습니다. 아마도 버전은 `0.25.0` 인 것으로 보입니다.
- i18next: 다국어 지원을 위해 i18next 를 사용하고 있습니다. nextjs 프로젝트와 사용하기 위해 `_nextI18Next` 를 사용하는 것 또한 확인했습니다.
- dayjs: 날짜 유틸로 `dayjs`를 사용하고 있습니다.
- uuid: 아이디 고유값을 만들기 위해 uuid 를 사용하고 있는 것으로 보입니다.
- lodash: 자바스크립트 범용 유틸 lodash 를 사용하고 있습니다.
- datadog sdk: datadog sdk 를 사용하는 것을 확인했으며, 버전은 5.35.1 입니다.
- zustand: 상태관리를 위해서 사용 중인 것으로 보입니다.

## 3-2. 빌드 환경

nextjs 의 버전을 정확히 추정할 수 있는 방법은 없지만, 내부 패턴을 미루어 보았을 때 12.x~14.x 버전을 사용하고 있는 page router 기반 SSR 프로젝트인 것으로 보입니다. 서버사이드 렌더링 특성상 내부 구조를 완벽하게 파악하는 것이 어렵지만, `__app.tsx`에 아래를 비롯한 다수의 Provider 로 감싸져 있을 것으로 보입니다.

- `@emotion/react` : `CacheProvider`
- `@apollo/client` : `ApolloProvider`
- `appWithTranslation` : `next-i18next` 의 HOC
- `I18nextProvider` : 상동
- `@tanstack/react-query` : `QueryClientProvider` , `Hydrate`

## 3-3. 배포 환경

```bash
nslookup example.com
Server:    0.0.0.0
Address:  10.100.3.167#53

Non-authoritative answer:
Name:  example.com
Address: 0.0.0.0
Name:  example.com
Address: 0.0.0.0
Name:  example.com
Address: 0.0.0.0
Name:  example.com
Address: 0.0.0.0

curl https://ipinfo.io/0.0.0.0/json

{
  "ip": "0.0.0.0",
  "hostname": "server-0.0.0.0.icn00.r.cloudfront.net",
  "city": "Seoul",
  "region": "Seoul",
  "country": "KR",
  "loc": "37.5660,126.9784",
  "org": "AS16509 Amazon.com, Inc.",
  "postal": "03141",
  "timezone": "Asia/Seoul",
  "readme": "https://ipinfo.io/missingauth"
}
```

- AWS 에서 운영 중이며, 인천 Amazon Cloud Front를 사용하고 있는 것으로 보입니다.

# 4. 제안

앞선 '웹사이트 분석' 섹션에서는 `example.com` 웹사이트의 현재 성능 상태와 주요 개선이 필요한 지점들을 다각도로 살펴보았습니다. 본 '제안' 장에서는 이러한 분석 결과를 토대로, 웹사이트의 전반적인 로딩 속도를 향상시키고 사용자 경험을 최적화하며, 나아가 핵심 웹 지표를 개선하는 데 실질적인 도움이 될 수 있는 구체적이고 실천 가능한 방안들을 항목별로 제시하고자 합니다.

각 제안은 식별된 문제점에 대한 구체적인 해결책과 그 기대 효과를 중심으로 기술하여, 실제 개선 작업에 대한 이해를 돕고 우선순위를 설정하는 데 참고가 될 수 있도록 구성했습니다.

## 4-1. 거대한 자바스크립트 리소스 파일

해당 웹서비스 분석 중에 가장 눈에 띄었던 것은 해당 웹서비스의 `/`를 불러오기 위해 필요한 자바스크립트 파일이었습니다. `/` 를 불러오기 위해 총 14,647kb 크기에 달하는 41개의 자바스크립트 파일을 불러오고 있었습니다. 물론 그 중에는 `kakao.min.js` `gtm.js` 등 써드 파티 라이브러리도 있었습니다만, 해당 웹서비스가 서빙하는 next.js 리소스의 크기도 만만치 않았습니다.

```javascript
;((self.__BUILD_MANIFEST = (function (
  t,
  s,
  e,
  a,
  c,
  i,
  n,
  o,
  u,
  d,
  p,
  m,
  l,
  k,
  f,
  y,
  r,
  b,
  h,
  g,
  j,
  v,
  w,
  S,
  _,
  x,
  M,
  C,
  D,
  I,
  T,
  A,
  E,
  U,
  B,
  F,
  q,
  z,
) {
  return {
    __rewrites: {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    },
    '/': [
      e,
      a,
      d,
      c,
      p,
      l,
      h,
      n,
      'static/chunks/pages/index-6b09fcdd8e2f5445.js',
    ],
    // .. 다른 페이지 생략
  }
})(
  'static/chunks/15-a9a48f7944e0e298.js',
  'static/chunks/8631-592dbd6f83032fc0.js',
  'static/chunks/fec483df-db3f7b2046a0a64a.js',
  'static/chunks/3763-ecbc1ef0a619ccdc.js',
  'static/chunks/7978-897f3a152fd54de3.js',
  'static/chunks/966-6cef0f650c8a7441.js',
  'static/css/2c191b1d58af9610.css',
  'static/chunks/3053-ae68c57739ba1ff4.js',
  'static/chunks/3127-870b5d6feca82804.js',
  'static/chunks/1907-ad5c27c3b3b7d60b.js',
  'static/chunks/5011-6994a6f9b60dd1c1.js',
  'static/chunks/5912-301e1a380c683a48.js',
  'static/chunks/2451-9e32b55d273f58ab.js',
  'static/chunks/9819-61b2f434cbd511ac.js',
  'static/chunks/2992-759ed9bf2658b944.js',
  'static/chunks/9738-70e6b0d150c1fb76.js',
  'static/chunks/8412-36d0e0939bef9710.js',
  'static/chunks/5967-26ad41dd5b9edc06.js',
  'static/chunks/3055-58c5470e34b2f706.js',
  'static/chunks/8349-9faf5341f07dd35c.js',
  'static/chunks/7094-84c88e31a56721ad.js',
  'static/chunks/3096-eb0b475935c82a55.js',
  'static/chunks/6186-c06b470a95a9374e.js',
  'static/chunks/9099-7d6cb2e6ff4b5743.js',
  'static/chunks/2957-1ebc10f740dfdb59.js',
  'static/chunks/8888-8d8e077c448bea31.js',
  'static/chunks/2871-2587166ff722243e.js',
  'static/chunks/9152-098296c0be4fa4cb.js',
  'static/chunks/2272ea81-d98992a44535b5b7.js',
  'static/chunks/9965-2bf9c244cc59be40.js',
  'static/chunks/9433-769dc6182acbdb07.js',
  'static/chunks/3676-60038ecd98fea7cc.js',
  'static/chunks/5872-d6248ba3506507b6.js',
  'static/chunks/770-740564783223b60a.js',
  'static/chunks/1134-7590ca8c52014b90.js',
  'static/chunks/4045-93d1c0b9d354c3b9.js',
  'static/chunks/9534-625ccbc57a2af12a.js',
  'static/chunks/6404-ef83ba69c344044a.js',
)),
  self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB())
```

위 파일은 next.js 에서 제공하는 `__buildManifest.js` 파일입니다. 해당 자바스크립트 파일은 next.js 로 빌드된 웹사이트에 대한 정보를 나타내고 있습니니다. 보시면 `/` 를 불러오기 위해 총 9개의 자바스크립트 파일이 필요하다는 것을 알 수 있으며, 이외에 모든 사이트 최초 로딩에 필요한 `__app` `framework` 파일 까지 포함하면 대략 3메가 정도가 필요한 것으로 볼 수 있습니다. 평균적인 웹사이트가 약 22개의 자바스크립트 파일을 680kb 로 제공하는 것을 비춰보았을때, 이 웹사이트는 상당히 큰 편이라고 볼 수 있습니다.

[HTTP Archive: State of JavaScript](https://httparchive.org/reports/state-of-javascript?start=earliest&end=latest&view=list#bytesJs)

이 웹사이트가 겪는 대부분의 성능 문제는 이 큰 자바스크립트 파일에서 비롯되는 것으로 보입니다.

그 중에서도 단연 눈에 띄는 것은 `__app.js` 입니다. `_app.js`는 next.js 의 핵심 파일로, 웹사이트를 불러오기 위해 가장 먼저 항상 포함되는 자바스크립트 파일입니다. 이 파일이 크다는 것은 모든 페이지의 성능에 악영향을 미친다는 것을 의미합니다. 이 파일 크기가 크다는 것은, 그만큼 프로젝트의 공통영역에 많은 부담이 가고 있다는 것을 뜻합니다.

![image.png](/2025/05/images/web-performance-analysis-2/image3.png)

실제로도 위 분석 결과를 살펴보면 2메가가 넘는 `__app` 의 다운로드와 파싱을 위해 대부분의 시간을 소비하고 있는 것을 볼 수 있습니다. (실제 minify 를 해제 하면 9메가까지 커집니다.) 따라서 이 파일에 실제로 필요한 내용만 들어가 있는지, 불필요한 리소스가 있는지 확인해본다면 성능 문제를 크게 해결할 수 있을 것으로 보입니다.

지금부터 이 `__app` 파일을 위한 몇가지 제언을 드리겠습니다.

### 4-1-1. `lodash` 등 트리쉐이킹 되지 않는 라이브러리 제거 또는 변경

lodash 는 트리쉐이킹이 되지 않는 대표적인 라이브러리로, 이 웹사이트에서 트리쉐이킹 되지 않는 `lodash` 의 흔적을 볼 수 있었습니다.

![image.png](/2025/05/images/web-performance-analysis-2/image4.png)

위 스크린샷은 해당 웹사이트에서 찾은 `lodash` 라이브러리의 흔적과 실제로 사용하고 있는지 여부의 일부를 가져온 것입니다. `kt` 변수에 `lodash` 에서 제공하는 함수들이 추가되어있는 것을 확인했습니다. `lodash` 는 트리쉐이킹이 되지 않기 때문에, 이처럼 사용하지도 않는 유틸이 모두 `__app`에 추가되어 있는 것을 보실 수 있으며, 이는 번들 크기에 그대로 부담이 됩니다.

[npm: lodash-es](https://www.npmjs.com/package/lodash-es)

트리쉐이킹이 되는 `ESModule`형식으로 작성된 `lodash-es` 로 변경해보시는 것을 강력하게 추천해드립니다. 해당 라이브러리를 사용하면, 실제 사용하지 않는 유틸은 `__app.js` 번들에서 제거되어 번들 크기가 눈에 띄게 줄어드는 것을 확인하실 수 있을 것입니다.

이 외에도 `package.json` 에서 사용중인 라이브러리들을 bundlephobia 에서 한번 확인하시는 것을 추천해드립니다.

[Bundlephobia | Size of npm dependencies](https://bundlephobia.com/)

![image.png](/2025/05/images/web-performance-analysis-2/image5.png)

정상적으로 트리쉐이킹이 가능한 라이브러리라면, 위 스샷의 [Bundlephobia: lodash-es](https://bundlephobia.com/package/lodash-es@4.17.21) 의 경우 처럼 `exports` 분석이 가능할 것입니다.

### 4-1-2. 다국어 리소스 사용에 따른 거대한 props

nextjs 는 `getInitialProps` 또는 `getServerSideProps` 와 같은 함수를 호출한다음, 해당 함수의 결과물을 클라이언트에 내려줌으로써 하이드레이션 과정을 거칩니다. 해당 페이지에서 제공되는 `props` 를 보고 싶다면, `window.__NEXT_DATA__`를 확인해보면 됩니다.

![image.png](/2025/05/images/web-performance-analysis-2/image6.png)

`/` 의 경우, 다국어 제공을 위한 `next-i18next` 관련 props 가 제공되고 있는 것을 볼 수 있었습니다. 문제는 이 객체의 크기가 560kb 에 달할 정도로 매우 크다는 것입니다.

이 문제를 해결하기 위한 방법은 크게 두가지 정도로 볼 수 있습니다.

- `fallbackLng`에서 `en` 제거: 제가 방문한 사이트는 `/ko` 임에도 불구하고 `/en` 정보까지 포함되어 있는 이유는 아마도 불러오지 못한 정보를 위한 fallback 처리인 `fallbackLng` 에 `en` 이 추가 추가 되어있기 때문일 것으로 보입니다.

  ```javascript
  A.exports = {
    i18n: {
      defaultLocale: 'default',
      locales: ['default', 'en', 'ko', 'ja', 'zh-CN'],
      localeDetection: !1,
      fallbackLng: {
        ko: ['en'],
        en: ['ko'],
        ja: ['ko'],
        'zh-CN': ['ko'],
      },
      backend: {
        expirationTime: 18e5,
        loadPath: 'https://'.concat(
          'd3jg758w1vtpa6',
          '.cloudfront.net/v2/projects/26cf3ff8b06465adbd967ff8ed1e8d12/locales/{{lng}}/download?file_format=react_nested_json',
        ),
        reloadInterval: !1,
      },
      react: {
        transKeepBasicHtmlNodesFor: ['strong', 'br', 'b', 'i', 'u', 'li'],
        useSuspense: !1,
      },
    },
  }
  ```

  `fallbackLng` 은 누락된 언어를 기본값으로 나마 보여줄 수 있는 효과적인 옵션이지만, 반대로 생각해보면 안나올지도 모르는 text 에 대한 예외처리를 위해 언어 한벌을 추가로 다운로드 해야 하는 것과 다름이 없습니다. 그리고 전체크기가 약 200kb 에 달하는 `en` 을 다운로드 해야할지는 고민해봐야할 부분입니다.

- `namespace` 를 페이지별로 세분화: 다국어 정보를 하나씩 보면서 느낀 또한가지 문제점은, 현재 페이지에서 불필요한 언어정보도 모두 반환되고 있는 것 같다는 사실입니다. `next-i18next` 에서 제공하는 네임스페이스도 사용하지 않는 것 같다는 생각도 들었습니다.

  ![image.png](/2025/05/images/web-performance-analysis-2/image7.png)

  네임스페이스를 사용하면 다국어 리소스를 여러 파일로 분리할 수 있는 핵심적인 기술로, 이처럼 다국어 파일이 거대해지는 것을 막는데 중요한 역할을 합니다.

  [Namespaces | i18next documentation](https://www.i18next.com/principles/namespaces)

  네임스페이스를 사용하시어 다음과 같이 나눠서 로딩하시는 것을 추천해드립니다.
  1. SSR 시에 사용자에게 무조건 보여지는 영역에 필요한 리소스
  2. 모달, 인터랙션등 사용자가 특정 액션을 취해야만 보여지는 리소스

  1번에 해당하는 리소스를 `getServerSideProps`에서 불러오시고, 2번에 해당하는 리소스는 `React.lazy` 나 `useEffect` 등을 통해 실제로 컴포넌트가 로딩되는 시점에 불러오게 해주세요. 그렇게 함으로써 초기에 다운로드 해야하는 리소스를 줄일 수 있고, 페이지로딩 속도를 보다 빠르게 할 수 있습니다.

### 4-1-3. 불필요한 폴리필 제거

현재 웹서비스가 타겟으로 하고 있는 브라우저가 어떻게 되시나요? 제가 서비스 제공 현황까지는 정확하게 알 수 없지만, 성능 입장에서만 말 씀드리면 웹서비스 지원 타겟은 높을 수록 좋습니다. 반대로 말하자면, 구형 브라우저를 지원하려고 애쓰지 않을 수록 성능은 향상되고 번들 크기는 감소합니다. 현재 개발자님의 웹사이트에서 발견한 폴리필은 다음과 같습니다.

![image.png](/2025/05/images/web-performance-analysis-2/image8.png)

그리고 해당 폴리필들의 버전과 현황은 다음과 같습니다.

| **모듈 경로 (Module Path)**                 | **폴리필 대상 기능 (Polyfilled Feature)**                | **관련 ECMAScript 버전 (Approx.)**        |
| ------------------------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| `core-js/modules/es.promise`                | `Promise` 객체                                           | ES2015                                    |
| `core-js/modules/es.promise.finally`        | `Promise.prototype.finally`                              | ES2018                                    |
| `core-js/modules/es.object.assign`          | `Object.assign()`                                        | ES2015                                    |
| `core-js/modules/es.object.keys`            | `Object.keys()`                                          | ES5.1                                     |
| `core-js/modules/es.object.values`          | `Object.values()`                                        | ES2017                                    |
| `core-js/modules/es.symbol`                 | `Symbol` 타입 및 관련 기능 (예: `Symbol.iterator`)       | ES2015                                    |
| `core-js/modules/es.symbol.async-iterator`  | `Symbol.asyncIterator`                                   | ES2018                                    |
| `core-js/modules/es.array.iterator`         | 배열 이터레이터 (예: `Array.prototype[Symbol.iterator]`) | ES2015                                    |
| `core-js/modules/es.array.includes`         | `Array.prototype.includes()`                             | ES2016                                    |
| `core-js/modules/es.array.find-index`       | `Array.prototype.findIndex()`                            | ES2015                                    |
| `core-js/modules/es.array.find`             | `Array.prototype.find()`                                 | ES2015                                    |
| `core-js/modules/es.string.from-code-point` | `String.fromCodePoint()`                                 | ES2015                                    |
| `core-js/modules/es.string.includes`        | `String.prototype.includes()`                            | ES2015                                    |
| `core-js/modules/es.number.is-nan`          | `Number.isNaN()`                                         | ES2015                                    |
| `regenerator-runtime/runtime`               | `async/await`, 제너레이터(Generators) 함수 지원          | ES2017 (async/await), ES2015 (Generators) |

제가 모든 폴리필을 일일이 다 확인한 것은 아닙니다만, 대부분의 폴리필이 2025년 현재 사용되는 모던 브라우저에서는 필요 없는 코드로 보입니다. 해당 폴리필이 삽입되는 코드를 삭제하신다면, 번들 크기를 줄이는데 많은 도움이 될 수 있습니다.

### 4-1-4. uuid 제거

서비스내 고유한 아이디 생성을 위해 uuid 라이브러리를 사용하시는 것으로 보입니다.

![image.png](/2025/05/images/web-performance-analysis-2/image9.png)

그러나 해당 라이브러리는 10.3kb 정도로 제법 큰편에 속합니다.

[uuid v11.1.0 ❘ Bundlephobia](https://bundlephobia.com/package/uuid@11.1.0)

특별한 이유가 있으신게 아니라면, 이보다 훨씬 작은 `nanoid`로 안전하게 난수 id 를 생성하시는 것을 추천해드립니다.

[nanoid v5.1.5 ❘ Bundlephobia](https://bundlephobia.com/package/nanoid@5.1.5)

### 4-1-5. 불필요한 의존성이 `__app` 에 들어가지 않았나 확인

크롬 개발자도구에서는, `Coverage`라고 하는 메뉴가 있는데, 이 메뉴에서는 실제로 해당 페이지를 위해 사용한 코드가 무엇인지 구별하는 기능을 제공하고 있습니다.

![image.png](/2025/05/images/web-performance-analysis-2/image10.png)

이 메뉴로 살펴본 결과, 2메가 가량의 `__app.js` 의 리소스중 78% (빨간색)는 실제 페이지 로딩에 필요하지 않다는 분석 결과가 나왔습니다. 물론 이 78%가 당장에 제거해도 된다는 것을 의미하지는 않습니다. 페이지 초기 로딩에는 필요하지 않지만, 사용자 인터랙션에 따라 필요할 수도 있고, 에러 처리에 필요한 코드일 수도 있습니다.

그러나 물론 이중에는 실제로 삭제 가능한 코드도 있을 것입니다. 다음 스크린샷을 한번 살펴보겠습니다.

![image.png](/2025/05/images/web-performance-analysis-2/image11.png)

위 코드는 추정 컨데, Microsoft Office Open XML 형식, 특히 스프레드 시트 파일을 분석하기 위한 코드로 보입니다. 그 이유는 다음과 같습니다.

- nodejs 의 `Buffer`를 클라이언트에서 사용하기 위한 폴리필이 추가되어 있음
- 태그 이름이 OOXML 표준과 일치

아마도 개발자님의 사이트에서 엑셀이나 docx 파일을 파싱하기 위해서 존재하는 것으로 보입니다. 다만 중요한 것은 이 소스코드가 앞서 언급드린 대로 모든 웹페이지를 불러오는데 필요한 공통 리소스인 `__app.js` 에 포함되어 있다는 점입니다. 이러한 특정 페이지에 제공되기 위한 기능은 해당 페이지의 리소스에 포함되어있어야 합니다. 특히 이런 거대한 라이브러리가 `__app`에 포함되어 있다면 초기 페이지 로딩에 불필요한 부담을 야기 하게 됩니다. 제 추측 컨데 저 라이브러리는 `exceljs` 일 것 같습니다.

[exceljs v4.4.0 ❘ Bundlephobia](https://bundlephobia.com/package/exceljs@4.4.0)

`exceljs`는 순수크기만 1mb 에 달할정도로 거대한 라이브러리입니다. 이 패키지가 꼭 클라이언트 코드에 필요한지 한번더 확인하시고, 가급적 서버에서만 이 라이브러리가 포함되도록 조정해주세요. 그리고 불가피하게 클라이언트에서도 필요하다면 `__app.js`가 아닌 다른 페이지의 리소스에 포함되도록 수정 해주시면 좋습니다.

이 외에도 `__app.tsx` 의 `import` 에 있는 패키지 명단을 확인하시어 불필요한 패키지는 꼭 필요한 곳으로 이동시켜주세요. 루트에 있어야 하는 이유가 의심스러운 다른 패키지 혹은 컴포넌트들은 다음과 같습니다.

- `react-tooltip`
- 비밀번호 유효성 검증 컴포넌트
- 채용공고지원, 필터링, 업로드, 본인인증 관련 컴포넌트
- 파일 업로드

다시한번 명심해야할 것은, ‘해당 기능이 필요한지’ 가 아니라, ‘해당 기능이 반드시 루트에 있어야 하는지’ 입니다. `__app.js` 는 꼭 공통적으로 필요한 기능만 담겨있어야 합니다.

### 4-1-6. 데이터 페칭 라이브러리 일원화

현재 데이터 패칭을 위해 `GraphQL` 과 `react-query` + `axios` 를 사용하고 계신 것으로 보입니다. 데이터 페칭을 위해 두가지 완전히 다른 기법을 사용하는 것은 굉장히 보기드문 사례입니다. 두가지 다른 데이터 페칭 기법을 사용하는 것은 그만큼 두 기능을 제공하기 위한 초기 코드가 커진다는 것을 의미합니다. `GraphQL` 을 걷어내시고 `react-query` 만 사용하시는 것은 어떨까요? 물론 이는 적절한 백엔드 지원이 있어야만 가능하겠습니다만, `GraphQL`을 걷어낸다면 `Apollo` 관련 라이브러리와 프로바이더를 제거할 수 있어 그만큼 번들 크기가 줄어들 것입니다.

제가 모든 유즈케이스를 다 살펴보지 않아서 말씀드리기 조심스럽습니다만, 만약 GraphQL 로 사용하는 기능이 크게 복잡하지 않다면 `ApolloClient` 보다 훨씬 가벼운 `graphql-request` 를 추천해드립니다.

[npm: graphql-request](https://www.npmjs.com/package/graphql-request)

---

위와 같은 내용을 반영하신다면 `__app.js` 의 크기를 크게 줄일 수 있고, 모든 페이지를 불러오는데 있어 크게 성능을 향상시킬 수 있을 것으로 보입니다.

다음으로는 그외에 성능개선에 도움이 되는 내용입니다.

## 4-2. 써드파티 라이브러리 로딩 최적화

`<body />` 위에 `<head />` 내 next.js 가 삽입한 자바스크립트 외 개발자님께서 임의로 삽입한 듯한 코드를 분석해보았습니다.

```html
<script src="https://developers.kakao.com/sdk/js/kakao.min.js"></script>
<script
  type="text/javascript"
  src="https://code.jquery.com/jquery-1.12.4.min.js"
></script>
<script
  type="text/javascript"
  src="https://cdn.iamport.kr/js/iamport.payment-1.2.0.js"
></script>
<script
  async=""
  src="https://www.googletagmanager.com/gtag/js?id=G-YNKW461YK0"
></script>
<script>
  window.dataLayer = window.dataLayer || []
  function gtag() {
    dataLayer.push(arguments)
  }
  gtag('js', new Date())
  gtag('config', 'G-YNKW461YK0', {
    cookie_flags: 'SameSite=Lax',
    debug_mode: false,
  })
</script>
<script>
  !(function (e, t, n, s, u, a) {
    e.twq ||
      ((s = e.twq =
        function () {
          s.exe ? s.exe.apply(s, arguments) : s.queue.push(arguments)
        }),
      (s.version = '1.1'),
      (s.queue = []),
      (u = t.createElement(n)),
      (u.async = !0),
      (u.src = '//static.ads-twitter.com/uwt.js'),
      (a = t.getElementsByTagName(n)[0]),
      a.parentNode.insertBefore(u, a))
  })(window, document, 'script')
  // Insert Twitter Pixel ID and Standard Event data below
  twq('init', 'o8306')
  twq('track', 'PageView')
</script>
<script>
  ;(function (w, d, s, l, i) {
    w[l] = w[l] || []
    w[l].push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js',
    })
    var f = d.getElementsByTagName(s)[0],
      j = d.createElement(s),
      dl = l != 'dataLayer' ? '&l=' + l : ''
    j.async = true
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl
    f.parentNode.insertBefore(j, f)
  })(window, document, 'script', 'dataLayer', 'GTM-WDWL5GM')
</script>
```

이 자바스크립트 리소스들을 대상으로 성능에 도움이 되는 스크립트 로딩 최적화 관련 안내를 추가해 두겠습니다.

`<head />` 에 위치한 스크립트 중 `async` 내지는 `defer` 가 없는 리소스는 HTML 파싱을 중단시키고 스크립트를 다운로드하고 실행할때까지 기다리게 만들어 페이지 로딩 속도를 지연 시킵니다.

- `kakao.min.js` 해당 기능은 아마도 카카오 로그인을 위해서 필요한 것으로 보이는데요. 해당 리소스가 웹서비스 로딩에 반드시 필요한게 아니라면, 카카오 로그인이 필요한 시점에 동적으로 삽입하거나, `defer` 를 추가하거나, `body` 최하단으로 내려주세요.
- `jquery-1.12.4.min.js` jquery는 혹시 정말로 필요하신건가요? 제가 jquery 스크립트를 제거하고 실행해봤을 땐 크게 이슈가 없었습니다. `jquery` 는 굳이 사용할 필요가 없을 뿐더러, 버전도 매우 낮아 사용하는 것이 위험하고 불필요해보입니다.
- `iamport.payment` 아임포트 결제 모듈은 사용자가 결제를 시도하는 시점에만 필요할 것 같습니다. 해당 코드는 결제가 필요한 페이지에서만 불러오도록 수정해주시거나, 최소한 `defer`는 추가해주세요.
- [`//wcs.naver.net/wcslog.js`](https://wcs.naver.net/wcslog.js) : 네이버 로그 분석을 위한 스크립트로 보이는데요, 이 스크립트 역시 `async` `defer` 를 추가해주시는 것이 좋습니다. 분석 스크립트는 렌더링에 중요한 요소가 아니므로, 비동기로 처리하는 것이 좋습니다.

실제로 현재 위 두 라이브러리가 nextjs 가 페이지를 렌더링하는데 필요한 리소스를 블로킹하는 것을 볼 수 있습니다.

![image.png](/2025/05/images/web-performance-analysis-2/image12.png)

단순히 저 네 라이브러리에 defer를 추가하는 것 만으로도 nextjs 가 페이지를 불러오는 시점을 크게 앞당길수 있습니다.

![image.png](/2025/05/images/web-performance-analysis-2/image13.png)

위 스샷은 앞선 네개의 리소스에 단순히 `defer` 만 추가한 코드 인데요. next.js 코드를 다운로드 하고 파싱하는 시점을 1초 가까이 줄인 것을 볼 수 있습니다.

## 4-3. 배너 이미지 최적화

개발자님의 사이트는 사이트 최초 접근시 대형 배너가 노출되는 구조입니다.

![image.png](/2025/05/images/web-performance-analysis-2/image14.png)

당연히 이는 성능적으로, 그리고 LCP 가 별로 좋아하지 않는 UI 입니다. 개발자 입장에서는 없애고 싶은 리소스이지만 사업적으로는 중요한 배너일 수 있습니다. 이러한 배너를 노출시키면서도, 라이트 하우스 점수를 최대한 끌어올 수 있는 방법을 몇가지 제안해드리겠습니다.

- 더 압축률이 높은 이미지 포맷 사용: 현재 사용중인 이미지는 PNG 입니다만, webp 나 avif 등을 사용하신다면 이미지의 크기를 더 줄이실 수 있습니다.
- 서버에서 이미지를 가져오도록 변경: 현재 구조에서는 자바스크립트 번들이 모두 다운로드되고 파싱된 이후에 서야 비로소 배너에 뜰 이미지를 알수 있는 구조입니다.

  ![image.png](/2025/05/images/web-performance-analysis-2/image15.png)

  배너에 필요한 이미지를 서버사이드 렌더링에서 인지할 수 있도록 `getServerSideProps` 를 활용해보시기 바랍니다.

- 프리로드 스캐너 활용: 브라우저는 프리로드 스캐너라는 특별한 동작이 있습니다. 이 프리로드 스캐너란 HTML 문서를 분석하는 주요 파서외에 보조적으로 동작하는 스캐너로, HTML 문서를 빠르게 로드하기 위한 내부 최적화 도구입니다. 프리로드 스캐너는 다음과 같은 동작을 수행합니다.
  1. HTML 을 미리 읽으면서 `link` `script` `img` 태그등으로 선언된 주요 리소스를 먼저 찾습니다.
  2. 주요 파서가 해당 태그에 도달하기 전이라도, 그리고 다른작업으로 파서가 멈춰있더라도 스캐너는 1번에서 찾은 리소스가 있다면 리소스를 미리 다운로드 합니다.
  3. CSS, JS 등으로 렌더링이 차단되어 있더라도 리소스를 병렬로 다운로드 할 수 있어 페이지 로딩 속도를 향상시킵니다.

  자세한 내용은 아래 블로그 참고 부탁드립니다.

  [브라우저의 프리로드 스캐너(pre-load scanner)와 파싱 동작의 이해](https://yceffort.kr/2022/06/preload-scanner)

  해당 이미지는 현재 프리로드 스캐너가 추가되어 있지 않아 해당 이미지 태그를 만나는 시점까지 이미지를 불러오지 않습니다. 만약 프리로드 스캐너가 불러올 수 있도록 다음 태그를 추가해주신다면, 이미지를 미리 다운로드 받아올 수 있어 성능이 향상됩니다.

  ```html
  <link
    rel="preload"
    as="image"
    href="https://cf.example.com/mercury/admin/4de275c6-3517-4316-bb45-78e9d80dfafb/7b253cc6-e4f8-459d-b869-4e37dee5a048.png?Expires=1721284816&Signature=hFDXxzCE0NmomVB-nhe0NR6FvA1ZwMVP6EDSFzU6dk5GhWVaQ7r6bXZZ-YQc0MQ7C-EGU4dW9dRUtDoFyVE-FL5HZhKSfv-VBqV4dHGhcfg3ObbeXH9~aG0X3UT8IJIILCqPfZDyrd59noaardQohENAUTgU6qum3kxkPw~fIRyqyBPBUkVDXMvePkenNd0hVq5KYggH44xZqr36L1JyHCslxN2WZlo504BCbQU9q1JARZc86ocwUgUaLfYf0cIe9YDpZBb3QotguVte5aC5TOh862N1XQ~P3CuC2Pcxdh9EUECwePqaSCuzE1KUnNC56qUfvJo7g9vHqbqqEquPqw__&Key-Pair-Id=K23149LG91UYF2&response-content-disposition=attachment%3B+filename*%3DUTF-8 7 7s3Path.png"
  />
  ```

  위 태그를 추가한 전후를 살펴보면 다음과 같습니다.

  ![image.png](/2025/05/images/web-performance-analysis-2/image16.png)

  ![image.png](/2025/05/images/web-performance-analysis-2/image17.png)

단순히 해당 태그를 추가한 것 만으로 이미지 다운로드 우선순위가 크게 앞당겨졌으며, LCP 역시 1초가까이 향상된 것을 볼 수 있습니다.

- `fetchpriority: 'high'` : 이와 비슷한 기법으로 이미지에 해당 속성을 추가하는 방법도 있습니다만, 이미지에 대한 존재시점을 스크립트가 다 실행되어야 아는 배너의 특성상 별로 도움이 되지는 않을 것 같습니다.

  [Fetch Priority API로 리소스 로드 최적화  |  Articles  |  web.dev](https://web.dev/articles/fetch-priority?hl=ko)

- 이미지 크기 조절: 현재 이미지는 노출되는 크기 대비 큰 것으로 보입니다. 사용자의 화면 크기에 노출하고 싶은 사이즈로 적절하게 조절하는 것이 좋아보입니다.

## 4-4. 비디오 리소스 최적화

현재 개발자님의 웹사이트에서는 다음과 같은 비디오 리소스도 일부 사용하시는 것으로 보입니다.

```html
<video
  autoplay=""
  loop=""
  muted=""
  playsinline=""
  disablepictureinpicture=""
  width="100%"
  height="auto"
  src="https://cf.example.com/example.png"
></video>
```

이 비디오 리소스 역시 성능에 영향을 미칠 수 있는 부분이 있어 몇가지 조언의 말씀 드리겠습니다.

- 적절한 크기 사용: 비디오가 모바일 화면에서 보이는 것 대비 크기가 큰것으로 보입니다. 비디오가 보이는 영역에 필요한 최소한의 해상도와, 화질 저하가 없는 선에서 최대한 낮은 비트 전송률을 사용하는 것이 좋아보입니다.
- `poster` 사용: `video`에는 `poster` 라는 속성이 있습니다. 이 속성은 비디오가 일시정지되거나 재생 실패시 보여주는 이미지이기도 하면서, video 가 LCP 요소일 때 사용되는 기준이 되기도 합니다. 이 속성을 추가하여 최적화된 정지이미지를 제공하시기 바랍니다.
- CLS 방지: CSS 로 비디오의 aspect-ratio 를 명확히 지정하시어 비디오 로딩전 공간을 미리 확보하시기 바랍니다.

## 4-5. CLS 가 발생하는 큰 제목

현재 개발자님의 사이트에 있는 큰 제목이 CLS 를 발생시키고 있는 것으로 보입니다.

![image.png](/2025/05/images/web-performance-analysis-2/image18.png)

![image.png](/2025/05/images/web-performance-analysis-2/image19.png)

위에서 보시는 것 처럼 제목 영역이 크게 움직이는 것으로 보이는데, 그 이유를 찾아보니 다음과 같았습니다.

```html
<!-- ko.html 을 불러올 때 폰트 크기 -->
<div
  letter-spacing="-0.02em"
  color="#242424"
  cursor=""
  text-decoration="none"
  style="font-size:50px"
  class="css-bygkac e1mepo3j0"
>
  플랫폼
</div>

<!-- 최종적으로 렌더링되는 크기 -->
<div
  letter-spacing="-0.02em"
  color="#242424"
  cursor=""
  text-decoration="none"
  style="font-size: 30px;"
  class="css-bygkac e1mepo3j0"
>
  플랫폼
</div>
```

```javascript
  {
    font: 'title_1_B',
    color: 'greyScale90',
    style: {
      fontSize: i ? '50px' : 'ko' === n ? '30px' : '24px',
    },
    children: e(i ? 'homeV2.example.title' : 'homeV2.example.titleMobile'),
  }
```

대충 로직을 파악해보면 다음과 같았습니다.

- 현재 환경이 데스크톱이면 50px 로 설정
- 데스크톱이 아니고, ko 면 30px 로 설정, 그 외에는 24px 로 설정

현재 정황상 브라우저/모바일 여부도 서버에서가 아닌 클라이언트에서 판단하고 있다는 것을 의미합니다. 이는 클라이언트 코드가 실행되는 시점에서 폰트가 급격하게 줄어들므로, CLS 에 안좋은 영향을 미치게 됩니다.

이처럼 자바스크립트에서 판단하시는 것보다는, CSS 미디어 쿼리를 사용해서 판단하게 하는 것을 추천해드립니다. CSS 는 자바스크립트 보다 훨씬 빠르게 파싱되고 적용되며, 스타일과 자바스크립트의 관심사를 명확하게 분리하여 자바스크립트는 인터랙션 로직에 집중할 수 있을 것입니다.

## 4-6. 렌더링을 블로킹하는 폰트

현재 css 상단에 다음과 같이 외부 폰트를 불러오는 코드가 있다는 것을 확인할 수 있었습니다.

```css
@import 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=Noto+Sans+JP:wght@300;400;500;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap';
*,
:after,
:before {
  box-sizing: border-box;
  white-space: pre-wrap;
}
```

이 코드는 다음과 같은 문제가 있습니다.

- CSS 파일 내의 `@import` 규칙은 페이지 렌더링을 차단할 수 있습니다. 브라우저는 먼저 이 CSS 파일을 다운로드하고 파싱하다가 `@import`를 만나면, 그제야 구글 폰트 서버로 또 다른 CSS 파일을 요청합니다. 이 구글 폰트 CSS 파일 안에는 실제 폰트 파일(`woff2` 등)을 다운로드하는 `@font-face` 규칙이 들어있습니다. 이렇게 여러 단계의 요청이 순차적으로 발생하여 폰트 로드가 지연되고, 이는 FOUT(Flash of Unstyled Text) 또는 CLS(Cumulative Layout Shift)의 원인이 될 수 있습니다. (`display=swap`은 FOUT을 유도하여 텍스트는 빨리 보이지만, 폰트 변경 시 레이아웃이 밀릴 수 있습니다.)
- 다수 폰트 로드**:** Noto Sans KR (한국어), JP (일본어), SC (중국어 간체) 폰트를 여러 굵기(weight)로 로드하고 있습니다. 만약 특정 페이지나 사용자의 언어 설정에 따라 일부 폰트만 필요하다면, 불필요한 폰트까지 다운로드하여 초기 로딩 속도를 느리게 만듭니다. CJK (Chinese, Japanese, Korean) 폰트는 문자셋이 매우 커서 파일 크기가 상당합니다.

위와 같은 문제를 수정하기 위해 다음과 같은 방안을 제안드립니다.

- HTML `<head>`에서 `<link>` 태그로 변경: `@import` 대신 HTML 파일의 `<head>` 섹션에 `<link>` 태그를 사용하여 폰트를 로드하는 것이 좋습니다. 이렇게 하면 브라우저가 병렬적으로 또는 더 일찍 폰트 CSS를 요청할 수 있습니다.
  `preconnect`는 폰트 서버에 미리 연결하여 다운로드 속도를 약간 더 향상시킬 수 있습니다.

```html
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=Noto+Sans+JP:wght@300;400;500;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap"
    rel="stylesheet"
  />
</head>
```

- 필요한 폰트만 로드 및 폰트 서브셋팅(Subsetting):
  - 선택적 로드: 사용자의 언어 설정(locale)에 따라 필요한 언어의 폰트만 동적으로 로드하거나, 최소한의 기본 폰트만 초기에 로드하고 나머지는 필요시 로드하는 방식을 고려할 수 있습니다.
  - 서브셋팅: CJK 폰트의 경우, 웹사이트에서 실제로 사용하는 글자들만 추려서 폰트 파일(서브셋)을 만들면 파일 크기를 크게 줄일 수 있습니다. (구글 폰트는 어느 정도 자동 서브셋팅을 하지만, 완벽하지 않을 수 있습니다.) 이는 주로 폰트를 직접 호스팅할 때 더 효과적으로 제어할 수 있습니다.

# 5. 마치며

지금까지 `example.com` 웹사이트의 성능을 저해하는 주요 요인으로 지적된 과도한 자바스크립트 문제와 주요 리소스(다국어 데이터, 이미지, 폰트 등) 처리의 비효율성을 살펴보았습니다. 이를 해결하기 위해 제시된 자바스크립트 최적화 및 로딩 개선, 그리고 각 리소스별 최적화 방안들이 `example.com` 웹사이트를 더욱 빠르고 안정적으로 만드는 데 실질적인 도움이 되기를 바랍니다.

이러한 작은 최적화 노력들이 쌓여 사용자들에게는 더욱 만족스러운 경험을 선사할 것이며, 이는 곧 서비스의 성장으로 이어질 수 있는 중요한 밑거름이 될 것입니다.

`example.com`의 성공적인 성능 개선 여정을 응원하며, 앞으로도 지속적인 관심과 관리를 통해 더욱 발전하는 웹사이트가 되기를 기대합니다. 궁금하신 점이나 추가 지원이 필요하시면 언제든 편하게 문의해주십시오.

이만 마무리하겠습니다. 편안한 밤 되시길 바랍니다!
