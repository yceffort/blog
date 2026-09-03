---
title: 'How to Efficiently Process Massive JSON Responses'
tags:
  - javascript
  - web-performance
published: true
date: 2026-01-11 15:00:00
description: 'How to survive when JSON.parse() becomes overwhelming'
art:
  layout: contours
  hue: cyan
  tone: light
  hero: '47.2초 → 0.4초'
---

## Table of Contents

## Introduction

There are situations where you need to handle JSON responses of tens of megabytes from APIs. This includes loading tens of thousands of log entries in a dashboard or receiving massive coordinate datasets in map applications.

`JSON.parse()` only begins parsing after the entire string is loaded into memory. Users have to stare at a blank screen until the response completes, while memory usage skyrockets. The situation becomes even more critical in mobile environments.

This article explores various strategies for efficiently processing large JSON datasets. We'll cover everything from the limitations of traditional `JSON.parse()` to NDJSON and streaming parsers, examining the pros and cons of each approach and their practical implementations.

## Limitations of JSON.parse()

### Basic JSON Processing Approach

The JSON processing method most developers use looks like this:

```javascript
const response = await fetch('/api/huge-data')
const data = await response.json()
```

Simple and intuitive. However, these two lines of code hide several serious problems.

### Problem 1: Waiting for Complete Response

`response.json()` internally reads the entire response body as a string and then calls `JSON.parse()`. If a 10MB response arrives over 3 seconds, you can't do anything for those 3 seconds from the moment the first byte arrives.

```javascript
// By the time this code executes, the entire response has already arrived
const data = await response.json()

// To display the first item on screen, you must wait for the complete response
renderFirstItem(data[0])
```

From the user's perspective, they have to stare at a loading spinner for 3 seconds.

### Problem 2: Memory Surge

Consider how `JSON.parse()` works. The original JSON string exists in memory, and the parsed JavaScript object is also created in memory. For a brief moment, both datasets exist simultaneously.

When parsing a 10MB JSON string, the resulting object typically occupies more memory than the original. JavaScript objects have greater overhead than strings. The actual measurements yield surprising numbers.

```javascript
const jsonString = await response.text()
console.log('String size:', jsonString.length / 1024 / 1024, 'MB')

const before = performance.memory?.usedJSHeapSize
const data = JSON.parse(jsonString)
const after = performance.memory?.usedJSHeapSize

console.log(
  'Memory increase from parsing:',
  (after - before) / 1024 / 1024,
  'MB',
)
```

Parsing 10MB of JSON can cause an instant increase of 20-30MB in memory usage.

### Problem 3: UI Blocking

`JSON.parse()` is a synchronous function. The main thread stops until parsing completes. While parsing large JSON, scrolling stops, button clicks are ignored, and animations stutter.

Looking at Chrome DevTools' Performance tab, you can see `JSON.parse` calls occupying the main thread for hundreds of milliseconds.

```javascript
console.time('parse')
const data = JSON.parse(hugeJsonString) // Main thread blocking
console.timeEnd('parse')
// parse: 847ms
```

All user interactions are ignored for 847ms. This is enough for users to feel that "the app has frozen."

### Problem 4: Vulnerability to Network Failures

What happens if you're receiving data for 3 seconds and the network disconnects at the 2.5-second mark? All 2.5 seconds worth of already-received data is discarded. `fetch` treats incomplete responses as errors.

```javascript
try {
  const response = await fetch('/api/huge-data')
  const data = await response.json()
} catch (error) {
  // Network error - all already received data is lost
  console.error('Complete request failed:', error)
}
```

Even if you've already received 8MB out of 10MB, you must start the request from scratch.

## NDJSON: Line-by-Line JSON Streaming

### What is NDJSON?

[NDJSON](https://github.com/ndjson/ndjson-spec) (Newline Delimited JSON) is a format where each line is an independent JSON object. It's also called JSON Lines (JSONL).

```
{"id":1,"name":"Alice","email":"alice@example.com"}
{"id":2,"name":"Bob","email":"bob@example.com"}
{"id":3,"name":"Charlie","email":"charlie@example.com"}
```

Compare this with a regular JSON array:

```json
[
  {"id": 1, "name": "Alice", "email": "alice@example.com"},
  {"id": 2, "name": "Bob", "email": "bob@example.com"},
  {"id": 3, "name": "Charlie", "email": "charlie@example.com"}
]
```

See the difference? A regular JSON array only becomes valid JSON when the closing bracket `]` arrives. In contrast, NDJSON can be parsed and processed immediately when the first line arrives, since each line is complete JSON.

### Advantages of NDJSON

1. **Progressive processing**: Data can be processed immediately as it arrives.
2. **Memory efficiency**: Only one line needs to be kept in memory at a time.
3. **Fault recovery**: Already received lines remain valid even if connection drops.
4. **Simple parsing**: Just call `JSON.parse()` on each line.

### Server-Side Implementation (Node.js/Express)

The simplest form of NDJSON response looks like this:

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

However, this approach has the problem of loading all data into memory first. Using database cursors or streams can save server memory too.

```javascript
const {Transform} = require('stream')

const toNDJSON = new Transform({
  objectMode: true,
  transform(chunk, encoding, callback) {
    callback(null, JSON.stringify(chunk) + '\n')
  },
})

app.get('/api/users', (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson')
  res.setHeader('Transfer-Encoding', 'chunked')

  const cursor = db.collection('users').find().stream()

  cursor
    .pipe(toNDJSON)
    .pipe(res)
    .on('error', (err) => {
      console.error('Streaming error:', err)
      res.end()
    })
})
```

This way, the server only keeps one document in memory at a time. Even millions of records can be streamed without memory concerns.

### Progressive Transmission Through Throttling

When streaming existing data rather than real-time data, you can intentionally control transmission speed. This provides a smoother user experience as new data arrives while the client processes existing data.

```javascript
const {Readable} = require('stream')

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
    },
  })

  readable.pipe(res)
})
```

### Client-Side Implementation (Browser)

The Fetch API's `response.body` returns a `ReadableStream`. Using this, you can process data as it arrives.

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
    const {done, value} = await reader.read()

    if (done) break

    // The stream: true option is important
    // Multibyte characters can be cut at chunk boundaries
    buffer += decoder.decode(value, {stream: true})

    const lines = buffer.split('\n')
    // The last line might not be complete yet, so keep it in buffer
    buffer = lines.pop()

    for (const line of lines) {
      if (line.trim()) {
        try {
          const data = JSON.parse(line)
          onData(data)
        } catch (e) {
          console.error('Parse error:', line, e)
        }
      }
    }
  }

  // Process the last line
  if (buffer.trim()) {
    try {
      const data = JSON.parse(buffer)
      onData(data)
    } catch (e) {
      console.error('Parse error:', buffer, e)
    }
  }
}
```

The `stream: true` option for `TextDecoder` is crucial. In UTF-8, multibyte characters like Korean are composed of multiple bytes, and network chunks can be cut in the middle of characters. Setting `stream: true` makes the decoder handle incomplete characters together with the next chunk.

### Using the can-ndjson-stream Library

If direct implementation is cumbersome, you can use the [`can-ndjson-stream`](https://www.npmjs.com/package/can-ndjson-stream) library.

```javascript
import ndjsonStream from 'can-ndjson-stream'

async function fetchWithNDJSONStream(url, onData) {
  const response = await fetch(url)
  const reader = ndjsonStream(response.body).getReader()

  while (true) {
    const {done, value} = await reader.read()

    if (done) break

    onData(value)
  }
}
```

The code becomes much cleaner since the library handles buffering and parsing internally.

## Streaming JSON Parsers

NDJSON is excellent but requires server-side modifications. What if existing APIs return regular JSON arrays? Streaming JSON parsers are the answer.

Streaming JSON parsers read JSON strings sequentially from beginning to end while emitting events. It's similar to the SAX parser concept for XML.

### stream-json (Node.js)

[`stream-json`](https://github.com/uhop/stream-json) is the most widely used streaming JSON parser in Node.js. It provides various utilities and streamers.

#### Basic Usage

```javascript
const {parser} = require('stream-json')
const {streamArray} = require('stream-json/streamers/StreamArray')
const fs = require('fs')

fs.createReadStream('huge-data.json')
  .pipe(parser())
  .pipe(streamArray())
  .on('data', ({key, value}) => {
    // key is array index, value is each element
    console.log(`[${key}]`, value)
  })
  .on('end', () => {
    console.log('Parsing complete')
  })
  .on('error', (err) => {
    console.error('Parse error:', err)
  })
```

#### Object Streaming

To stream properties of objects rather than arrays, use `streamObject`.

```javascript
const {streamObject} = require('stream-json/streamers/StreamObject')

fs.createReadStream('config.json')
  .pipe(parser())
  .pipe(streamObject())
  .on('data', ({key, value}) => {
    console.log(`${key}:`, value)
  })
```

#### Extracting Specific Paths Only

When you only need data from specific paths in large JSON, use `pick`.

```javascript
const {pick} = require('stream-json/filters/Pick')
const {streamArray} = require('stream-json/streamers/StreamArray')

// Extract only items from { "metadata": {...}, "items": [...] } structure
fs.createReadStream('data.json')
  .pipe(parser())
  .pipe(pick({filter: 'items'}))
  .pipe(streamArray())
  .on('data', ({key, value}) => {
    processItem(value)
  })
```

#### Streaming from HTTP Responses

You can stream from HTTP responses as well as files.

```javascript
const https = require('https')
const {parser} = require('stream-json')
const {streamArray} = require('stream-json/streamers/StreamArray')

https.get('https://api.example.com/data', (res) => {
  res
    .pipe(parser())
    .pipe(streamArray())
    .on('data', ({key, value}) => {
      processItem(value)
    })
    .on('end', () => {
      console.log('Complete')
    })
})
```

#### Batch Processing

When it's more efficient to process a certain number of items together rather than one by one, use `batch`.

```javascript
const {batch} = require('stream-json/utils/Batch')

fs.createReadStream('huge-array.json')
  .pipe(parser())
  .pipe(streamArray())
  .pipe(batch({batchSize: 100}))
  .on('data', (items) => {
    // Process 100 items at a time
    bulkInsert(items.map((item) => item.value))
  })
```

### @streamparser/json (Browser + Node.js)

[`@streamparser/json`](https://www.npmjs.com/package/@streamparser/json) is a streaming parser that works in both browsers and Node.js. It has no dependencies, making the bundle size small.

#### Basic Usage

```javascript
import {JSONParser} from '@streamparser/json'

const parser = new JSONParser()

parser.onValue = ({value, key, parent, stack}) => {
  // You can determine current depth with stack.length
  if (stack.length === 1 && Array.isArray(parent)) {
    // Top-level array element
    processItem(value)
  }
}

parser.onEnd = () => {
  console.log('Parsing complete')
}

parser.onError = (err) => {
  console.error('Parse error:', err)
}

// Input data piece by piece
parser.write('{"items": [')
parser.write('{"id": 1},')
parser.write('{"id": 2}')
parser.write(']}')
```

#### Using with Fetch API

```javascript
import {JSONParser} from '@streamparser/json'

async function fetchAndParse(url, onItem) {
  const parser = new JSONParser({paths: ['$.items.*']})

  parser.onValue = ({value}) => {
    onItem(value)
  }

  const response = await fetch(url)
  const reader = response.body.getReader()

  while (true) {
    const {done, value} = await reader.read()
    if (done) break
    parser.write(value)
  }

  parser.end()
}
```

#### Using WHATWG Streams Wrapper

Using `@streamparser/json-whatwg` allows integration with web standard stream APIs.

```javascript
import {JSONParser} from '@streamparser/json-whatwg'

async function fetchAndStream(url, onItem) {
  const response = await fetch(url)

  const parser = new JSONParser({paths: ['$.*']})

  const reader = response.body.pipeThrough(parser).getReader()

  while (true) {
    const {done, value} = await reader.read()
    if (done) break
    onItem(value.value)
  }
}
```

### Oboe.js (Legacy)

Oboe.js is a streaming parser that supports JSONPath-style pattern matching, once widely used. However, **it's a project that started in 2013 and is no longer maintained.** I'll mention it briefly since you might encounter it in legacy codebases.

```javascript
// Oboe.js basic usage (for reference)
oboe('/api/data')
  .node('users[*]', (user) => {
    appendUserToList(user)
    return oboe.drop // Remove from memory
  })
  .done(() => console.log('Complete'))
  .fail((error) => console.error(error))
```

Use `@streamparser/json` for new projects. While the JSONPath syntax is slightly different (`users[*]` → `$.users.*`), it supports modern async/await patterns and is actively maintained.

## Parsing with Web Worker

Separately from streaming, you can also offload large JSON parsing itself to a Web Worker. This completely avoids main thread blocking.

### Basic Worker Implementation

```javascript
// json-worker.js
self.onmessage = async (e) => {
  const {url} = e.data

  try {
    const response = await fetch(url)
    const text = await response.text()

    // Perform parsing in Worker
    const data = JSON.parse(text)

    self.postMessage({success: true, data})
  } catch (error) {
    self.postMessage({success: false, error: error.message})
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

worker.postMessage({url: '/api/huge-data'})
```

### Chunk-based Transfer

If you transfer large data from Worker to main thread all at once, the serialization/deserialization cost is high. Transferring in chunks enables progressive rendering.

```javascript
// json-worker.js
self.onmessage = async (e) => {
  const {url, chunkSize = 100} = e.data

  const response = await fetch(url)
  const data = await response.json()

  // If array, transfer in chunks
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize)
      self.postMessage({
        type: 'chunk',
        data: chunk,
        progress: Math.min(i + chunkSize, data.length) / data.length,
      })
    }
    self.postMessage({type: 'done'})
  } else {
    self.postMessage({type: 'data', data})
  }
}
```

### Using Transferable Objects

With ArrayBuffer, you can transfer data between Worker and main thread without copying.

```javascript
// json-worker.js
self.onmessage = async (e) => {
  const response = await fetch(e.data.url)
  const buffer = await response.arrayBuffer()

  // Transfer ownership - passes without copying
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

## Benchmark: Real Performance Measurements

Here are benchmark results from my local environment (MacBook Pro M3 Pro, 36GB RAM, Node.js v22) processing 100,000 user objects (~29MB).

### Pure Parsing Speed Comparison

| Method       | Average Time | Min       | Max       | vs JSON.parse() |
| ------------ | ------------ | --------- | --------- | --------------- |
| JSON.parse() | 101.28ms     | 96.83ms   | 113.83ms  | 1.0x            |
| NDJSON       | 102.66ms     | 101.19ms  | 105.63ms  | 1.01x           |
| stream-json  | 1243.56ms    | 1178.23ms | 1287.88ms | 12.28x          |

Interestingly, **JSON.parse() and NDJSON have nearly identical pure parsing speeds**. This is because V8's JSON.parse() is highly optimized, and NDJSON ultimately uses the same engine.

stream-json, being implemented in pure JavaScript, is **about 12x slower**. However, this benchmark assumes data already exists in memory. In real network environments, results are completely different.

### Network-included Benchmark (localhost)

| Method | Total Time | First Item Time | TTFB Improvement |
| ------ | ---------- | --------------- | ---------------- |
| JSON   | 1,247ms    | 1,247ms         | -                |
| NDJSON | 1,389ms    | 12ms            | 99%              |

Overall completion time is slightly slower for NDJSON (line-by-line parsing overhead). But **time until first item appears on screen** is 100x faster with NDJSON. This makes a huge difference in perceived user performance.

### Slow Network Simulation

Results using Chrome DevTools Network Throttling to simulate slow 3G:

| Method | Total Time | First Item Time |
| ------ | ---------- | --------------- |
| JSON   | 47.2s      | 47.2s           |
| NDJSON | 48.1s      | 0.4s            |

The difference becomes even more dramatic on slow networks. Having users watch a loading spinner for 47 seconds versus starting to see data in 0.4 seconds is a completely different experience.

## Memory Usage Comparison

Measured memory changes when processing 29MB JSON.

### JSON.parse() Method

| Stage                      | Heap Used |
| -------------------------- | --------- |
| Initial state              | 3.68 MB   |
| After JSON string creation | 32.97 MB  |
| After JSON.parse()         | 80.96 MB  |

Processing 29MB JSON increased heap memory by about **48MB**. There's a moment when both the JSON string (~29MB) and parsed result object (~48MB) exist simultaneously in memory.

### NDJSON Streaming Method

| Method                 | Peak Memory Increase |
| ---------------------- | -------------------- |
| Without retaining data | ~24MB                |
| With data retention    | ~19MB                |

NDJSON streaming allows GC to reclaim memory as items are processed and references released. Compared to JSON.parse()'s **~48MB**, this achieves about **50% memory savings**. Progressive parsing is more favorable to GC than parsing everything at once.

## Real-world Case Studies

### Case 1: Log Viewer Dashboard

**Problem:**

- Daily log data: ~5 million entries, 2GB
- Existing: Pagination loading 100 entries at a time
- User complaint: "Want to see all logs at a glance"

**Solution:**

```javascript
// Server: Virtualized NDJSON stream
app.get('/api/logs', async (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson')

  const {startDate, endDate, level} = req.query

  // Cursor-based streaming
  const cursor = db
    .collection('logs')
    .find({
      timestamp: {$gte: startDate, $lte: endDate},
      level: level || {$exists: true},
    })
    .sort({timestamp: -1})
    .stream()

  cursor.on('data', (doc) => {
    res.write(
      JSON.stringify({
        id: doc._id,
        timestamp: doc.timestamp,
        level: doc.level,
        message: doc.message.substring(0, 200), // Send summary only
      }) + '\n',
    )
  })

  cursor.on('end', () => res.end())
  cursor.on('error', (err) => {
    console.error(err)
    res.end()
  })
})

// Detailed info via separate API
app.get('/api/logs/:id', async (req, res) => {
  const log = await db.collection('logs').findOne({_id: req.params.id})
  res.json(log)
})
```

On the client side, you can combine the NDJSON stream with virtual scrolling libraries (react-window, vue-virtual-scroller, etc.).

**Results:**

- First log display: 3s → 50ms
- Memory usage: 800MB → 150MB (thanks to virtual scrolling)
- Total load time: 45s → 30s (sending summary data only)

### Case 2: Map Coordinate Data Loading

**Problem:**

- National convenience store coordinates: 50,000 points, 8MB JSON
- All data needed when loading map
- 7-second initial loading on mobile

**Solution:**

```javascript
// Step 1: Region-divided NDJSON
// /api/stores/region/seoul.ndjson
// /api/stores/region/busan.ndjson

// Step 2: Priority loading based on current viewport
async function loadStoresForMap(map) {
  const bounds = map.getBounds()
  const center = map.getCenter()

  // Load visible area data first
  const visibleStores = await fetch(
    `/api/stores/bounds?${new URLSearchParams({
      north: bounds.north,
      south: bounds.south,
      east: bounds.east,
      west: bounds.west,
    })}`,
  ).then((r) => r.json())

  // Display markers immediately
  addMarkersToMap(visibleStores)

  // Stream remaining data in background
  const nearbyRegions = getNearbyRegions(center)

  for (const region of nearbyRegions) {
    await fetchNDJSON(`/api/stores/region/${region}.ndjson`, (store) => {
      if (!isInBounds(store, bounds)) {
        // If not visible on screen yet, store in buffer only
        storeBuffer.push(store)
      } else {
        addMarkerToMap(store)
      }
    })
  }
}

// Add markers from buffer when map moves
map.on('moveend', () => {
  const bounds = map.getBounds()
  const newlyVisible = storeBuffer.filter((s) => isInBounds(s, bounds))
  addMarkersToMap(newlyVisible)
})
```

**Results:**

- Initial marker display: 7s → 800ms
- Perceived loading time: "Map and markers appear simultaneously"
- Full data load: Completed in background

### Case 3: Converting Large CSV to JSON

**Problem:**

- User-uploaded 1GB CSV file
- Needs conversion to JSON for processing
- 2GB server memory limit

**Solution:**

```javascript
const {parse} = require('csv-parse')
const {Transform} = require('stream')

app.post('/api/csv-to-json', (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson')

  const csvParser = parse({
    columns: true,
    skip_empty_lines: true,
  })

  const toNdjson = new Transform({
    objectMode: true,
    transform(record, encoding, callback) {
      // Convert CSV record to JSON
      const jsonLine = JSON.stringify(record) + '\n'
      callback(null, jsonLine)
    },
  })

  req.pipe(csvParser).pipe(toNdjson).pipe(res)

  csvParser.on('error', (err) => {
    console.error('CSV parsing error:', err)
    res.end()
  })
})

// Client-side streaming upload + streaming download
async function convertCsvToJson(file, onRecord) {
  const response = await fetch('/api/csv-to-json', {
    method: 'POST',
    body: file,
    headers: {
      'Content-Type': 'text/csv',
    },
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let count = 0

  while (true) {
    const {done, value} = await reader.read()
    if (done) break

    buffer += decoder.decode(value, {stream: true})
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (line.trim()) {
        onRecord(JSON.parse(line))
        count++
      }
    }
  }

  return {totalRecords: count}
}
```

**Results:**

- Server memory usage: Max 50MB (stream buffer only)
- 1GB CSV processing time: 45 seconds
- First record received: 200ms

## Detailed Comparison of Each Method

| Method             | Server Modification | Browser | Node.js | Memory | CPU    | Complexity | Error Recovery |
| ------------------ | ------------------- | ------- | ------- | ------ | ------ | ---------- | -------------- |
| JSON.parse()       | Not needed          | O       | O       | High   | Low    | Low        | Difficult      |
| NDJSON             | Required            | O       | O       | Low    | Low    | Medium     | Easy           |
| stream-json        | Not needed          | X       | O       | Low    | Medium | Medium     | Medium         |
| @streamparser/json | Not needed          | O       | O       | Low    | Medium | Medium     | Medium         |
| Oboe.js            | Not needed          | O       | O       | Medium | High   | Low        | Medium         |
| Web Worker         | Not needed          | O       | X       | High   | Low    | Medium     | Difficult      |

### Memory Usage Comparison

Approximate memory usage comparison (based on 10MB JSON array):

- **JSON.parse()**: ~30MB (original + parsed result + intermediate buffer)
- **NDJSON**: ~1MB (only currently processing line retained)
- **Streaming parser**: ~2-5MB (parser state + currently processing node)

### Processing Speed Comparison

Processing speed varies by situation.

- **Small JSON (< 1MB)**: JSON.parse() is fastest
- **Medium size (1-10MB)**: Depends on network speed
- **Large (> 10MB)**: Streaming methods advantageous for TTFB (Time To First Byte)

Based on time until first item appears on screen:

- **JSON.parse()**: Full response time + parsing time
- **NDJSON**: First line arrival time + parsing time (~milliseconds)

## Practical Selection Guide

### When You Can Modify the Server

NDJSON is strongly recommended.

1. Simple implementation
2. Easy error recovery since each line is complete JSON
3. Already received data is usable even if connection drops
4. Simple client implementation
5. Natural progress indication

### When You Must Use Existing JSON APIs

Choose based on environment.

**Node.js server/scripts:**

- `stream-json` is most mature and stable
- Provides various utilities (filters, batching, etc.)
- Essential for processing large files in memory-constrained environments

**Browser:**

- Use `@streamparser/json`
- Small bundle size with no dependencies
- Integrates with WHATWG Streams

### When You Only Need to Avoid UI Blocking

Consider Web Workers.

- When UI responsiveness is more important than memory savings
- When you want minimal changes to existing code
- When you want to avoid streaming parser complexity

### First Consider If It's Really Necessary

**For JSON under 10MB**, streaming might not be necessary. `JSON.parse()` is faster and the code is simpler.

Before adding complexity, first consider:

1. **Pagination**: Do you need all data at once?
2. **Filtering**: Can the server send only necessary data?
3. **Field selection**: Can you request only needed fields like GraphQL?
4. **Caching**: Do you need to request the same data repeatedly?
5. **Compression**: Are you using gzip/brotli compression?

Honestly, for most web applications, improving API design is the fundamental solution. Consider streaming only when you really need to process large volumes of data all at once.

## Caveats and Pitfalls

### CPU Overhead of Streaming Parsers

Pure JavaScript parsers are slower than native `JSON.parse()`. V8's `JSON.parse()` is implemented in C++ and highly optimized.

Actual benchmark results show `stream-json` was **about 12x slower** than `JSON.parse()`. However, this overhead is often negligible compared to network latency.

### Error Handling Complexity

When errors occur mid-streaming, rolling back already processed data is difficult.

```javascript
// Example: Error occurs after processing 50 out of 100 items
oboe('/api/data')
  .node('items[*]', (item) => {
    insertToDB(item) // 50 already inserted
  })
  .fail((error) => {
    // What to do with the 50 already inserted?
  })
```

When transactions are needed, streaming approaches might not be suitable. Or consider inserting into a temporary table first, then moving to the actual table after completion.

### Order Preservation Issues

Order can get mixed up during asynchronous processing.

```javascript
// Wrong example
oboe('/api/data').node('items[*]', async (item) => {
  await processAsync(item) // Order not guaranteed
})
```

If order matters, process synchronously or use a queue.

### Browser Compatibility

Streaming features of Fetch API aren't supported in all browsers. Particularly, `response.body` returning `ReadableStream` is not supported in IE.

Major browser support as of 2024:

- Chrome: 43+
- Firefox: 65+
- Safari: 10.1+
- Edge: 14+

If IE support is needed, consider polyfills or alternative approaches.

## Debugging and Troubleshooting

Let's explore common issues that occur in streaming JSON processing and their solutions.

### Problem 1: Korean Text Corruption

Korean characters are encoded as 3 bytes in UTF-8. When network chunks are split in the middle of a character, corrupted text is displayed.

```javascript
// Incorrect example
const decoder = new TextDecoder()
buffer += decoder.decode(value) // Missing stream option

// Correct example
buffer += decoder.decode(value, {stream: true})
```

Using the `stream: true` option makes the decoder keep incomplete multibyte characters in the buffer and process them together with the next chunk.

### Problem 2: Missing Last Line

If an NDJSON file doesn't end with a newline character, the last line remains in the buffer.

```javascript
// Incorrect example
while (true) {
  const {done, value} = await reader.read()
  if (done) break

  buffer += decoder.decode(value, {stream: true})
  const lines = buffer.split('\n')
  buffer = lines.pop()

  for (const line of lines) {
    onData(JSON.parse(line))
  }
}
// The last line remains in buffer after loop ends!

// Correct example
while (true) {
  // ... same
}

// Process buffer after loop ends
if (buffer.trim()) {
  onData(JSON.parse(buffer))
}
```

### Problem 3: Streaming Not Working

If the server buffers the response, streaming won't work on the client side.

**Things to check:**

1. **Nginx buffering**: Check `proxy_buffering off;` setting
2. **Express compression**: Check `threshold` value (small responses are buffered)
3. **Transfer-Encoding**: Check for `chunked` header

```javascript
// Express configuration for reliable streaming
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('X-Accel-Buffering', 'no') // For Nginx
  res.flushHeaders() // Send headers immediately

  // ... send data
})
```

### Problem 4: Memory Leaks

If resources aren't cleaned up when streaming is aborted, memory leaks occur.

```javascript
async function fetchWithCleanup(url, onData, signal) {
  const response = await fetch(url, {signal})
  const reader = response.body.getReader()

  try {
    while (true) {
      const {done, value} = await reader.read()
      if (done) break
      // ... process
    }
  } finally {
    // Always release reader
    reader.releaseLock()
  }
}
```

### Debugging Utilities

A debug wrapper to monitor streaming status:

```javascript
function createDebugStream(url, onData) {
  const startTime = performance.now()
  let chunkCount = 0
  let totalBytes = 0
  let itemCount = 0

  return fetchNDJSON(
    url,
    (item) => {
      itemCount++

      if (itemCount % 1000 === 0) {
        const elapsed = performance.now() - startTime
        console.log(`[Stream Debug]
        Elapsed time: ${(elapsed / 1000).toFixed(2)}s
        Chunks received: ${chunkCount}
        Items processed: ${itemCount}
        Processing speed: ${((itemCount / elapsed) * 1000).toFixed(0)} items/sec
      `)
      }

      onData(item)
    },
    {
      onProgress: (progress) => {
        chunkCount++
        totalBytes = progress.receivedBytes
      },
    },
  )
}
```

## Conclusion

Processing large JSON data requires cooperation between both frontend and backend. When the server provides streaming-friendly formats like NDJSON, client implementation becomes much simpler.

However, there are many situations where you can't modify existing APIs. In such cases, streaming parsers are helpful. Libraries like `stream-json` and `@streamparser/json` are mature enough and battle-tested in production.

### Decision Flowchart

If you're unsure which approach to choose, refer to this flowchart:

```
Is the data size less than 10MB?
├─ Yes → JSON.parse() is sufficient
└─ No → Can you modify the server API?
         ├─ Yes → Use NDJSON (most recommended)
         └─ No → What's the execution environment?
                  ├─ Node.js → stream-json
                  ├─ Browser → @streamparser/json
                  └─ Only need to solve UI blocking → Web Worker
```

### Key Takeaways

1. **Use NDJSON when possible.** It's the simplest and most effective approach.
2. **If you must use existing APIs, choose a streaming parser that fits your environment.**
3. **If UI responsiveness is the only issue, consider Web Workers as well.**
4. **Most importantly, first consider if it's really necessary.** In most cases, improving API design is the better choice.

## References

- [Faster Page Loads: How to Use NDJSON to Stream API Responses](https://www.bitovi.com/blog/faster-page-loads-how-to-use-ndjson-to-stream-api-responses)
- [Streaming Data with Fetch() and NDJSON](https://davidwalsh.name/streaming-data-fetch-ndjson)
- [stream-json - GitHub](https://github.com/uhop/stream-json)
- [@streamparser/json - npm](https://www.npmjs.com/package/@streamparser/json)
- [Why Oboe.js?](https://oboejs.com/why)
- [JSON streaming - Wikipedia](https://en.wikipedia.org/wiki/JSON_streaming)
- [can-ndjson-stream - npm](https://www.npmjs.com/package/can-ndjson-stream)
