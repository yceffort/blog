---
title: 'React 19: ref를 prop으로 사용하기'
tags:
  - react
published: true
date: 2025-12-11 10:00:00
description: 'React 19부터는 forwardRef 없이 ref를 prop으로 전달할 수 있다.'
---

## Table of Contents

## 개요

React 19에서는 함수형 컴포넌트에서 `ref`를 `prop`으로 직접 전달할 수 있게 되었다. 기존에는 함수형 컴포넌트가 인스턴스를 가지지 않기 때문에 `ref`를 `prop`으로 전달하더라도 무시되었고, 이를 해결하기 위해 `forwardRef`라는 고차 컴포넌트(HOC)를 사용해야 했다. 이번 글에서는 `forwardRef`가 사라지게 된 배경과 변경된 사용법에 대해 알아보자.

## forwardRef의 등장 배경

React 초기에는 클래스 컴포넌트가 주를 이루었고, 클래스 컴포넌트에서 `ref`는 해당 클래스의 인스턴스를 참조하는 용도로 사용되었다. 반면 `props`는 데이터를 전달하는 용도였기 때문에, React는 `ref`를 `props`에서 제외하고 별도로 처리했다.

```tsx
class MyComponent extends React.Component {
  doSomething() {
    console.log('Hello!')
  }

  render() {
    return <div>Hello</div>
  }
}

class Parent extends React.Component {
  myRef = React.createRef()

  handleClick = () => {
    // ref.current는 MyComponent의 인스턴스를 가리킨다.
    // 따라서 인스턴스 메서드를 직접 호출할 수 있다.
    this.myRef.current.doSomething()
  }

  render() {
    return <MyComponent ref={this.myRef} />
  }
}
```

함수형 컴포넌트가 도입된 이후에도 이러한 메커니즘은 유지되었다. 하지만 함수형 컴포넌트는 클래스가 아니기 때문에 `new` 키워드로 인스턴스화되지 않는다. 단순히 JSX를 반환하는 함수일 뿐이므로, `ref`를 전달하더라도 참조할 대상 자체가 존재하지 않았다.

```tsx
// 함수형 컴포넌트는 인스턴스가 없다
function MyButton({children}) {
  return <button>{children}</button>
}

// MyButton()은 그냥 함수 호출이다.
// 클래스처럼 new MyButton()으로 인스턴스를 만들 수 없다.
// 따라서 ref가 참조할 "인스턴스"가 애초에 존재하지 않는다.
```

이러한 제약을 해결하기 위해 React 16.3에서 `forwardRef`가 도입되었다. `forwardRef`는 함수형 컴포넌트가 `ref`를 두 번째 인자로 전달받을 수 있게 해주는 고차 컴포넌트(HOC)다. 이를 통해 부모로부터 받은 `ref`를 컴포넌트 내부의 실제 DOM 요소에 연결하거나, `useImperativeHandle`과 함께 사용하여 특정 메서드만 외부에 노출할 수 있게 되었다.

```tsx
// React 18 이하에서 ref를 직접 함수형 컴포넌트에 전달하려는 시도 (잘못된 방법)
import {useRef} from 'react'

function MyButton({children}) {
  return <button>{children}</button>
}

function App() {
  const buttonRef = useRef(null)

  // React는 MyButton 컴포넌트에 ref를 연결할 수 없으므로,
  // 개발 모드에서 "Function components cannot be given refs." 경고가 발생하고
  // buttonRef.current는 null이 된다.
  return (
    <div>
      <MyButton ref={buttonRef}>클릭하세요</MyButton>
      <button onClick={() => console.log(buttonRef.current)}>ref 확인</button>
    </div>
  )
}
```

```tsx
// React 18 이하 (forwardRef를 사용한 올바른 방법)
import {forwardRef} from 'react'

const MyInput = forwardRef((props, ref) => {
  return <input {...props} ref={ref} />
})
```

이 방식에는 몇 가지 불편한 점이 있었다.

- **복잡한 구문**: 컴포넌트를 정의할 때마다 `forwardRef`로 감싸야 했다.
- **타입스크립트의 복잡성**: `ForwardRefRenderFunction`이나 제네릭 타입 정의 순서 등 타입 정의가 번거로웠다.
- **DevTools**: `displayName`을 별도로 설정하지 않으면 익명 컴포넌트로 표시되는 경우가 많았다.

## React 19에서의 변화

React 19부터는 함수형 컴포넌트에서도 `ref`를 일반적인 `prop`처럼 사용할 수 있다. 내부적으로 함수형 컴포넌트일 경우 `ref`를 `props`에서 제거하지 않고 그대로 전달하도록 변경되었기 때문이다.

### 사용법 변화

이제 `forwardRef` 없이 `props`에서 `ref`를 꺼내 사용하면 된다.

```tsx
// React 19
function MyInput({placeholder, ref}) {
  return <input placeholder={placeholder} ref={ref} />
}

// 사용 예시
import {useRef} from 'react'

function App() {
  const inputRef = useRef(null)
  return <MyInput ref={inputRef} placeholder="검색어를 입력하세요" />
}
```

### 타입스크립트 예제

타입스크립트를 사용할 때도 별도의 `ForwardRefRenderFunction` 타입을 사용할 필요 없이, 일반적인 인터페이스에 `ref`를 추가하면 된다.

```tsx
interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  ref?: React.Ref<HTMLInputElement>
}

export default function SearchInput({label, ref, ...rest}: SearchInputProps) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-bold">{label}</label>
      <input ref={ref} className="border p-2 rounded" {...rest} />
    </div>
  )
}
```

## 장점

이번 변화로 인해 얻을 수 있는 장점은 다음과 같다.

1. **간결해진 코드**: `forwardRef` 래퍼가 제거되어 코드가 더 직관적이고 깔끔해졌다.
2. **HOC 작성 용이**: 고차 컴포넌트(HOC)를 작성할 때 `ref` 전달을 위해 별도의 로직을 구현할 필요 없이, 단순히 `props`를 전개하는 것만으로 충분해졌다.
3. **러닝 커브 감소**: `ref`와 `forwardRef`의 개념을 따로 학습할 필요가 없어졌다.

## 결론

React 19의 이번 업데이트는 오랫동안 개발자들을 괴롭혔던 `forwardRef` 패턴을 제거하고, `ref`를 직관적인 `prop`으로 되돌려놓았다. 기존에 작성된 `forwardRef` 코드도 여전히 동작하지만, 새로운 프로젝트나 리팩토링 시에는 `ref` prop 패턴을 사용하는 것이 좋다. React 팀은 향후 `forwardRef`를 deprecated 처리할 예정이라고 하니, 점진적으로 마이그레이션을 준비하는 것이 좋겠다.

## 참고

- [React v19 공식 블로그](https://react.dev/blog/2024/12/05/react-19#ref-as-a-prop)
- [forwardRef API 문서](https://react.dev/reference/react/forwardRef)
