---
title: 'typescript@7을 설치하면 벌어지는 일들: 블로그 모노레포 마이그레이션 기록'
tags:
  - typescript
  - oxc
  - eslint
  - tooling
  - frontend
published: true
date: 2026-08-10 22:00:00
description: 'pnpm lint가 12분 32초 걸리던 모노레포에 typescript 7.0.2를 넣어봤다. 타입체크는 조용히 지나갔는데 next build가 깨졌고, lint는 크래시했다. eslint와 prettier를 oxlint와 oxfmt로 갈아탄 하루의 연쇄 반응과 전후 실측 기록. 미리 말해두면, 빌드는 빨라지지 않았다.'
thumbnail: /thumbnails/2026/08/typescript-7-oxc-migration.png
---

## Table of Contents

## 토요일 저녁, typescript@7

이 블로그 저장소에서 `pnpm lint`는 12분 32초가 걸리는 명령이었다. 지금은 0.4초에 끝난다. 다만 이런 숫자 뒤에는 보통 성공담이 따라오기 마련이라 미리 고백해두면, **빌드는 1초도 빨라지지 않았다.** 43.0초였던 콜드 빌드는 지금도 43.4초다.

[TypeScript 7](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)이 npm의 latest가 된 것을 보고, 토요일 저녁에 가벼운 마음으로 사이드 프로젝트(이 블로그의 pnpm 모노레포)에 설치해 봤다. 컴파일러가 Go로 다시 쓰인 메이저 버전이니 반나절은 각오했는데, 정작 TS 7 자체는 10분 만에 끝났고 나머지 시간은 전부 다른 것들이 연쇄적으로 무너지는 것을 수습하는 데 썼다. 이 글은 그 하루의 기록이다. 그날의 커밋 로그를 따라가면 이렇게 된다.

- ⬆️ [Upgrade to TypeScript 7 and Next.js 16.3](https://github.com/yceffort/blog/commit/46d0f9ac)
- 🔧 [Replace eslint and prettier with oxlint and oxfmt](https://github.com/yceffort/blog/commit/535795db)
- ♻️ [Adapt code to oxlint ruleset](https://github.com/yceffort/blog/commit/3a43ab23)
- 🎨 [Reformat with oxfmt and sort imports](https://github.com/yceffort/blog/commit/a031d0e0)
- ⬆️ [Migrate to pnpm 11 and trim overrides](https://github.com/yceffort/blog/commit/38e03cc5)
- ♿ [Adopt native dialog and button semantics](https://github.com/yceffort/blog/commit/fe4c6299)
- 🔧 [Enable type-aware linting via tsgolint](https://github.com/yceffort/blog/commit/9b7a8e18)
- 🐛 [Fix sitemap tag urls and issue link slug](https://github.com/yceffort/blog/commit/d1da090e)

typescript를 올리러 갔다가 lint와 포매터가 통째로 교체되고, 마지막에는 몇 달 묵은 버그 수정으로 끝난다. 순서대로 따라가 본다.

> 대상 버전: typescript 5.9.3 → 7.0.2, next 16.2.12 → 16.3.0, eslint 9.39.5 → oxlint 1.77.0 (+ oxlint-tsgolint 7.0.2001), prettier 3.9.6 → oxfmt 0.62.0 (베타), pnpm 10.6.5 → 11.20.0

## 업그레이드 자체는 10분

`pnpm add typescript@7`을 하고 고친 것은 tsconfig 두 줄이 전부다. 애플리케이션 코드는 한 줄도 건드리지 않았다.

하나는 `baseUrl` 삭제. TS 7에서 이 옵션 자체가 제거되어 지우는 것 외에 선택지가 없었고, 상대 경로 import만 쓰는 저장소라 지워도 아무 일이 없었다. 다른 하나는 `lib`을 `es2023`으로 올린 것인데, 이건 뒤에 나올 oxlint 대응(`sort`를 `toSorted`로 교체) 때문이지 TS 7 탓은 아니다. 굳이 함정이라 부를 만한 것은 하나였다. `lib`을 올렸는데도 `toSorted`가 없다는 에러가 계속 나서 한참 들여다봤는데, 범인은 이전 컴파일이 남긴 tsbuildinfo 캐시였다. 컴파일러를 통째로 갈아 끼운 날 만난 가장 큰 컴파일러 문제가 캐시 파일 삭제였다는 것이 TS 7의 호환성을 잘 말해준다고 생각한다.

여기까지가 10분. 문제는 `tsc`가 아니라 `tsc` 위에 쌓여 있던 것들이었다.

## 첫 번째로 깨진 것: next build

typescript@7 패키지에는 `lib/typescript.js`가 없다. 컴파일러가 Go 바이너리가 되면서, 수많은 도구가 의존해 온 JS 컴파일러 API가 통째로 사라졌다. Next.js는 빌드 중 타입체크를 바로 그 JS API로 하고 있었고, 당시 버전이던 16.2.12는 API가 없는 typescript 패키지를 만나자 빌드 단계에서 실패했다.

해법은 Next.js 16.3에 있었다. 16.3은 [useTypeScriptCli](https://nextjs.org/docs/app/api-reference/config/next-config-js/useTypeScriptCli)라는 이름으로 JS API 대신 로컬 tsc CLI를 직접 호출하는 방식을 넣었고, 이게 기본으로 켜져 있어 TS 6은 물론 JS API가 없는 TS 7에서도 빌드 중 타입체크가 동작한다. 그러니까 **typescript 메이저 업그레이드가 next 마이너 업그레이드를 강제**한 셈인데, 프레임워크가 컴파일러를 따라가는 게 아니라 컴파일러가 프레임워크 버전을 끌어올리는 방향이라 조금 낯설었다. 16.3으로 올리는 김에, 삭제된 `experimental.viewTransition` 플래그도 next.config에서 지웠다.

## 두 번째로 깨진 것: lint

빌드를 살리고 `pnpm lint`를 돌리자 이번에는 eslint가 죽었다. 규칙 위반 목록이 아니라 실행 자체가 죽는 하드 크래시였고, 메시지는 "typescript-eslint does not support TS 7.0"으로 시작해서 TS 6 API로 우회하는 방법을 안내하는 링크로 끝났다.

typescript-eslint의 peer dependency 범위는 `<6.1.0`이고, [트래킹 이슈](https://github.com/typescript-eslint/typescript-eslint/issues/10940)를 보면 TS 7의 안정적인 외부 API가 7.1에 예정되어 있어 그전까지는 정식 지원이 어렵다는 사정이 보인다. typescript-eslint만이 아니다. ts-jest, ts-morph, Vue와 Svelte와 Astro의 타입체커까지, JS API 위에 서 있던 도구들이 전부 같은 줄에서 대기 중이다. 공식 우회는 `@typescript/typescript6`을 병행 설치해 lint만 TS 6로 돌리는 것인데, 마침 oxlint로 갈아탈 생각을 하던 참이라 이쪽을 우회 대신 선택했다. 여기서부터는 TS 7 마이그레이션이 아니라 툴체인 교체 이야기가 된다.

## eslint와 prettier를 내리고

[oxlint](https://oxc.rs)로 갈아타면서 걱정한 것은 속도가 아니라 커버리지였다. 기존에는 @naverpay/eslint-config가 typescript-eslint, react, jsx-a11y, import 계열을 묶어주고 있었고, 이걸 oxlint 플러그인 구성으로 다시 매핑했다. 다행히 oxlint가 기존 `eslint-disable` 주석을 그대로 해석해줘서, 수년치 주석을 한 줄도 고치지 않고 넘어왔다.

플러그인을 켜자 기존 eslint가 잡지 않던 지적이 84건 나왔다. 하나씩 보면서 "규칙이 틀렸다"와 "코드가 틀렸다"로 나누는 것이 이날 오후의 일이었다.

규칙 쪽으로 분류한 대표는 `react/react-in-jsx-scope`였다. 처음 켰을 때 무려 1,281건이 나와서 잠깐 놀랐는데, 내용을 보면 전부 "JSX를 쓰는 파일에 `import React from 'react'`가 없다"는 지적이었다. 이 규칙은 JSX가 `React.createElement` 호출로 컴파일되던 React 16 이전 시절의 유산이다. 그때는 JSX 파일마다 React가 스코프에 있어야 해서 import 누락이 곧 런타임 에러였지만, React 17부터는 자동 JSX 런타임(automatic JSX runtime)이 도입되어 컴파일러가 `react/jsx-runtime`의 함수를 알아서 import한다. Next.js도 당연히 이 방식을 쓰므로, React를 import하지 않은 JSX 파일은 문제가 아니라 오히려 권장 형태다. 다시 말해 1,281건 전부가 정상 코드에 대한 오탐이었고, 규칙을 끄는 것이 정답이었다. eslint 시절에는 프리셋(`react/jsx-runtime`)이 이 규칙을 알아서 꺼주고 있었는데, oxlint에서 플러그인을 직접 구성하면서 잠시 부활했던 것이다.

코드 쪽으로 분류한 대표는 jsx-a11y였다. `role="dialog"`를 붙인 div 모달들을 네이티브 `dialog` 요소로 바꿨는데, 미뤄온 세월이 무색하게 브라우저 기본 스타일을 리셋하는 CSS 한 블록이면 기존 모양이 그대로 유지됐다.

prettier 쪽은 허무할 정도였다.

```bash
oxfmt --migrate prettier
```

이 한 번으로 설정이 넘어왔고, 옮기지 못한 옵션은 `endOfLine: auto` 하나였다("is not supported, skipping"이라고 스스로 알려준다). 전체 673개 파일 중 재포맷된 것은 50개 남짓. 마크다운과 yaml까지 포맷 대상이라 prettier가 맡던 영역이 거의 그대로 넘어오고, `sortImports` 옵션이 eslint의 `import/order` 규칙까지 대체해줬다.

물론 공짜는 아니었다. 기존 config가 해주던 package.json 파일 lint는 oxlint 범위 밖이라 사라졌고, `react/jsx-sort-props`처럼 oxlint에 구현이 없는 규칙도 있었고, `typescript/no-unsafe-type-assertion`은 지적량이 감당이 안 돼 껐다. oxfmt가 아직 0.x 베타라는 점도 감안이 필요하다.

## 뜻밖의 수확: 1.9초짜리 타입 인식 린트

이날 가장 재미있었던 부분이다. oxlint의 기본 모드는 타입 정보를 아예 쓰지 않는다. 0.4초의 비결이 그것이고, 대신 `no-floating-promises` 같은 타입 기반 규칙은 못 돌린다. typescript-eslint를 버리며 잃은 것이 바로 이 typed linting인데, [tsgolint](https://github.com/oxc-project/tsgolint)가 이 자리를 메운다. typescript-go 위에 타입 기반 규칙을 구현한 프로젝트라, `oxlint --type-aware`로 붙이면 타입 인식 린트가 돌아온다.

그러니까 이런 아이러니가 된다. tsgolint는 TS 7의 컴파일러 위에 서 있어서, **typescript-eslint가 크래시하는 바로 그 TS 7 환경에서 타입 인식 린트가 전체 모노레포 기준 1.9초에 돈다.** TS 7 때문에 typed lint를 포기해야 했던 자리에서, TS 7 덕분에 더 빠른 typed lint를 얻었다.

켠 첫날 실제 버그도 나왔다. `no-base-to-string`이 잡아낸 sitemap이 백미였다.

```diff
-    ...tags.map((tag) => ({
+    ...tags.map(({tag}) => ({
       url: `https://yceffort.kr/tags/${tag}`,
     })),
```

`tags`가 `{tag, count}` 객체 배열인데 구조 분해를 빼먹어서, sitemap의 모든 태그 URL이 `tags/[object Object]`로 생성되고 있었다. 중괄호 하나 차이로 몇 달간 검색 엔진에 깨진 URL을 제출해 온 SEO 버그이고, 타입은 전부 맞아서 tsc는 내내 조용했다. 비슷하게 `restrict-template-expressions`가 포스트 하단 이슈 링크에서 slug 배열이 쉼표로 이어진 채 문자열이 되던 것을 잡았고, fullscreen과 clipboard와 service worker 등록에서 `no-floating-promises` 7건이 나왔다. 전부 "타입은 맞는데 의도가 틀린" 코드였다는 점이 typed linting의 존재 이유를 다시 보여줬다.

## 숫자 정산

마이그레이션 이전 시점을 git worktree로 재현해서 같은 머신에서 전후를 쟀다.

> 측정 환경: 같은 Apple M 시리즈 맥, 콜드 캐시, 각 1회. eslint는 재실행도 5분을 넘겨 회수를 늘리지 못했다. 결론은 전부 자릿수 차이에 기대고 있어 1회 측정으로도 판단은 달라지지 않는다고 본다.

| 항목      | 이전                    | 이후                           | 배율                  |
| --------- | ----------------------- | ------------------------------ | --------------------- |
| lint      | 752.4초 (eslint, typed) | 0.4초 / 1.9초 (`--type-aware`) | 약 1,880배 / 약 400배 |
| 포맷 체크 | 216.6초 (prettier)      | 2.9초 (oxfmt)                  | 약 75배               |
| 타입체크  | 4.2초 (tsc ×3)          | 1.1초 (네이티브 tsc ×3)        | 약 4배                |
| 콜드 빌드 | 43.0초                  | 43.4초                         | 동일                  |

표는 압승처럼 보이지만 줄마다 정직하게 읽을 필요가 있다. lint의 1,880배는 비교 축이 다른 숫자다. eslint 752초의 정체는 typed linting이 워크스페이스마다 TS 프로그램을 새로 빌드하는 비용이고, oxlint 0.4초는 타입을 아예 안 보는 모드다. 같은 일을 하는 비교는 타입 인식을 켠 1.9초 쪽이고, 그래도 400배쯤 된다. 타입체크 4배는 코드베이스가 작아 절대값이 무의미한 수준이다(1.1초의 대부분이 워크스페이스 세 개의 기동 비용). typescript-go가 내세우는 10배는 순수 체크 시간이 지배하는 큰 코드베이스의 수치다. 다만 깎아내리기만 할 숫자는 아니다. 기동 비용을 다 짊어지고도 1/4로 줄었다는 것은 그 자체로 좋은 수치이고, 순수 체크 시간의 비중이 큰 코드베이스일수록 이 배율은 10배 쪽에 가까워질 것이다.

## 그래서 빌드는 왜 안 빨라졌나

서두에서 던져둔 질문으로 돌아오면, 답은 빌드 시간의 구성에 있다. 이 저장소의 `next build` 43초는 Turbopack이 소스를 컴파일하는 시간과 400페이지 남짓을 정적 생성하는 시간이 대부분을 차지하고, 타입체크는 그 안에서 수 초짜리 구간이다. 컴파일러를 갈아치워서 빨라지는 것은 그 수 초뿐이니, 4.2초가 1.1초가 되어도 43초 전체에서는 오차 범위에 묻힌다.

조금 더 구조적으로 말하면, TS 7이 빨라지게 만드는 것과 `next build`가 시간을 쓰는 곳이 애초에 겹치지 않는다. TypeScript는 타입을 지우면 JS가 되는 언어라서, 빌드의 변환 작업은 오래전부터 타입을 무시하고 걷어내는 네이티브 도구(SWC, 지금은 Turbopack)가 해왔다. 빌드 경로에서 tsc가 맡은 일은 변환이 아니라 검사뿐이고, TS 7은 그 검사를 빠르게 한 것이다. 원래도 작던 조각을 아무리 줄여도 전체는 줄지 않는다.

반대로 말하면 이 결과는 이 저장소의 사정이기도 하다. 타입 연산이 무거워 타입체크가 빌드 시간을 지배하는 코드베이스라면 TS 7의 체감은 완전히 다를 것이다. TS 7에 빌드 시간 단축을 기대한다면, 지금 빌드에서 타입체크가 차지하는 비중부터 재보는 것이 순서라고 생각한다.

## 보너스 트랙: pnpm 11

계획에 없던 마지막 작업. pnpm을 11로 올리자 첫 실행부터 경고가 나왔다.

```
The "pnpm" field in package.json is no longer read by pnpm
```

pnpm 11은 package.json의 `pnpm` 필드를 읽지 않아서 설정을 [pnpm-workspace.yaml](https://pnpm.io/pnpm-workspace_yaml)로 옮겨야 하고, `onlyBuiltDependencies`도 `allowBuilds`로 바뀌었다. 어차피 옮겨 적어야 해서, 이참에 그동안 보안 권고 때마다 하나씩 쌓은 overrides 30개를 전부 지우고 `pnpm audit`으로 재검증해 봤다. 부활한 것은 단 2개였다. 나머지 28개는 상위 패키지들이 그사이 취약 의존성을 올려서 이미 없어도 되는 좀비 pin이었다. overrides에는 만료일이 없으니 이렇게 쌓이는 모양이다. 하나씩 관리하기보다 주기적으로 전부 지우고 다시 심사하는 쪽이 나을 수 있겠다는 생각을 했다. 이 청소에 패치가 나오지 않던 image-size를 sharp로 교체한 것까지 더해, dependabot 경고는 13건에서 0건이 됐다.

덧붙이면 pnpm도 이 흐름의 다음 주자다. [pnpm 12](https://github.com/orgs/pnpm/discussions/11292)는 설치 엔진(패키지를 받아오고 링크하는 부분)을 Rust로 다시 쓴 버전으로 현재 알파 단계인데, CLI와 lockfile과 node_modules 구조는 그대로 두고 v11 대비 의도적인 breaking change 없이 엔진만 바꾸는 범위라고 한다. 컴파일러는 Go로(typescript-go), 린터와 포매터는 Rust로(oxc), 번들러는 이미 Rust로(Turbopack) 넘어갔고 패키지 매니저까지 합류하는 셈인데, 방향은 꽤 분명해 보인다. 브라우저에서 실행될 결과물만 JS로 내놓을 수 있다면, 그 결과물을 만드는 도구들까지 JS로 쓰여 있을 이유는 없다는 것이다. JS는 점점 도구의 언어가 아니라 산출물의 언어로 남고, 그 주변의 모든 것이 Rust와 Go로 넘어가고 있다. 이번에 겪었듯 기반 도구가 네이티브로 바뀌면 그 위의 도구들도 따라 움직일 수밖에 없으니, 이 흐름은 앞으로 가속화될지도 모르겠다.

## 하루를 마치며

TS 7 자체는 안전하다는 것이 하루를 보낸 소감이다. 코드 수정이 tsconfig 두 줄이었고, 컴파일러가 Go로 바뀌었다는 사실을 체감할 일 자체가 거의 없었다. 관건은 lint 파이프라인이다. typed linting에 깊이 의존하고 있다면 TS 7.1과 생태계를 기다리거나, `@typescript/typescript6`으로 lint만 TS 6에 남기거나, 이 글처럼 oxc 전환 비용을 내거나 셋 중 하나를 고르게 된다. 커스텀 eslint 규칙 자산이 많은 코드베이스라면 세 번째의 비용은 이 글보다 훨씬 클 것이다.

결국 빨라지는 것은 빌드가 아니라 개발 루프의 보조 도구들이다. 다만 12분짜리 lint가 2초가 되면 pre-commit에 걸 수 있는 것과 없는 것이 갈리니, 이 변화는 CI 요금보다는 워크플로우의 형태를 바꾸는 쪽에 가깝다고 느꼈다. 그리고 몇 달 묵은 `[object Object]` URL을 찾아준 것은 결국 새 도구가 아니라, 도구를 갈아엎는 김에 켜본 규칙 하나였다.

마지막으로 개인적인 수확을 하나 꼽자면, Rust를 공부할 명목이 더 생겼다는 것이다. 하루 사이에 린터와 포매터가 Rust가 됐고 패키지 매니저까지 뒤따르는 중이니, 이제 매일 쓰는 도구가 어떻게 움직이는지 알고 싶다면 그 언어를 피해 가기는 어려워 보인다.
