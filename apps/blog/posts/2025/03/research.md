---
title: 'https://research.yceffort.kr/ 를 오픈했습니다'
tags:
  - nextjs
  - web-performance
published: true
date: 2025-03-26 10:12:30
description: '게을러터져서 이제 만든'
---

회사 동료가 [Marp](https://marp.app/)를 이용해 마크다운 파일로 발표 자료를 만드는 걸 보고, 언젠가 나도 내 블로그에서 비슷하게 만들어 보고 싶다는 생각을 했었다. 회사 발표 자료 준비에 꽤 많은 시간을 투자하고, Keynote로도 여러 자료를 만들어봤지만, 파일 관리가 쉽지 않고 어디서든 빠르게 꺼내 보여주기 어려운 한계가 있었다. 반면 Marp는 빠르게 작성할 수 있고, 웹 형태로 렌더링할 수 있어 어디서나 손쉽게 보여줄 수 있다는 장점이 있어, 언젠간 꼭 시도해보고 싶었다.

그러다 시간이 흘러 책을 집필하고 번역하느라 바쁜 나날을 보내고, 회사에선 공부나 개발할 시간을 충분히 내기 어려워 괴로워하던 차에 문득 Marp가 다시 떠올랐다. 그리고 지금이 아니면 다시는 못만들겠다는 생각에 본격적으로 작업하기 시작했고, 마침내 완성했다.

- https://github.com/yceffort/research
- https://research.yceffort.kr/

전체적인 웹사이트 구조와 디자인은 기존 블로그와 거의 동일하게 만들었다(이럴 줄 알았으면 모노레포로 구성할 걸 그랬다 조만간 모노레포로 부시고 다시 만들 수도). 다른 점이 있다면 [generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)를 활용해 정적인 Marp 페이지를 렌더링한다는 것이다. 이미 Marp 안에서 다양한 플러그인을 지원하고 있어, 큰 어려움 없이 빠르게 구축할 수 있었다.

아직 얼기설기 만들어서 보완할 부분이 많지만, 일단 출시한 뒤에 시간이 날 때 조금씩 개선해 나가려 한다. 블로그 글로 쓰기엔 조금 애매하거나 귀찮은 이야기, 혹은 발표나 소개용 자료, 또는 잘 정리해서 보관하고 싶은 자료들은 모두 이 사이트에서 Marp 형태로 만들어둘 계획이다.

오픈 기념으로 곧 출간될 책 내용과 연계된 자료 세개 공개..!

- https://research.yceffort.kr/slides/best-practice-for-package-1
- https://research.yceffort.kr/slides/best-practice-for-package-2
- https://research.yceffort.kr/slides/best-practice-for-package-3

😉
