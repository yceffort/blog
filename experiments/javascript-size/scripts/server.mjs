import {readFile} from 'node:fs/promises'
import {createServer} from 'node:http'

import {root} from './generate.mjs'

const html = `<!doctype html>
<html lang="en"><meta charset="utf-8"><title>Unused JavaScript experiment</title>
<style>body{font:18px system-ui;margin:32px}button{position:absolute;left:32px;top:100px;width:240px;height:64px;font:inherit}#status{margin-top:120px}</style>
<h1>One button, identical behavior</h1><button id="counter">Clicks: 0</button><p id="status">Ready to load a payload</p>
<script>
const state = window.bench = {clicks:[],events:[],longTasks:[],frames:[],errors:[],phase:'setup'};
let count=0;
document.querySelector('#counter').addEventListener('pointerdown', event => {
  state.clicks.push({timestamp:event.timeStamp,handledAt:performance.now(),inputDelayMs:performance.now()-event.timeStamp,isTrusted:event.isTrusted,phase:state.phase});
  document.querySelector('#counter').textContent='Clicks: '+(++count);
});
new PerformanceObserver(list=>state.longTasks.push(...list.getEntries().map(e=>({startTime:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});
new PerformanceObserver(list=>state.events.push(...list.getEntries().map(e=>({name:e.name,startTime:e.startTime,processingStart:e.processingStart,processingEnd:e.processingEnd,duration:e.duration,interactionId:e.interactionId})))).observe({type:'event',buffered:true,durationThreshold:16});
function frame(t){state.frames.push(t);requestAnimationFrame(frame)}requestAnimationFrame(frame);
window.addEventListener('error',e=>state.errors.push(e.message));
window.startBenchmark=(url)=>{
  state.phase='loading';state.start=performance.now();performance.mark('experiment-start');
  state.done=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=url;
    script.onload=()=>{state.ready=performance.now();state.phase='settled';document.querySelector('#status').textContent='Payload ready';performance.mark('experiment-ready');resolve()};
    script.onerror=()=>reject(new Error('payload load failed'));document.head.append(script);
  });return state.start;
};
</script></html>`

export async function startServer() {
  const manifest = JSON.parse(
    await readFile(`${root}/fixtures/manifest.json`, 'utf8'),
  )
  const payloads = new Map()
  // Preload all bytes before timed runs. No generation, compression, or disk I/O in request handlers.
  for (const item of manifest) {
    payloads.set(item.name, {
      plain: await readFile(`${root}/fixtures/${item.name}.js`),
      gzip: await readFile(`${root}/fixtures/${item.name}.js.gz`),
    })
  }
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname === '/') {
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store',
      })
      res.end(html)
      return
    }
    const name = url.pathname.replace(/^\//, '').replace(/\.js$/, '')
    const payload = payloads.get(name)
    if (!payload) {
      res.writeHead(404)
      res.end()
      return
    }
    const encoding =
      url.searchParams.get('encoding') === 'gzip' ? 'gzip' : 'plain'
    const data = payload[encoding]
    const headers = {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Content-Length': data.length,
      'Cache-Control': url.searchParams.has('warm')
        ? 'public, max-age=3600'
        : 'no-store',
      'Timing-Allow-Origin': '*',
    }
    if (encoding === 'gzip') headers['Content-Encoding'] = 'gzip'
    res.writeHead(200, headers)
    res.end(data)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {server, origin: `http://127.0.0.1:${server.address().port}`, manifest}
}
