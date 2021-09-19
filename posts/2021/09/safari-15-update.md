---
title: '웹 개발자가 본 사파리 15의 변화와 대응'
tags:
  - javascript
published: true
date: 2021-09-19 17:46:41
description: '죽인다 사파리'
---

## Introduction

사파리 15가 나왔다. 애플을 굉장히 좋아하고, 또 다수의 애플 제품을 보유하고 있는 나로서는 매우 즐거운 일이지만, 이번 safari 15는 나에게 몇가지 이슈를 안겨줬다. 무엇이 달라졌고, 어떻게 대응해야 하는지 살펴보자. 

## 버튼 기본 색상 및 radius 변경

먼저 버튼의 기본 색상과 raidus가 변경되었다.

![safari14-button](./images/safari14-button.png)

![safari15-button](./images/safari15-button.jpeg)

애플에서 자주 보던 그 파란색이다. 이제 스타일 리셋을 할때 버튼의 색깔까지 클리어 해주어야 한다. 

## 사파리 100vh 문제 해결?

모바일 사파리에서는 기존 버전까지 `100vh`가 의도대로 동작하지 않는 문제가 있었다. 요약하자면 모바일 사파리에서는 스크롤시 주소창이 사라지는데, 이 경우 `100vh`가 뷰포트의 100% 높이가 변경되어 버리는 문제가 있다. 즉, `100vh`라는 값이 정적이지 않다는 뜻이다. 문제를 자세히 살펴보자.

먼저 우리가 아는 `vh` 란 viewport 너비의 1%를 말한다.

그리고 모바일 사파리에서 동작하는 `100vh`는 아마도 아래와 같을 것이라고 추측하고 있다.

> 가장 큰 문제는 모바일 브라우저 (크롬, 사파리)가 주소창이 보여지거나 숨겨져서 view port의 크기가 변경될 수 있다는 것이다. 이러한 브라우저는 view port 높이가 변경될때 현재 가시적인 부분으로 100vh를 수정하는 것이 아니라, 브라우저 주소 표시줄이 숨겨진 상태에서 100vh를 설정해둔다는 것이다. 그 결과, 주소표시줄이 다시 보이게 될 때 화면 하단 부분이 잘려나가서, 100vh의 목적을 위반하게 된다.

> https://chanind.github.io/javascript/2019/09/28/avoid-100vh-on-mobile-web.html

![100vh](https://chanind.github.io/assets/100vh_problem.png) 

### 테스트

아래 테스트 페이지를 살펴보자. 하단에는 버튼이 있고, 이 모든 요소들은 `100vh`로 감싸져 있다.

![safari14-100vh](./images/safari14-100vh.png)

![safari15-100vh](./images/safari15-100vh.jpeg)

오오 해결된 것 같지만...

![safari15-100vh-floating-address-bar](./images/safari15-100vh-floating-address.jpeg)

> 짜잔 사실 해결되지 않았습니다. 

Safari15에서도 `100vh`에는 변화가 없다. 이 쯤 되면 사실상 해결할 생각이 없거나, 혹은 이를 문제라고 보고 있는 것 같지 않다.

이를 해결하기 위해서는 어떻게 해야할까? 

시간을 과거로 돌려, 아이폰 X가 처음나왔을때, 노치에 컨텐츠가 가려지는 문제를 해결하기 위하여 애플이 [`env`와 `safe-area-inset`을 소개했던 것](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)을 떠올려보자.

사파리 14에서는, `safe-area-inset-bottom`의 값이 주소 창에 상관없이 0으로 고정되어 있었다. 그러나 사파리 15에서는 주소창이 활성화 되지 않은 상태에서의 `safe-area-inset-bottom`값은 0 이지만, 주소창이 펼쳐졌을 때는 그 값만큼 제공이 된다.

```css
height: calc(100vh - env(safe-area-inset-bottom));
```

