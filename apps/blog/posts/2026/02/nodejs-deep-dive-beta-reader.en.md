---
title: Seeking Beta Readers for Node.js Deep Dive (Working Title)
tags:
  - nodejs
  - javascript
published: true
featured: true
date: 2026-02-19 22:00:00
description: 'Please show lots of interest and support!'
art:
  layout: glyph
  hue: violet
  tone: dark
  hero: 'Node.js Deep Dive'
---

I'm writing my fourth book. This time, it's about Node.js.

What happens to performance when V8's hidden classes break? How does `AsyncLocalStorage` track `async/await` chains? How does Prototype Pollution actually lead to RCE? — This book seeks to answer these questions at the code and source level.

I've currently completed Parts 1-5 out of 10 total parts, and I'm working on Parts 6-10. The content written so far is already about 65% of my previous book `<<Web Performance Deep Dive>>`, so I expect the completed version will be longer than my previous work.

## Table of Contents (Subject to Change)

| Part   | Topic                                                                                                                          | Progress |
| ------ | ------------------------------------------------------------------------------------------------------------------------------ | -------- |
| Part 0 | Before We Begin                                                                                                                | ✅       |
| Part 1 | The Heart of Node.js Runtime — V8, libuv, Event Loop, Task Queue, Native Bindings                                              | ✅       |
| Part 2 | Module System — CommonJS, ESM, Dual Package Hazard, Custom Loaders                                                             | ✅       |
| Part 3 | Memory and Streams — V8 GC, Buffer, Stream Backpressure, Web Streams                                                           | ✅       |
| Part 4 | Networking — TCP/IP, HTTP Protocol Evolution, TLS/SSL, DNS, WebSocket                                                          | ✅       |
| Part 5 | Security — Permission Model, vm Module, Prototype Pollution, Password/Token Validation                                         | ✅       |
| Part 6 | Concurrency — Worker Threads, AsyncLocalStorage, Child Process, Concurrency Control Patterns                                   | ✅       |
| Part 7 | Errors and Processes — Error Propagation, uncaughtException, Cluster, Signals, Graceful Shutdown                               | 🚧       |
| Part 8 | Performance Diagnostics — Event Loop Delay Measurement, CPU Profiling, Memory Leak Diagnosis, async_hooks, diagnostics_channel | 🚧       |
| Part 9 | Production Environment — Containers, Serverless, Edge Runtime                                                                  | 🚧       |

> The table of contents may change during the writing process.

## This Beta Reading Round is Different

With my previous book `<<Web Performance Deep Dive>>`, the beta reading period overlapped with the publication schedule, so I could only incorporate some of the valuable feedback I received. That was quite disappointing.

This time, **I plan to carefully incorporate all feedback from beta readers before submitting the manuscript to the publisher**. I don't want to let any opinions slip by due to schedule pressure. So I'd appreciate it if you could **provide feedback across all chapters**.

- I'll invite you to a private GitHub repository. The reading period is **March 1, 2026 ~ May 31, 2026**, and you can read chapter by chapter as completed sections are released, leaving feedback as you go.
- There's no set format. Feel free to write in the corresponding GitHub issues.
  - However, since the author is quite sensitive (F-type personality), I'd appreciate warm words of encouragement rather than aggressive criticism. 😉
- Please also write a 4-5 line beta reader review to be included at the front of the book.
  - The editorial team will review it, so you don't need to put too much effort into polishing.
  - Please don't use generative AI. The writing needs a human touch 😭

## Perks

- Your message as a beta reader will be published in the front of the book.
- I'll gift you a copy of the book upon publication.
- I'll fulfill one request within my capabilities. 🙏

## Application

- **Eligibility**: Any intermediate to advanced developer with Node.js experience. Years of experience don't matter.
- **How to Apply**: Send an email to root@yceffort.kr with the subject line `[Beta Reader Application]`.
  - Your affiliation and what you do
  - Resume

  > I need to collect this information to introduce who the beta readers are. It won't be used for any other purpose.

- **Application Period**: Open recruitment
- **Capacity**: Maximum 10 people

## FAQ

- **Can I apply even if I don't have much Node.js experience?** — Yes, no problem. Even if you've only used Express/Nest, that's fine.
- **Do I need to read all chapters?** — Yes, please read all chapters if possible. Since I wrote this book while learning myself, there might be mistakes, so I'd appreciate your thorough review.
- **When is the expected publication date?** — I'm expecting sometime in 2026.
- **I was a beta reader for your previous book. Can I apply again?** — Yes, no problem at all.
- **I'd like to see a book sample!** — Please check [here](/2026/02/nodejs-deep-dive-sample).

Thank you 🙇🏻‍♂️
