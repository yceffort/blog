---
name: 디렉티브 딥다이브
title: '<em>디렉티브</em> 딥다이브'
description: "'use client', 'use server', 'use cache'. 파일 맨 위 한 줄이 빌드와 런타임에서 무엇으로 변하는지 소스 레벨까지 따라간 기록"
art:
  hue: violet
  tone: light
  scene: 'A single file icon at the center splits into two separate module nodes connected by thin lines, one line crossing a vertical network boundary wall with an arrow passing through it.'
  composition: diagonal
---

React와 Next.js의 디렉티브는 파일 맨 위에 문자열 한 줄을 적는 것이 전부다. 그런데 그 한 줄이 만드는 결과는 전부가 아니다. 모듈 그래프가 갈라지고, 함수가 네트워크 엔드포인트로 바뀌고, 캐시 경계가 생긴다. 적기는 쉬운데 무슨 일이 벌어지는지는 설명하기 어려운 이 간극이 시리즈의 출발점이다.

세 편은 각각 `'use client'`, `'use server'`, `'use cache'`를 맡아, 디렉티브가 빌드 타임에 어떤 변환을 거치고 런타임에 어떤 코드로 실행되는지를 번들러와 React 소스까지 내려가서 따라간다. 각 편 서두에 분석한 소스의 버전 태그를 고정해 두었으므로, 이후 버전에서 달라진 부분이 있다면 그 기준으로 대조할 수 있다.

경계라는 같은 주제를 셋으로 나눈 것에 가깝기 때문에 순서는 크게 중요하지 않지만, 클라이언트 경계를 다루는 첫 편이 나머지 두 편의 용어를 깔아주는 역할을 한다.
