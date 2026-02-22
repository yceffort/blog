---
title: 'Infinite Scroll의 몰락 — Google은 왜 무한 스크롤을 걷어냈는가'
tags:
  - frontend
  - ux
  - web-performance
  - accessibility
  - infinite-scroll
published: true
date: 2026-02-21 10:00:00
description: '무한 스크롤이 UX, 성능, 접근성, 그리고 법률의 관점에서 어떻게 재평가되고 있는지 살펴본다'
---

## Table of Contents

## 들어가며

2024년 6월, Google은 검색 결과에서 continuous scroll을 제거했다. 2021년 모바일, 2022년 데스크톱에 도입한 지 불과 2~3년 만이다. Google의 공식 입장은 이랬다.

> "자동으로 결과를 로딩하는 것이 검색 만족도를 유의미하게 높이지 않았다."

무한 스크롤의 대명사처럼 여겨지던 Google 검색이 다시 "다음" 버튼으로 돌아간 것이다. 이 결정은 단순한 UI 변경이 아니다. 무한 스크롤이라는 패턴 자체에 대한 재평가가 업계 전반에서 진행되고 있다는 신호다.

이 글에서는 무한 스크롤이 왜 도입됐고, 어디서 실패했으며, 기술적으로 어떤 비용을 치르고, 지금은 어떤 규제의 대상이 되고 있는지 살펴본다.

## 무한 스크롤이 작동하는 맥락

무한 스크롤이 무조건 나쁜 것은 아니다. 특정 맥락에서는 여전히 가장 효과적인 패턴이다.

Nielsen Norman Group의 분석에 따르면, 무한 스크롤은 **탐색(discovery) 중심의 경험**에서 잘 작동한다. 사용자가 특정 목표 없이 콘텐츠를 훑어볼 때, 페이지 전환이라는 마찰을 제거하면 체류 시간이 늘고 이탈률이 줄어든다. *Information Systems Journal*에 실린 연구도 "다음 버튼을 클릭하는 것 같은 짧은 중단조차 소셜 커머스 플랫폼에서 사용자가 작업을 포기하게 만들 수 있다"고 밝혔다.

Twitter(X), Instagram, TikTok이 여전히 무한 스크롤을 핵심 패턴으로 유지하는 이유가 여기에 있다. 이 서비스들의 공통점은 명확하다.

- **콘텐츠가 동질적이다** — 포스트, 사진, 짧은 영상으로 구성된 피드
- **목적이 없는 브라우징이다** — 사용자가 무엇을 찾겠다는 의도 없이 스크롤한다
- **모바일 중심이다** — 손가락 스와이프와 무한 스크롤은 자연스럽게 맞아떨어진다

문제는 이 맥락을 무시하고, 모든 곳에 무한 스크롤을 적용했을 때 발생한다.

## 무한 스크롤이 실패한 사례들

### Etsy: "모든 주요 지표에서 실패했다"

2012년, Etsy는 검색 결과에 무한 스크롤을 도입했다. 당시 Etsy의 Principal Engineer였던 Dan McKinley는 팀의 가정을 이렇게 설명했다.

> "더 많은 아이템을, 더 빨리 보여주는 것이 더 좋은 경험이라는 게 당연하다고 생각했다."

A/B 테스트 결과는 정반대였다.

| 지표 | 페이지네이션 (대조군) | 무한 스크롤 (실험군) | 변화 |
|------|----------------------|---------------------|------|
| 방문자당 조회 아이템 수 | 80 | 40 | **-50.0%** |
| 방문자당 클릭 수 | 0.6520 | 0.5811 | **-10.87%** |
| 방문자당 즐겨찾기 수 | 0.0752 | 0.0689 | **-8.38%** |
| 방문자당 구매 수 | 0.0164 | 0.0127 | **-22.5%** |

McKinley는 이를 "모든 주요 지표에서 실패했다(failed in every major way)"고 요약했다. 팀이 사후 분석에서 발견한 원인은 다음과 같았다.

**위치 감각의 상실.** 페이지네이션에서는 "2페이지 중간쯤에 봤던 상품"이라는 기억이 가능하다. 무한 스크롤에서는 그런 랜드마크가 없다. 사용자는 이전에 본 상품으로 돌아갈 수 없었고, 결과적으로 비교 행동 자체가 불가능해졌다.

**뒤로 가기의 파괴.** 상품을 클릭하고 뒤로 돌아오면 스크롤 위치가 초기화된다. 이미 본 수십 개의 상품을 다시 스크롤해야 했다.

**콘텐츠 유형의 부적합.** Google Images처럼 이미지 중심 콘텐츠는 빠르게 스캔할 수 있어서 무한 스크롤이 효과적이다. 하지만 Etsy의 상품 목록처럼 텍스트 설명, 가격, 리뷰를 비교해야 하는 콘텐츠에서는 집중적인 읽기가 필요하고, 페이지네이션이 이를 더 잘 지원한다.

McKinley의 결론은 인상적이다.

> "내 요점은 무한 스크롤이 멍청하다는 게 아니다. 우리가 우리 사이트의 사용자를 더 잘 이해했어야 했다는 것이다."

### Google 검색: 광고와 만족도의 교차점

Google이 continuous scroll을 제거한 공식적인 이유는 "더 빠르게 검색 결과를 제공하기 위해서"였다. 하지만 업계에서는 회의적인 시각이 많았다.

Google의 반독점 재판에서 공개된 내부 이메일에 따르면, 경영진은 광고 수익을 늘리는 방안을 논의해왔다. Continuous scroll은 사용자의 주의를 여러 페이지에 분산시키는 반면, 페이지네이션은 첫 번째 페이지의 광고 노출을 집중시킨다. 실제로 Workshop Digital은 이 변경 이후 5년 만에 처음으로 CPC(클릭당 비용)의 전년 대비 감소가 발생했다고 보고했다.

어떤 이유든, 핵심 사실은 변하지 않는다. Backlinko가 400만 건의 Google 검색 결과를 분석한 결과, **2페이지 결과를 클릭하는 사용자는 전체의 0.63%에 불과했다.** GSQI의 연구도 continuous scroll 도입 전후로 상위 6위 이내 결과의 클릭 비율이 ~96%로 변하지 않았음을 보여준다. 자동으로 더 많은 결과를 로딩하는 것은 대부분의 사용자에게 불필요한 일이었다.

### 직접 걷어낸 경험

나도 최근 프로젝트에서 무한 스크롤을 걷어내고 페이지네이션으로 전환한 적이 있다. 걷어내면서 가장 크게 느낀 것은, 무한 스크롤이 "구현"보다 "유지"가 훨씬 비싸다는 점이다.

**스크롤 위치 유지가 악몽이다.** 아이템을 클릭하고 상세 페이지에 다녀온 뒤 목록으로 돌아왔을 때, 이전 스크롤 위치를 정확히 복원해야 한다. 이를 위해서는 이미 로딩된 모든 아이템을 다시 불러오고, 동일한 높이로 렌더링한 뒤, 정확한 `scrollTop` 값으로 이동해야 한다. 아이템 높이가 가변적이면 — 이미지 로딩 타이밍, 텍스트 줄 수 차이 등으로 — 복원된 위치가 미묘하게 어긋난다. 이 문제를 완벽히 해결한 사이트를 거의 본 적이 없다.

**뒤로 가기(back navigation)가 까다롭다.** SPA에서 `history.pushState()`로 URL을 업데이트하지 않으면, 브라우저의 뒤로 가기가 목록이 아니라 이전 사이트로 나가버린다. URL을 업데이트하더라도 `popstate` 이벤트 핸들링, 스크롤 위치 캐싱, 데이터 재요청 여부 판단 등 신경 써야 할 것이 한두 가지가 아니다.

**예외 처리가 끝없이 늘어난다.** 네트워크 에러 시 재시도 로직, 빈 응답 처리, 중복 요청 방지(debounce/throttle), 데이터 변경으로 인한 중복 아이템 필터링, 로딩 인디케이터 상태 관리… 처음에는 Intersection Observer 하나면 될 것 같지만, 프로덕션 수준으로 올리면 코드 복잡도가 빠르게 증가한다. 페이지네이션은 이 모든 문제를 구조적으로 회피한다.

## 기술적 비용

무한 스크롤은 "그냥 스크롤하면 더 로딩되는 것"처럼 보이지만, 기술적으로는 상당한 비용을 수반한다.

### DOM 비대화와 메모리

사용자가 스크롤할수록 DOM 노드가 누적된다. Chrome Lighthouse는 **800개 노드**에서 경고를, **1,400개**에서 에러를 표시한다. 1,000개의 상품 카드가 각각 20개의 노드로 구성되어 있다면, 스크롤 끝에는 20,000개의 노드가 DOM에 존재한다. 이는 메모리 사용량 증가, 스타일 재계산 비용 증가, 가비지 컬렉션 빈도 증가로 이어진다.

실측 데이터가 이를 뒷받침한다. Expedia에서는 검색 결과 50개에 포함된 별점 컴포넌트만으로 1,200개의 DOM 노드가 생성되고 있었다. SVG 구조를 최적화해 **50개 노드로 줄이자, 주요 렌더링 지표가 ~200ms 개선됐다.** Google/SOASTA의 90만 모바일 페이지 분석에서도 페이지 요소가 400개에서 6,000개로 증가하면 **전환율이 95% 하락**하는 것으로 나타났다.

메모리 문제도 심각하다. Facebook은 무한 스크롤 피드의 메모리 누수를 탐지하기 위해 MemLab이라는 전용 도구를 개발했다. 이 도구 도입 후 facebook.com의 **OOM(Out of Memory) 크래시가 50% 감소**했고, React 18의 fiber 정리 최적화로 **평균 메모리 사용량이 ~25% 줄었다.** 거대 기업도 별도 도구를 만들어야 할 정도로, 무한 스크롤의 메모리 관리는 본질적으로 어려운 문제다.

Virtualization 라이브러리(react-window, react-virtuoso 등)로 화면에 보이는 아이템만 렌더링하는 것이 일반적인 해결책이지만, 이 역시 한계가 있다. 스크롤 위치 복원, 가변 높이 아이템 처리, SSR과의 호환성 등 구현 복잡도가 급격히 올라간다.

### Core Web Vitals에 대한 영향

**CLS (Cumulative Layout Shift).** 무한 스크롤에서 가장 까다로운 지표다. CLS 측정에서 스크롤은 "능동적 상호작용(active interaction)"으로 취급되지 않는다. 클릭이나 키 입력 후 500ms 이내의 레이아웃 이동은 CLS에서 제외되지만, 스크롤 중 발생하는 콘텐츠 삽입은 그런 유예가 없다. 새로운 아이템이 로딩되면서 footer가 밀려나거나, 이미지가 예약된 공간 없이 로딩되면 CLS 점수가 직접적으로 악화된다.

Andrea Verlicchi가 2025년 Web Performance Calendar에서 정리한 핵심 원칙은 이렇다.

> "사용자가 스크롤하는 동안 페이지의 보이는 부분을 움직이지 마라. 콘텐츠가 보이기 전에 공간을 확보하라."

반면 "Load More" 버튼은 이 문제를 구조적으로 회피한다. 버튼 클릭은 능동적 상호작용이므로, 클릭 직후 skeleton placeholder를 삽입하면 500ms 유예 기간 안에 레이아웃 확장이 완료된다. 네트워크 응답이 느려도 CLS 페널티가 0이다.

**INP (Interaction to Next Paint).** 무한 스크롤 구현이 스크롤 이벤트에서 무거운 JavaScript를 실행하면 메인 스레드가 블로킹되어 INP가 악화된다. passive event listener 사용, Intersection Observer API 기반 구현, requestAnimationFrame을 통한 스로틀링 등으로 완화할 수 있지만, 추가적인 엔지니어링 비용이 든다.

### 접근성: 해결 불가능한 문제들

접근성은 무한 스크롤의 가장 근본적인 기술적 문제다. W3C의 WCAG 논의에서 한 참여자는 무한 스크롤을 **"키보드 트랩"**으로 간주할 수 있다고 언급했다.

**키보드 사용자.** 무한 스크롤 영역의 모든 링크를 Tab으로 순회해야만 그 아래 콘텐츠에 도달할 수 있다. 한 테스트에서는 사이드 콘텐츠에 도달하기까지 **100번 이상의 Tab 키 입력**이 필요했다.

**스크린 리더 사용자.** 테스트 참여자의 발언이 문제를 명확하게 보여준다.

> "footer가 있는지 없는지 알 수가 없었다."
>
> "스크린 리더가 콘텐츠를 계속 읽어 내려갔고, 몇 분 뒤에 답답해졌다."

**음성 인식 사용자.** Dragon 같은 음성 인식 소프트웨어 사용자는 새로운 콘텐츠 로딩을 트리거할 방법 자체가 없다. 무한 스크롤 경험에서 완전히 배제된다.

**저시력 사용자.** 화면 확대 소프트웨어를 최대 6배까지 사용하는 저시력 사용자에게, 스크롤하면서 콘텐츠가 동적으로 변하는 것은 방향 감각 유지를 극도로 어렵게 만든다.

ARIA 1.1에서 도입된 `role="feed"`는 스크린 리더 사용자를 위한 부분적 해결책이지만, 키보드 트랩, 인지 과부하, 운동 장애, 음성 인식, 저시력 사용자의 문제는 해결하지 못한다. W3C WCAG 논의의 결론은 명확하다 — 무한 스크롤은 **"현행 WCAG 2.0 기준으로 명확하게 다루지 못하는 실질적인 접근성 격차"**를 나타내며, WCAG 3.0에서 이를 다뤄야 한다.

## 규제 동향

기술적 논의를 넘어, 무한 스크롤은 이제 입법의 대상이 되고 있다. 미국 연방 수준의 KIDS Online Safety Act(KOSA)는 무한 스크롤을 미성년자 대상 "중독적 디자인 기능"의 대표 사례로 명시했고, 뉴욕주의 SAFE for Kids Act는 18세 미만 사용자에 대해 무한 스크롤, 알고리즘 피드, 자동 재생을 부모 동의 없이 제공하는 것을 제한한다(위반당 $5,000 벌금). 중국은 2021년부터 이미 미성년자 대상 앱에서 알고리즘 피드와 무한 스크롤에 시간 제한을 시행 중이다.

TikTok의 미성년자 60분 제한, Instagram의 "Take a Break", YouTube Shorts의 타이머 — 플랫폼도 규제 압력에 선제 대응하고 있다. 무한 스크롤 자체가 중독을 유발한다는 것은 과잉 단순화이고, 실제로 문제가 되는 것은 **알고리즘 피드 + 자동 재생 + 무한 스크롤의 결합**이다. 하지만 "미성년자 보호"라는 프레이밍이 붙으면 이 구분은 정치적으로 의미가 없어진다. 프론트엔드 엔지니어로서 알아둬야 할 것은, 무한 스크롤을 도입할 때 규제 컴플라이언스가 추가 비용이 될 수 있다는 점이다.

## 대안 패턴 비교

무한 스크롤을 대체할 수 있는 패턴들과 그 trade-off를 정리하면 다음과 같다.

| 패턴 | 장점 | 단점 | 적합한 맥락 |
|------|------|------|-------------|
| **Pagination** | 위치 감각 유지, SEO 우수, 접근성 좋음 | 페이지 전환 마찰, 사용자 불만 높음 | 검색 결과, 관리자 목록 |
| **Infinite Scroll** | 마찰 제거, 체류 시간 증가, 모바일 친화적 | 위치 상실, CLS 악화, 접근성 파괴 | 소셜 피드, 이미지 갤러리 |
| **Load More 버튼** | 사용자 제어, CLS 우회, 접근성 양호 | 클릭 필요, 초기 구현은 단순하지만 스크롤 복원이 어려움 | 이커머스, 블로그 목록 |
| **Hybrid** (자동 N회 로딩 후 Load More) | 초반 마찰 제거 + 후반 제어 | 구현 복잡도 증가 | 콘텐츠 양이 많은 목록 |
| **Virtualized Infinite Scroll** | 메모리/DOM 효율적, 대량 데이터 처리 | SSR 호환성, 가변 높이 처리 복잡, 접근성 문제 동일 | 대시보드, 데이터 테이블 |

Baymard Institute의 e-commerce UX 연구는 **"Load More" 버튼 + lazy loading** 조합을 권장한다. 이 방식에서 사용자는 페이지네이션보다 더 많은 상품을 탐색하면서도, 무한 스크롤보다 개별 상품을 더 주의 깊게 살펴봤다. 다만 조사 시점에서 미국 상위 50개 이커머스 사이트 중 이 패턴을 채택한 곳은 **8%**에 불과했다.

구체적인 가이드라인은 이렇다.

- **카테고리 페이지:** 10~30개 상품을 초기 로딩, lazy loading으로 추가 10~30개, 이후 "Load More" 버튼 표시
- **검색 결과:** 25~75개 상품 기본 로딩. **검색에는 절대 무한 스크롤을 사용하지 말 것** — Etsy의 실패가 이를 증명한다
- **모바일:** 15~30개 상품 후 "Load More" 표시
- **뒤로 가기:** `history.pushState()`를 사용해 URL을 업데이트하고, 뒤로 가기 시 스크롤 위치를 복원해야 한다. 벤치마크 대상 사이트의 **90% 이상**이 이 동작을 잘못 처리하고 있었다

## 마치며

무한 스크롤은 나쁜 패턴이 아니다. 맥락을 무시하고 쓸 때 나쁜 패턴이 된다.

소셜 피드처럼 목적 없는 탐색이 핵심인 서비스에서는 여전히 효과적이다. 하지만 이커머스 상품 목록, 검색 결과, 비교가 필요한 콘텐츠에서는 Etsy와 Google이 실증적으로 보여줬듯이 역효과를 낸다. 기술적으로는 DOM 비대화, CLS 악화, 접근성 파괴라는 비용을 수반하고, 법적으로는 "중독적 디자인"이라는 프레임 아래 규제의 대상이 되고 있다.

Nielsen Norman Group의 결론이 핵심을 잘 요약한다.

> "어떤 솔루션도(무한 스크롤, 페이지네이션, Load More, 통합 페이지네이션) 전반적으로 우월하지 않다."

패턴 자체에 선악은 없다. 사용자의 의도와 서비스의 목적에 맞는 선택이 핵심이다. 그리고 그 판단을 위해서는 — Etsy의 McKinley가 말했듯이 — "우리 사이트의 사용자를 더 잘 이해하는 것"이 선행되어야 한다.

## 참고

- [Infinite Scrolling: When to Use It, When to Avoid It - Nielsen Norman Group](https://www.nngroup.com/articles/infinite-scrolling-tips/)
- [Google Dropping Continuous Scroll in Search Results - Search Engine Land](https://searchengineland.com/google-dropping-continuous-scroll-in-search-results-443529)
- [Infinite Scroll Fail: Etsy - Dan McKinley](https://danwin.com/2013/01/infinite-scroll-fail-etsy/)
- [Design for Continuous Experimentation - Dan McKinley (Etsy A/B Test Data)](https://www.slideshare.net/danmckinley/design-for-continuous-experimentation)
- [Infinite Scrolling, Pagination Or "Load More" Buttons - Smashing Magazine (Baymard Institute)](https://www.smashingmagazine.com/2016/03/pagination-infinite-scrolling-load-more-buttons/)
- [Infinite Scrolling & Role Feed Accessibility Issues - Deque](https://www.deque.com/blog/infinite-scrolling-rolefeed-accessibility-issues/)
- [Infinite Scroll Accessibility: Is it Any Good? - DigitalA11Y](https://www.digitala11y.com/infinite-scroll-accessibility-is-it-any-good/)
- [W3C WCAG Discussion: Infinite Scroll Accessibility](https://github.com/w3c/wcag/discussions/3837)
- [Infinite Scroll Without Layout Shifts - Addy Osmani](https://addyosmani.com/blog/infinite-scroll-without-layout-shifts/)
- [Optimizing CLS for Infinite Scroll and Load More - Web Performance Calendar](https://calendar.perfplanet.com/2025/optimizing-cls-for-infinite-scroll-and-load-more/)
- [We Analyzed 4 Million Google Search Results - Backlinko](https://backlinko.com/google-ctr-stats)
- [Google Continuous Scroll Desktop Study - GSQI](https://www.gsqi.com/marketing-blog/google-continuous-scroll-study/)
- [Minimizing DOM Nodes for Performance - Expedia Group](https://medium.com/expedia-group-tech/minimizing-dom-nodes-for-performance-57f347df4c72)
- [MemLab: Finding JavaScript Memory Leaks - Facebook Engineering](https://engineering.fb.com/2022/09/12/open-source/memlab/)
- [Avoid an Excessive DOM Size - Chrome Lighthouse](https://developer.chrome.com/docs/lighthouse/performance/dom-size)
- [Mobile Page Speed Benchmarks - Google/SOASTA](https://business.google.com/ca-en/think/marketing-strategies/mobile-page-speed-new-industry-benchmarks/)
- [KIDS Online Safety Act - U.S. Congress](https://www.congress.gov/bill/119th-congress/senate-bill/1748/text)
- [NY SAFE for Kids Act - NY Attorney General](https://ag.ny.gov/press-release/2025/attorney-general-james-releases-proposed-rules-safe-kids-act-restrict-addictive)
