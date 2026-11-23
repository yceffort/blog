---
title: 'The Path a Single Trade Takes to Reach the <em>Browser</em>'
tags:
  - networking
  - backend
  - browser
  - rust
published: true
date: 2026-11-23 13:14:00
series: 'Building a Stock Trade WebSocket Server'
seriesOrder: 2
description: 'The path a single trade takes from the server to the browser, what the trade frames you can receive without logging in tell you at the end of that path, and the processes, kernel, socket buffers, epoll, and shared memory along the way, compared to things frontend developers already know and backed by numbers I measured myself.'
art:
  undraw: server-cluster
---

The price on a stock screen changes every time a buy order and a sell order meet at the same price and a trade happens. At that moment the browser receives a WebSocket message of a little over 400 bytes once decompressed. In frontend code, you just read the `data` of the `MessageEvent` that the `onmessage` handler receives. But where that message was made and what it went through before being sent cannot be learned from frontend code alone.

In this second post of the [Building a Stock Trade WebSocket Server](/series/websocket-trade-server) series, I follow a single trade until it arrives at the browser. First I draw that path in one picture, and then at the end of the path I analyze the trade frames that the Toss Securities web screen receives without logging in. For the server internals that the frames cannot confirm, I explain using the server I imagined and built myself.[^1]

The path inside the server involves operating system concepts that frontend developers rarely handle directly, such as processes, the kernel, socket buffers, and shared memory. I compare these concepts to things familiar from frontend work and look at their costs alongside values I measured myself. What proxies, load balancers, and deployments do to WebSocket connections is covered in Part 5.

## Table of Contents

## The Path a Single Trade Takes

The server internals cannot be seen from the frames the browser receives, so I built the setup below with reference to a configuration commonly used in systems that handle trade data. The thick lines are the sections I observed through frames, and the dotted lines are the sections I imagined and built.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=path&lang=en" title="The path a single trade takes. The numbers match the order of the list below" height={721} />

A single trade moves in the following order.

1. The **feed process** receives a trade from the exchange and converts it to an internal format. My server has no exchange, so the feed generates fake trades.
2. The feed writes the trade to a **ring buffer in shared memory**. A ring buffer is a fixed-size buffer that wraps around to the start and overwrites old data once it reaches the end.
3. The **gateway process** is the process that accepts users' WebSocket connections. One thread of this process reads the ring.
4. The gateway looks up the connections subscribed to that stock in the **subscription index** and puts the trade into a **queue**, one per connection.
5. The **task** in charge of the connection takes the trade out of the queue, builds a `MESSAGE` frame, and calls `send`.
6. The **kernel** sends those bytes over TCP, and in the browser a SharedWorker, which several tabs share, receives them and hands them to the tabs.

**Feed and gateway** are names I gave to the two processes of the market data server built in this series. As summarized in [Part 1](/en/2026/11/websocket-trade-server-securities-basics#how-market-data-arrives), a brokerage receives market data from the exchange and sends it back out to apps and the web from its own servers. Data that keeps coming in without a break, every time a trade happens, is called a feed, and the first server an outside client reaches when entering a system is called a gateway (an API gateway is a familiar example). The two names come from those. As an analogy with Socket.IO, the Socket.IO server the browser connects to is the gateway, and the separate worker that receives data from outside and hands events to this server is the feed.

Splitting feed and gateway into two processes means that if one stops, the other can keep running. The connections the two processes handle are also different in nature. There is only one connection to the exchange, and if it drops, every user's screen freezes. User connections are many, and any individual connection can drop at any time.

User connections differ from a Node.js API server in one major way. A WebSocket connection is a **stateful connection**. An API server built with Express keeps user information in a database or Redis and reads what it needs on each request, so it can return the same result even if the next request goes to another server or the server restarts in between. Such a server is called a stateless server. A WebSocket connection lasts for hours, and during that time the server keeps in its own memory which stocks this connection subscribed to and what the next `message-id` is. When the process ends, this state disappears too, and a live connection cannot be moved to another server.

The code that handles user connections will be changed and deployed often, and I don't want to re-establish the connection to the exchange each time. Conversely, I want to avoid cutting the WebSockets of 10,000 users when I fix the feed and bring it back up. Splitting the processes also lets me scale out only the gateway when users increase. The actual configuration is covered in Part 5.

In this picture, the only section that can be seen directly from outside is the thick line, that is, the frames the browser receives. In the next section I look at those frames first, and then go inside the server drawn with dotted lines.

## What the Frames Tell You

If you open a stock page and filter the Network tab to WS, the list is empty. On this screen a SharedWorker opens the socket. A SharedWorker is a worker shared by several tabs of the same origin[^2], and in Chrome you have to open DevTools for the worker separately at `chrome://inspect/#workers` to see the network inside it. I captured it with a script that automatically attaches to the worker over CDP (Chrome DevTools Protocol, the protocol DevTools uses to talk to the browser) and records the handshake and frames.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=sw&lang=en" title="Several tabs share the WebSocket connection of a single SharedWorker" height={303} />

Even when I opened one more tab, there was still one WebSocket connection. The second tab's subscriptions were added on the same connection with the next subscription ids, and ids from 0 to 30 were never reused. 0.14 seconds after the second tab opened, 12 of the 13 subscriptions the first tab had been using were unsubscribed, and 0.14 seconds after I closed the second tab, the subscriptions for the first tab's stocks were created again. It seems the subscriptions of tabs that are not visible on screen are unsubscribed. From the server's point of view, the number of connections is the number of browsers, not tabs, and subscribing and unsubscribing are common events that happen just from the user switching tabs.

### Frames Inside Frames

The message DevTools shows on one line is wrapped in several layers. The outermost is the stream of bytes carried by TCP, and inside it is a WebSocket frame. A single WebSocket message can be split across several frames, and the browser passes the reassembled message's data to `onmessage`.[^3]

**STOMP** stands for Simple Text Oriented Messaging Protocol, a protocol that defines the commands and format of messages a client and server exchange. You can send text or binary data over a WebSocket, but whether that data is a subscription request or a new trade has to be decided by the application. The service I examine in this post uses STOMP for that agreement.

For example, the client sends a `SUBSCRIBE` command with the path of the stock to subscribe to, and when a new trade happens the server sends the trade data with a `MESSAGE` command. One message that bundles a command and data in this defined format is called a STOMP frame. This service builds the trade data as JSON and puts it in the body of a `MESSAGE` frame. STOMP is not required for WebSockets, and an application may define its own message format.

The picture below shows the wrapping layers when one message fits in one WebSocket frame.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=frame&lang=en" title="The wrapping layers when one message fits in one WebSocket frame" height={435} />

A WebSocket connection starts with a single HTTP request. Picking out only the headers that determine the connection's nature from the captured request and response gives the following.

```text
GET /ws HTTP/1.1
Host: realtime-socket.tossinvest.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Version: 13
Sec-WebSocket-Protocol: v12.stomp, v11.stomp, v10.stomp
Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits

HTTP/1.1 101 Switching Protocols
upgrade: websocket
connection: upgrade
sec-websocket-protocol: v12.stomp
sec-websocket-extensions: permessage-deflate
```

`Sec-WebSocket-Protocol` is the header that agrees on which protocol to use when exchanging messages over the WebSocket. Here the client proposed three versions of STOMP and the server chose 1.2.

The header of a WebSocket frame itself is small. The default is 2 bytes, and if the payload is between 126 and 65,535 bytes, the length takes 2 more bytes.[^4] If an uncompressed 403 bytes is sent as is, the header is 4 bytes, and if compression shrinks it below 126 bytes, the header is 2 bytes. Frames the client sends carry an additional 4-byte masking key. This is because the specification tells clients to mask every frame and tells servers not to mask any,[^5] and in the capture too, every frame sent was masked and every frame received was not.

`permessage-deflate` in `Sec-WebSocket-Extensions` is an agreement to compress messages when sending them. The frames CDP hands over contain only the text after decompression, so I recorded the sizes that actually went over the wire separately with Chrome's NetLog. NetLog keeps the frame header from before decompression, and that header contains the bit indicating whether the frame was compressed (RSV1) and the payload length.[^6] When I captured the same page again for 25 seconds during trading hours on November 23, all 1,529 frames the server sent arrived compressed. The median size of the 1,509 `MESSAGE` frames was 405 bytes decompressed and 48 bytes of payload actually received. All frame sizes quoted in this post are byte counts of the decompressed STOMP text.

It shrinks this much because earlier messages are reused as a dictionary. Trade frames have the same key names and stock code every time, so if I compress the same frames with the dictionary cleared for each message, the median only drops to 292 bytes. The server's response has no marker saying not to carry the dictionary over (`server_no_context_takeover`), so carrying it over is allowed,[^7] and in practice it was being carried over. When I compressed the received frames in order with zlib compression level 1 (the fastest setting), carrying the dictionary over, all 1,526 matched the sizes recorded in NetLog.[^8] Carrying the dictionary over means keeping compression state in memory for each connection. I measure this memory cost in Part 4.

### From Subscription to Trade

STOMP over a WebSocket is a text protocol where one frame is made of a command line, several `key:value` header lines, a blank line, a body, and a NUL character (written as `^@` below).[^9] In this capture, all 712 WebSocket messages exchanged (excluding heartbeats) each contained exactly one STOMP frame. After the connection opens, the conversation proceeds in the following order.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=stomp&lang=en" title="The order in which STOMP frames are exchanged after the connection opens" height={639} />

The first frame is `CONNECT`. I removed the values used for authentication and device identification.

```text
CONNECT
device-id:<removed>
connection-id:00000000-0000-4000-8000-000000000000
authorization:<removed>
platform:Web/wts
accept-version:1.2,1.1,1.0
heart-beat:5000,5000

^@
```

```text
CONNECTED
version:1.2
heart-beat:5000,5000

^@
```

`connection-id` is a UUID the client generates and sends, and it shows up again later in the `MESSAGE` number. `heart-beat:5000,5000` means "I can send a signal every 5 seconds that I'm alive, and I'd like the other side to send one every 5 seconds too." The server answered with the same value, and in practice the client and server each sent a single newline character every 5 seconds. A connection that subscribed only to stocks with no trades may see nothing exchanged for several minutes, and without this signal you cannot tell whether the connection is quiet or broken.

The frame requesting a subscription and its response look like the following. The client attaches an `id` to each subscription itself and asks for confirmation of processing with the `receipt` header.

```text
SUBSCRIBE
id:0
receipt:0-sub_receipt
destination:/topic/v1/kr/stock/trade/A005930

^@
```

```text
RECEIPT
receipt-id:0-sub_receipt
message:subscribe success
response-code:200

^@
```

After that, a `MESSAGE` arrives every time a trade happens. The frame below keeps the order of headers and keys and the data types of values exactly as captured, but the values are changed arbitrarily.

```text
MESSAGE
message-id:00000000-0000-4000-8000-000000000000-42
subscription:0
content-length:273
content-type:application/json

{"code":"A005930","dt":"2026-11-19T04:55:12Z","currency":"KRW","exchange":"krx","session":"REGULAR","base":70000,"close":70300,"volume":12,"tradeType":"BUY","changeType":"UP","tradingStrength":104.2857142857142857,"cumulativeVolume":8123456,"cumulativeAmount":571234567800}^@
```

Which rule each of the 13 keys in the body comes from was covered in [Part 1](/en/2026/11/websocket-trade-server-securities-basics). In summary:

| Key                                    | Example value                 | Meaning                                                                                                                                    |
| -------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `code`                                 | `"A005930"`                   | Stock code (short code)                                                                                                                    |
| `dt`                                   | `"2026-11-19T04:55:12Z"`      | Trade time. It is UTC and has only second precision                                                                                        |
| `currency`, `exchange`, `session`      | `"KRW"`, `"krx"`, `"REGULAR"` | Currency, the exchange where the trade happened (Korea Exchange or Nextrade), and the trading hours segment                                |
| `base`, `close`                        | `70000`, `70300`              | Reference price (usually the previous day's closing price) and the price of this trade                                                     |
| `volume`                               | `12`                          | The quantity of this trade                                                                                                                 |
| `tradeType`, `changeType`              | `"BUY"`, `"UP"`               | Whether it was a buy trade or a sell trade, and whether the price is above or below the reference price (`UPPER_LIMIT` at the upper limit) |
| `tradingStrength`                      | `104.2857142857142857`        | Trading strength (an indicator shown in brokerages' trading software, HTS). It arrived with up to 19 significant digits                    |
| `cumulativeVolume`, `cumulativeAmount` | `8123456`, `571234567800`     | The cumulative trading volume and cumulative trading value of that stock for the day                                                       |

The value to watch on the frontend is `tradingStrength`. A JavaScript number can hold only about 17 significant digits, so reading the value above with `JSON.parse` gives `104.28571428571429`. Of the 686 frames captured, 640 changed their digits after going through `JSON.parse`.

I also checked whether this value is the result of a calculation in double (the JavaScript number format) printed out at length. Of the 571 values in the capture with 18 or more significant digits, 568 differed from the nearest double printed to the same number of digits.[^10] The frames alone cannot tell where it was computed at this precision, but it is clear that ordinary `JSON.parse` and `Number` cannot preserve the digits received. How I kept these digits in my server is explained in Part 3.

### What the Frames Say About the Server's State

I summarized what I observed in the 686 `MESSAGE` frames received over 23.8 seconds with 12 subscriptions. The last column lists the implementation I chose to reproduce the same behavior. There are many ways to produce the same frames, so there is no basis for saying the real server was built this way.

| What I observed                                                                     | Evidence                                                                                                               | The implementation I chose to reproduce this observation                                                                                                  |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `message-id` is `connection-id` followed by a number that grows from 1 with no gaps | 686 frames ran from 1 to 686                                                                                           | Keep one counter per connection, and assign numbers in only one place, the task that writes frames to that connection                                     |
| `MESSAGE` has no `destination`, only `subscription`                                 | Every frame's headers are just the four above                                                                          | Store, per connection, which stock each subscription id points to                                                                                         |
| Subscribing to the same stock twice delivers the same trade twice                   | ids 0 and 11 were the same stock, and 207 trades arrived as two frames with consecutive numbers                        | Build the subscriber list per subscription, not per stock                                                                                                 |
| Every field arrives with every trade                                                | Domestic stocks always had 13 keys and U.S. stocks 15, in the same order each time. The median frame size is 403 bytes | The feed computes cumulative volume and cumulative trading value per stock and puts them in the trade, and the gateway passes the received values through |
| In this capture, no current value arrived right after subscribing                   | From the subscription request to the first `MESSAGE` took 0.16 to 10.8 seconds, and 3 subscriptions received none      | Send nothing right after subscribing and wait for the next trade                                                                                          |

The number in the first row of the table represents the order of messages sent on this connection. If the server guarantees gapless numbering, a missing number in the middle lets you notice that a message was lost after the number was assigned. But trades lost before numbering, or trades missed while reconnecting, cannot be detected. In my server too, if the gateway falls behind on the ring and skips trades, the send task numbers the remaining messages consecutively.[^11][^12]

The STOMP specification also requires only that `message-id` be unique, not that it increase consecutively.[^13] So this number should be read as the order of messages within the connection observed in this capture. It cannot be used as a number to verify trade loss. Since trade time has only second precision, multiple trades within the same second can be distinguished only by the order received, but whether that order matches the exchange's trade order also cannot be known from the frames alone.

In this capture, there was no frame that sent the current price right after subscribing. So the first price shown on screen must come through another path. The trade frames that arrive afterward contain every value needed to draw the screen, so the client needs only the latest frame. It does not have to remember earlier frames and merge them.

The missing `destination` header differs from the specification. STOMP 1.2 states that a `MESSAGE` frame must include this header.[^13] Had the header been there, `destination:/topic/v1/kr/stock/trade/A005930` with its newline would add 45 bytes to every frame. That is 11% of the 403-byte uncompressed frame. However, as seen earlier, the server compresses with the dictionary carried over, so this header, being identical every time, barely increases the transfer size. When I added this header to the 1,509 `MESSAGE` frames of the November 23 capture and compressed them with the same settings as the server, the median size stayed at 48 bytes and the total grew by 1.6%.[^14] It is hard to say it was removed to reduce transfer size, and the reason it was removed cannot be known from the frames alone.

The subscription confirmation (`RECEIPT`) always came before that subscription's first `MESSAGE`, and after the unsubscribe confirmation arrived, not a single `MESSAGE` for that subscription came. If changing the subscriber list and sending frames happen on different threads, the order of the two operations has to be coordinated to keep this behavior. How I coordinated this order in my server is explained in Part 3.

## Operating System Concepts Inside the Server

From here on is the dotted part of the picture, the server internals. The trade the feed wrote is delivered to the gateway through shared memory. In the gateway, a few threads share 10,000 connections, and the trade to send to each connection is handed to the kernel with a system call and put into a socket buffer. Before measuring the cost of this process, I go over four operating system concepts that keep appearing in this post and the next two, comparing them to things familiar from the frontend. If you already know them, feel free to skip to the next section.

A **process** is one running program. Each process has its own memory space and can neither read nor write another process's memory. When one tab freezes in Chrome and the other tabs are fine, it is because Chrome launches separate processes per site.

A **thread** is a flow that executes code inside a process. One process can have several threads, and with several cores they actually run at the same time. On the frontend, thinking of a Web Worker makes it easy to understand. But there is a difference in how workers pass values to each other. If you send a plain object with `postMessage`, a copy is delivered. An `ArrayBuffer` can have its ownership transferred instead of being copied, and on a page with cross-origin isolation you can even share memory with a `SharedArrayBuffer`, but unless specified otherwise it is a copy.[^15] Threads in an operating system share the process's memory by default. Two threads can modify the same variable at the same time, so unlike when JavaScript runs only on the main thread, you have to care about the order of access.

The **kernel** is the program at the center of the operating system, and it hands out CPU time, memory, and hardware such as network cards to processes. It also decides which thread runs on which core.

A **system call** is a request a process makes to the kernel. A process cannot touch the network card or disk directly, so to send data or open a file it has to ask the kernel. In code it looks like a function call, but it is more expensive because the CPU has to move from the state of running the process's code (user mode) to the state of running the kernel's code (kernel mode) and come back. It is similar to how calling a DOM API in JavaScript is slower than a pure function call because it has to leave the engine and return. The `send`, `recv`, and `mmap` in this post are all system calls.

Drawing these four concepts in one picture gives the following.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=os&lang=en" title="Two processes and the kernel. Processes cannot see each other's memory, and when they need hardware they ask the kernel with a system call" height={574} />

## The Cost of One System Call

A **socket** is one end of a network connection. When you run `new WebSocket(url)` in the browser, a TCP connection to the server is created, and one socket pointing to that connection is created in the server process. A process handles a socket as an integer called a **file descriptor** (fd). An fd is a number indicating which entry it is in the list of files and sockets that the process has open, and the list itself is managed by the kernel.

First I attached 1,000 connections to the gateway and counted threads and sockets with the operating system's tools.

| What I counted | Value | How I counted                              |
| -------------- | ----- | ------------------------------------------ |
| Threads        | 12    | `ps -M -p <pid>`                           |
| Open sockets   | 1,001 | Entries of type IPv4 in `lsof -a -p <pid>` |

With 1,000 connections there are only 12 threads. They are 10 worker threads created to match the 10 cores, 1 thread that reads the ring, and 1 thread that started the program. How a small number of threads handles many connections is covered later.

The 1,001 sockets are 1,000 connections plus 1 socket waiting for new connections. One socket is one fd, so to accept many connections you first have to raise the limit on the number of fds a process can open (`ulimit -n`). The same list also had 3 fds of a kind called kqueue. These are also used to wait on many connections, and I explain them together later.

When a process sends out a frame, it uses the `send` system call. Calling it once goes through the following process.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=send&lang=en" title="What happens when the send system call is made once" height={417} />

I measured myself how much more expensive a system call is than a function call. Within the same program, I repeated four tasks millions of times each and divided the time for the whole repetition by the count to get the average for one.[^16]

| What one iteration does                                     | Mac     | Linux |
| ----------------------------------------------------------- | ------- | ----- |
| Function call                                               | 1.7ns   | 1.6ns |
| Light system call (`fstat`, reading info of an open file)   | 240ns   | 202ns |
| Writing a trade record (63 bytes) to the shared-memory ring | 30ns    | 37ns  |
| `send` of a frame (370 bytes) on a TCP socket               | 1,915ns | 381ns |

Even a light system call that only visits the kernel is more than 100 times more expensive than a function call. `send` took longer because after entering the kernel it also has to copy the frame and do TCP processing. On the same machine, `send` was 5 times slower on the Mac than on Linux, but the fact that it is more than 200 times more expensive than a function call on either operating system is the same.

I also put the cost of writing to the shared-memory ring in the table, but this value cannot be compared directly with `send`. The ring measurement is only the cost of writing, with no process reading. The cost of reading and the time spent waiting are missing, and the data size also differs from the frame used for `send`.

As connections increase, this cost adds up. If 10,000 connections are subscribed to the same stock, a single trade has to be written to 10,000 sockets individually. My gateway requests a write for every frame,[^17] so one trade produces 10,000 write requests. How many `send` calls one request actually makes depends on the state of the send buffer and how writes are batched.

If I assume one request is one `send` and multiply the average time of consecutive writes to one socket by 10,000, it comes to 19ms on the Mac and close to 4ms on Linux. Sending out a single trade takes milliseconds, proportional to the number of connections. However, this value was not measured under the condition of writing across 10,000 sockets, and it is not a measurement of CPU working time alone, so I use it only to get a sense of scale.

The actual latency I measured on Linux in Part 4 pointed the same way. With 10,000 connections, half of the frames reached the client within 13.4ms of the trade being recorded, and with 100 connections they arrived within 0.2ms. How much of this latency `send` accounts for cannot be found from the multiplication above, and I measure it separately in Part 4.

## Sockets and Buffers

A **buffer** is memory where data stays briefly before moving to the next stage. The kernel keeps, for each socket, a send buffer that holds data to be sent and a receive buffer that holds data received. `send` is a call that copies the bytes to send into the send buffer, and if it succeeds, the kernel has accepted as many bytes as the return value.

The kernel transmits the bytes put into the send buffer by `send` according to TCP's rules. Transmission does not necessarily begin after `send` returns. Linux tries to transmit after copying into the send buffer and before `send` returns. If the other side cannot receive more, it postpones transmission according to TCP's rules.[^18] Either way, the fact that `send` returned alone does not mean the other side's application received the data.

On the receiving machine too, the kernel first accumulates data in the receive buffer, and the application takes it with `recv`. A single frame moves from the server process's memory to the server kernel's send buffer, across the network to the receive buffer of the user machine's kernel, and then to the browser's memory.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=buf&lang=en" title="The path one frame takes through the buffers of two machines" height={357} />

TCP does three things in between. It makes bytes arrive in the order they were sent, resends what was lost along the way, and sends only as much as the receiving machine can handle. The third is the dotted line in the picture above. The receiving kernel keeps reporting the remaining space in its receive buffer in its responses, and the sending kernel does not send beyond that space.

### Sending to a Peer That Does Not Read

If the receiving application does not call `recv`, the receive buffer fills up. When the sending kernel learns that the remaining space is 0 and stops transmitting, the send buffer fills up in turn. Then `send` either blocks until space frees up, or, on a socket set not to wait, immediately returns an error saying there is nowhere more to put data.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=bp&lang=en" title="What happens when you keep calling send to a peer that does not read" height={409} />

This phenomenon, where a receiver that cannot read ends up stopping even the sending process, is called backpressure. You can confirm it with Node.js too. The script below keeps sending 403-byte frames to a peer that reads not a single byte, and counts how many frames the kernel accepted.

```js
import net from 'node:net'

const frame = Buffer.alloc(403, 'x')
// 받는 프로그램: 연결은 받지만 한 바이트도 읽지 않는다
const server = net.createServer({pauseOnConnect: true}, () => {})

server.listen(0, '127.0.0.1', () => {
  const client = net.connect(server.address().port, '127.0.0.1')
  let accepted = 0
  let last = Date.now()
  // write의 콜백은 그 데이터가 커널의 송신 버퍼로 넘어갔을 때 불린다
  const send = () =>
    client.write(frame, () => {
      accepted++
      last = Date.now()
      send()
    })
  client.on('connect', send)

  setInterval(() => {
    if (Date.now() - last < 1000) return
    console.log(
      `프레임 ${accepted}개(${accepted * frame.length}바이트)까지 받고 멈췄다`,
    )
    process.exit(0)
  }, 100)
})
```

```text
프레임 1365개(550095바이트)까지 받고 멈췄다
```

I ran this three times on the Mac I wrote this post on, and all three times it was 1,365. The send buffer and receive buffer together accepted 550,000 bytes and then accepted no more. The default size of each of the two buffers is 131,072 bytes (`sysctl net.inet.tcp.sendspace`, `net.inet.tcp.recvspace`), but the kernel is set up so it can grow them as needed up to 4,194,304 bytes (`net.inet.tcp.autosndbufmax`), so more went in than the sum of the defaults.

In the browser, you can see how backed up sending is with `WebSocket.bufferedAmount`. It is the number of bytes put in with `send()` that have not yet gone out to the network.[^19] In the script above, if you keep calling `write` while the kernel cannot accept more, Node.js piles the data up in its own memory. In the browser too, data that could not be sent yet piles up, and that amount shows in `bufferedAmount`.

With 10,000 connections, you have to decide how to handle it when some of them slow down. You can keep piling the data for that connection up in memory, drop it, or cut the connection. In my server, which sends frames without compression, for a stock with 15 trades per second, 1,365 frames is 91 seconds' worth. You have to decide whether to keep trades beyond that for a client that has not read for 91 seconds. The method I chose is explained in Part 3, and the results of deliberately mixing in clients that do not read are covered in Part 4.

### Small Frames and the Nagle Algorithm

TCP has the Nagle algorithm on by default, which holds small data and sends it after gathering. It is a mechanism meant to reduce the number of packets when `send` calls of a few bytes arrive back to back, like keyboard input. Trade frames are small, around 400 bytes, and each one needs to arrive quickly, so gathering them like this can add latency. If you turn on the `TCP_NODELAY` option on a socket, the Nagle algorithm is turned off, and even small amounts of data are sent right away as far as possible.[^20] The gateway turns this option on as soon as it accepts a connection. The code for that appears in the next section.

## How to Wait on 10,000 Connections

`recv` by default does not return until there is something to read. The thread is stopped in the meantime. So the simplest server creates one thread per connection and has each wait in `recv`.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=thr&lang=en" title="A server with one thread per connection" height={267} />

With a few hundred connections this approach is enough. At 10,000 you need 10,000 threads, each thread needs its own memory reserved for its stack (the default in the Rust standard library is 2MiB[^21]), and there is also the cost of the kernel switching between threads. On top of that, most connections of a trade data server have nothing to receive from the client for most of the time. 10,000 threads would be asleep almost all the time. Handling 10,000 concurrent connections on one server has been called the "C10K problem" since 1999.[^22]

Instead of adding threads, you can have the kernel tell you which sockets can be read or written. You switch the socket to a mode that returns immediately when there is nothing to read (non-blocking) and register the fds to watch with the kernel. Linux's epoll[^23] and macOS's kqueue return a list of the registered fds that have become readable or writable. One thread takes this list and handles the entries in turn, and sleeps inside the kernel only when there is nothing to handle. The 3 kqueues that showed up when I counted the gateway's fds earlier are used for this purpose.

This structure is the event loop. Node.js can handle tens of thousands of connections with a single thread because libuv wraps epoll and kqueue and runs this loop,[^24] and in that it takes work out of a queue and runs it and waits when the queue is empty, it has the same structure as the browser's event loop.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=ep&lang=en" title="The kernel reports which sockets are ready, and a small number of worker threads run tasks" height={399} />

The gateway I built uses tokio, Rust's async runtime. The code that accepts a new connection is all of the following.[^25]

```rust
tokio::spawn(async move {
    let mut conn = 0;
    loop {
        match listener.accept().await {
            Ok((stream, _)) => {
                conn += 1;
                // 작은 프레임을 하나씩 flush하므로 Nagle이 켜져 있으면 상대의 지연 ACK를 기다린다. 실패해도 지연만 늘어난다.
                let _ = stream.set_nodelay(true);
                let (heartbeat_ms, queue_capacity) = (config.heartbeat_ms, config.queue_capacity);
                tokio::spawn(connection::serve(stream, accept_hub.clone(), heartbeat_ms, queue_capacity, conn));
            }
            Err(error) => {
                eprintln!("accept 실패: {error}");
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            }
        }
    }
});
```

`listener.accept().await` suspends this function until a new connection arrives, and in the meantime the thread does other work. `tokio::spawn` is a call that hands an `async` function to the runtime to run separately, and one such handed-off execution is called a **task**. It is the same as a JavaScript `async` function in that it pauses at `await` and resumes when ready. The gateway creates one task per connection.

What differs from JavaScript is that several threads run the loop. By default tokio launches as many worker threads as there are CPU cores, and an idle worker takes work from a busy worker and runs it.[^26]

|                                    | JavaScript on the browser main thread | tokio in the gateway             |
| ---------------------------------- | ------------------------------------- | -------------------------------- |
| Where it waits for events          | Inside the browser                    | The kernel's epoll, kqueue       |
| Threads running the loop           | 1 main thread                         | As many as cores. 10 on this Mac |
| Unit of work                       | Callback, `async` function            | Task                             |
| Do two tasks run at the same time? | No                                    | Yes                              |
| Need a guard for shared data?      | No                                    | Yes                              |

Even with 10,000 connections the number of threads equals the number of cores, and the memory one task uses is much smaller than a thread's stack. By the value I measured in Part 4, it was 13KB per connection.

With several workers you can use several cores, but two tasks may run at the same time on different workers. So you must not let any task modify shared data such as the subscriber list. That is why in Part 3 I made the subscription index modifiable by only one task.

If a task does long-running work without `await`, that worker cannot run other tasks. It is the same as a long synchronous job blocking the main thread in JavaScript. In Part 4, I confirm with measurement results a situation where all 10 workers were stuck inside the `send` system call.

## Sharing Memory Between Processes

**Virtual memory** is the mechanism that gives each process its own address space. The memory addresses a process uses are not actual memory addresses, and which place in actual memory an address corresponds to is managed by the kernel in a table, in fixed-size pieces called **pages**. Each process has a different table, so they cannot see each other's memory, but if the same page is linked into the tables of two processes, only that part can be seen by both. This is shared memory, and on the frontend `SharedArrayBuffer` is the closest thing.

The feed and gateway exchange trades by connecting the same file as shared memory. The system call that asks the kernel to connect a file into a process's address space is `mmap`. When two processes `mmap` the same file in shared mode, the same actual pages are linked into both processes' tables. This is why what one process writes can be seen by the other.[^27] The connection is made in units of pages, and on the Mac I wrote this post on, one page is 16,384 bytes (`getconf PAGESIZE`).

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=mm&lang=en" title="Two processes mmap the same file and see the same page" height={376} />

The feed connects the same file as readable and writable, and the gateway as read-only.[^28]

```rust
pub fn map(file: &File) -> io::Result<Region> {
    Ok(Region::File(MmapRaw::map_raw(file)?))
}

pub fn map_read_only(file: &File) -> io::Result<Region> {
    Ok(Region::File(MmapOptions::new().map_raw_read_only(file)?))
}
```

Values written to shared memory can also be confirmed by reading the file. With the feed running, I read the first 32 bytes of the ring file twice, 2 seconds apart.

```text
$ wc -c < ws-trade-feed.ring
 1048640

$ xxd -l 32 ws-trade-feed.ring
00000000: 5753 5249 4e47 3031 0000 1000 0000 0000  WSRING01........
00000010: 2807 0000 0000 0000 2807 0000 0000 0000  (.......(.......

$ xxd -l 32 ws-trade-feed.ring
00000000: 5753 5249 4e47 3031 0000 1000 0000 0000  WSRING01........
00000010: b80f 0000 0000 0000 b80f 0000 0000 0000  ................
```

The first line is the marker that this file is a ring (`WSRING01`) and the size of the data area (1,048,576 bytes), and it does not change. The two numbers on the second line are positions showing how far the feed has written, and they grew from 1,832 to 4,024 in 2 seconds. When the feed writes a trade, it does not call a system call that writes to the file. It writes the header to the file only when creating a new ring file, and trades are stored as values in the mapped memory.[^29] It only wrote a value into its own memory, but that memory is the same page as this file, so the changed value is visible to tools that read the file too. What the gateway sees is the same page as well.

### Copying and Sharing

When you send a plain object to a worker with `postMessage`, the sending thread serializes the value and the receiving thread makes a copy from it. When processes exchange data over a socket, copying is also needed, and it goes through system calls and kernel buffers.

With `SharedArrayBuffer`, two threads can see the same memory without copying. Sharing memory between processes with `mmap` is similar. Once connected, afterward data is exchanged by writing and reading memory without system calls.

Replacing the socket with shared memory can reduce the send and receive system calls. Every trade passes between the feed and the gateway. With a socket, the sending process has to call `send` and the receiving process has to call `recv`, but with shared memory these calls are unnecessary.

How many calls can be saved depends on how work is batched. TCP is a stream of bytes carried in order, so one trade does not correspond to one call.[^30] Several trades can be sent in one `send` or read in one `recv`, and one trade can be read in two parts. In the earlier measurement too, the reading thread read as much as it could at once with a 64KiB buffer.[^16]

In the earlier table, the cost of writing to the ring was 30ns. But since it was measured only as the cost of writing with no process reading, it cannot be taken as the time it takes to deliver a trade. When the ring is empty, the real gateway sleeps for 200us (the default) and checks again.[^11] So the latency until a trade reaches the gateway depends on the polling interval more than on the write cost. How latency changes with the polling interval is measured in Part 4.

### A Half-Written Value

When memory is shared, the order of reads and writes also has to be coordinated. If another thread reads while one thread is in the middle of writing a value, it can see a half-written value. This is the same reason you coordinate the order of access with `Atomics` when using `SharedArrayBuffer`. The kernel only links the pages, and does not get involved in who reads and writes what and when on top of them. If a record is written to the ring in the order "length, content", the following can happen.

<LiveDemo src="/demos/websocket-trade-server-path-and-os-basics/index.html?view=torn&lang=en" title="The order in which the gateway reads a half-written record when length and content are written separately" height={393} />

The gateway read 63 bytes without any error, but it was a value mixing the new trade and the previous trade. When exchanging over a socket, the kernel preserves the order of the bytes sent. In shared memory, the two processes have to agree on rules and follow them so that the gateway does not read before the feed has finished writing the trade. In Part 3 I explain the process of settling on this rule. My first implementation had five mistakes.

## The Boundaries One Frame Crossed

The trade contained in the `MESSAGE` frame at the start is passed from the feed to the gateway, from the gateway to the kernel, and from the server machine to the user's machine. Between the feed and the gateway, shared memory is used, so there is no need to call a system call for each trade. But since the gateway checks for new trades at each polling interval, there is waiting time. When sending from the gateway to the kernel, a write has to be requested separately for each connection subscribed to that stock. This count grows in proportion to the number of connections.

Most of the problems that came up while building and measuring the server were also at these boundaries. In shared memory, I got the order of reads and writes wrong (Part 3), and at the kernel boundary, calls that grow with the number of connections became latency (Part 4). These were things I could not see when I was only receiving frames.

[^1]: The server, capture tools, and measurement results are in [yceffort/ws-trade-server](https://github.com/yceffort/ws-trade-server). The code quoted in this post and the values measured by running the gateway are based on commit `05ae6632`. Since I added features to the repository after that, the latest code differs in shape from the quoted code, and the thread count counted the same way is also higher than the value in this post. I received the frames on November 19, 2026, with headless Chrome Beta 159 using a temporary profile that was not logged in. The authentication headers, device identifiers, and actual market values that were in the capture were not carried over to the repository or this post.

[^2]: [MDN, SharedWorker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker)

[^3]: [RFC 6455, 5.4. Fragmentation](https://www.rfc-editor.org/rfc/rfc6455#section-5.4) and [WHATWG WebSockets Standard, Feedback from the protocol](https://websockets.spec.whatwg.org/#feedback-from-the-protocol). The latter's original text begins "When a WebSocket message has been received with type type and data data, the user agent must queue a task to follow these steps", and in these steps it dispatches the `message` event as a `MessageEvent`.

[^4]: [RFC 6455, 5.2. Base Framing Protocol](https://www.rfc-editor.org/rfc/rfc6455#section-5.2)

[^5]: [RFC 6455, 5.1. Overview](https://www.rfc-editor.org/rfc/rfc6455#section-5.1). The original text is "a client MUST mask all frames that it sends to the server" and "A server MUST NOT mask any frames that it sends to the client".

[^6]: CDP's `WebSocketFrame` has only `opcode`, `mask`, and `payloadData` ([ChromeDevTools/devtools-protocol `62afb853` `pdl/domains/Network.pdl` L516-L525](https://github.com/ChromeDevTools/devtools-protocol/blob/62afb853b4629b6059542166e4eeb2975ce52f58/pdl/domains/Network.pdl#L516-L525)). NetLog records the header of a frame Chromium received, before decompression, as a `WEBSOCKET_RECV_FRAME_HEADER` event ([chromium/chromium `6011ccf8` `net/websockets/websocket_basic_stream.cc` L380-L383](https://github.com/chromium/chromium/blob/6011ccf8866a1c703e3b15d4e5cc0a109163134f/net/websockets/websocket_basic_stream.cc#L380-L383)), and the event includes `reserved1` and `payload_length` (same file [L119-L128](https://github.com/chromium/chromium/blob/6011ccf8866a1c703e3b15d4e5cc0a109163134f/net/websockets/websocket_basic_stream.cc#L119-L128)). I did the capture at 12:09 KST on November 23, 2026, with headless Chrome Beta 159.0.8154.13 launched by the CDP capture script, with `--log-net-log` added.

[^7]: [RFC 7692, 7.1.1.1. Server No Context Takeover](https://www.rfc-editor.org/rfc/rfc7692#section-7.1.1.1). The calculation with the dictionary cleared is raw deflate with zlib using a new compressor for each `MESSAGE`, and the size is what remains after removing the last 4 bytes as RFC 7692 specifies.

[^8]: I paired the 1,529 received-frame headers in NetLog with the 1,526 `webSocketFrameReceived` events in CDP, in order. The timestamp difference between entries with the same sequence number was within 1ms, and the 3 present only in NetLog are frames that arrived within 26ms after the CDP recording ended. Not only `MESSAGE` but also `CONNECTED`, `RECEIPT`, and heartbeats were fed in the order received into Python `zlib` (system zlib 1.2.12) raw deflate (window 2^15), each message was cut with `Z_SYNC_FLUSH`, and I compared the sizes after removing the last 4 bytes. At compression levels 2-9, at most 263 frames had the same size, and when the window was reduced to 2^12 or below, at most 125 did. This is a comparison of sizes, not bytes. The zlib bundled with Node 24 produces different compression results for the same input, so I compared with Python. The comparison script is [yceffort/ws-trade-server `14c7d84` `capture/compression-check.py`](https://github.com/yceffort/ws-trade-server/blob/14c7d84fedceceeab3e45e2ebfeb158015d6a40c/capture/compression-check.py).

[^9]: [STOMP Protocol Specification, Version 1.2, STOMP Frames](https://stomp.github.io/stomp-specification-1.2.html#STOMP_Frames)

[^10]: A long digit string alone does not mean it was computed with more precision than a double. A double printed with `(0.1).toFixed(19)` also gives the 19 digits `0.1000000000000000056`, and these trailing digits are determined by the double's binary value. The comparison method is as follows. Taking the digits of `tradingStrength` from the frame text as a string `s`, and letting `d` be the number of digits after the decimal point, I checked whether `Number(s).toFixed(d) === s`. `Number(s)` is the double nearest to `s`, and `toFixed` prints the exact value of that double rounded to the `d`-th digit after the decimal point ([ECMA-262 16.0, 21.1.3.3 Number.prototype.toFixed](https://262.ecma-international.org/16.0/#sec-number.prototype.tofixed)), so a string that is the result of a double calculation printed at length comes out equal. Checking with synthetic inputs, `'0.1000000000000000056'` comes out equal, and `'104.2857142857142857'` comes out different because `Number(s).toFixed(16)` is `'104.2857142857142918'`. Values with few significant digits tend to come out equal however they were produced, so I counted only values with 18 or more digits.

[^11]: When the ring is empty it sleeps for `poll`, and if it falls behind because it was overwritten, it only logs and moves on to the next record. [yceffort/ws-trade-server `05ae6632` `src/bridge.rs` L18-L19](https://github.com/yceffort/ws-trade-server/blob/05ae66329025da3cd67b05957f21c4d3d613e11f/src/bridge.rs#L18-L19). The default `poll` of 200us is in [`src/lib.rs` L32](https://github.com/yceffort/ws-trade-server/blob/05ae66329025da3cd67b05957f21c4d3d613e11f/src/lib.rs#L32) of the same commit.

[^12]: A number is assigned for each `MESSAGE` actually sent out. [yceffort/ws-trade-server `05ae6632` `src/connection.rs` L125-L133](https://github.com/yceffort/ws-trade-server/blob/05ae66329025da3cd67b05957f21c4d3d613e11f/src/connection.rs#L125-L133)

[^13]: [STOMP Protocol Specification, Version 1.2, MESSAGE](https://stomp.github.io/stomp-specification-1.2.html#MESSAGE). The original text is "The MESSAGE frame MUST include a destination header indicating the destination the message was sent to.", and for `message-id` it requires only uniqueness: "The MESSAGE frame MUST also contain a message-id header with a unique identifier for that message".

[^14]: Using the `id` and `destination` of the `SUBSCRIBE` frames, I inserted a `destination` line after the `subscription` line of each `MESSAGE`, compressed all received frames in the order received with zlib compression level 1 and window 2^15, carrying the dictionary over, and compared with before the insertion. Before compression, each frame grew by a median of 45 bytes, and after compression the median stayed the same, the mean grew by 0.79 bytes, and the total grew from 73,463 bytes to 74,651 bytes.

[^15]: The `transfer` argument of [MDN, Worker: postMessage() method](https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage) and the Security requirements of [MDN, SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements)

[^16]: The measurement code is [yceffort/ws-trade-server `47563840` `examples/boundary_cost.rs`](https://github.com/yceffort/ws-trade-server/blob/47563840775daf4ac94ab106452730e7beac9a28/examples/boundary_cost.rs), and I ran it at that commit with `cargo run --release --example boundary_cost`. This file was added after `05ae6632` in footnote 1, so it is not in `05ae6632`. The Mac is macOS on an Apple M5 (10 cores), and Linux ran in an OrbStack virtual machine on the same machine (Linux 7.0.14, aarch64), pinned to 4 cores. The compiler is rustc 1.95.0. Each value is the elapsed time of the whole repetition (`Instant::elapsed`) divided by the count, and it is not CPU time measured separately. I ran each three times, and the values other than `send` were almost the same across the three runs. Linux `send` was 347ns, 381ns, and 443ns, and the table shows the middle value. The ring write is a condition of repeatedly just writing a 63-byte record with no reading process, and `send` is a condition of writing 370-byte frames to one socket back to back with `write_all` while another thread keeps reading.

[^17]: Each time a frame is built, it calls `writer.send` and waits for its completion. [yceffort/ws-trade-server `05ae6632` `src/connection.rs` L139-L141](https://github.com/yceffort/ws-trade-server/blob/05ae66329025da3cd67b05957f21c4d3d613e11f/src/connection.rs#L139-L141). The current `main` (`5270364`) gathers up to 4 frames going to the same connection and writes them at once ([`src/connection/batch.rs` L11](https://github.com/yceffort/ws-trade-server/blob/527036486bb8fe2a5654916d133bfd2ab0587aef/src/connection/batch.rs#L11)).

[^18]: [torvalds/linux `v7.0` `net/ipv4/tcp.c` L1425-L1436](https://github.com/torvalds/linux/blob/028ef9c96e96197026887c0f092424679298aae8/net/ipv4/tcp.c#L1425-L1436). If there are copied bytes, `tcp_sendmsg_locked` calls `tcp_push` before returning, and `tcp_push` (same file L751-L784) tries to transmit the accumulated segments. Whether to actually send is decided by `tcp_write_xmit` in `net/ipv4/tcp_output.c`, which checks conditions such as congestion control, the peer's receive window, and the Nagle algorithm.

[^19]: [MDN, WebSocket: bufferedAmount property](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/bufferedAmount)

[^20]: `TCP_NODELAY` in [Linux man-pages, tcp(7)](https://man7.org/linux/man-pages/man7/tcp.7.html)

[^21]: [Rust 1.95.0 standard library, Stack size section of std::thread](https://doc.rust-lang.org/1.95.0/std/thread/index.html#stack-size)

[^22]: [Dan Kegel, The C10K problem](https://www.kegel.com/c10k.html)

[^23]: [Linux man-pages, epoll(7)](https://man7.org/linux/man-pages/man7/epoll.7.html)

[^24]: [libuv documentation, Design overview](https://docs.libuv.org/en/v1.x/design.html)

[^25]: [yceffort/ws-trade-server `05ae6632` `src/lib.rs` L54-L71](https://github.com/yceffort/ws-trade-server/blob/05ae66329025da3cd67b05957f21c4d3d613e11f/src/lib.rs#L54-L71)

[^26]: [tokio 1.54.1 documentation, tokio::runtime](https://docs.rs/tokio/1.54.1/tokio/runtime/index.html#multi-thread-scheduler)

[^27]: [Linux man-pages, mmap(2)](https://man7.org/linux/man-pages/man2/mmap.2.html). The description of `MAP_SHARED` is "Updates to the mapping are visible to other processes mapping the same region".

[^28]: [yceffort/ws-trade-server `05ae6632` `src/region.rs` L16-L22](https://github.com/yceffort/ws-trade-server/blob/05ae66329025da3cd67b05957f21c4d3d613e11f/src/region.rs#L16-L22)

[^29]: [yceffort/ws-trade-server `05ae6632` `src/ring.rs` L81-L126](https://github.com/yceffort/ws-trade-server/blob/05ae66329025da3cd67b05957f21c4d3d613e11f/src/ring.rs#L81-L126). The header is written with `write_all_at` only when the file is empty (L88-L91), and the record's bytes and the written position are written to the mapped memory with an atomic store (`store`) (L124-L126).

[^30]: [RFC 9293, 2.2 Key TCP Concepts](https://www.rfc-editor.org/rfc/rfc9293#section-2.2) describes TCP as "a reliable, in-order, byte-stream service". [3.9.1.2 Send](https://www.rfc-editor.org/rfc/rfc9293#section-3.9.1.2) has the sentence "the data may be combined with data from subsequent SENDs for transmission efficiency" and the sentence "The PSH bit is not a record marker".
