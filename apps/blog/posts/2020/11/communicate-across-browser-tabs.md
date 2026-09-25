---
title: '브라우저 탭 사이에서 통신 하는 방법'
tags:
  - browser
published: true
date: 2020-11-06 21:37:40
description: '블로그 다크모드 지원시에 고려해보겠습니다 🤔'
---

한 사이트가 여러 탭에서 떠 있을 때, 탭 사이에서 통신이 필요한 경우가 있을까?

- 한 탭에서 사이트의 테마를 변경해서 다른 탭에 있는 사이트에까지 변경이 필요한 경우
- 애플리케이션의 상태를 탭 사이에 맞춰야 하는 경우
- 가장 최근에 가져온 인증 정보를 브라우저 탭 간에 공유가 필요한 경우

이를 달성할 수 있는 방법이 무엇이 있을까?

## Local Storage

놀랍게도 [로컬 스토리지에도 event를 지원한다.](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event) 이 event를 활용해서 localStorage의 변화를 감지하는 방법이다.

```javascript
React.useEffect(() => {
  function listener(event: StorageEvent) {
    if (event.storageArea !== localStorage) return
    if (event.key === LOGGINED) {
      setLoginTime(parseInt(event.newValue || '0', 10))
    }
  }
  window.addEventListener('storage', listener)

  return () => {
    window.removeEventListener('storage', listener)
  }
}, [])
```

https://codesandbox.io/s/tab-communications-1-localstorage-5ldjw

![example1](./images/tab-communication-1.gif)

잘 작동하는 것 같지만 몇가지 문제가 존재한다.

- 정확히는 탭 별로 이벤트가 발생하는게 아니고 storage의 event를 가져다 쓰는 꼼수라는 점
- localStorage는 동기로 작동하기 때문에 메인 UI 스레드를 블로킹할 수도 있음.

## Broadcast Channel API

[BroadCast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)는 탭, 윈도우, 프레임, iframe 그리고 Web worker 간에 통신을 할 수 있게 해주는 API다.

이 방법을 쓰면, [브라우저 콘텍스트](https://developer.mozilla.org/en-US/docs/Glossary/browsing_context) 간에 통신이 가능해진다.

```javascript
const LOGGINED = "loggedIn";

const channel = new BroadcastChannel(LOGGINED);

export default function App() {
  const [loginTime, setLoginTime] = React.useState<number>(() =>
    parseInt(window.localStorage.getItem(LOGGINED) || "0", 10)
  );

  React.useEffect(() => {
    function listener(event: MessageEvent) {
      setLoginTime(event.data);
    }

    channel.addEventListener("message", listener);

    return () => {
      channel.removeEventListener("message", listener);
    };
  }, []);

  return (
    // jsx
  );
}
```

https://codesandbox.io/s/tab-communications-2-braodcast-channel-m50d6

~~코드가 어딘가 이상하다면 그냥 무시해주셈~~

![example2](./images/tab-communication-2.gif)

다만 문제점은 [Broadcast Channel Api는 너무 힙한 나머지 사파리와 IE에서 쓸 수 없다는 점](https://caniuse.com/broadcastchannel)다.

## Service Worker

[서비스 워커](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration)를 이용하는 방법도 있다.

```javascript
window.navigator.serviceWorker.controller?.postMessage({
  [LOGGINED]: currentDateTime,
})
```

그리고 이 정보를 서비스워커에서 받으면 된다. 그러나 서비스 워커를 세팅하는 것은 쉽지 않고, 추가적으로 `serviceWorker.js`등을 만드는 등의 노력이 필요하다. 그리고 [서비스 워커도 마찬가지로 IE에서 지원하지 않는다.](https://caniuse.com/serviceworkers)

## postMessage

가장 전통적이고도 널리 쓰이는 방식은 [window.postmessasge](https://developer.mozilla.org/ko/docs/Web/API/Window/postMessage)다. 아마 대다수의 서비스들이 이 방식을 쓰고 있을 것이다.

```javascript
targetWindow.postMessage(message, targetOrigin)
```

```javascript
window.addEventListener(
  'message',
  (event) => {
    if (event.origin !== 'http://localhost:8080') return
    // Do something
  },
  false,
)
```

이 방법의 장점은 cross-origin을 지원한다는 것이다. 그러나 단점은 위 코드에서 알 수 있듯이 브라우저 탭의 레퍼런스를 가지고 있어야 한다. (`targetWindow`를 가지고 있는 것 같이) 그래서 이 방식은 `window.open()`이나 `document.open()`을 통해서 탭을 열었을 때만 사용 가능하다.

https://caniuse.com/mdn-api_window_postmessage
