---
name: 'Next.js의 페이지 보존'
title: '<em>Next.js</em>의 페이지 보존'
description: 'cacheComponents를 켠 Next.js에서 떠난 페이지가 숨겨지고 다시 나타나는 과정. Activity와 라이브러리의 생명주기 충돌, 실제 보존 범위, 남겨 둘 상태와 종료할 작업을 나누는 메모리 관리'
art:
  undraw: tabs
  hue: cyan
  tone: light
---

이 블로그는 Next.js의 `cacheComponents`를 켜 두었다. 다른 페이지로 이동하면 이전 화면 일부가 React Activity 안에 숨겨져 남는다. 다시 돌아왔을 때 상태를 복원할 수 있지만, 라이브러리가 예상한 생명주기와 다르게 움직이거나 여러 화면의 DOM을 함께 유지할 수 있다.

1편은 소개 페이지의 three.js 캔버스가 하얗게 비었던 문제를 따라간다. Next.js가 화면을 숨기는 시점과 React가 Effect를 정리하는 시점, react-three-fiber가 WebGL 컨텍스트를 버리는 시점을 소스와 재현으로 확인한다.

2편은 연속 이동 실험에서 글 3개와 9개가 남은 이유를 확인한 뒤, 메모리를 관리할 때 무엇을 바꿀지 살핀다. 숨겨질 때 종료할 작업과 돌아왔을 때 복원할 상태를 나누고, DOM과 데이터의 크기, 페이지 밖 캐시의 수명을 검토한다. 측정으로 확인한 결과와 아직 절감량을 재지 않은 개선 방향을 구분한다.
