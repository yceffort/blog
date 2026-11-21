---
name: 'Building a Stock Trade WebSocket Server'
title: 'Building a Stock <em>Trade WebSocket Server</em>'
description: 'Starting from the basics of the stock market, I imagine the inside of a stock trade WebSocket server using only trade frames available without logging in and public specs, build it myself in Rust, and measure it up to 10,000 connections'
art:
  undraw: financial-data
---

When frontend developers use WebSockets, they mostly deal with what happens after the connection. You connect with `new WebSocket(url)`, display the data received in `onmessage`, and reconnect when the connection drops. Screens where the server pushes data first, such as chat, notifications, and real-time quotes, are usually built this way. There are few chances to look at what goes on inside the server that sends that data to a huge number of browsers.

I develop the frontend at a brokerage. When the prices of a buy order and a sell order match and a deal is struck, a trade happens, and the price on the stock screen changes. In the WS tab of DevTools, trade frames pile up one line at a time. My job is to receive these frames and display them on screen.

Yet I could hardly answer even basic questions about the server sending those frames. With 10,000 connections, how many times does the work of sending one trade have to be repeated? If some clients don't read their frames, does that affect other connections? If the process receiving trades dies, do users' connections drop with it?

I can't look into my company's servers and write about them, so I decided to think through how a trade server might work using public material. The Toss Securities web app, which I picked as a sample, receives trade frames on stock pages even without logging in. It was built relatively recently and was easy to observe in the browser.

I followed the observed frame format, but built the server internals myself in Rust, referring to widely known designs. It is an experiment to learn what a server that sends trades over WebSocket has to do. The server structure in this series is entirely my own choice, and emitting frames in the same format reveals nothing about Toss Securities' actual implementation. The server, capture tool, and measurement results are in [yceffort/ws-trade-server](https://github.com/yceffort/ws-trade-server).

Part 1 covers the basics of the stock market before getting to the server. Following whom you buy a stock from, at what price, and when, and what remains after the purchase, it explains exchanges and brokerages, quotes and trades, trading hours and daylight saving time, and settlement and margin. Building on that, it looks at which rules the fields of the captured frames relate to.

Part 2 sorts out what can be learned from the frames and follows how a single trade travels from the server to the browser. The processes and kernel, socket buffers, epoll, and shared memory along the way are compared with concepts familiar from frontend development and explained with values I measured myself.

Part 3 covers the server code that implements this path. It splits the process that receives trades from the process that accepts connections and links them with a ring buffer in shared memory. It builds a subscription index and per-connection queues, and also explains how to handle clients that don't read their data.

Part 4 attaches 10,000 connections and measures latency and memory. It looks at how per-connection memory went from 138KB down to 13KB and why latency grows with the number of connections. It also covers how the measurement environment hit its limits before the server did.
