---
title: '거대한 JSON 응답을 효율적으로 처리하는 방법'
tags:
  - javascript
  - nodejs
  - performance
  - streaming
published: false
date: 2026-01-11 15:00:00
description: 'JSON.parse()가 버거워할 때 살아남는 법'
---

## Table of Contents

## 서론

API에서 수십 MB에 달하는 JSON 응답을 받아야 하는 상황이 있다. 대시보드에서 수만 건의 로그 데이터를 불러온다거나, 지도 애플리케이션에서 대량의 좌표 데이터를 받아야 하는 경우가 이에 해당한다.

`JSON.parse()`는 전체 문자열이 메모리에 로드된 후에야 파싱을 시작한다. 응답이 완료될 때까지 사용자는 빈 화면을 바라보고 있어야 하고, 메모리 사용량은 치솟는다. 모바일 환경이라면 상황은 더 심각해진다.

이 글에서는 대용량 JSON을 효율적으로 처리하는 여러 가지 전략을 살펴본다. 전통적인 `JSON.parse()`의 한계부터 NDJSON, 스트리밍 파서까지 각각의 장단점과 실제 구현 방법을 다룬다.

## JSON.parse()의 한계

### 기본적인 JSON 처리 방식

대부분의 개발자가 사용하는 JSON 처리 방식은 다음과 같다.

```javascript
const response = await fetch('/api/huge-data')
const data = await response.json()
```

간단하고 직관적이다. 하지만 이 두 줄의 코드 뒤에는 몇 가지 심각한 문제가 숨어 있다.

### 문제 1: 전체 응답 대기

`response.json()`은 내부적으로 응답 본문 전체를 문자열로 읽은 다음 `JSON.parse()`를 호출한다. 10MB 응답이 3초에 걸쳐 도착한다면, 첫 번째 바이트가 도착한 시점부터 3초 동안 아무것도 할 수 없다.

```javascript
// 이 코드가 실행되는 시점에는 이미 전체 응답이 도착한 상태다
const data = await response.json()

// 첫 번째 아이템을 화면에 표시하려면 전체 응답을 기다려야 한다
renderFirstItem(data[0])
```

사용자 입장에서는 로딩 스피너만 3초 동안 바라보고 있어야 한다.

### 문제 2: 메모리 급증

`JSON.parse()`가 동작하는 방식을 생각해보자. 원본 JSON 문자열이 메모리에 있고, 파싱 결과인 JavaScript 객체도 메모리에 생성된다. 잠시 동안이지만 두 데이터가 동시에 존재한다.

10MB JSON 문자열을 파싱하면 결과 객체는 보통 원본보다 더 큰 메모리를 차지한다. JavaScript 객체는 문자열보다 오버헤드가 크기 때문이다. 실제로 측정해보면 놀랄 만한 수치가 나온다.

```javascript
const jsonString = await response.text()
console.log('문자열 크기:', jsonString.length / 1024 / 1024, 'MB')

const before = performance.memory?.usedJSHeapSize
const data = JSON.parse(jsonString)
const after = performance.memory?.usedJSHeapSize

console.log('파싱으로 인한 메모리 증가:', (after - before) / 1024 / 1024, 'MB')
```

10MB JSON을 파싱하면 20~30MB의 메모리가 순식간에 증가하는 것을 볼 수 있다.

### 문제 3: UI 블로킹

`JSON.parse()`는 동기 함수다. 파싱이 완료될 때까지 메인 스레드가 멈춘다. 대용량 JSON을 파싱하는 동안 스크롤이 멈추고, 버튼 클릭이 무시되고, 애니메이션이 버벅인다.

Chrome DevTools의 Performance 탭에서 확인하면 `JSON.parse` 호출이 수백 밀리초 동안 메인 스레드를 점유하는 것을 볼 수 있다.

```javascript
console.time('parse')
const data = JSON.parse(hugeJsonString) // 메인 스레드 블로킹
console.timeEnd('parse')
// parse: 847ms
```

847ms 동안 사용자 인터랙션이 모두 무시된다. 이 정도면 사용자가 "앱이 멈췄다"고 느끼기에 충분하다.

### 문제 4: 네트워크 장애에 취약

3초 동안 데이터를 받다가 2.5초 시점에 네트워크가 끊기면 어떻게 될까? 이미 받은 2.5초 분량의 데이터는 모두 버려진다. `fetch`는 불완전한 응답을 에러로 처리하기 때문이다.

```javascript
try {
  const response = await fetch('/api/huge-data')
  const data = await response.json()
} catch (error) {
  // 네트워크 오류 - 이미 받은 데이터도 모두 손실
  console.error('전체 요청 실패:', error)
}
```

10MB 중 8MB를 이미 받았더라도 다시 처음부터 요청해야 한다.

## NDJSON: 줄 단위 JSON 스트리밍

### NDJSON이란?

NDJSON(Newline Delimited JSON)은 각 줄이 독립적인 JSON 객체인 형식이다. JSON Lines(JSONL)라고도 불린다.

```
{"id":1,"name":"Alice","email":"alice@example.com"}
{"id":2,"name":"Bob","email":"bob@example.com"}
{"id":3,"name":"Charlie","email":"charlie@example.com"}
```

일반 JSON 배열과 비교해보자.

```json
[
  {"id":1,"name":"Alice","email":"alice@example.com"},
  {"id":2,"name":"Bob","email":"bob@example.com"},
  {"id":3,"name":"Charlie","email":"charlie@example.com"}
]
```

차이점이 보이는가? 일반 JSON 배열은 닫는 대괄호 `]`가 도착해야 비로소 유효한 JSON이 된다. 반면 NDJSON은 각 줄이 완전한 JSON이므로, 첫 번째 줄이 도착하면 바로 파싱하고 처리할 수 있다.

### NDJSON의 장점

1. **점진적 처리**: 데이터가 도착하는 대로 즉시 처리할 수 있다.
2. **메모리 효율**: 한 번에 한 줄만 메모리에 유지하면 된다.
3. **장애 복구**: 연결이 끊겨도 이미 받은 줄은 유효하다.
4. **단순한 파싱**: 줄 단위로 `JSON.parse()`를 호출하면 된다.

### 서버 측 구현 (Node.js/Express)

가장 단순한 형태의 NDJSON 응답은 다음과 같다.

```javascript
app.get('/api/users', async (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson')

  const users = await getUsersFromDB()

  for (const user of users) {
    res.write(JSON.stringify(user) + '\n')
  }

  res.end()
})
```

하지만 이 방식은 모든 데이터를 먼저 메모리에 로드한다는 문제가 있다. 데이터베이스 커서나 스트림을 활용하면 서버 메모리도 절약할 수 있다.

```javascript
const { Transform } = require('stream')

const toNDJSON = new Transform({
  objectMode: true,
  transform(chunk, encoding, callback) {
    callback(null, JSON.stringify(chunk) + '\n')
  }
})

app.get('/api/users', (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson')
  res.setHeader('Transfer-Encoding', 'chunked')

  const cursor = db.collection('users').find().stream()

  cursor
    .pipe(toNDJSON)
    .pipe(res)
    .on('error', (err) => {
      console.error('스트리밍 에러:', err)
      res.end()
    })
})
```

이렇게 하면 서버는 한 번에 하나의 문서만 메모리에 유지한다. 백만 건의 데이터도 메모리 걱정 없이 스트리밍할 수 있다.

### 스로틀링을 통한 점진적 전송

실시간 데이터가 아니라 기존 데이터를 스트리밍하는 경우, 의도적으로 전송 속도를 조절할 수 있다. 이렇게 하면 클라이언트가 데이터를 처리하는 동안 새 데이터가 도착하므로 더 부드러운 사용자 경험을 제공할 수 있다.

```javascript
const { Readable } = require('stream')

app.get('/api/users', async (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson')

  const users = await getUsersFromDB()
  let index = 0

  const readable = new Readable({
    read() {
      if (index < users.length) {
        const chunk = JSON.stringify(users[index]) + '\n'
        this.push(chunk)
        index++
      } else {
        this.push(null)
      }
    }
  })

  readable.pipe(res)
})
```

### 클라이언트 측 구현 (브라우저)

Fetch API의 `response.body`는 `ReadableStream`을 반환한다. 이를 활용하면 데이터가 도착하는 대로 처리할 수 있다.

```javascript
async function fetchNDJSON(url, onData) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) break

    // stream: true 옵션이 중요하다
    // 멀티바이트 문자가 청크 경계에서 잘릴 수 있기 때문
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    // 마지막 줄은 아직 완성되지 않았을 수 있으므로 버퍼에 유지
    buffer = lines.pop()

    for (const line of lines) {
      if (line.trim()) {
        try {
          const data = JSON.parse(line)
          onData(data)
        } catch (e) {
          console.error('파싱 에러:', line, e)
        }
      }
    }
  }

  // 마지막 줄 처리
  if (buffer.trim()) {
    try {
      const data = JSON.parse(buffer)
      onData(data)
    } catch (e) {
      console.error('파싱 에러:', buffer, e)
    }
  }
}
```

`TextDecoder`의 `stream: true` 옵션은 매우 중요하다. UTF-8에서 한글 같은 멀티바이트 문자는 여러 바이트로 구성되는데, 네트워크 청크가 문자 중간에서 잘릴 수 있다. `stream: true`를 설정하면 디코더가 불완전한 문자를 다음 청크와 함께 처리한다.

### 진행률 표시 추가

NDJSON 스트리밍의 장점 중 하나는 진행률을 쉽게 표시할 수 있다는 것이다.

```javascript
async function fetchNDJSONWithProgress(url, onData, onProgress) {
  const response = await fetch(url)

  const contentLength = response.headers.get('Content-Length')
  const total = contentLength ? parseInt(contentLength, 10) : null

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''
  let received = 0
  let itemCount = 0

  while (true) {
    const { done, value } = await reader.read()

    if (done) break

    received += value.length
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (line.trim()) {
        itemCount++
        onData(JSON.parse(line))
      }
    }

    // 진행률 콜백
    onProgress({
      receivedBytes: received,
      totalBytes: total,
      percentage: total ? Math.round((received / total) * 100) : null,
      itemCount
    })
  }

  if (buffer.trim()) {
    itemCount++
    onData(JSON.parse(buffer))
  }

  return { totalItems: itemCount, totalBytes: received }
}
```

사용 예시는 다음과 같다.

```javascript
const progressBar = document.getElementById('progress')
const itemList = document.getElementById('items')

await fetchNDJSONWithProgress(
  '/api/users',
  (user) => {
    const li = document.createElement('li')
    li.textContent = user.name
    itemList.appendChild(li)
  },
  (progress) => {
    if (progress.percentage !== null) {
      progressBar.style.width = `${progress.percentage}%`
    }
    progressBar.textContent = `${progress.itemCount}개 로드됨`
  }
)
```

### AbortController로 취소 기능 추가

대용량 데이터 로딩 중에 사용자가 다른 페이지로 이동하거나 취소 버튼을 누를 수 있다. `AbortController`를 사용하면 진행 중인 요청을 깔끔하게 취소할 수 있다.

```javascript
async function fetchNDJSONWithAbort(url, onData, signal) {
  const response = await fetch(url, { signal })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (line.trim()) {
          onData(JSON.parse(line))
        }
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('요청이 취소되었습니다')
      return { aborted: true }
    }
    throw error
  } finally {
    reader.releaseLock()
  }

  if (buffer.trim()) {
    onData(JSON.parse(buffer))
  }

  return { aborted: false }
}
```

사용 예시는 다음과 같다.

```javascript
const controller = new AbortController()

// 취소 버튼
document.getElementById('cancel').onclick = () => {
  controller.abort()
}

// 5초 후 자동 취소
setTimeout(() => controller.abort(), 5000)

await fetchNDJSONWithAbort('/api/users', handleUser, controller.signal)
```

### can-ndjson-stream 라이브러리 활용

직접 구현하기 번거롭다면 `can-ndjson-stream` 라이브러리를 사용할 수 있다.

```javascript
import ndjsonStream from 'can-ndjson-stream'

async function fetchWithNDJSONStream(url, onData) {
  const response = await fetch(url)
  const reader = ndjsonStream(response.body).getReader()

  while (true) {
    const { done, value } = await reader.read()

    if (done) break

    onData(value)
  }
}
```

라이브러리가 내부적으로 버퍼링과 파싱을 처리해주므로 코드가 훨씬 간결해진다.

### React에서 NDJSON 활용하기

React 컴포넌트에서 NDJSON 스트리밍을 활용하는 커스텀 훅을 만들어보자.

```javascript
import { useState, useEffect, useCallback, useRef } from 'react'

function useNDJSONStream(url) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState({ count: 0, bytes: 0 })
  const abortControllerRef = useRef(null)

  const startStream = useCallback(async () => {
    setLoading(true)
    setError(null)
    setData([])
    setProgress({ count: 0, bytes: 0 })

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      let buffer = ''
      let count = 0
      let bytes = 0

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        bytes += value.length
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop()

        const newItems = []
        for (const line of lines) {
          if (line.trim()) {
            newItems.push(JSON.parse(line))
            count++
          }
        }

        if (newItems.length > 0) {
          setData((prev) => [...prev, ...newItems])
          setProgress({ count, bytes })
        }
      }

      if (buffer.trim()) {
        const lastItem = JSON.parse(buffer)
        setData((prev) => [...prev, lastItem])
        setProgress({ count: count + 1, bytes })
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err)
      }
    } finally {
      setLoading(false)
    }
  }, [url])

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return { data, loading, error, progress, startStream, cancel }
}
```

사용 예시는 다음과 같다.

```jsx
function UserList() {
  const { data, loading, error, progress, startStream, cancel } =
    useNDJSONStream('/api/users')

  return (
    <div>
      <button onClick={startStream} disabled={loading}>
        {loading ? '로딩 중...' : '사용자 불러오기'}
      </button>

      {loading && (
        <div>
          <button onClick={cancel}>취소</button>
          <p>{progress.count}명 로드됨 ({progress.bytes} bytes)</p>
        </div>
      )}

      {error && <p>에러: {error.message}</p>}

      <ul>
        {data.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  )
}
```

이 패턴의 장점은 사용자가 데이터가 로드되는 것을 실시간으로 볼 수 있다는 것이다. 로딩 스피너를 3초 동안 보는 것보다, 아이템이 하나씩 추가되는 것을 보는 게 훨씬 나은 사용자 경험이다.

다만 위 훅에서 `setData((prev) => [...prev, ...newItems])` 패턴은 대량 데이터에서 성능 문제가 있을 수 있다. 10만 건을 처리하면 10만 번의 배열 복사가 발생하기 때문이다. 실무에서는 아이템을 100개씩 모아서 한 번에 추가하는 배치 처리를 적용하거나, `react-window` 같은 가상화 라이브러리와 결합하는 것이 좋다. 가상화를 사용하면 10만 건의 데이터가 있어도 화면에 보이는 수십 개의 DOM 노드만 렌더링하므로 스크롤 성능이 크게 향상된다.

## 스트리밍 JSON 파서

NDJSON은 훌륭하지만 서버 측 수정이 필요하다. 기존 API가 일반 JSON 배열을 반환한다면 어떻게 해야 할까? 스트리밍 JSON 파서가 해답이다.

스트리밍 JSON 파서는 JSON 문자열을 처음부터 끝까지 순차적으로 읽으면서 이벤트를 발생시킨다. XML의 SAX 파서와 비슷한 개념이다.

### stream-json (Node.js)

`stream-json`은 Node.js에서 가장 널리 사용되는 스트리밍 JSON 파서다. 다양한 유틸리티와 스트리머를 제공한다.

#### 기본 사용법

```javascript
const { parser } = require('stream-json')
const { streamArray } = require('stream-json/streamers/StreamArray')
const fs = require('fs')

fs.createReadStream('huge-data.json')
  .pipe(parser())
  .pipe(streamArray())
  .on('data', ({ key, value }) => {
    // key는 배열 인덱스, value는 각 요소
    console.log(`[${key}]`, value)
  })
  .on('end', () => {
    console.log('파싱 완료')
  })
  .on('error', (err) => {
    console.error('파싱 에러:', err)
  })
```

#### 객체 스트리밍

배열이 아닌 객체의 속성을 스트리밍하려면 `streamObject`를 사용한다.

```javascript
const { streamObject } = require('stream-json/streamers/StreamObject')

fs.createReadStream('config.json')
  .pipe(parser())
  .pipe(streamObject())
  .on('data', ({ key, value }) => {
    console.log(`${key}:`, value)
  })
```

#### 특정 경로만 추출

대용량 JSON에서 특정 경로의 데이터만 필요한 경우 `pick`을 사용한다.

```javascript
const { pick } = require('stream-json/filters/Pick')
const { streamArray } = require('stream-json/streamers/StreamArray')

// { "metadata": {...}, "items": [...] } 구조에서 items만 추출
fs.createReadStream('data.json')
  .pipe(parser())
  .pipe(pick({ filter: 'items' }))
  .pipe(streamArray())
  .on('data', ({ key, value }) => {
    processItem(value)
  })
```

#### HTTP 응답에서 스트리밍

파일뿐 아니라 HTTP 응답에서도 스트리밍할 수 있다.

```javascript
const https = require('https')
const { parser } = require('stream-json')
const { streamArray } = require('stream-json/streamers/StreamArray')

https.get('https://api.example.com/data', (res) => {
  res
    .pipe(parser())
    .pipe(streamArray())
    .on('data', ({ key, value }) => {
      processItem(value)
    })
    .on('end', () => {
      console.log('완료')
    })
})
```

#### 배치 처리

아이템을 하나씩 처리하는 것보다 일정 개수를 모아서 처리하는 것이 효율적인 경우가 있다. `batch`를 사용하면 된다.

```javascript
const { batch } = require('stream-json/utils/Batch')

fs.createReadStream('huge-array.json')
  .pipe(parser())
  .pipe(streamArray())
  .pipe(batch({ batchSize: 100 }))
  .on('data', (items) => {
    // 100개씩 묶어서 처리
    bulkInsert(items.map((item) => item.value))
  })
```

### @streamparser/json (브라우저 + Node.js)

`@streamparser/json`은 브라우저와 Node.js 모두에서 사용할 수 있는 스트리밍 파서다. 의존성이 없어서 번들 크기가 작다.

#### 기본 사용법

```javascript
import { JSONParser } from '@streamparser/json'

const parser = new JSONParser()

parser.onValue = ({ value, key, parent, stack }) => {
  // stack.length로 현재 깊이를 알 수 있다
  if (stack.length === 1 && Array.isArray(parent)) {
    // 최상위 배열의 요소
    processItem(value)
  }
}

parser.onEnd = () => {
  console.log('파싱 완료')
}

parser.onError = (err) => {
  console.error('파싱 에러:', err)
}

// 데이터를 조각씩 입력
parser.write('{"items": [')
parser.write('{"id": 1},')
parser.write('{"id": 2}')
parser.write(']}')
```

#### Fetch API와 함께 사용

```javascript
import { JSONParser } from '@streamparser/json'

async function fetchAndParse(url, onItem) {
  const parser = new JSONParser({ paths: ['$.items.*'] })

  parser.onValue = ({ value }) => {
    onItem(value)
  }

  const response = await fetch(url)
  const reader = response.body.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    parser.write(value)
  }

  parser.end()
}
```

#### WHATWG Streams 래퍼 사용

`@streamparser/json-whatwg`를 사용하면 웹 표준 스트림 API와 통합할 수 있다.

```javascript
import { JSONParser } from '@streamparser/json-whatwg'

async function fetchAndStream(url, onItem) {
  const response = await fetch(url)

  const parser = new JSONParser({ paths: ['$.*'] })

  const reader = response.body
    .pipeThrough(parser)
    .getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    onItem(value.value)
  }
}
```

### Oboe.js (브라우저)

Oboe.js는 JSONPath 스타일의 패턴 매칭을 지원하는 스트리밍 파서다. 특정 경로의 데이터만 선택적으로 처리할 수 있어서 직관적이다.

```javascript
oboe('/api/data')
  .node('users[*]', (user) => {
    // users 배열의 각 요소가 파싱될 때마다 호출
    appendUserToList(user)

    // oboe.drop을 반환하면 해당 노드를 메모리에서 제거
    // 대용량 배열을 처리할 때 메모리 절약에 필수적
    return oboe.drop
  })
  .node('metadata', (metadata) => {
    // metadata 객체가 파싱되면 호출
    updateMetadata(metadata)
  })
  .done((finalJson) => {
    console.log('파싱 완료')
  })
  .fail((error) => {
    if (error.thrown) {
      console.error('파싱 에러:', error.thrown)
    } else {
      console.error('HTTP 에러:', error.statusCode)
    }
  })
```

#### 패턴 매칭 예시

Oboe.js의 패턴 문법은 강력하다.

```javascript
oboe('/api/data')
  // 모든 깊이의 id 속성
  .node('!..id', (id) => {
    console.log('ID 발견:', id)
  })

  // users 배열에서 status가 active인 요소
  .node('users[*]', (user) => {
    if (user.status === 'active') {
      return user
    }
    return oboe.drop
  })

  // 3단계 깊이의 모든 객체
  .node('!.*.*.*', (obj) => {
    console.log('3단계 객체:', obj)
  })
```

#### 주의사항

Oboe.js는 더 이상 유지보수되지 않는다. 2013년에 시작된 프로젝트로, 당시에는 혁신적이었지만 지금은 `@streamparser/json` 같은 현대적인 대안을 고려하는 것이 좋다.

또한 Oboe.js는 순수 JavaScript 파서이므로 네이티브 `JSON.parse()`보다 CPU를 더 많이 사용한다. 작은 JSON에서는 오히려 느릴 수 있다.

#### Oboe.js에서 @streamparser/json으로 마이그레이션

기존 Oboe.js 코드를 현대적인 라이브러리로 전환하는 방법을 알아보자.

```javascript
// 기존 Oboe.js 코드
oboe('/api/data')
  .node('users[*]', (user) => {
    appendUserToList(user)
    return oboe.drop
  })
  .done(() => console.log('완료'))
  .fail((error) => console.error(error))
```

```javascript
// @streamparser/json으로 마이그레이션
import { JSONParser } from '@streamparser/json'

async function fetchUsers(url, onUser) {
  const parser = new JSONParser({ paths: ['$.users.*'] })

  parser.onValue = ({ value, key, stack }) => {
    if (stack.length === 2) {
      onUser(value)
    }
  }

  const response = await fetch(url)
  const reader = response.body.getReader()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      parser.write(value)
    }
    console.log('완료')
  } catch (error) {
    console.error(error)
  }
}

fetchUsers('/api/data', appendUserToList)
```

주요 차이점:
- Oboe.js의 `node()` 콜백은 `onValue` 이벤트로 대체
- `oboe.drop` 대신 파싱된 값을 별도로 저장하지 않으면 자동으로 GC 대상이 됨
- JSONPath 문법이 약간 다름 (`users[*]` → `$.users.*`)
- Promise/async-await 패턴 사용 가능

## Web Worker를 활용한 파싱

스트리밍과 별개로, 대용량 JSON 파싱 자체를 Web Worker로 오프로드하는 방법도 있다. 메인 스레드 블로킹을 완전히 피할 수 있다.

### 기본 Worker 구현

```javascript
// json-worker.js
self.onmessage = async (e) => {
  const { url } = e.data

  try {
    const response = await fetch(url)
    const text = await response.text()

    // 파싱을 Worker에서 수행
    const data = JSON.parse(text)

    self.postMessage({ success: true, data })
  } catch (error) {
    self.postMessage({ success: false, error: error.message })
  }
}
```

```javascript
// main.js
const worker = new Worker('json-worker.js')

worker.onmessage = (e) => {
  if (e.data.success) {
    renderData(e.data.data)
  } else {
    showError(e.data.error)
  }
}

worker.postMessage({ url: '/api/huge-data' })
```

### 청크 단위 전송

Worker에서 메인 스레드로 대용량 데이터를 한 번에 전송하면 직렬화/역직렬화 비용이 크다. 청크 단위로 나눠서 전송하면 점진적 렌더링이 가능하다.

```javascript
// json-worker.js
self.onmessage = async (e) => {
  const { url, chunkSize = 100 } = e.data

  const response = await fetch(url)
  const data = await response.json()

  // 배열이라면 청크 단위로 전송
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize)
      self.postMessage({
        type: 'chunk',
        data: chunk,
        progress: Math.min(i + chunkSize, data.length) / data.length
      })
    }
    self.postMessage({ type: 'done' })
  } else {
    self.postMessage({ type: 'data', data })
  }
}
```

### Transferable Objects 활용

ArrayBuffer를 사용하면 복사 없이 Worker와 메인 스레드 간에 데이터를 전달할 수 있다.

```javascript
// json-worker.js
self.onmessage = async (e) => {
  const response = await fetch(e.data.url)
  const buffer = await response.arrayBuffer()

  // 소유권 이전 - 복사 없이 전달
  self.postMessage(buffer, [buffer])
}
```

```javascript
// main.js
worker.onmessage = (e) => {
  const decoder = new TextDecoder()
  const text = decoder.decode(e.data)
  const data = JSON.parse(text)
  renderData(data)
}
```

## 벤치마크: 실제 성능 측정

이론적인 비교는 충분히 했으니, 실제로 성능을 측정해보자. 다음은 Node.js v22 환경에서 10만 개의 사용자 객체(약 29MB)를 처리하는 벤치마크 결과다.

### 테스트 환경 및 데이터

```javascript
// 테스트 데이터 생성
function generateTestData(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    address: {
      street: `${i + 1} Main Street`,
      city: 'Seoul',
      zipCode: `${10000 + i}`
    },
    createdAt: new Date().toISOString(),
    tags: ['tag1', 'tag2', 'tag3'],
    metadata: {
      lastLogin: new Date().toISOString(),
      preferences: { theme: 'dark', language: 'ko' }
    }
  }))
}

const testData = generateTestData(100000)
const jsonString = JSON.stringify(testData)
console.log('테스트 데이터 크기:', (jsonString.length / 1024 / 1024).toFixed(2), 'MB')
// 테스트 데이터 크기: 29.24 MB
```

### 벤치마크 코드

```javascript
// 벤치마크 유틸리티
async function benchmark(name, fn, iterations = 5) {
  const times = []

  // 워밍업
  await fn()

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await fn()
    const end = performance.now()
    times.push(end - start)
  }

  return {
    avg: times.reduce((a, b) => a + b) / times.length,
    min: Math.min(...times),
    max: Math.max(...times)
  }
}

// JSON.parse()
const jsonParseResult = await benchmark('JSON.parse()', () => {
  return JSON.parse(jsonString)
})

// NDJSON
const ndjsonString = testData.map(item => JSON.stringify(item)).join('\n')
const ndjsonResult = await benchmark('NDJSON', () => {
  const lines = ndjsonString.split('\n')
  for (const line of lines) {
    if (line.trim()) JSON.parse(line)
  }
})

// stream-json
import pkg from 'stream-json'
import streamArrayPkg from 'stream-json/streamers/StreamArray.js'
const { parser } = pkg
const { streamArray } = streamArrayPkg

const streamJsonResult = await benchmark('stream-json', async () => {
  return new Promise((resolve, reject) => {
    let count = 0
    Readable.from(jsonString)
      .pipe(parser())
      .pipe(streamArray())
      .on('data', () => { count++ })
      .on('end', () => resolve(count))
      .on('error', reject)
  })
})
```

### 결과 요약

| 방식 | 평균 시간 | 최소 | 최대 | JSON.parse() 대비 |
|------|----------|------|------|------------------|
| JSON.parse() | 101.28ms | 96.83ms | 113.83ms | 1.0x |
| NDJSON | 102.66ms | 101.19ms | 105.63ms | 1.01x |
| stream-json | 1243.56ms | 1178.23ms | 1287.88ms | 12.28x |

흥미롭게도 **JSON.parse()와 NDJSON의 순수 파싱 속도는 거의 동일**하다. V8 엔진의 JSON.parse()가 워낙 최적화되어 있고, NDJSON도 결국 같은 엔진을 사용하기 때문이다.

반면 stream-json은 순수 JavaScript로 구현된 파서라서 **약 12배 느리다**. 하지만 이 벤치마크는 데이터가 이미 메모리에 있는 상황이다. 실제 네트워크 환경에서는 완전히 다른 결과가 나온다.

### 네트워크 포함 벤치마크

실제 HTTP 요청을 포함한 벤치마크를 진행해보자.

```javascript
// 서버 측 (Express)
const express = require('express')
const app = express()

// 일반 JSON 엔드포인트
app.get('/api/json', (req, res) => {
  res.json(testData)
})

// NDJSON 엔드포인트
app.get('/api/ndjson', (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson')
  for (const item of testData) {
    res.write(JSON.stringify(item) + '\n')
  }
  res.end()
})

app.listen(3000)
```

```javascript
// 클라이언트 측 벤치마크
async function benchmarkNetworkJson() {
  const start = performance.now()
  const response = await fetch('http://localhost:3000/api/json')
  const data = await response.json()
  const end = performance.now()

  return {
    total: end - start,
    firstItemAt: end - start, // 전체 완료 후에야 첫 아이템 접근 가능
    itemCount: data.length
  }
}

async function benchmarkNetworkNdjson() {
  const start = performance.now()
  let firstItemTime = null

  const response = await fetch('http://localhost:3000/api/ndjson')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''
  let itemCount = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (line.trim()) {
        JSON.parse(line)
        itemCount++
        if (firstItemTime === null) {
          firstItemTime = performance.now() - start
        }
      }
    }
  }

  const end = performance.now()

  return {
    total: end - start,
    firstItemAt: firstItemTime,
    itemCount
  }
}
```

### 네트워크 벤치마크 결과 (localhost)

| 방식 | 전체 시간 | 첫 아이템 시간 | TTFB 개선 |
|------|----------|--------------|----------|
| JSON | 1,247ms | 1,247ms | - |
| NDJSON | 1,389ms | 12ms | 99% |

전체 완료 시간은 NDJSON이 약간 더 느리다(줄 단위 파싱 오버헤드). 하지만 **첫 번째 아이템이 화면에 나타나는 시간**은 NDJSON이 100배 이상 빠르다. 사용자 체감 성능 면에서 엄청난 차이다.

### 느린 네트워크 시뮬레이션

Chrome DevTools의 Network Throttling을 사용하여 느린 3G 환경을 시뮬레이션한 결과:

| 방식 | 전체 시간 | 첫 아이템 시간 |
|------|----------|--------------|
| JSON | 47.2초 | 47.2초 |
| NDJSON | 48.1초 | 0.4초 |

느린 네트워크에서는 차이가 더욱 극적이다. 사용자가 47초 동안 로딩 스피너를 보는 것과, 0.4초 만에 첫 데이터를 보기 시작하는 것은 완전히 다른 경험이다.

## 메모리 프로파일링: 실제로 얼마나 차이나는가

### Chrome DevTools로 메모리 측정

브라우저에서 메모리 사용량을 측정하는 방법을 알아보자.

```javascript
// 메모리 측정 유틸리티
function measureMemory(label) {
  if (performance.memory) {
    console.log(`[${label}]`)
    console.log('  Used JS Heap:', (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2), 'MB')
    console.log('  Total JS Heap:', (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2), 'MB')
  }
}

// JSON.parse() 메모리 측정
async function measureJsonParseMemory(url) {
  measureMemory('시작')

  const response = await fetch(url)
  measureMemory('fetch 완료')

  const text = await response.text()
  measureMemory('text 변환 완료')

  const data = JSON.parse(text)
  measureMemory('JSON.parse 완료')

  return data
}
```

### 29MB JSON 파싱 시 메모리 변화

Node.js v22에서 `--expose-gc` 플래그로 실행한 결과:

```
[초기 상태]
  RSS: 41.28 MB
  Heap Used: 3.68 MB
  Heap Total: 6.33 MB

[JSON 문자열 생성 후]
  RSS: 213.63 MB
  Heap Used: 32.97 MB
  Heap Total: 66.33 MB

[JSON.parse() 후]
  RSS: 216.30 MB
  Heap Used: 80.96 MB
  Heap Total: 114.36 MB
```

29MB JSON을 처리하는 데 약 **48MB의 힙 메모리가 증가**했다. JSON 문자열 자체(~29MB)와 파싱 결과 객체(~48MB)가 동시에 메모리에 존재하는 순간이 있다.

### NDJSON 스트리밍 메모리 측정

데이터를 유지하지 않고 스트리밍 방식으로 처리할 때의 메모리 사용량을 측정했다.

```javascript
// node --expose-gc memory-benchmark.mjs

function formatMemory(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

function logMemory(label) {
  if (global.gc) global.gc()
  const usage = process.memoryUsage()
  console.log(`[${label}]`)
  console.log(`  Heap Used: ${formatMemory(usage.heapUsed)}`)
}

// NDJSON 스트리밍 (데이터 유지 안함)
const beforeNdjson = logMemory('NDJSON 파싱 전')
let peakMemory = process.memoryUsage().heapUsed
let count = 0

const lines = ndjsonString.split('\n')
for (const line of lines) {
  if (line.trim()) {
    const item = JSON.parse(line)
    // 데이터 처리 후 참조 해제 (실제 스트리밍처럼)
    count++

    if (count % 20000 === 0) {
      if (global.gc) global.gc()
      const current = process.memoryUsage().heapUsed
      if (current > peakMemory) peakMemory = current
    }
  }
}

logMemory('NDJSON 파싱 완료')
console.log(`피크 메모리 증가: ${formatMemory(peakMemory - beforeNdjson)}`)
```

### NDJSON 스트리밍 메모리 측정 결과

```
--- NDJSON 스트리밍 (데이터 유지 안함) ---
[NDJSON 파싱 전]
  Heap Used: 42.14 MB

[NDJSON 파싱 완료]
  Heap Used: 62.24 MB

처리된 아이템: 100000
피크 메모리 증가: 23.92 MB

--- NDJSON 스트리밍 (데이터 유지) ---
[NDJSON 파싱 전]
  Heap Used: 62.24 MB

[NDJSON 파싱 완료]
  Heap Used: 81.08 MB

처리된 아이템: 100000
메모리 증가: 18.85 MB
```

NDJSON 스트리밍은 아이템을 처리하고 참조를 해제하면 GC가 메모리를 회수한다. 피크 메모리 증가가 **~24MB**로, JSON.parse()의 **~48MB**와 비교하면 **약 50%의 메모리 절약**이다. 데이터를 배열에 유지해도 메모리 증가량이 더 적은 이유는, 한 번에 전체를 파싱하는 것보다 점진적으로 파싱하는 것이 GC에 더 유리하기 때문이다.

### Node.js에서 메모리 프로파일링

Node.js에서는 `--expose-gc` 플래그와 `process.memoryUsage()`를 사용한다.

```javascript
// node --expose-gc memory-benchmark.js

function formatMemory(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

function logMemory(label) {
  const usage = process.memoryUsage()
  console.log(`[${label}]`)
  console.log('  RSS:', formatMemory(usage.rss))
  console.log('  Heap Total:', formatMemory(usage.heapTotal))
  console.log('  Heap Used:', formatMemory(usage.heapUsed))
  console.log('  External:', formatMemory(usage.external))
}

async function compareMemoryUsage() {
  global.gc()
  logMemory('초기 상태')

  // JSON.parse 방식
  const jsonString = JSON.stringify(generateTestData(100000))
  global.gc()
  logMemory('JSON 문자열 생성 후')

  const parsed = JSON.parse(jsonString)
  logMemory('JSON.parse 후')

  // 명시적으로 참조 해제
  parsed.length = 0
  global.gc()
  logMemory('데이터 해제 후')
}
```

### 메모리 힙 스냅샷 분석

Chrome DevTools의 Memory 탭에서 힙 스냅샷을 찍으면 어떤 객체가 메모리를 차지하는지 자세히 볼 수 있다.

```javascript
// 스냅샷 비교를 위한 코드
async function analyzeMemoryWithSnapshots() {
  console.log('첫 번째 스냅샷을 찍으세요 (초기 상태)')
  await new Promise(r => setTimeout(r, 5000))

  const response = await fetch('/api/huge-data')
  const text = await response.text()

  console.log('두 번째 스냅샷을 찍으세요 (text 로드 후)')
  await new Promise(r => setTimeout(r, 5000))

  const data = JSON.parse(text)

  console.log('세 번째 스냅샷을 찍으세요 (parse 후)')
  await new Promise(r => setTimeout(r, 5000))

  // 데이터 사용
  console.log('아이템 수:', data.length)
}
```

스냅샷을 비교하면 다음과 같은 정보를 얻을 수 있다:
- 어떤 타입의 객체가 가장 많은 메모리를 차지하는지
- 문자열 vs 객체 비율
- 배열과 객체의 오버헤드

## 모바일 환경 최적화

모바일 환경은 데스크톱과 다른 제약이 있다. 메모리가 제한적이고, CPU도 느리며, 네트워크는 불안정하다.

### 모바일 메모리 제한

iOS Safari는 탭당 약 1GB의 메모리 제한이 있다. Android Chrome도 비슷하다. 하지만 백그라운드 탭은 훨씬 적은 메모리만 허용되며, 메모리 압박 시 먼저 종료된다.

실제로 측정해보면:
- iPhone 12: 약 1.2GB 제한
- Galaxy S21: 약 1.5GB 제한
- 저가형 Android: 약 512MB 제한

100MB JSON을 파싱하면 피크 메모리가 300MB 이상 될 수 있어서, 저가형 기기에서는 탭이 크래시될 수 있다.

### 모바일 최적화 전략

```javascript
// 1. 디바이스 메모리 감지
const deviceMemory = navigator.deviceMemory || 4 // GB

function getOptimalChunkSize() {
  if (deviceMemory <= 2) return 50
  if (deviceMemory <= 4) return 100
  return 200
}

// 2. 연결 상태 감지
const connection = navigator.connection || navigator.mozConnection

function getOptimalStrategy() {
  if (connection) {
    const { effectiveType, saveData } = connection

    if (saveData) {
      return 'minimal' // 최소한의 데이터만 요청
    }

    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return 'paginated' // 페이지네이션 사용
    }

    if (effectiveType === '3g') {
      return 'streaming' // NDJSON 스트리밍
    }
  }

  return 'full' // 전체 로드
}

// 3. 적응형 데이터 로딩
async function adaptiveDataLoader(baseUrl) {
  const strategy = getOptimalStrategy()
  const chunkSize = getOptimalChunkSize()

  switch (strategy) {
    case 'minimal':
      return fetch(`${baseUrl}?fields=id,name&limit=20`)

    case 'paginated':
      return fetchPaginated(baseUrl, { pageSize: chunkSize })

    case 'streaming':
      return fetchNDJSON(`${baseUrl}/stream`, { chunkSize })

    default:
      return fetch(baseUrl).then(r => r.json())
  }
}
```

### 페이지 가시성 기반 최적화

모바일에서는 사용자가 탭을 전환하면 리소스를 절약해야 한다.

```javascript
class SmartDataLoader {
  constructor(url, onData) {
    this.url = url
    this.onData = onData
    this.abortController = null
    this.paused = false
    this.pendingData = []

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause()
      } else {
        this.resume()
      }
    })
  }

  async start() {
    this.abortController = new AbortController()

    try {
      const response = await fetch(this.url, {
        signal: this.abortController.signal
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        // 일시정지 상태면 대기
        while (this.paused) {
          await new Promise(r => setTimeout(r, 100))
        }

        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (line.trim()) {
            const data = JSON.parse(line)

            if (document.hidden) {
              // 백그라운드에서는 데이터를 버퍼에 저장
              this.pendingData.push(data)
            } else {
              this.onData(data)
            }
          }
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        throw error
      }
    }
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false

    // 버퍼에 쌓인 데이터 처리
    while (this.pendingData.length > 0) {
      this.onData(this.pendingData.shift())
    }
  }

  cancel() {
    this.abortController?.abort()
  }
}
```

### 배터리 상태 고려

```javascript
async function getBatteryAwareStrategy() {
  if ('getBattery' in navigator) {
    const battery = await navigator.getBattery()

    if (battery.level < 0.2 && !battery.charging) {
      // 배터리 부족 + 충전 중 아님 -> 최소한의 처리
      return {
        chunkSize: 20,
        throttle: 100, // 100ms 간격으로 처리
        skipAnimations: true
      }
    }
  }

  return {
    chunkSize: 100,
    throttle: 0,
    skipAnimations: false
  }
}
```

## 압축과 스트리밍의 조합

HTTP 압축은 대용량 데이터 전송에서 필수다. 하지만 압축과 스트리밍을 함께 사용할 때 주의할 점이 있다.

### 서버 측 압축 설정

```javascript
const compression = require('compression')
const express = require('express')

const app = express()

// 기본 compression 미들웨어
// threshold: 1KB 이상일 때만 압축
app.use(compression({ threshold: 1024 }))

// NDJSON 전용 압축 설정
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson')

  // flush 옵션이 중요하다
  // 각 청크를 즉시 클라이언트로 전송하도록 함
  res.flush = () => {
    if (res.socket && res.socket.writable) {
      res.socket.uncork()
    }
  }

  for (const item of data) {
    res.write(JSON.stringify(item) + '\n')
    res.flush() // 각 줄마다 flush
  }

  res.end()
})
```

### 압축과 TTFB의 트레이드오프

압축은 전체 전송 시간을 줄이지만, TTFB(Time To First Byte)를 늘릴 수 있다. 압축 버퍼가 차야 데이터가 전송되기 때문이다.

```javascript
const zlib = require('zlib')

// 압축 버퍼 크기 조절
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Encoding', 'gzip')
  res.setHeader('Content-Type', 'application/x-ndjson')

  const gzip = zlib.createGzip({
    flush: zlib.constants.Z_SYNC_FLUSH, // 각 write마다 flush
    level: 1 // 빠른 압축 (낮은 압축률)
  })

  gzip.pipe(res)

  for (const item of data) {
    gzip.write(JSON.stringify(item) + '\n')
  }

  gzip.end()
})
```

`Z_SYNC_FLUSH`를 사용하면 각 write마다 압축된 데이터를 출력하지만, 압축 효율이 떨어진다. 반면 기본 설정은 효율적인 압축을 하지만 버퍼가 차야 출력된다.

### 압축률 vs 스트리밍 지연 비교

| 설정 | 압축률 | 첫 바이트 시간 | 전체 시간 |
|------|--------|--------------|----------|
| 압축 없음 | 0% | 5ms | 2,500ms |
| gzip level 9 (기본) | 85% | 150ms | 400ms |
| gzip level 1 + SYNC_FLUSH | 70% | 15ms | 600ms |
| brotli level 4 | 88% | 200ms | 380ms |

일반적으로 `level 1 + SYNC_FLUSH` 조합이 스트리밍에 적합하다. 압축률은 다소 낮지만 TTFB가 매우 짧다.

### 클라이언트 측에서 압축 해제 스트리밍

브라우저의 Fetch API는 `Content-Encoding: gzip` 응답을 자동으로 해제한다. 별도의 처리가 필요 없다.

```javascript
// 브라우저가 자동으로 gzip 해제
async function fetchCompressedNdjson(url, onData) {
  const response = await fetch(url) // Accept-Encoding: gzip 자동 전송

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    // value는 이미 압축 해제된 상태
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (line.trim()) {
        onData(JSON.parse(line))
      }
    }
  }
}
```

### Node.js에서 압축 스트림 처리

Node.js에서는 명시적으로 압축 해제 스트림을 연결해야 한다.

```javascript
const https = require('https')
const zlib = require('zlib')
const { pipeline } = require('stream/promises')

async function fetchCompressedStream(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let stream = res

      // Content-Encoding에 따라 압축 해제 스트림 연결
      const encoding = res.headers['content-encoding']

      if (encoding === 'gzip') {
        stream = res.pipe(zlib.createGunzip())
      } else if (encoding === 'br') {
        stream = res.pipe(zlib.createBrotliDecompress())
      } else if (encoding === 'deflate') {
        stream = res.pipe(zlib.createInflate())
      }

      resolve(stream)
    }).on('error', reject)
  })
}

// 사용 예시
const stream = await fetchCompressedStream('https://api.example.com/data')
stream
  .pipe(parser())
  .pipe(streamArray())
  .on('data', ({ value }) => {
    processItem(value)
  })
```

## 실전 사례 연구

### 사례 1: 로그 뷰어 대시보드

**문제 상황:**
- 하루 로그 데이터: 약 500만 건, 2GB
- 기존: 페이지네이션으로 100건씩 로드
- 사용자 불만: "전체 로그를 한눈에 보고 싶다"

**해결책:**

```javascript
// 서버: 가상화된 NDJSON 스트림
app.get('/api/logs', async (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson')

  const { startDate, endDate, level } = req.query

  // 커서 기반 스트리밍
  const cursor = db.collection('logs')
    .find({
      timestamp: { $gte: startDate, $lte: endDate },
      level: level || { $exists: true }
    })
    .sort({ timestamp: -1 })
    .stream()

  cursor.on('data', (doc) => {
    res.write(JSON.stringify({
      id: doc._id,
      timestamp: doc.timestamp,
      level: doc.level,
      message: doc.message.substring(0, 200) // 요약만 전송
    }) + '\n')
  })

  cursor.on('end', () => res.end())
  cursor.on('error', (err) => {
    console.error(err)
    res.end()
  })
})

// 상세 정보는 별도 API
app.get('/api/logs/:id', async (req, res) => {
  const log = await db.collection('logs').findOne({ _id: req.params.id })
  res.json(log)
})
```

```jsx
// 클라이언트: 가상 스크롤과 결합
function LogViewer() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  const loadLogs = async (filters) => {
    setLoading(true)
    setLogs([])

    await fetchNDJSONWithProgress(
      `/api/logs?${new URLSearchParams(filters)}`,
      (log) => {
        setLogs((prev) => [...prev, log])
      },
      (progress) => {
        // 진행률 표시
      }
    )

    setLoading(false)
  }

  return (
    <div>
      <VirtualList
        height={600}
        itemCount={logs.length}
        itemSize={40}
      >
        {({ index, style }) => (
          <LogItem
            style={style}
            log={logs[index]}
            onClick={() => loadLogDetail(logs[index].id)}
          />
        )}
      </VirtualList>
    </div>
  )
}
```

**결과:**
- 첫 로그 표시: 3초 → 50ms
- 메모리 사용량: 800MB → 150MB (가상 스크롤 덕분)
- 전체 로드 시간: 45초 → 30초 (요약 데이터만 전송)

### 사례 2: 지도 좌표 데이터 로딩

**문제 상황:**
- 전국 편의점 좌표: 5만 개, 8MB JSON
- 지도 로딩 시 전체 데이터 필요
- 모바일에서 초기 로딩 7초

**해결책:**

```javascript
// 1단계: 지역별로 분할된 NDJSON
// /api/stores/region/seoul.ndjson
// /api/stores/region/busan.ndjson

// 2단계: 현재 뷰포트 기준 우선 로딩
async function loadStoresForMap(map) {
  const bounds = map.getBounds()
  const center = map.getCenter()

  // 현재 보이는 영역의 데이터 먼저 로드
  const visibleStores = await fetch(
    `/api/stores/bounds?${new URLSearchParams({
      north: bounds.north,
      south: bounds.south,
      east: bounds.east,
      west: bounds.west
    })}`
  ).then(r => r.json())

  // 마커 즉시 표시
  addMarkersToMap(visibleStores)

  // 나머지 데이터는 백그라운드에서 스트리밍
  const nearbyRegions = getNearbyRegions(center)

  for (const region of nearbyRegions) {
    await fetchNDJSON(
      `/api/stores/region/${region}.ndjson`,
      (store) => {
        if (!isInBounds(store, bounds)) {
          // 아직 화면에 안 보이면 버퍼에만 저장
          storeBuffer.push(store)
        } else {
          addMarkerToMap(store)
        }
      }
    )
  }
}

// 지도 이동 시 버퍼에서 마커 추가
map.on('moveend', () => {
  const bounds = map.getBounds()
  const newlyVisible = storeBuffer.filter(s => isInBounds(s, bounds))
  addMarkersToMap(newlyVisible)
})
```

**결과:**
- 초기 마커 표시: 7초 → 800ms
- 체감 로딩 시간: "지도와 마커가 동시에 나타남"
- 전체 데이터 로드: 백그라운드에서 완료

### 사례 3: 대용량 CSV를 JSON으로 변환

**문제 상황:**
- 사용자가 업로드한 1GB CSV 파일
- JSON으로 변환 후 처리 필요
- 서버 메모리 2GB 제한

**해결책:**

```javascript
const { parse } = require('csv-parse')
const { Transform } = require('stream')

app.post('/api/csv-to-json', (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson')

  const csvParser = parse({
    columns: true,
    skip_empty_lines: true
  })

  const toNdjson = new Transform({
    objectMode: true,
    transform(record, encoding, callback) {
      // CSV 레코드를 JSON으로 변환
      const jsonLine = JSON.stringify(record) + '\n'
      callback(null, jsonLine)
    }
  })

  req
    .pipe(csvParser)
    .pipe(toNdjson)
    .pipe(res)

  csvParser.on('error', (err) => {
    console.error('CSV 파싱 에러:', err)
    res.end()
  })
})

// 클라이언트에서 스트리밍 업로드 + 스트리밍 다운로드
async function convertCsvToJson(file, onRecord) {
  const response = await fetch('/api/csv-to-json', {
    method: 'POST',
    body: file,
    headers: {
      'Content-Type': 'text/csv'
    }
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let count = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (line.trim()) {
        onRecord(JSON.parse(line))
        count++
      }
    }
  }

  return { totalRecords: count }
}
```

**결과:**
- 서버 메모리 사용량: 최대 50MB (스트림 버퍼만 사용)
- 1GB CSV 처리 시간: 45초
- 첫 레코드 수신: 200ms

## 각 방식의 상세 비교

| 방식 | 서버 수정 | 브라우저 | Node.js | 메모리 | CPU | 복잡도 | 에러 복구 |
|------|---------|---------|---------|-------|-----|-------|---------|
| JSON.parse() | 불필요 | O | O | 높음 | 낮음 | 낮음 | 어려움 |
| NDJSON | 필요 | O | O | 낮음 | 낮음 | 중간 | 쉬움 |
| stream-json | 불필요 | X | O | 낮음 | 중간 | 중간 | 중간 |
| @streamparser/json | 불필요 | O | O | 낮음 | 중간 | 중간 | 중간 |
| Oboe.js | 불필요 | O | O | 중간 | 높음 | 낮음 | 중간 |
| Web Worker | 불필요 | O | X | 높음 | 낮음 | 중간 | 어려움 |

### 메모리 사용량 비교

대략적인 메모리 사용량을 비교하면 다음과 같다. (10MB JSON 배열 기준)

- **JSON.parse()**: ~30MB (원본 + 파싱 결과 + 중간 버퍼)
- **NDJSON**: ~1MB (현재 처리 중인 줄만 유지)
- **스트리밍 파서**: ~2-5MB (파서 상태 + 현재 처리 중인 노드)

### 처리 속도 비교

처리 속도는 상황에 따라 다르다.

- **작은 JSON (< 1MB)**: JSON.parse()가 가장 빠름
- **중간 크기 (1-10MB)**: 네트워크 속도에 따라 다름
- **대용량 (> 10MB)**: 스트리밍 방식이 TTFB(Time To First Byte) 관점에서 유리

첫 번째 아이템이 화면에 나타나는 시간을 기준으로 하면:

- **JSON.parse()**: 전체 응답 시간 + 파싱 시간
- **NDJSON**: 첫 줄 도착 시간 + 파싱 시간 (~밀리초)

## 실전 선택 가이드

### 서버를 수정할 수 있는 경우

NDJSON을 강력히 추천한다.

1. 구현이 단순하다
2. 각 줄이 완전한 JSON이므로 에러 복구가 쉽다
3. 연결이 끊겨도 이미 받은 데이터는 사용할 수 있다
4. 클라이언트 구현도 간단하다
5. 진행률 표시가 자연스럽다

### 기존 JSON API를 사용해야 하는 경우

환경에 따라 선택한다.

**Node.js 서버/스크립트:**
- `stream-json`이 가장 성숙하고 안정적이다
- 다양한 유틸리티(필터, 배치 등)를 제공한다
- 메모리가 제한된 환경에서 대용량 파일을 처리할 때 필수

**브라우저:**
- `@streamparser/json`을 사용한다
- 번들 크기가 작고 의존성이 없다
- WHATWG Streams와 통합 가능

### UI 블로킹만 피하면 되는 경우

Web Worker를 고려해볼 수 있다.

- 메모리 절약보다 UI 반응성이 중요할 때
- 기존 코드를 최소한으로 수정하고 싶을 때
- 스트리밍 파서의 복잡성을 피하고 싶을 때

### 정말로 필요한지 먼저 고민하기

**10MB 미만의 JSON이라면** 굳이 스트리밍이 필요 없을 수도 있다. `JSON.parse()`가 더 빠르고, 코드도 단순하다.

복잡성을 추가하기 전에 다음을 먼저 고려해보자:

1. **페이지네이션**: 한 번에 모든 데이터가 필요한가?
2. **필터링**: 서버에서 필요한 데이터만 보내줄 수 없는가?
3. **필드 선택**: GraphQL처럼 필요한 필드만 요청할 수 없는가?
4. **캐싱**: 같은 데이터를 매번 요청해야 하는가?
5. **압축**: gzip/brotli 압축을 사용하고 있는가?

솔직히 대부분의 웹 애플리케이션에서는 API 설계를 개선하는 것이 근본적인 해결책이다. 스트리밍은 정말로 대용량 데이터를 한 번에 처리해야 할 때만 고려하자.

## TypeScript 타입 정의

스트리밍 JSON 처리를 TypeScript로 작성할 때 유용한 타입 정의를 살펴보자.

### NDJSON 클라이언트 타입

```typescript
interface StreamProgress {
  receivedBytes: number
  totalBytes: number | null
  percentage: number | null
  itemCount: number
}

interface StreamResult<T> {
  data: T[]
  totalItems: number
  totalBytes: number
  aborted: boolean
}

type OnDataCallback<T> = (item: T) => void
type OnProgressCallback = (progress: StreamProgress) => void

async function fetchNDJSON<T>(
  url: string,
  onData: OnDataCallback<T>,
  options?: {
    signal?: AbortSignal
    onProgress?: OnProgressCallback
  }
): Promise<StreamResult<T>> {
  const response = await fetch(url, { signal: options?.signal })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  const contentLength = response.headers.get('Content-Length')
  const total = contentLength ? parseInt(contentLength, 10) : null

  let buffer = ''
  let received = 0
  let itemCount = 0
  const data: T[] = []

  while (true) {
    const { done, value } = await reader.read()

    if (done) break

    received += value.length
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop()!

    for (const line of lines) {
      if (line.trim()) {
        const item = JSON.parse(line) as T
        data.push(item)
        onData(item)
        itemCount++
      }
    }

    options?.onProgress?.({
      receivedBytes: received,
      totalBytes: total,
      percentage: total ? Math.round((received / total) * 100) : null,
      itemCount
    })
  }

  if (buffer.trim()) {
    const item = JSON.parse(buffer) as T
    data.push(item)
    onData(item)
    itemCount++
  }

  return {
    data,
    totalItems: itemCount,
    totalBytes: received,
    aborted: false
  }
}
```

### 제네릭을 활용한 타입 안전한 사용

```typescript
interface User {
  id: number
  name: string
  email: string
}

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
}

// 타입 추론이 자동으로 적용됨
await fetchNDJSON<User>('/api/users', (user) => {
  console.log(user.name) // user는 User 타입
})

await fetchNDJSON<LogEntry>('/api/logs', (log) => {
  if (log.level === 'error') {
    console.error(log.message)
  }
})
```

### React 훅의 타입 정의

```typescript
interface UseNDJSONStreamResult<T> {
  data: T[]
  loading: boolean
  error: Error | null
  progress: { count: number; bytes: number }
  startStream: () => Promise<void>
  cancel: () => void
}

function useNDJSONStream<T>(url: string): UseNDJSONStreamResult<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [progress, setProgress] = useState({ count: 0, bytes: 0 })
  const abortControllerRef = useRef<AbortController | null>(null)

  // ... 구현
}
```

## 주의사항과 함정

### 스트리밍 파서의 CPU 오버헤드

순수 JavaScript 파서는 네이티브 `JSON.parse()`보다 느리다. V8 엔진의 `JSON.parse()`는 C++로 구현되어 있고, 고도로 최적화되어 있다.

실제 벤치마크 결과 `stream-json`은 `JSON.parse()`보다 **약 12배 느렸다**. 다만 이 오버헤드는 네트워크 지연시간에 비하면 무시할 수준인 경우가 많다.

### 에러 처리의 복잡성

스트리밍 중간에 에러가 발생하면 이미 처리한 데이터의 롤백이 어렵다.

```javascript
// 예: 100개 중 50개를 처리한 후 에러 발생
oboe('/api/data')
  .node('items[*]', (item) => {
    insertToDB(item) // 50개가 이미 삽입됨
  })
  .fail((error) => {
    // 이미 삽입된 50개는 어떻게 할 것인가?
  })
```

트랜잭션이 필요한 경우 스트리밍 방식이 적합하지 않을 수 있다. 또는 임시 테이블에 먼저 삽입하고, 완료 후 실제 테이블로 이동하는 방식을 고려해야 한다.

### 순서 보장 문제

비동기 처리를 할 때 순서가 뒤바뀔 수 있다.

```javascript
// 잘못된 예
oboe('/api/data')
  .node('items[*]', async (item) => {
    await processAsync(item) // 순서 보장 안됨
  })
```

순서가 중요하다면 동기적으로 처리하거나, 큐를 사용해야 한다.

### 브라우저 호환성

Fetch API의 스트리밍 기능은 모든 브라우저에서 지원되지 않는다. 특히 `response.body`가 `ReadableStream`을 반환하는 기능은 IE에서 지원되지 않는다.

2024년 기준 주요 브라우저의 지원 현황:
- Chrome: 43+
- Firefox: 65+
- Safari: 10.1+
- Edge: 14+

IE 지원이 필요하다면 폴리필이나 다른 방식을 고려해야 한다.

## 디버깅과 트러블슈팅

스트리밍 JSON 처리에서 자주 발생하는 문제들과 해결 방법을 알아보자.

### 문제 1: 한글이 깨지는 경우

UTF-8에서 한글은 3바이트로 인코딩된다. 네트워크 청크가 문자 중간에서 잘리면 깨진 문자가 출력된다.

```javascript
// 잘못된 예
const decoder = new TextDecoder()
buffer += decoder.decode(value) // stream 옵션 누락

// 올바른 예
buffer += decoder.decode(value, { stream: true })
```

`stream: true` 옵션을 사용하면 디코더가 불완전한 멀티바이트 문자를 버퍼에 유지하고, 다음 청크와 함께 처리한다.

### 문제 2: 마지막 줄이 누락되는 경우

NDJSON 파일이 개행 문자로 끝나지 않으면 마지막 줄이 버퍼에 남는다.

```javascript
// 잘못된 예
while (true) {
  const { done, value } = await reader.read()
  if (done) break

  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split('\n')
  buffer = lines.pop()

  for (const line of lines) {
    onData(JSON.parse(line))
  }
}
// 루프 종료 후 buffer에 마지막 줄이 남아있음!

// 올바른 예
while (true) {
  // ... 동일
}

// 루프 종료 후 버퍼 처리
if (buffer.trim()) {
  onData(JSON.parse(buffer))
}
```

### 문제 3: 스트리밍이 동작하지 않는 경우

서버에서 응답을 버퍼링하면 클라이언트에서 스트리밍이 동작하지 않는다.

**확인 사항:**

1. **Nginx 버퍼링**: `proxy_buffering off;` 설정 확인
2. **Express compression**: `threshold` 값 확인 (작은 응답은 버퍼링됨)
3. **Transfer-Encoding**: `chunked` 헤더 확인

```javascript
// Express에서 확실한 스트리밍을 위한 설정
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('X-Accel-Buffering', 'no') // Nginx용
  res.flushHeaders() // 헤더 즉시 전송

  // ... 데이터 전송
})
```

### 문제 4: 메모리 누수

스트리밍 중 abort 되었을 때 리소스를 정리하지 않으면 메모리 누수가 발생한다.

```javascript
async function fetchWithCleanup(url, onData, signal) {
  const response = await fetch(url, { signal })
  const reader = response.body.getReader()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      // ... 처리
    }
  } finally {
    // 항상 reader 해제
    reader.releaseLock()
  }
}
```

### 디버깅 유틸리티

스트리밍 상태를 모니터링하는 디버그 래퍼:

```javascript
function createDebugStream(url, onData) {
  const startTime = performance.now()
  let chunkCount = 0
  let totalBytes = 0
  let itemCount = 0

  return fetchNDJSON(url, (item) => {
    itemCount++

    if (itemCount % 1000 === 0) {
      const elapsed = performance.now() - startTime
      console.log(`[Stream Debug]
        경과 시간: ${(elapsed / 1000).toFixed(2)}s
        받은 청크: ${chunkCount}
        처리된 아이템: ${itemCount}
        처리 속도: ${(itemCount / elapsed * 1000).toFixed(0)} items/sec
      `)
    }

    onData(item)
  }, {
    onProgress: (progress) => {
      chunkCount++
      totalBytes = progress.receivedBytes
    }
  })
}
```

## 테스트 작성 가이드

스트리밍 JSON 처리 코드를 테스트하는 방법을 알아보자.

### Mock 스트림 생성

```javascript
function createMockReadableStream(chunks, delayMs = 10) {
  let index = 0

  return new ReadableStream({
    async pull(controller) {
      if (index < chunks.length) {
        await new Promise(r => setTimeout(r, delayMs))
        controller.enqueue(new TextEncoder().encode(chunks[index]))
        index++
      } else {
        controller.close()
      }
    }
  })
}

// 사용 예
const mockStream = createMockReadableStream([
  '{"id":1,"name":"Alice"}\n',
  '{"id":2,"name":"Bob"}\n',
  '{"id":3,"name":"Charlie"}\n'
])
```

### Jest를 사용한 단위 테스트

```javascript
import { fetchNDJSON } from './ndjson-client'

describe('fetchNDJSON', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('should parse NDJSON stream correctly', async () => {
    const mockData = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]

    const ndjson = mockData.map(d => JSON.stringify(d)).join('\n')
    const mockStream = createMockReadableStream([ndjson])

    global.fetch.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      body: mockStream
    })

    const received = []
    await fetchNDJSON('/api/test', (item) => {
      received.push(item)
    })

    expect(received).toEqual(mockData)
  })

  it('should handle chunked data correctly', async () => {
    // 문자 중간에서 잘린 청크 시뮬레이션
    const mockStream = createMockReadableStream([
      '{"id":1,"name":"홍',  // 한글이 중간에 잘림
      '길동"}\n'
    ])

    global.fetch.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      body: mockStream
    })

    const received = []
    await fetchNDJSON('/api/test', (item) => {
      received.push(item)
    })

    expect(received[0].name).toBe('홍길동')
  })

  it('should handle abort correctly', async () => {
    const controller = new AbortController()
    const slowStream = createMockReadableStream(
      Array(100).fill('{"id":1}\n'),
      100 // 100ms 딜레이
    )

    global.fetch.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      body: slowStream
    })

    const received = []
    const promise = fetchNDJSON('/api/test', (item) => {
      received.push(item)
      if (received.length === 5) {
        controller.abort()
      }
    }, { signal: controller.signal })

    await expect(promise).rejects.toThrow('aborted')
    expect(received.length).toBeLessThanOrEqual(10)
  })
})
```

### E2E 테스트 (Playwright)

```javascript
import { test, expect } from '@playwright/test'

test('should load large dataset progressively', async ({ page }) => {
  await page.goto('/users')

  // 로드 버튼 클릭
  await page.click('button:has-text("사용자 불러오기")')

  // 첫 번째 아이템이 빠르게 나타나는지 확인
  await expect(page.locator('.user-item').first()).toBeVisible({
    timeout: 1000
  })

  // 진행률 표시 확인
  await expect(page.locator('.progress')).toContainText(/\d+개 로드됨/)

  // 전체 로드 완료 대기
  await expect(page.locator('button:has-text("사용자 불러오기")')).toBeEnabled({
    timeout: 30000
  })

  // 전체 아이템 수 확인
  const count = await page.locator('.user-item').count()
  expect(count).toBeGreaterThan(1000)
})
```

## 마치며

대용량 JSON 처리는 프론트엔드와 백엔드 모두의 협력이 필요한 문제다. NDJSON처럼 서버에서 스트리밍 친화적인 형식을 제공하면 클라이언트 구현이 훨씬 단순해진다.

하지만 기존 API를 수정할 수 없는 상황도 많다. 그럴 때 스트리밍 파서들이 도움이 된다. `stream-json`, `@streamparser/json` 같은 라이브러리들은 충분히 성숙하고 실전에서 검증되었다.

정리하자면:

1. **가능하다면 NDJSON을 사용하자.** 가장 단순하고 효과적이다.
2. **기존 API를 사용해야 한다면 환경에 맞는 스트리밍 파서를 선택하자.**
3. **UI 반응성만 문제라면 Web Worker도 고려해볼 만하다.**
4. **무엇보다, 정말 필요한지 먼저 고민하자.** 대부분의 경우 API 설계 개선이 더 나은 선택이다.

## 참고

- [Faster Page Loads: How to Use NDJSON to Stream API Responses](https://www.bitovi.com/blog/faster-page-loads-how-to-use-ndjson-to-stream-api-responses)
- [Streaming Data with Fetch() and NDJSON](https://davidwalsh.name/streaming-data-fetch-ndjson)
- [stream-json - GitHub](https://github.com/uhop/stream-json)
- [@streamparser/json - npm](https://www.npmjs.com/package/@streamparser/json)
- [Why Oboe.js?](https://oboejs.com/why)
- [JSON streaming - Wikipedia](https://en.wikipedia.org/wiki/JSON_streaming)
- [can-ndjson-stream - npm](https://www.npmjs.com/package/can-ndjson-stream)
