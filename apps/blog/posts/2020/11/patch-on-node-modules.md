---
title: 'node_modules에 임시 패치 적용하기'
tags:
  - nodejs
  - javascript
published: true
date: 2020-11-23 22:41:38
description: '이러고 있을 때가 아니고 이슈 업해서 오픈소스 컨트리뷰터가 되야 되는데'
---

세상 많은 javascript 패키지에 감사하며 개발을 하고 있지만, 때로는 이러한 오픈소스에도 버그가 존재하곤 한다. 한 달 전 쯤에는, [리액트에서 ie11에 존재하지 않는 `Array.fill()`을 쓰는 바람에 패치를 한 것을 본 적도 있다.](https://github.com/facebook/react/issues/20069) 공짜로 가져다 쓰는 주제에 감사는 못할 망정 비난을 하는 것은 아니지만, 모두가 완벽할 수는 없고, 때로는 이런 버그를 내가 찾아서 적용해야 할 때가 있다. 아래 과정은 이슈 업해서 고쳐지는 것을 기다리기엔 너무 급한 나에게 필요한 방법이다.

## 1. 패치 폴더 만들기

```bash
mkdir patches
```

## 2. 해당 폴더에 패치를 적용할 파일을 만들기

일단 `node_modules` 에 버그를 수정한 패치를 적용해서 작동을 확인했다고 가정하자. (이번 예제에서는 `react-dom`에 `console.log`를 찍어볼 것이다.)

```bash
cp node_modules/react-dom/index.js patches/react-dom-index.js
```

그리고 아래 명령어로 `node_modules`를 다 지운 다음, 다시 설치해서 비교해 볼 것이다.

```bash
rm -rf ./node_modules && npm install
```

## 3. 패치 파일 만들기

그리고 diff 로 비교해보자

```bash
» diff -Naur node_modules/react-dom/index.js patches/react-dom-index.js
--- node_modules/react-dom/index.js     1985-10-26 17:15:00.000000000 +0900
+++ patches/react-dom-index.js  2020-11-23 16:55:32.000000000 +0900
@@ -28,6 +28,8 @@
   }
 }

+console.log('==========REACT DOM START==========')
+
 if (process.env.NODE_ENV === 'production') {
   // DCE check should happen before ReactDOM bundle executes so that
   // DevTools can report bad minification during injection.

```

그리고 이를 `patch`로 export 한다.

```bash
diff -Naur node_modules/react-dom/index.js patches/react-dom-index.js > patches/react-dom-bug.patch
```

```text
--- node_modules/react-dom/index.js  1985-10-26 17:15:00.000000000 +0900
+++ patches/react-dom-index.js  2020-11-23 16:55:32.000000000 +0900
@@ -28,6 +28,8 @@
   }
 }

+console.log('==========REACT DOM START==========')
+
 if (process.env.NODE_ENV === 'production') {
   // DCE check should happen before ReactDOM bundle executes so that
   // DevTools can report bad minification during injection.
```

## 4. 적용하기

아까 지우고 다시 설치했기 때문에 버그가 있던 깔끔한 상태로 있을 것이다. 이에 패치 파일을 씌워보자.

```bash
patch --forward node_modules/react-dom/index.js < patches/react-dom-bug.patch
patching file node_modules/react-dom/index.js
```

적용이 잘되었는지 확인해보자. 잘 되었는지 확인 되었다면, 맨처음에 만들었던 파일 (버그 수정버전)을 삭제해도 된다.

```bash
rm patches/react-dom-index.js
```

## 5. `postinstall` 에 걸어두기

[npm postinstall](https://docs.npmjs.com/cli/v6/using-npm/scripts#npm-install)에 걸어두면 설치한 후애 해당 커맨드를 실행한다. `npm install` 과 `npm ci`에서 모두 동작한다.

`package.json`

```json
{
  "postinstall": "patch --forward node_modules/react-dom/index.js < patches/react-dom-bug.patch"
}
```

## 6. 기다리기

이제 오픈소스 컨트리뷰터가 해당 버그를 수정해주시기를 기도하자. 🙏🙏
