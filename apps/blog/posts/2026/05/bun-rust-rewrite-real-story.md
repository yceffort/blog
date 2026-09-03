---
title: '<em>Bun rewrite</em>가 폭로한 것: OSS는 외부 AI만 막을 수 있었다'
tags:
  - bun
  - rust
  - oss
  - code-generation
  - ai
  - governance
published: true
date: 2026-05-15 02:00:00
description: 'Bun이 Claude Code로 6일 만에 Zig에서 Rust로 옮긴 사건. 코드 품질보다 OSS 거버넌스와 자원 비대칭의 의미가 더 크다.'
art:
  layout: stripes
  hue: rose
  tone: dark
  hero: '6일'
---

## Table of Contents

## 서론

Bun 창립자 Jarred Sumner가 Anthropic의 Claude Code로 약 96만 줄의 Zig 코드를 6일만에 Rust로 옮겼다. Linux x64 glibc 기준 테스트 99.8% 통과. main branch에는 6,755개 commit으로 100만 줄 이상의 Rust 코드가 머지됐다[^1]. Sumner는 v1.3.14가 "마지막 Zig 버전"이 될 거라고 했다.

당연히 시끄러웠다. Hacker News에 700+ upvote와 500+ comment가 달렸고[^16], The Register는 두 차례에 걸쳐 비판적으로 다뤘다[^2][^1]. 커뮤니티 비판은 크게 두 갈래다. 하나는 unsafe 블록 개수. Rust 버전에 unsafe가 13,000개를 넘는다고 보고됐다. 비교 대상인 [uv](https://github.com/astral-sh/uv)는 35만 줄에 73개다. 둘은 Rust로 옮긴 게 아니라 Zig를 Rust 문법으로 transliteration한 것에 가깝다는 비판이다.

두 비판은 production에서 2-3개월 굴려보기 전엔 결론이 나지 않는다. 옹호 측도 비판 측도 아직 근거가 부족하다. 이 글은 unsafe 개수 자체가 정당한지 판정하려는 글은 아니다. 다만 이 논쟁이 왜 본질이 아닌지 설명하기 위해, unsafe와 FFI 문제가 무엇을 의미하는지는 먼저 짚고 넘어간다.

이 사건의 진짜 의미는 코드 품질이 아니라 거버넌스와 자원에 있다. 그 둘은 코드 품질보다 더 오래, 더 크게 영향을 미친다.

> **OSS의 AI 방어 메커니즘은 외부 기여자만 막도록 설계됐다. 메인테이너 자신이 AI가 되는 시나리오는 아무도 준비하지 않았다.**

이 비대칭을 두 측면에서 본다. 메인테이너 정의가 바뀐 것. 그리고 토큰 접근성이 새 변수가 된 것.

## 지금까지 도구 변화가 만든 패턴

무엇이 새로운지 짚으려면 새롭지 않은 것부터 정리해야 한다.

도구 때문에 개발자 직업의 정의가 바뀐 건 처음이 아니다.

처음에는 어셈블리어로 직접 짜는 사람만 "진짜 프로그래머"였다. C 컴파일러가 나왔을 때 "기계가 짠 코드는 사람이 짠 만큼 효율적일 수 없다"는 반응이 있었다. Garbage Collector가 도입됐을 때 "메모리 관리는 프로그래머의 책임이다"라는 입장이 있었고, 지금 메모리를 직접 관리하는 언어는 시스템 영역에만 남았다. IDE 자동완성, ORM, Docker가 차례로 등장할 때마다 "그건 진짜 X가 아니다"라는 반응이 있었다. 지금은 다 일상이다.

패턴은 일관적이다. **새 도구가 나오면 일부 노동이 기계로 넘어가고, 그 노동을 하던 사람들은 한 단계 위로 올라가거나, 좁은 틈새에 남거나, 시장에서 밀린다.** 어셈블리를 직접 짜는 사람은 지금도 있다. 게임 엔진 hot path, 임베디드 일부, 컴파일러 작성 영역에. 좁은 틈새의 예시다. 일반 개발자 시장에서는 0.1% 미만이다.

AI 코드 생성도 같은 연속선 위에 있다. 다만 이전 도구 변화와 두 가지가 결정적으로 다르다.

| 변화              | 보급 속도 | 자원 비대칭                 |
| ----------------- | --------- | --------------------------- |
| C 컴파일러        | 수년      | 거의 없음 (한 번 깔면 끝)   |
| Garbage Collector | 수년      | 없음 (런타임 비용만)        |
| IDE 자동완성      | 수년      | 없음                        |
| Docker / 클라우드 | 수년      | 약간 (인프라 비용)          |
| AI 코드 생성      | 수개월    | 큼 (사용량 비례, 지속 비용) |

속도 차이는 정도의 문제지만 자원 비대칭은 본질이 다른 문제다. 컴파일러는 한 번 깔면 누구에게나 똑같이 동작한다. AI는 사용량에 비례해 토큰 비용이 계속 든다. 이 비용 구조의 차이가 OSS 거버넌스에 어떻게 작용하는지 보여준 첫 대형 사례가 Bun rewrite다.

## 초기 비판들

세 갈래 비판을 먼저 정리한다. 각각이 어디까지 정당하고 어디서 한계에 부딪히는지 짚어둬야 글의 핵심 thesis가 어떤 evidence 위에 서는지 분명해진다.

### Unsafe 블록 13,000개

#### 먼저 `unsafe`가 뭔지

Rust는 borrow checker라는 정적 분석기로 메모리 안전성을 컴파일 타임에 검증한다. ownership, borrow, lifetime 규칙을 어기는 코드는 컴파일이 안 된다. 다만 모든 시스템 프로그래밍 작업이 이 규칙 안에서 표현되지는 않는다. raw pointer 역참조, C 함수 호출(FFI), `static mut` 접근, union 필드 접근, `transmute` 같은 강제 타입 변환 — 이런 작업은 borrow checker가 검증 자체를 할 수 없다. 컴파일러가 "이 코드가 안전한지 모르겠다"라고 말하는 영역이다.

이런 코드를 작성하려면 `unsafe { ... }` 블록 안에서 명시적으로 써야 한다. `unsafe` 블록은 프로그래머가 "이 안의 invariant는 내가 보증한다, 컴파일러는 검증 못 하니까 믿어라"라고 선언하는 표시다. **안전 보장의 책임이 컴파일러에서 프로그래머로 넘어오는 경계**다.

```rust
extern "C" {
    fn jsc_alloc() -> *mut JSValue;
}

let value: *mut JSValue = unsafe { jsc_alloc() };
// 여기서 프로그래머가 보증해야 하는 것들:
// - 반환된 포인터가 유효한 메모리를 가리킨다
// - 다른 곳에서 동시에 free되지 않는다
// - 메모리 layout이 JSValue와 호환된다
// - aliasing 규칙을 어기지 않는다
```

unsafe 블록 안의 한 줄짜리 실수가 use-after-free, data race, 메모리 침범으로 이어진다. 그리고 그게 unsafe 블록 바깥의 safe 코드까지 오염시킬 수 있다. C/C++에서 일어나는 메모리 버그가 Rust에서도 unsafe 영역에서는 그대로 일어난다.

#### 그래서 13,000개가 시끄러운 이유

13,000개 각각이 "이 안의 invariant를 내가 보증한다"는 선언이다. 보증 주체는 코드를 작성한 인간이어야 한다. **그런데 이 코드를 작성한 건 인간이 아니라 AI 에이전트고, 그 13,000개를 6일 안에 인간이 검토했을 가능성은 0에 가깝다.** PORTING.md가 모든 unsafe 블록에 `// SAFETY:` 주석을 의무화했지만, AI가 작성한 SAFETY 주석의 정확성은 결국 인간이 검토해야 하는 대상이다.

unsafe 안에서 발생한 메모리 침범, data race, 잘못된 ownership transfer는 프로그램 전체의 안전 보장을 깨뜨린다. "Rust로 옮겼으니 안전하다"는 주장이 unsafe 영역에는 적용되지 않는다는 게 핵심 비판의 출발점이다.

#### Bun의 숫자로 돌아가면

커뮤니티가 추적한 카운트로는 Rust 버전에 unsafe 블록이 13,000개를 넘고, 자주 비교되는 [uv](https://github.com/astral-sh/uv)는 350,000줄에 73개다. 약 100배 차이. uv 저자 Charlie Marsh 본인이 이런 식의 기계적 rewrite에 대해 "200개의 알려진 이슈를 미지의 미지로 교환하는 것"이라고 평한 바 있다[^17]. 73 unsafe를 직접 책임지는 사람의 발언이라 무게가 다르다. 다만 이 13,000이라는 수치 자체는 Anthropic이나 Bun 공식 발표에 명시된 게 아니라 Theo 등 외부 커뮤니티가 PR을 분석해 셈한 결과라는 점은 짚어둘 필요가 있다.

이 비교는 사실 부당하다. uv는 임베디드 JavaScript 엔진이 없다. Bun은 JavaScriptCore라는 C++ 엔진을 embed한다. FFI 경계에서 unsafe가 광범위하게 등장하는 건 구조상 피할 수 없다. 그리고 Rust식 safe/unsafe 구분으로 보면, Zig는 ownership과 aliasing invariant를 Rust처럼 타입 시스템이 정적으로 강제하지 않는다. 따라서 Zig 코드를 Rust로 옮길 때 핵심은 기존에 인간 규율로 관리하던 invariant를 어디까지 safe Rust의 타입 시스템 안으로 옮기고, 어디까지 unsafe 영역으로 남길 것인가다.

그런데 진짜 비판은 절대 개수가 아니다. 13,000개 중 몇 개가 FFI 경계 때문에 필연적인지, 몇 개가 Zig idiom을 그대로 옮긴 결과인지를 구분하지 않으면 의미가 없다. 후자가 많을수록 검토 대상도 늘어난다.

근본 문제는 따로 있다. **테스트 99.8% 통과는 unsafe invariant를 검증하지 않는다.** 테스트가 증명하는 건 behavioral compatibility지 memory safety가 아니다. rewrite의 동기가 memory safety였는데, "99.8% 통과"는 그 동기에 답하지 않는다.

### Transliteration 비판

두 번째 비판은 더 구조적이다. PORTING.md는 576줄짜리 마이그레이션 가이드다. 그 안에 tokio/rayon/hyper/futures 사용 금지, async fn 금지가 명시되어 있다[^6]. Rust 생태계의 핵심 추상을 거의 쓰지 않고 Zig 아키텍처를 그대로 옮긴 셈이다. Sumner 본인도 The Register 인터뷰에서 아키텍처와 데이터 구조를 거의 그대로 옮겼다는 취지로 답했다[^2].

이 비판은 정확하다. 신중한 Rust rewrite라면 안전성을 개선할 수 있다. 그러나 기계적인 "Rust 모양" rewrite는 같은 버그를 보존하고, 새로운 aliasing 실수를 추가하면서, "Rust로 옮겼으니 안전하다"는 confidence 아래에 그것들을 묻는다. Theo는 이를 한 줄로 정리한다. "진짜 Rust를 짠 게 아니다. Rust 문법으로 C++를 짠 거다."[^7] 그는 이어서 두 가지를 짚는다. 첫째, AI 에이전트 기반 수정은 자주 마주치는 에러 경로를 우선 처리한다. 둘째, 그 경로는 Claude Code가 쓰는 경로와 일치한다. 결과적으로 Claude Code 경로는 단단해지고 나머지는 부실해지는 비대칭 안정화로 수렴할 가능성이 있다.

### FFI 경계: rewrite의 진짜 동기가 해결됐는가

가장 무게 있는 비판이 따로 있다. **rewrite의 동기 자체가 해결됐는지 의심받는다는 점이다.**

복기하면, rewrite의 직접 동기는 Bun의 만성 메모리 누수였다. 특히 Claude Code에서 메모리가 14GB, 일부 세션에서는 23GB까지 치솟는 문제. Rust로 옮긴다는 결정은 "Rust의 안전 모델이 이 누수를 잡아준다"는 전제 위에 있다.

근데 Rust의 안전 모델이 자동으로 잡는 메모리 버그는 사실 좁은 영역에 한정돼 있다. 어떤 게 들어오고 어떤 게 빠지는지부터 짚어야 한다.

#### safe Rust에서 자동으로 줄어드는 것

**safe Rust 영역 한정**으로, borrow checker와 RAII 모델이 컴파일 타임 + 런타임에 다음을 크게 줄여준다.

- **use-after-free**: ownership을 잃은 후 접근하면 컴파일 에러
- **double-free**: `Drop`은 정확히 한 번만 호출됨
- **error path forget-to-free**: `?` 연산자나 panic으로 함수가 일찍 종료되어도 RAII로 자동 cleanup

이 세 클래스가 시스템 프로그래밍에서 흔히 보던 메모리 버그의 큰 비중을 차지한다. C/C++의 manual memory management에서 가장 골치 아픈 영역. Rust로 옮긴다는 결정의 거의 모든 정당성이 여기서 나온다.

다만 한 가지 단서가 결정적이다. **`unsafe`, FFI, raw pointer, 외부 allocator, JS boundary가 끼어드는 순간 이 보장이 작동하지 않는다.** Sumner도 The Register 인터뷰에서 "Rust가 이 모든 걸 잡아주지는 않는다"고 명시적으로 인정했다[^2]. 즉 자동 검출은 safe Rust 안에서만의 약속이다.

#### Rust가 자동으로 못 잡는 것

다만 Rust의 안전 모델은 "메모리 누수"를 안전성 위반으로 정의하지 않는다. 공식 표준 라이브러리 문서가 명시적으로 그렇게 표현하고, `std::mem::forget`이 safe 함수인 게 그 증거다. 의도된 누수는 안전한 행위로 분류된다. 문제는 의도되지 않은 누수도 컴파일러가 안 잡는다는 점이다.

- **Logical leak**: `Vec<T>`나 `HashMap`에 reference를 넣고 영원히 안 비우면 누수. 컴파일러 입장에서는 정상 코드다. ownership과 lifetime이 어긋나지 않으니까.
- **순환 참조**: `Rc<RefCell<T>>`로 두 노드가 서로 참조하면 reference count가 0이 되지 않아 free가 안 된다. `Weak`로 명시적으로 끊지 않으면 그대로 남는다.
- **FFI 경계 메모리**: extern 블록에 선언된 외부 함수를 호출하는 건 unsafe operation이고, C/C++가 alloc한 메모리는 Rust 컴파일러의 추적 영역 바깥이다. JavaScriptCore 같은 embedded engine의 GC 객체나 libuv가 관리하는 핸들도 마찬가지.
- **Re-entrancy 누수**: JavaScript callback이 Rust 데이터 구조에 다시 진입하는 경로에서, 그 사이 만들어진 객체가 해제 타이밍을 놓치는 경우. Rust는 single-thread re-entrancy를 정적으로 추적하지 못한다.

표로 정리하면 이렇다.

| 메모리 버그 클래스         | safe Rust 자동 검출               | Bun 누수의 핵심 후보 |
| -------------------------- | --------------------------------- | -------------------- |
| use-after-free             | safe 영역 한정 (borrow checker)   | 가능성 낮음          |
| double-free                | safe 영역 한정 (`Drop`은 한 번만) | 가능성 낮음          |
| error path forget-to-free  | safe 영역 한정 (RAII)             | 일부 가능            |
| logical leak (참조 보유)   | 검출 안 함                        | 가능성 큼            |
| 순환 참조                  | 검출 안 함 (Weak 필요)            | 가능                 |
| FFI 경계 누수 (JSC, libuv) | 검출 불가 (unsafe 영역)           | **매우 가능성 큼**   |
| JS boundary re-entrancy    | 정적 추적 불가                    | 가능성 큼            |

#### Bun의 누수는 어디서 났는가

Bun은 JavaScriptCore를 embed하고, HTTP/socket 계층에서는 uSockets/uWebSockets 계열 라이브러리에 크게 의존한다. 플랫폼에 따라 libuv도 일부 포함된다. JavaScript 객체와 Rust/Zig 데이터가 상호 참조하는 구조다. **이 구조에서는 JS 엔진, 네이티브 네트워크 계층, 런타임 객체 사이의 ownership 경계가 복잡해질 수밖에 없고, 가장 누수가 잘 나는 영역이 정확히 FFI 경계와 JS boundary의 re-entrancy다.** Rust가 자동으로 못 잡는 영역.

Claude Code에서 메모리가 23GB까지 치솟는 패턴은 use-after-free 같은 single-allocation 버그로는 잘 안 나온다. reference를 너무 오래 들고 있거나, callback chain에서 cleanup이 누락되거나, FFI 경계에서 ownership transfer가 잘못된 경우에 나오는 패턴이다. 위 표의 아래쪽 영역.

#### 그래서 핵심 비판은

**Rust로 옮긴다고 자동으로 잡히는 클래스는 Bun이 원래 가장 골치 아파했던 누수 클래스가 아닐 가능성이 크다.** 누수는 여전히 unsafe 영역에서 발생할 것이고, unsafe 영역의 invariant는 인간이 보증해야 한다. 13,000개의 unsafe 블록이 그 보증 대상이다. 그리고 그 13,000개를 6일 안에 인간이 검토했을 가능성은 0에 가깝다.

Bun이 발표문에서 "메모리 누수 일부가 해결됐다"고 한 것이 거짓말은 아닐 것이다. error path forget-to-free 같은 클래스는 실제로 잡혔을 가능성이 크다. 다만 **rewrite의 진짜 동기였던 큰 누수가 잡혔는지는 다른 문제고, 그 답은 production에서 2-3개월 굴려봐야 나온다.**

### 이 비판들의 한계: 시간이 답한다

세 비판이 정당하더라도 결국 시간이 답한다. 그 외 비판도 마찬가지다. 99.8% 통과가 Linux x64 glibc에서만이라는 것 — macOS/Windows는 별도 검증이 필요하다. 테스트가 검증하는 건 관찰 가능한 상태 결과지 data race 부재가 아니다. 발표문에 구체적 성능 벤치마크 수치도 없다. unsafe invariant가 production에서 어떻게 깨지는지, FFI 누수가 실제로 해결됐는지, 비대칭 안정화가 일어나는지는 2-3개월에서 1년 사이에 데이터로 드러난다. 그 시점이면 이 논쟁은 정리된다.

이 글이 다루려는 핵심은 그 정리 가능한 논쟁이 아니다. 정리되지 않고 더 큰 함의를 가진 두 가지가 따로 있다.

## 메인테이너의 정의가 바뀌었다

OSS는 그동안 AI에 꽤 방어적이었다. 잘 알려진 정책들을 정리하면 이렇다.

- curl의 Daniel Stenberg는 AI 생성 가짜 CVE 리포트 폭증을 못 견뎌 결국 HackerOne 버그 바운티 프로그램을 종료했다. 전체 제출의 약 20%가 AI slop이었다[^9].
- Linux 커널 메인테이너 Greg Kroah-Hartman은 AI 생성 패치를 "mass spam과 동등하다"고 표현했다. 일부 subsystem 메인테이너는 AI 의심만으로 PR을 즉시 reject한다[^10].
- Zig는 PR/이슈/코멘트/번역에 AI 사용을 전면 금지한다. 메이저 OSS 중 가장 엄격한 정책이다[^11].
- GitHub는 AI slop 문제를 공식 인정했고, 대규모 자동 생성 PR에 대한 PR kill switch 같은 강경 대응을 검토 중이다. abuse detection이 일부 PR을 자동 분류한다[^12].

이 정책들에는 공통 전제가 있다.

> **메인테이너는 인간이고, 메인테이너의 일은 외부에서 들어오는 AI 노이즈로부터 프로젝트를 지키는 것이다.**

메인테이너의 권위는 본인이 책임지고 검토한다는 가정 위에서만 작동했다. Bun이 한 일은 이 전제를 뒤집은 거다. Sumner는 Rust 버전이 주로 Claude Code로 유지될 것이냐는 The Register의 질문에 "이건 이미 status quo다. 우리는 몇 달 동안 코드를 직접 타이핑하지 않았다"고 답했다[^2]. 메인테이너 본인이 AI가 된 거다.

### 96만 줄을 6일에. 검토는 어디에 있었나

먼저 "6일"이라는 숫자 자체를 한 번 짚을 필요가 있다. PR 자체는 6일이 맞다. 하지만 그 6일은 빙산의 일각이다. Bun 레포 commit 히스토리를 보면 `bun_collections` 디렉터리는 인수 발표 5개월 전인 2025년 7월에 이미 등장했다[^15]. Zig 측 코드에는 `bun.ptr.Owned`, `bun.ptr.Shared`, `bun.ptr.AtomicShared` 같은 스마트 포인터 추상이 사전에 도입되어 있었고, PORTING.md §Pointers는 이를 `Rc`, `Arc` 같은 Rust 타입에 1:1로 매핑하는 가이드까지 명시했다. PR 직전(2026년 5월 초)에는 대규모 `src/` 재구성도 있었다. 즉 **rewrite는 인수 협상 시점부터 점진적으로 준비된 작업**이고, "6일 만에 머지"는 마지막 단계의 시간일 뿐이다.

이 사실이 글의 thesis를 약화시키지는 않는다. 오히려 강화한다. 토큰 접근성과 자본이 있으면 **사전 준비 5개월 + AI 머지 6일**이라는 형태로 시간을 압축할 수 있다는 게 핵심이다. 다만 "6일"이라는 수사 자체는 일종의 마케팅 어휘라는 점은 분명히 짚어두는 게 글의 신뢰도에 좋다.

시간당 2,000-5,000줄을 단순히 훑는다고 해도 192-480시간이 필요하다. 매일 8시간씩 쉬지 않고 읽어도 24-60일이 걸리는 양이다. 그런데 시스템 코드의 의미, unsafe invariant, FFI ownership, 테스트 커버리지까지 검토하는 리뷰라면 실제 비용은 그보다 훨씬 커진다. 6일 안에 사람이 의미 있는 수준으로 검토했다고 보기는 어렵다. 사전 준비 단계에 검토가 분산되어 있었을 가능성은 있지만, 그게 어떤 형태였는지는 외부에서 확인할 수 없다.

외부에서 100줄짜리 AI PR이 들어오면 메인테이너가 검토할 수 있다. 96만 줄의 내부 AI 머지는 검토 자체가 불가능하다. 이 비대칭이 정책의 사각지대다.

> **외부 AI는 거부할 수 있어도, 내부 AI를 거부할 메커니즘은 아예 없다.**

그동안 잘 작동하던 OSS 방어막은 외부에만 쳐져 있었다. 내부는 무방비였는데, 메인테이너들이 AI를 본격적으로 쓰지 않았으니 문제가 드러나지 않았을 뿐이다.

OSS의 AI 거부가 작동했던 진짜 이유는 도덕적 신념이 아니다. 시스템 코드는 짜기 어렵고, 메인테이너 대다수가 보수적인 시니어고, 검토자 capacity에 한계가 있어 외부 AI PR이 압도하면 운영이 마비됐기 때문이다. 모두 AI 능력이 부족하거나 운영 비용이 클 때만 작동하는 시간차 방어였다.

이 시간차가 사라지면 어떻게 되는가. Bun이 답을 보여줬다. 그냥 무너진다.

### 검토 부재의 직접 증거: 이슈 #30719

추상적 우려가 아니라는 직접 증거가 PR 머지 직후 며칠 만에 나왔다. safe API의 캡슐화가 깨지는 UB 사례, 이슈 #30719다[^14].

**UB(Undefined Behavior)**는 언어 명세가 결과를 보장하지 않는 코드 상태다. use-after-free, aliasing 위반, 초기화 안 한 메모리 읽기 같은 게 대표적이다. UB가 발생하면 정상 동작할 수도, 크래시할 수도, 데이터를 조용히 손상시킬 수도 있다. 컴파일러는 UB가 발생하지 않는다고 가정하고 최적화하기 때문에 다른 코드의 동작까지 예측 불가능해진다. Rust의 핵심 가치는 "safe Rust에서는 UB가 컴파일 타임에 차단된다"는 것이고, 그래서 **safe API를 호출하기만 했는데 UB가 나오는 건 Rust 코드에서 가장 심각한 종류의 버그다.**

이슈 #30719는 `PathString::init`이라는 평범한 safe API에서 시작한다. signature만 보면 위험할 게 없다. `&[u8]` reference를 받아 자기 자신(`Self`)을 반환한다. 그런데 내부 구현이 unsafe 블록에서 lifetime을 erase한다. **입력 reference의 lifetime을 추적하지 않고 `'static`으로 강제 변환한다는 뜻이다.** 결과는 원본 데이터가 drop된 후에도 그 포인터를 들고 있는 `PathString` 인스턴스가 만들어지는 것. use-after-free와 invalid aliasing이 가능한 상태가 된다.

Rust의 UB 탐지 도구인 miri가 이 패턴을 즉시 잡았다. 다음 코드만으로 UB가 검출된다.

```rust
let test = Box::new(*b"Hello World");
let init = PathString::init(&*test);
drop(test);

println!("{:?}", init.slice());  // UB: dangling reference
```

이게 결정적인 이유는 **safe API를 정상적으로 사용하는 것만으로 UB가 발생한다**는 점이다. 호출자가 `unsafe` 키워드를 쓴 적이 없다. unsafe 블록은 `PathString` 내부에 있고, 호출자 입장에서는 일반 safe 코드를 작성한 것뿐이다. unsafe 캡슐화가 실패했다는 직접 증거다.

Bun 팀의 공식 대응은 PR #30728이다. 두 가지를 한다.

1. `PathString::init`과 `dir_iterator::next()`를 `unsafe fn`으로 표시한다. 즉 호출 자체가 unsafe context를 요구하게 바꾼다.
2. **약 70개 in-tree call site 각각에 SAFETY 주석을 사후에 추가한다.** outlives contract도 같이 문서화한다.

두 번째가 핵심이다. **처음 머지될 당시 그 70개의 SAFETY 보증이 명시적으로 작성되지 않은 채 main에 들어갔다는 자체 인정이다.** "AI가 SAFETY 주석을 의무화했다"는 PORTING.md 규칙이 실제 머지 시점까지 작동하지 않았다는 뜻이기도 하다. **인간 검토가 없었다는 thesis의 가장 직접적인 코드 증거다.**

이슈 보고자는 여기서 멈추지 않았다. 첫 UB를 찾은 뒤 몇 분 안에 또 다른 UB를 추가로 발견했다.

```
error: Undefined Behavior: trying to retag from <wildcard> for Unique
permission at alloc309[0x0], but no exposed tags have suitable
permission in the borrow stack for this location
```

PathString 하나의 개별 실수로 끝난다고 보기 어렵고, **비슷한 lifetime erasure 패턴이 다른 곳에도 있을 수 있다는 강한 신호**다. 보고자 코멘트: "이건 Rust를 20시간만 써본 사람도 안 만들 실수다. 몇 분 만에 이 정도 찾았는데 우리가 모르는 게 얼마나 있을지 모르겠다."

같은 시점에 Jarred Sumner는 X에 **Rust 경력자 채용**을 언급했다. 적어도 이 정도 규모의 Rust 코드베이스를 장기적으로 운영하기 위한 전문 인력을 추가로 필요로 했다는 신호로 볼 수 있다. 다만 이것만으로 머지 시점에 팀 내부에 Rust 전문성이 전혀 없었다고 단정할 수는 없다.

옹호 측에서는 "canary version이고 공식 릴리즈가 아니니 버그는 자연스럽다"고 반박한다. 일리는 있다. 다만 두 가지가 그 반박을 약화시킨다. 첫째, **96만 줄 PR을 main branch에 머지한 결정 자체가 "canary니까 괜찮다"의 일반적 기준을 벗어난다.** 둘째, 발견된 UB는 ad-hoc edge case가 아니라 `PathString::init` 같은 기본 API에 있는 시스템적 패턴이다.

13,000개 unsafe 블록의 SAFETY 주장이 실제로 검증된 보증인지, 아니면 사후적으로 붙은 자기보고에 가까운지 의심할 이유는 이제 충분하다.

### Sumner의 비전, 그리고 GitHub의 모순

Sumner는 한 발 더 나갔다. X에 "OSS가 반대 방향으로 갈 것이다 — 인간 기여 금지. 사람들은 여전히 이슈와 우선순위를 논의하지만, 실제 코드 작성, PR 제출, 피드백 대응, 구현 행위는 LLM이 할 것이다"라고 적었다[^6]. 흘려들을 발언이 아니다. OSS 거버넌스의 핵심 모델이 끝났다는 선언에 가깝다.

상징적인 사건도 있다. Bun에서 Zig 소스 파일 60만 줄 이상을 제거하는 PR이 GitHub의 자동 시스템에 "AI slop"으로 분류되어 닫혔다[^2]. 그런데 닫힌 PR이 사실 옳았다. Anthropic이 자기 코드를 머지하려는데 GitHub 플랫폼이 막은 거니까. 작은 사건이지만 큰 신호다. 플랫폼조차 이 종류의 변경을 어떻게 분류해야 할지 모른다는 신호.

### Zig가 보여준 거버넌스의 한계

Zig 케이스는 이 thesis를 가장 직접적으로 증명하는 외부 evidence다. Bun은 Rust로 옮기기 전부터 이미 Zig 본가가 아닌 자체 포크를 쓰고 있었다[^2]. Zig 메인테이너들은 AI 정책 여부와 무관하게 Bun 같은 대규모 변경을 Zig 본가에 받지 않겠다는 입장이었다. 즉 Zig 거버넌스는 작동했다. 그러나 그 거버넌스로 막을 수 있었던 건 "Bun이 Zig에 더 기여하는 것"까지였다.

**"Bun이 Zig를 떠나는 것"은 거버넌스가 다룰 수 있는 범위 밖이었다.** Bun이 Rust로 옮기는 데 Zig 거버넌스의 동의는 필요하지 않다. 메인테이너 본인이 자기 프로젝트의 언어를 바꾸겠다는데 외부 OSS 거버넌스가 개입할 수 있는 메커니즘이 없다. 그래서 가장 엄격한 AI 정책을 가진 언어 커뮤니티조차, 그 언어의 가장 큰 사용자가 AI 도구로 언어 자체를 떠나는 시나리오에는 무력했다.

이게 글의 핵심 thesis를 가장 강하게 보여주는 사례다. **외부 AI 기여는 OSS 거버넌스로 막을 수 있다. 내부 AI는 못 막는다. 그리고 외부 vs 내부 경계가 어디인지는 메인테이너 본인의 선택이다.** Zig는 이 비대칭의 가장 깨끗한 case study다.

## 토큰 접근성이 새 변수가 됐다

메인테이너 재정의보다 더 큰 게 따로 있다.

지금까지 개발자 평가의 핵심 변수는 능력이었다. 도구는 누구나 비슷하게 접근할 수 있었으니까. git, IDE, 컴파일러, Stack Overflow 모두 무료다. 능력이 격차의 거의 전부였다. 인터넷 시대 디지털 격차도 한 번 깔리면 추가 비용이 거의 없어, 한 세대가 지난 뒤에는 평준화됐다.

AI 시대에 변수 하나가 추가됐다. 토큰 접근성. 사용량에 비례해 비용이 계속 들어서 평준화되지 않는다.

### 토큰 접근성의 계층

| 위치                     | 비용 부담 주체 | 실질 제약                                     | 접근 가능한 자원                                        |
| ------------------------ | -------------- | --------------------------------------------- | ------------------------------------------------------- |
| 무료 사용자              | 개인           | 강한 rate limit                               | 공개 모델                                               |
| 일반 구독자              | 개인           | 월 구독 한도                                  | 공개 모델                                               |
| Max/Pro 구독자           | 개인           | 높은 한도, 여전히 개인 비용                   | 공개 모델                                               |
| 일반 회사 직원           | 회사           | 보안 정책, 부서 예산, 사용량 제한             | 공개 모델 + 사내 도구                                   |
| AI 회사 직원             | 회사           | 내부 정책에 따름, 개인보다 훨씬 유리          | 공개 모델 + 제품 개발 인프라                            |
| AI 제품의 핵심 인프라 팀 | 회사/제품 조직 | 외부에서 한도 확인 불가, 전략적 우선순위 높음 | 모델, 에이전트, 배포, 테스트, 관측 인프라와 결합된 환경 |

Sumner가 96만 줄을 6일에 머지할 수 있었던 이유를 개인 능력만으로 설명하면 안 된다. 물론 그는 Bun의 Zig 시스템을 깊이 이해했고, PORTING.md 576줄에 기존 아키텍처와 이식 규칙을 명시할 수 있었다. 그 자체가 중요한 능력이다. 그러나 더 결정적인 변화는 그 능력이 놓인 자원 환경이다.

Bun이 Anthropic에 인수된 뒤, Bun 팀의 생산 조건은 일반 개인 기여자와 완전히 달라졌다. Anthropic은 2025년 12월 Bun을 인수하면서 Claude Code 가속화를 명시적 목적으로 들었다. Bun은 더 이상 독립적인 개인 메인테이너 OSS가 아니라, Anthropic의 AI coding product를 떠받치는 핵심 인프라가 된 것이다.

외부에서 실제 토큰 한도, 내부 모델 접근 범위, 에이전트 인프라의 구체적 구성까지 확인할 수는 없다. 그러나 이 불확실성이 핵심 주장을 약화시키지는 않는다. 중요한 건 정확한 한도 숫자가 아니라 위치 변화다. 같은 사람이 같은 실력을 갖고 있더라도, 월 $20 구독자 환경과 Anthropic 내부의 제품 인프라 환경은 같은 생산 조건이 아니다. 인수가 없었다면 같은 속도, 같은 규모, 같은 확신으로 추진되기는 어려웠을 것이다. **Bun rewrite는 개인 능력의 폭발이라기보다, 능력 있는 메인테이너가 자본과 AI 인프라에 결합했을 때 OSS 생산성이 어떻게 달라지는지를 보여준 사건이다.**

### Mythos: 검증 가능성의 비대칭

Anthropic의 "Mythos" 모델 발표도 같은 비대칭을 보여준다. Mythos는 수천 개의 zero-day 취약점을 발견했다고 발표됐지만, 외부 검증에서 그 수치는 198개의 수동 검토 결과를 외삽한 것이었다[^13]. 외부인은 모델의 실제 능력, 평가 방식, 접근 조건을 검증하기 어렵다. **AI 회사 내부에서만 접근 가능한 모델과 도구가 늘어날수록 공개 생태계의 검증 가능성은 낮아진다.** Bun rewrite와 직접 연결된 사건은 아니지만, 같은 비대칭의 구조적 유사 사례다.

### 함의

세 가지 결과가 따라온다.

**1. 회사와 개인의 생산성 격차가 커질 가능성이 높다.** OSS의 미덕 중 하나가 대기업 엔지니어와 야간 개인 기여자가 같은 무대에 설 수 있다는 점이었다. Linus Torvalds가 핀란드 학생일 때 Linux를 시작한 것처럼. AI 회사 내부 인프라와 결합된 OSS는 개인 메인테이너 OSS보다 훨씬 빠른 속도로 움직일 수 있다. 외부에서 정확한 토큰 한도나 모델 접근 조건을 확인할 수 없으므로 "얼마나 큰 격차냐"는 단정할 수 없지만, 방향은 분명하다.

**2. "실력만 있으면 어디서든 빛난다"는 신화가 약해진다.** 능력만 있고 자원이 없으면 평가받을 기회조차 없는 환경이 만들어진다. 좋은 회사에 들어가는 것, 본인 회사를 차리거나 fundraising하는 능력이 예전보다 더 결정적이 된다. 순수 기술 스킬로는 닫지 못하는 영역이 늘어난다.

**3. OSS 생태계가 자본화된다.** Bun처럼 자본 있는 조직이 인수한 OSS만 빠르게 발전하고, 개인 메인테이너 OSS는 상대적으로 정체된다. 어떤 OSS를 쓰느냐가 어떤 자본 뒤에 있느냐의 문제로 바뀐다.

여기서 가장 어두운 건 **개인이 개선할 수 있는 변수가 아니라는 점이다.** 능력은 노력으로 키울 수 있어도, 본인 위치를 토큰 접근 가능한 환경에 두는 건 노력만으로 안 된다. 운, 타이밍, 인맥, 시장 상황이 다 작용한다.

## 그래서 개발자의 일은 어떻게 바뀌는가

2-3년 시야로 보면 시니어 엔지니어의 일은 코드 작성에서 AI 감독으로 옮겨간다. 여기까지는 합리적으로 확신할 수 있다. 다만 "AI 감독"이라는 표현이 너무 추상적이라 별 의미가 없다. 구체적으로 무엇이 비싸지는지를 짚어야 한다.

핵심은 **암묵지의 언어화 능력**이다.

Sumner가 한 진짜 일은 Rust 코드 작성이 아니다. Zig 시스템의 모든 idiom을 PORTING.md 576줄에 명시적으로 옮긴 것이다. 그 576줄이 96만 줄을 만들었다. **문서가 코드를 생성하는 시대다.**

코드베이스의 "왜 이렇게 됐는가"를 글로 옮길 수 있는 능력은 AI 시대에 가장 비싸지는 스킬이다. 코드는 AI가 짤 수 있지만, 어떻게 짜야 하는지에 대한 컨텍스트는 결국 인간이 줘야 한다. 이 컨텍스트는 코드만 봐서는 안 나온다.

- 팀이 6개월 뒤에 onboarding할 신입의 인지 부하
- 옆 팀이 다음 분기에 요청할 가능성이 있는 기능의 확장성
- 회사의 정치적 이유로 이 모듈은 절대 X팀에 의존하면 안 된다는 제약
- 3년 전 결정으로 시스템이 가진 path dependence

이런 제약은 문서에 없는 컨텍스트에 있다. 명시적으로 언어화해야만 AI에 전달할 수 있다. **그 언어화 자체가 설계 작업의 핵심이다.** 코드를 짜는 능력이 아니라 코드를 어떻게 짜야 하는지를 글로 옮기는 능력. 후자가 전자보다 비싸지는 게 향후 2-3년 개발자 직업의 가장 큰 변화다.

OSS 기여자 풀도 갈라질 수 있다. 다수는 AI 의존 기여자로 가고, 소수는 의도적 비AI 기여자로 남는 시나리오가 가능하다. 후자가 양적으로 줄어도 문화적 위상은 오히려 올라가는, "이 코드는 인간이 직접 짰고 인간이 검토했다"가 보증서처럼 작동하는 시점.

다만 함정이 있다. 그 보증서를 외부에서 검증할 방법이 마땅치 않다. 앞서 Mythos 부분에서 짚었듯 AI 사용 여부 자체가 점점 검증 불가능한 변수가 되고 있다. organic, fair-trade 라벨도 인증 인프라가 있어야 작동한다. 인증 인프라가 없으면 자기 보고일 뿐이고, 그건 보증서로서 한계가 분명하다. 결국 "비AI" 라벨이 정말 가치로 작동하려면 그 라벨을 객관적으로 보증하는 메커니즘이 먼저 자리 잡아야 한다. 그게 가능한지는 또 다른 문제다.

## 이 그림이 다 틀릴 수 있는 세 가지 경로

여기까지의 분석은 세 가지 전제 위에 서 있다. 셋 중 하나만 깨져도 그림이 바뀐다. 내 주장의 약한 부분을 짚어둔다.

### 1. AI 성능 향상이 둔화된다

여기까지의 그림은 AI가 지금 속도로 계속 발전한다는 전제 위에 있다. 만약 모델 성능 향상이 지금보다 둔화된다면 — 가능성이 0은 아니다 — AI 기반 대규모 rewrite가 일반화되는 속도도 늦춰진다. 시니어 엔지니어의 자리가 더 오래 간다. 토큰 접근성 격차도 덜 벌어진다. 이게 plateau 시나리오의 단순 버전이다. 다만 모델 성능 둔화 여부 자체는 이 글의 본론과 결이 다른 큰 주제라 여기서는 깊이 들어가지 않는다.

### 2. 토큰 비용이 떨어지지 않는다

비용이 떨어지지 않는 게 더 심각한 시나리오다. AI 능력은 계속 좋아지는데 운영 비용이 폭증해서 자본 있는 조직만 쓸 수 있는 경우. Claude Code가 출시 후 한도 논란을 일으킨 게 이 시나리오의 전조일 수 있다. 모델이 좋아질수록 컴퓨트 비용이 더 든다면, 비대칭은 갈수록 더 커진다.

이 시나리오에서는 본인이 토큰 접근 가능한 환경에 있는 것의 가치가 폭발한다. 앞서 그린 비대칭의 가장 어두운 버전이다.

### 3. Legal/regulatory 환경이 바뀐다

법적 환경도 변수다. EU AI Act는 단계적으로 시행 중이고, AI 생성물 표시와 학습 데이터 투명성 논의를 제도권으로 끌어올렸다. Copilot 저작권 소송(Doe v. GitHub, "Doe"는 익명 원고를 가리키는 영미법 표기)은 2022년 익명의 GitHub 사용자들이 GitHub/Microsoft/OpenAI를 상대로 제기한 class action으로, Copilot이 OSS 코드를 라이선스 표시 없이 학습·출력한 게 침해인지를 다툰다. 이 소송과 미국 저작권청의 AI 생성물 판단 모두 아직 완전히 정리되지 않았다. 결국 **"AI로 생성한 코드를 OSS 라이선스로 배포할 때 권리와 책임이 어디에 있는가"** 는 아직 닫힌 문제가 아니다. 이 쟁점이 구체화되면 Bun식 모델도 영향을 받을 수 있다.

세 시나리오 다 진지하게 볼 변수다. 앞서 그린 그림은 가장 확률 높다고 본 시나리오일 뿐이지, 결정된 미래는 아니다.

## 그래서 Bun은 어떻게 될까

마지막으로 Bun이라는 구체 사례의 향후 2-3년을 짚어두면 분석이 더 손에 잡힌다.

가장 확실한 것부터. **단기적으로 Bun이 사라질 가능성은 낮다.** Anthropic이 소유하고 있고 Claude Code의 핵심 인프라다. 자원이 계속 투입되는 한 Rust 버전이 production에서 안정화될 가능성은 높다. 시간 문제에 가깝다.

문제는 **어떻게 살아남느냐**다. 가장 가능성 높은 시나리오는 비대칭 안정화. Claude Code가 자주 쓰는 경로(런타임, JS 실행, 표준 API)는 빠르게 단단해진다. AI 에이전트가 그 경로의 버그를 우선 처리하고 회귀 테스트도 그쪽에 집중되니까. 반면 Claude Code의 핵심 경로와 덜 겹치는 영역, 예를 들어 일부 monorepo 도구, 패키지 관리의 edge case, Windows 지원 같은 부분은 상대적으로 늦게 안정화될 가능성이 있다. Bun이 "Claude Code 의존성으로는 훌륭하지만 일반 개발자 도구로는 애매한" 포지션으로 수렴할 가능성이 있다.

두 번째 위험은 **cognitive debt**다. AI가 짠 코드를 AI가 유지하는 사이클이 누적되면, Anthropic 내부에서도 코드베이스의 mental model을 가진 사람이 점점 줄어든다. 위기 상황(보안 취약점, 데이터 손실 류 사고)에서 인간이 root cause를 빠르게 추적하지 못하는 상태가 될 수 있다.

다만 이 논증에는 분명한 반박이 있다. AI는 인간과 달리 매번 context를 코드에서 새로 빌드할 수 있다. 인간의 cognitive load 모델(forgetting curve, context switching cost)을 그대로 AI에 적용하는 게 정당한지는 명확하지 않다. AI가 짧은 시간 안에 전체 코드베이스를 다시 읽고 추론할 수 있다면, "mental model을 유지하는 사람의 수"가 그렇게까지 결정적인 변수가 아닐 수도 있다. cognitive debt는 인간 한정 문제고 AI에는 비대칭적으로 가벼울 가능성이 있다는 뜻이다. 어떻게 보든 검증 방법은 같다. 첫 진짜 critical 이슈가 났을 때 누가 root cause를 추적하고, 얼마나 빠른지. 인간 cognitive debt가 정말 문제였다면 그 시점에 드러난다.

세 번째는 **post-acquisition risk transfer**다. Anthropic이 Claude Code 가속이라는 자기 운영 우선순위를 위해 production-grade를 자처하는 rewrite를 6일 PR로 머지했다는 점 자체가, 기존 Bun을 production에 쓰던 팀들에게 위험을 전가하는 구도다. 자본 환경 변화로 인한 실험을 사용자가 떠안게 됐다. 인수 전이라면 안정 버전을 유지하면서 별도 브랜치에서 천천히 검증할 선택지가 있었을 텐데, 자본이 우선순위를 바꾸면 그 선택지가 사라진다. 정치적 신뢰 문제(OpenAI/Google 진영의 도입 회피)도 가능성은 있지만 이건 추측 영역이다. 자본 우선순위 변화 자체는 인수 사실로부터 직접 따라오는 명확한 위험이다.

Zig 커뮤니티는 1-2년 흔들린 후 다른 flagship 프로젝트(Ghostty, TigerBeetle)가 그 자리를 채울 것이다. Andrew Kelley는 AI 정책을 바꾸지 않고, Bun 없이도 언어는 계속 발전한다.

결국 Bun의 미래를 결정하는 건 코드 품질이 아니라 자본 환경이다. Anthropic이 Bun에 대한 투자 우선순위를 유지하는 한 살아남고, 우선순위가 떨어지는 순간 — Anthropic의 전략 변화나 비즈니스 환경 변화 — 빠르게 정체된다. 능력이 아니라 위치에 매여 있다는 점에서, **이 글의 thesis가 가장 구체적으로 적용되는 사례가 Bun 자신이다.**

## 마치며

Bun rewrite를 unsafe 블록 개수로 평가하면 표면만 본 게 된다. 더 들어가면 두 가지가 드러난다. 메인테이너 정의가 바뀌었다는 것. 토큰 접근성이 새 변수가 됐다는 것.

이 둘은 별개로 보이지만 사실 같은 뿌리에서 나온다. **자본이다.** 자본과 AI 인프라에 결합된 메인테이너는 인간 검토의 병목을 우회할 수 있고, 그 메인테이너가 만든 OSS는 자본 없는 개인 기여자가 따라가기 어려운 속도로 발전한다. 거버넌스 비대칭과 자원 비대칭은 자본이라는 단일 변수의 두 얼굴이다.

지금까지 OSS는 자본으로부터 어느 정도 자유로웠다. 정확히는 자본이 OSS 생산성에 큰 변수가 아니었기 때문에 자유로워 보였다. AI 시대에는 그렇지 않다. **토큰 비용이 곧 생산성이고, 자본 접근이 곧 시장 점유다.** 외부 AI를 거부하는 정책으로 막을 수 있는 변화가 아니다.

개발자 입장에서 보면 게임의 규칙이 바뀌었다. **능력만으로 설명되던 격차에 위치와 자원이라는 변수가 추가됐다.** 앞으로 개발자는 기술 역량뿐 아니라 자신이 어떤 자원 환경에서 일하는지도 전략적으로 봐야 한다. 능력은 노력으로 키울 수 있어도 위치는 그렇지 않다는 점에서, 후자의 무게가 점점 커진다.

컴파일러를 믿을 수 있게 만든 건 컴파일러 자체가 아니라 그 주변 검증 인프라였다. AI가 짠 OSS 코드도 마찬가지다. 코드 자체가 아니라 주변 인프라가 신뢰를 만든다. 그 인프라를 누가, 어떤 자본 위에서 만들 것인가. 그게 다음 2-3년 OSS의 가장 중요한 질문이다.

[^1]: [Anthropic's Bun Rust rewrite merged at speed of AI - The Register](https://www.theregister.com/devops/2026/05/14/anthropics-bun-rust-rewrite-merged-at-speed-of-ai/5240381) — PR 머지 시점, commit/line 통계, GitHub의 자동 close 사건.

[^2]: [Anthropic's Bun team trials port from Zig to Rust - The Register](https://www.theregister.com/software/2026/05/05/anthrophics-bun-team-trials-port-from-zig-to-rust/5222094) — Sumner의 "몇 달째 직접 타이핑하지 않았다" 발언, Bun이 Zig 본가가 아닌 자체 포크를 쓰고 있다는 점, GitHub의 AI slop 자동 close 사건.

[^6]: [Anthrophic's Bun team trials port from Zig to Rust - DEVCLASS](https://www.devclass.com/software/2026/05/11/anthrophics-bun-team-trials-port-from-zig-to-rust/5237835) — PORTING.md의 tokio/async 사용 금지 정책, Sumner의 "인간 기여 금지" 비전.

[^7]: [Theo - Bun Rewrites 960,000 Lines From Zig to Rust in Six Days (YouTube)](https://www.youtube.com/watch?v=gILMoijqeGA) — Theo의 13,000 unsafe 카운트 분석과 비대칭 안정화 우려 영상.

[^9]: [Curl ending bug bounty program after flood of AI slop reports - BleepingComputer](https://www.bleepingcomputer.com/news/security/curl-ending-bug-bounty-program-after-flood-of-ai-slop-reports/) — curl의 HackerOne 종료 결정과 AI slop 비율.

[^10]: [Linux kernel czar says AI bug reports aren't slop anymore - The Register](https://www.theregister.com/2026/03/26/greg_kroahhartman_ai_kernel/) — Greg Kroah-Hartman의 AI 패치에 대한 "mass spam" 입장과 정책 변화.

[^11]: [The Zig project's rationale for their firm anti-AI contribution policy - Simon Willison](https://simonwillison.net/2026/Apr/30/zig-anti-ai/) — Zig의 AI 전면 금지 정책 배경.

[^12]: [GitHub ponders kill switch for pull requests to stop AI slop - The Register](https://www.theregister.com/2026/02/03/github_kill_switch_pull_requests_ai/) — GitHub의 PR kill switch 검토와 AI slop 대응 방안.

[^13]: [Anthropic's Claude Mythos isn't a sentient super-hacker - it's a sales pitch - Tom's Hardware](https://www.tomshardware.com/tech-industry/artificial-intelligence/anthropics-claude-mythos-isnt-a-sentient-super-hacker-its-a-sales-pitch-claims-of-thousands-of-severe-zero-days-rely-on-just-198-manual-reviews) — Mythos 발표의 198건 외삽 비판.

[^14]: [Issue #30719 - oven-sh/bun](https://github.com/oven-sh/bun/issues/30719) — `PathString::init`에서 시작된 UB 보고, miri 검출 결과, Bun 팀의 PR #30728 대응(70개 call site에 SAFETY 주석 사후 추가), 추가 UB 발견 사례 포함.

[^15]: [PR #21270 "Refactor Zig imports and file structure part 1" - oven-sh/bun](https://github.com/oven-sh/bun/pull/21270) — 2025년 7월 commit `07cd45d`. `bun_collections` 디렉터리가 인수 발표 5개월 전부터 도입되어 있음. `bun.ptr` 스마트 포인터(`Owned`, `Shared`, `AtomicShared`, `RefCount`)는 같은 시점에 Zig 측에 사전 구축됐고, Rust 측 `src/ptr/lib.rs`에는 "Per PORTING.md §Pointers" 주석으로 매핑이 명시되어 있다.

[^16]: [Hacker News: discussion on Bun Rust rewrite](https://news.ycombinator.com/item?id=48132488) — 700+ upvote, 500+ comment의 커뮤니티 토론.

[^17]: Charlie Marsh(Astral/Ruff/uv 창립자)가 대규모 transliteration rewrite의 리스크를 두고 한 발언. "200개의 알려진 이슈를 미지의 미지로 교환한다"는 비유는 ashunar0의 일본어 정리글을 통해 영어권 커뮤니티에 빠르게 전파됐다. 원문 출처는 트윗/팟캐스트 인터뷰로 추정되지만 정확한 영구 링크는 추가 verify 필요.
