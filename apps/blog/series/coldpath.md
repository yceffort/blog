---
name: 'coldpath 제작기'
title: 'coldpath 제작기'
description: 'coldpath의 제작 동기와 V8 커버리지 분석 구현, 소스맵 없이 토스증권의 JavaScript 의존성을 추적한 과정을 다룬다.'
art:
  undraw: searching-everywhere
  hue: warm
  tone: light
---

블로그에서 어떤 JavaScript가 언제 필요한지 확인하려고 [coldpath](https://www.npmjs.com/package/@yceffort/coldpath)를 만들었다. 미실행량을 알게 된 뒤 어디를 바꿀지 판단하려면, 코드를 받아온 경로와 처음 사용하는 동작까지 연결해야 했다. 이 시리즈는 블로그에서 발견한 변경 후보와 실행량 계산의 검증, 소스맵 없는 토스증권의 코드 추적을 다룬다.

도구는 [npm의 `@yceffort/coldpath`](https://www.npmjs.com/package/@yceffort/coldpath/v/0.3.1)로 설치할 수 있다. 각 글의 실행 안내는 `@yceffort/coldpath@0.3.1`을 기준으로 하며, 측정값과 구현 분석에는 당시 사용한 버전을 따로 표시했다.
