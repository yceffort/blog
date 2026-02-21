---
title: 'IntersectionObserver 싱글톤 패턴과 WeakMap으로 메모리 누수 방지하기'
tags:
  - javascript
  - frontend
  - web-performance
published: true
date: 2026-01-17 21:30:00
description: '수백 개의 요소를 효율적으로 관찰하면서 메모리 누수도 방지하는 방법'
thumbnail: /thumbnails/2026/01/intersection-observer.png
---

## Table of Contents

## 서론

무한 스크롤, 지연 로딩, 광고 뷰어빌리티 측정 등에서 IntersectionObserver는 필수적인 API다. 그런데 컴포넌트마다 별도의 observer를 생성하면 어떻게 될까?

100개의 아이템이 있는 리스트에서 각 아이템이 자체 observer를 생성한다면, 100개의 IntersectionObserver 인스턴스가 만들어진다. 이는 메모리 낭비일 뿐 아니라, 각 observer가 별도로 교차 계산을 수행하므로 성능에도 영향을 준다.

이 글에서는 싱글톤 패턴으로 observer를 공유하고, WeakMap을 활용해 메모리 누수를 방지하는 방법을 살펴본다.

## IntersectionObserver가 scroll 이벤트보다 효율적인 이유

IntersectionObserver 이전에는 요소의 가시성을 확인하려면 scroll 이벤트를 사용했다.

```typescript
window.addEventListener('scroll', () => {
  const rect = element.getBoundingClientRect()
  const isVisible = rect.top < window.innerHeight && rect.bottom > 0

  if (isVisible) {
    loadImage()
  }
})
```

이 방식은 몇 가지 심각한 문제가 있다.

### 메인 스레드 블로킹

scroll 이벤트 핸들러는 **메인 스레드에서 동기적으로** 실행된다. 스크롤할 때마다 핸들러가 호출되고, 그 안에서 `getBoundingClientRect()`를 호출하면 브라우저에게 **레이아웃 재계산(reflow)** 을 강제한다.

```typescript
// 스크롤 중에 100개 요소 검사 → 100번의 reflow 유발 가능
elements.forEach((el) => {
  const rect = el.getBoundingClientRect()  // reflow!
  // ...
})
```

reflow는 비용이 큰 연산이다. 브라우저가 요소의 정확한 위치를 계산하려면 DOM 트리를 순회하고 스타일을 적용해야 한다. 스크롤 중에 이런 연산이 반복되면 프레임 드롭과 버벅거림이 발생한다.

### IntersectionObserver의 동작 방식

IntersectionObserver는 완전히 다르게 동작한다.

1. **비동기 처리**: 교차 계산이 메인 스레드를 블로킹하지 않는다. 브라우저가 내부적으로 렌더링 파이프라인과 통합하여 처리한다.

2. **배치 처리**: 여러 요소의 교차 상태를 한 번에 계산하고, 변경된 요소들만 모아서 콜백을 호출한다.

3. **Idle 시간 활용**: 브라우저가 여유로울 때 계산을 수행한다. 스크롤 중에 매 프레임마다 검사하지 않는다.

4. **하드웨어 가속 활용**: 일부 브라우저는 GPU 컴포지터 레벨에서 교차를 감지한다.

특히 중요한 건, **하나의 observer가 여러 요소를 관찰할 때** 브라우저가 이를 최적화할 수 있다는 점이다. 개별 observer를 100개 만드는 것보다 하나의 observer로 100개 요소를 관찰하는 게 훨씬 효율적이다.

## rootMargin과 threshold 활용하기

IntersectionObserver의 옵션을 잘 활용하면 다양한 UX를 구현할 수 있다.

### rootMargin: 뷰포트 확장/축소

`rootMargin`은 root 요소의 경계를 확장하거나 축소한다. CSS margin과 같은 형식으로 지정한다.

```typescript
// 뷰포트 밖 200px 지점에서 미리 감지
const observer = new IntersectionObserver(callback, {
  rootMargin: '200px 0px',
})
```

참고로 이미지 레이지 로딩은 네이티브 `loading="lazy"` 속성을 사용하는 게 더 간단하다.

```html
<img src="image.jpg" loading="lazy" />
```

IntersectionObserver가 더 유용한 케이스는 **무한 스크롤**이나 **데이터 프리페칭**이다. 스크롤이 끝에 가까워지면 미리 다음 페이지를 로드해둘 수 있다.

```typescript
const prefetchObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        prefetchNextPage()  // 다음 페이지 데이터 미리 로드
      }
    })
  },
  { rootMargin: '500px 0px' }  // 끝에서 500px 전에 미리 감지
)

// 리스트 마지막 요소를 관찰
prefetchObserver.observe(lastItemElement)
```

음수 값으로 뷰포트를 축소할 수도 있다. 요소가 **뷰포트 중앙에 왔을 때만** 감지하고 싶다면:

```typescript
// 뷰포트 상하 각 25%를 제외하고 중앙 50% 영역에서만 감지
const observer = new IntersectionObserver(callback, {
  rootMargin: '-25% 0px',
})
```

### threshold: 가시성 비율 기준

`threshold`는 콜백이 실행될 가시성 비율을 지정한다. 기본값은 0으로, 1픽셀이라도 보이면 콜백이 실행된다.

```typescript
// 요소의 50%가 보일 때 콜백 실행
const observer = new IntersectionObserver(callback, {
  threshold: 0.5,
})

// 요소가 완전히 보일 때 콜백 실행
const observer = new IntersectionObserver(callback, {
  threshold: 1.0,
})
```

**배열로 여러 threshold를 지정**하면, 각 비율에 도달할 때마다 콜백이 실행된다. 스크롤 진행률을 추적할 때 유용하다.

```typescript
// 10% 단위로 콜백 실행
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const progress = Math.round(entry.intersectionRatio * 100)
      updateProgressBar(progress)
    })
  },
  { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] }
)
```

**광고 뷰어빌리티 측정**에서는 보통 50% 이상 노출되어야 "조회됨"으로 인정한다.

```typescript
const adObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.intersectionRatio >= 0.5) {
        trackAdImpression(entry.target.dataset.adId)
        adObserver.unobserve(entry.target)
      }
    })
  },
  { threshold: 0.5 }
)
```

## 문제 상황

일반적인 IntersectionObserver 사용 패턴을 보자.

```typescript
function LazyImage({ src }: { src: string }) {
  const ref = useRef<HTMLImageElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
        observer.disconnect()
      }
    })

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return <img ref={ref} src={isVisible ? src : placeholder} />
}
```

이 코드는 동작하지만, 컴포넌트 인스턴스마다 새로운 observer를 생성한다. 100개의 이미지가 있다면 100개의 observer가 생성된다.

### IntersectionObserver는 왜 하나로 충분한가?

IntersectionObserver는 여러 요소를 동시에 관찰할 수 있도록 설계되었다. 하나의 observer로 `observe()` 메서드를 여러 번 호출하면 된다.

```typescript
const observer = new IntersectionObserver(callback)

observer.observe(element1)
observer.observe(element2)
observer.observe(element3)
// 하나의 observer로 여러 요소 관찰
```

브라우저는 내부적으로 이 요소들을 묶어서 효율적으로 교차 계산을 수행한다. 따라서 동일한 옵션(root, rootMargin, threshold)을 사용하는 경우, observer를 공유하는 것이 훨씬 효율적이다.

## 싱글톤 패턴으로 Observer 공유하기

### 기본 구조

먼저 여러 요소를 관리하는 VisibilityObserver 클래스를 만들어보자.

```typescript
type VisibilityCallback = (isVisible: boolean) => void

interface ObservedEntry {
  element: Element
  callback: VisibilityCallback
  previousVisibility: boolean | undefined
}

class VisibilityObserver {
  private observer: IntersectionObserver
  private entries = new Map<string, ObservedEntry>()
  private entriesByElement = new Map<Element, ObservedEntry>()

  constructor(options: IntersectionObserverInit = {}) {
    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const observed = this.entriesByElement.get(entry.target)
        if (observed && observed.previousVisibility !== entry.isIntersecting) {
          observed.previousVisibility = entry.isIntersecting
          observed.callback(entry.isIntersecting)
        }
      }
    }, options)
  }

  observe(key: string, element: Element, callback: VisibilityCallback): void {
    if (this.entries.has(key)) {
      this.unobserve(key)
    }

    const entry: ObservedEntry = {
      element,
      callback,
      previousVisibility: undefined,
    }

    this.entries.set(key, entry)
    this.entriesByElement.set(element, entry)
    this.observer.observe(element)
  }

  unobserve(key: string): void {
    const entry = this.entries.get(key)
    if (entry) {
      this.observer.unobserve(entry.element)
      this.entriesByElement.delete(entry.element)
      this.entries.delete(key)
    }
  }

  disconnect(): void {
    this.observer.disconnect()
    this.entries.clear()
    this.entriesByElement.clear()
  }
}
```

주목할 점이 몇 가지 있다.

### 두 개의 Map을 사용하는 이유

`entries`와 `entriesByElement`, 두 개의 Map을 유지하는 이유가 뭘까?

```typescript
private entries = new Map<string, ObservedEntry>()        // key → entry
private entriesByElement = new Map<Element, ObservedEntry>()  // element → entry
```

IntersectionObserver 콜백은 `IntersectionObserverEntry` 배열을 전달하는데, 여기서 얻을 수 있는 것은 `entry.target` (Element)뿐이다. 우리가 등록한 key나 callback을 알 수 없다.

```typescript
new IntersectionObserver((entries) => {
  for (const entry of entries) {
    console.log(entry.target)  // Element만 알 수 있음
    // entry.key?  → 없음
    // entry.callback?  → 없음
  }
})
```

그래서 Element로 원래 등록 정보를 찾을 수 있는 **역방향 조회용 Map**이 필요하다. `entriesByElement.get(entry.target)`으로 해당 요소의 콜백을 찾아 호출한다.

그렇다면 `entries` Map은 왜 필요한가? `unobserve(key)`를 위해서다. 사용자는 key로 관찰을 해제하는데, key로 element를 찾아야 `observer.unobserve(element)`를 호출할 수 있다.

```typescript
unobserve(key: string): void {
  const entry = this.entries.get(key)  // key → entry
  if (entry) {
    this.observer.unobserve(entry.element)  // entry에서 element 추출
    this.entriesByElement.delete(entry.element)
    this.entries.delete(key)
  }
}
```

정리하면:
- `entries`: key로 element를 찾을 때 (unobserve)
- `entriesByElement`: element로 callback을 찾을 때 (IntersectionObserver 콜백)

### previousVisibility를 추적하는 이유

IntersectionObserver는 생각보다 콜백을 자주 호출한다. 특히 threshold가 0일 때, 요소가 1픽셀이라도 움직이면 콜백이 호출될 수 있다. 스크롤할 때마다 수십 번 호출되는 건 드문 일이 아니다.

```typescript
// 문제: 같은 상태로 여러 번 호출될 수 있음
new IntersectionObserver((entries) => {
  for (const entry of entries) {
    // isIntersecting이 true인 상태로 여러 번 호출됨
    if (entry.isIntersecting) {
      loadImage()  // 중복 호출!
    }
  }
})
```

`previousVisibility`를 저장해두면, **실제로 상태가 변경된 경우에만** 콜백을 호출할 수 있다.

```typescript
if (observed.previousVisibility !== entry.isIntersecting) {
  observed.previousVisibility = entry.isIntersecting
  observed.callback(entry.isIntersecting)  // 변경된 경우에만 호출
}
```

이렇게 하면 `visible → visible` 중복 호출을 방지하고, `visible → hidden` 또는 `hidden → visible` 전환 시에만 콜백이 실행된다.

### key 기반 관리의 장점

왜 element 대신 문자열 key로 요소를 식별할까? React의 특성 때문이다.

React에서 컴포넌트가 리렌더링되면 ref가 새로운 DOM 요소를 가리킬 수 있다. 특히 조건부 렌더링이나 리스트에서 이런 일이 자주 발생한다.

```tsx
function Item({ id }: { id: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 리렌더링될 때마다 ref.current가 바뀔 수 있음
    observer.observe(id, ref.current, callback)
    return () => observer.unobserve(id)
  }, [id])  // id는 그대로, element만 바뀜

  return <div ref={ref}>...</div>
}
```

element를 직접 식별자로 사용하면, 같은 논리적 아이템인데도 element가 바뀔 때마다 새로운 관찰로 취급된다. key를 사용하면 "같은 아이템"임을 인식하고 기존 관찰을 새 element로 교체할 수 있다.

```typescript
observe(key: string, element: Element, callback: VisibilityCallback): void {
  if (this.entries.has(key)) {
    this.unobserve(key)  // 기존 관찰 해제
  }
  // 새 element로 다시 등록
  // ...
}
```

### 싱글톤으로 만들기

```typescript
let sharedObserver: VisibilityObserver | undefined

export const getSharedVisibilityObserver = (
  options?: IntersectionObserverInit,
): VisibilityObserver => {
  if (!sharedObserver) {
    sharedObserver = new VisibilityObserver(options)
  }
  return sharedObserver
}
```

이제 애플리케이션 전체에서 하나의 observer를 공유할 수 있다.

```typescript
function LazyImage({ id, src }: { id: string; src: string }) {
  const ref = useRef<HTMLImageElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = getSharedVisibilityObserver({ rootMargin: '100px' })

    if (ref.current) {
      observer.observe(id, ref.current, (visible) => {
        if (visible) setIsVisible(true)
      })
    }

    return () => observer.unobserve(id)
  }, [id])

  return <img ref={ref} src={isVisible ? src : placeholder} />
}
```

## WeakMap으로 root별 observer 관리하기

여기서 한 가지 문제가 있다. IntersectionObserver는 `root` 옵션에 따라 동작이 달라진다. viewport를 기준으로 하는 observer와 특정 스크롤 컨테이너를 기준으로 하는 observer는 별개여야 한다.

```typescript
// viewport 기준
const viewportObserver = new IntersectionObserver(callback, {root: null})

// 스크롤 컨테이너 기준
const containerObserver = new IntersectionObserver(callback, {
  root: scrollContainer,
})
```

root별로 observer를 관리해야 한다면, 어떻게 해야 할까?

### Map을 사용하면 생기는 문제

```typescript
const observersByRoot = new Map<Element, VisibilityObserver>()

export const getSharedVisibilityObserver = (options?: {
  root?: Element
}): VisibilityObserver => {
  const root = options?.root

  if (!root) {
    // viewport 기준은 전역 싱글톤
    if (!viewportObserver) {
      viewportObserver = new VisibilityObserver(options)
    }
    return viewportObserver
  }

  // root별 싱글톤
  let observer = observersByRoot.get(root)
  if (!observer) {
    observer = new VisibilityObserver(options)
    observersByRoot.set(root, observer)
  }
  return observer
}
```

이 코드의 문제는 **메모리 누수**다.

스크롤 컨테이너 컴포넌트가 언마운트되어 DOM에서 제거되었다고 가정해보자. 해당 Element는 더 이상 필요 없지만, `observersByRoot` Map이 참조를 유지하고 있어서 가비지 컬렉션되지 않는다. observer 인스턴스도 함께 메모리에 남아있게 된다.

SPA에서 페이지를 이동할 때마다 새로운 스크롤 컨테이너가 생성되고, 이전 컨테이너들은 Map에 계속 쌓인다. 시간이 지나면 상당한 메모리 누수가 발생할 수 있다.

### WeakMap으로 해결하기

WeakMap은 **키에 대한 약한 참조(weak reference)** 를 유지한다. 키로 사용된 객체가 다른 곳에서 참조되지 않으면, 가비지 컬렉터가 해당 키-값 쌍을 자동으로 제거한다.

```typescript
let viewportObserver: VisibilityObserver | undefined
const observersByRoot = new WeakMap<Element, VisibilityObserver>()

export const getSharedVisibilityObserver = (options?: {
  root?: Element
}): VisibilityObserver => {
  const root = options?.root

  if (!root) {
    if (!viewportObserver) {
      viewportObserver = new VisibilityObserver(options)
    }
    return viewportObserver
  }

  let observer = observersByRoot.get(root)
  if (!observer) {
    observer = new VisibilityObserver(options)
    observersByRoot.set(root, observer)
  }
  return observer
}
```

이제 스크롤 컨테이너가 DOM에서 제거되면:

1. Element에 대한 참조가 사라진다.
2. WeakMap이 해당 Element를 키로 가진 엔트리를 자동으로 정리한다.
3. VisibilityObserver 인스턴스도 함께 가비지 컬렉션된다.

메모리 누수 걱정 없이 동적으로 생성되는 스크롤 컨테이너를 처리할 수 있다.

## WeakMap 깊이 이해하기

### 약한 참조(Weak Reference)란?

JavaScript에서 객체를 변수에 할당하면 **강한 참조(strong reference)** 가 생성된다. 가비지 컬렉터는 강한 참조가 하나라도 남아있으면 해당 객체를 메모리에서 해제하지 않는다.

```typescript
let obj = {name: 'test'} // 강한 참조 생성
const map = new Map()
map.set(obj, 'some data') // Map도 obj에 대한 강한 참조를 가짐

obj = null // 변수의 참조는 끊었지만...
// Map이 여전히 참조를 유지하므로 객체는 GC되지 않음
```

**약한 참조(weak reference)** 는 가비지 컬렉터가 참조 카운트에 포함시키지 않는 참조다. 약한 참조만 남아있다면 객체는 GC 대상이 된다.

```typescript
let obj = {name: 'test'}
const weakMap = new WeakMap()
weakMap.set(obj, 'some data') // WeakMap은 약한 참조

obj = null // 유일한 강한 참조가 사라짐
// WeakMap의 참조는 약한 참조이므로 객체가 GC됨
// WeakMap의 해당 엔트리도 자동으로 제거됨
```

### 왜 WeakMap은 순회할 수 없는가?

WeakMap에는 `keys()`, `values()`, `entries()`, `forEach()` 메서드가 없고, `size` 속성도 없다. 이는 설계상의 의도적인 제약이다.

가비지 컬렉션은 **비결정적(non-deterministic)** 이다. 언제 실행될지, 어떤 객체가 수거될지 정확히 예측할 수 없다. 만약 WeakMap을 순회할 수 있다면 이런 문제가 발생한다.

```typescript
// 가상의 코드 (실제로는 불가능)
for (const [key, value] of weakMap) {
  // 순회 도중 GC가 실행되면?
  // 아직 방문하지 않은 엔트리가 갑자기 사라질 수 있음
  console.log(key, value)
}

console.log(weakMap.size) // 호출할 때마다 다른 값?
```

순회 결과가 GC 타이밍에 따라 달라진다면, 코드의 동작을 예측할 수 없게 된다. 이런 비결정성을 방지하기 위해 WeakMap은 순회 기능을 아예 제공하지 않는다.

### Map vs WeakMap 비교

| 특성      | Map                       | WeakMap                   |
| --------- | ------------------------- | ------------------------- |
| 키 타입   | 모든 값                   | 객체만 가능               |
| 키 참조   | 강한 참조                 | 약한 참조                 |
| GC 대상   | 명시적 삭제 필요          | 키가 GC되면 자동 삭제     |
| 순회 가능 | O (for...of, forEach)     | X                         |
| size 속성 | O                         | X                         |
| 사용 시점 | 키의 생명주기를 직접 관리 | 키 객체의 생명주기에 맞춤 |

### WeakMap의 다른 활용 사례

#### 1. 프라이빗 데이터 저장

ES2022 이전에는 클래스의 private 필드가 없었다. WeakMap으로 외부에서 접근할 수 없는 프라이빗 데이터를 구현할 수 있었다.

```typescript
const privateData = new WeakMap<object, {password: string}>()

class User {
  constructor(name: string, password: string) {
    this.name = name
    privateData.set(this, {password})
  }

  name: string

  checkPassword(input: string): boolean {
    return privateData.get(this)?.password === input
  }
}

const user = new User('kim', 'secret123')
console.log(user.name) // 'kim' (접근 가능)
console.log(privateData.get(user)) // 모듈 외부에서는 접근 불가
```

User 인스턴스가 GC되면 WeakMap의 비밀번호 데이터도 자동으로 정리된다.

#### 2. 캐싱/메모이제이션

객체를 키로 하는 캐시에서 WeakMap을 사용하면, 원본 객체가 필요 없어졌을 때 캐시도 자동으로 정리된다.

```typescript
const cache = new WeakMap<object, string>()

function expensiveOperation(obj: object): string {
  if (cache.has(obj)) {
    return cache.get(obj)!
  }

  const result = JSON.stringify(obj) // 비용이 큰 연산이라 가정
  cache.set(obj, result)
  return result
}

let data = {a: 1, b: 2}
expensiveOperation(data) // 계산 후 캐시
expensiveOperation(data) // 캐시에서 반환

data = null // 원본 객체 참조 해제
// 캐시 엔트리도 자동으로 GC됨 (명시적 삭제 불필요)
```

#### 3. DOM 노드에 메타데이터 연결

```typescript
const nodeData = new WeakMap<Element, {clickCount: number}>()

function trackClicks(element: Element) {
  element.addEventListener('click', () => {
    const data = nodeData.get(element) ?? {clickCount: 0}
    data.clickCount++
    nodeData.set(element, data)
  })
}

// DOM에서 요소가 제거되면 메타데이터도 자동 정리
```

### WeakSet, WeakRef, FinalizationRegistry

JavaScript는 WeakMap 외에도 약한 참조 관련 API를 제공한다.

#### WeakSet

WeakMap의 Set 버전이다. 값 없이 객체의 존재 여부만 추적할 때 사용한다.

```typescript
const visited = new WeakSet<Element>()

function markAsVisited(element: Element) {
  visited.add(element)
}

function hasVisited(element: Element): boolean {
  return visited.has(element)
}
```

#### WeakRef (ES2021)

객체에 대한 약한 참조를 직접 생성한다. `deref()` 메서드로 원본 객체에 접근하거나, GC되었으면 `undefined`를 반환한다.

```typescript
let obj = {data: 'important'}
const weakRef = new WeakRef(obj)

console.log(weakRef.deref()) // { data: 'important' }

obj = null
// GC 실행 후...
console.log(weakRef.deref()) // undefined (GC되었으면)
```

#### FinalizationRegistry (ES2021)

객체가 GC될 때 콜백을 실행한다. 정리 작업이 필요할 때 유용하다.

```typescript
const registry = new FinalizationRegistry((heldValue: string) => {
  console.log(`${heldValue} 객체가 GC되었습니다`)
  // 외부 리소스 정리 등
})

let obj = {name: 'test'}
registry.register(obj, 'test 객체')

obj = null
// GC 실행 시 "test 객체 객체가 GC되었습니다" 출력
```

단, FinalizationRegistry는 GC 타이밍에 의존하므로 콜백 실행이 보장되지 않는다. 중요한 정리 작업에는 의존하지 않는 것이 좋다.

## 실제 사용 예시

### 커스텀 훅으로 래핑

```typescript
interface UseVisibilityOptions {
  root?: Element | null
  rootMargin?: string
  threshold?: number
  onVisible?: () => void
  onHidden?: () => void
}

function useVisibility(
  key: string,
  options: UseVisibilityOptions = {},
): [RefObject<HTMLElement>, boolean] {
  const {root, rootMargin, threshold, onVisible, onHidden} = options
  const ref = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = getSharedVisibilityObserver({
      root: root ?? undefined,
      rootMargin,
      threshold,
    })

    observer.observe(key, element, (visible) => {
      setIsVisible(visible)
      if (visible) {
        onVisible?.()
      } else {
        onHidden?.()
      }
    })

    return () => observer.unobserve(key)
  }, [key, root, rootMargin, threshold, onVisible, onHidden])

  return [ref, isVisible]
}
```

### 실시간 데이터 구독과 결합

화면에 보이는 요소만 WebSocket 구독을 하고 싶다면:

```typescript
function StockPrice({symbol}: {symbol: string}) {
  const [ref, isVisible] = useVisibility(`stock-${symbol}`)

  useEffect(() => {
    if (isVisible) {
      subscribeToPrice(symbol)
    } else {
      unsubscribeFromPrice(symbol)
    }

    return () => unsubscribeFromPrice(symbol)
  }, [symbol, isVisible])

  // ...
}
```

100개의 종목이 있어도, 화면에 보이는 10개만 실시간 데이터를 받는다. 스크롤하면 보이는 종목이 바뀌고, 구독도 자동으로 전환된다.

## 주의사항

### rootMargin이 다르면 별도 observer 필요

현재 구현은 같은 root에 대해 하나의 observer만 생성한다. rootMargin이나 threshold가 다른 경우를 처리하려면 옵션을 포함한 키를 만들어야 한다.

```typescript
const getObserverKey = (options: IntersectionObserverInit) => {
  return `${options.rootMargin ?? '0px'}-${options.threshold ?? 0}`
}

// root별, 옵션별로 observer 관리
const observersByRootAndOptions = new WeakMap<
  Element,
  Map<string, VisibilityObserver>
>()
```

실제로는 대부분의 경우 동일한 rootMargin을 사용하므로, 필요한 경우에만 확장하면 된다.

### SSR 환경 고려

서버 사이드 렌더링에서는 IntersectionObserver가 존재하지 않는다. 조건부로 생성해야 한다.

```typescript
class VisibilityObserver {
  private observer: IntersectionObserver | null = null

  constructor(options: IntersectionObserverInit = {}) {
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(/* ... */)
    }
  }

  observe(key: string, element: Element, callback: VisibilityCallback): void {
    if (!this.observer) {
      // SSR에서는 항상 visible로 처리하거나, 아무것도 하지 않음
      callback(true)
      return
    }
    // ...
  }
}
```

## 마치며

IntersectionObserver 싱글톤 패턴과 WeakMap의 조합은 다음 이점을 제공한다.

1. **메모리 효율**: 수백 개의 요소를 하나의 observer로 관찰
2. **자동 정리**: DOM 요소가 제거되면 관련 observer도 자동으로 GC
3. **유연한 확장**: root별로 독립적인 observer 관리

WeakMap은 "객체의 생명주기에 맞춰 데이터를 관리하고 싶을 때" 유용한 도구다. DOM 요소, 컴포넌트 인스턴스, 캐시 등 객체와 연결된 메타데이터를 저장할 때 활용해보자.

## 참고

- [MDN: IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver)
- [MDN: WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
