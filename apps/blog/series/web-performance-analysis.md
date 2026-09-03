---
name: '웹 서비스 성능 분석'
title: '웹 서비스 <em>성능 분석</em>'
description: '실제 운영 중인 서비스 네 곳을 직접 성능 분석해 드리고, 그 과정과 개발자분들의 피드백을 남긴 기록'
art:
  hue: green
  tone: light
  scene: 'Four browser windows stand in a row, each showing a timeline bar of colored blocks of different lengths, with a magnifying glass hovering over one browser revealing a tangled bundle of nodes inside it.'
  composition: flatlay
---

실제로 운영 중인 웹 서비스를 보내주시면 직접 성능을 분석해 드리는 일을 한동안 진행했다. 이 시리즈는 그렇게 분석한 네 곳의 서비스에 대한 기록이다. 임의로 만든 예제가 아니라 실무에서 돌아가는 사이트를 다뤘기 때문에, 번들 구성, 렌더링 전략, 라이브러리 선택처럼 실제 코드베이스에서 마주치는 문제들이 그대로 담겨 있다.

각 편에는 분석 내용과 함께 개발자분들이 보내주신 피드백, 그리고 추가 질문에 대한 답변을 실었다. 어드민 서비스의 최적화 전략처럼 분석 대상을 넘어서는 질문도 있어서, 비슷한 상황의 다른 서비스에도 참고가 될 것이라 생각한다.

분석을 요청해주시고 피드백과 게재를 허락해주신 개발자분들께 다시 한번 감사드린다.
