import {readFile} from 'node:fs/promises'
import {createServer} from 'node:http'

import {root} from './build.mjs'

// Same page as the javascript-size experiment: one button that the payload never touches.
const html = `<!doctype html>
<html lang="en"><meta charset="utf-8"><title>Library side effect experiment</title>
<style>body{font:18px system-ui;margin:32px}button{position:absolute;left:32px;top:100px;width:240px;height:64px;font:inherit}#status{margin-top:120px}</style>
<h1>One button, identical behavior</h1><button id="counter">Clicks: 0</button><p id="status">Ready to load a payload</p>
<script>
const state = window.bench = {clicks:[],longTasks:[],errors:[],phase:'setup'};
let count=0;
document.querySelector('#counter').addEventListener('pointerdown', event => {
  state.clicks.push({timestamp:event.timeStamp,handledAt:performance.now(),inputDelayMs:performance.now()-event.timeStamp,isTrusted:event.isTrusted,phase:state.phase});
  document.querySelector('#counter').textContent='Clicks: '+(++count);
});
new PerformanceObserver(list=>state.longTasks.push(...list.getEntries().map(e=>({startTime:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});
window.addEventListener('error',e=>state.errors.push(e.message));
window.startBenchmark=(url)=>{
  state.phase='loading';state.start=performance.now();
  state.done=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=url;
    script.onload=()=>{state.ready=performance.now();state.phase='settled';document.querySelector('#status').textContent='Payload ready';resolve()};
    script.onerror=()=>reject(new Error('payload load failed'));document.head.append(script);
  });return state.start;
};
</script></html>`

export async function startServer() {
  const {payloads: manifest, versions} = JSON.parse(
    await readFile(`${root}/fixtures/manifest.json`, 'utf8'),
  )
  const bytes = new Map()
  // Preload every payload so request handlers do no disk I/O during timed runs.
  for (const item of manifest) {
    bytes.set(item.name, {
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
    const payload = bytes.get(
      url.pathname.replace(/^\//, '').replace(/\.js$/, ''),
    )
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
      'Cache-Control': 'no-store',
      'Timing-Allow-Origin': '*',
    }
    if (encoding === 'gzip') headers['Content-Encoding'] = 'gzip'
    res.writeHead(200, headers)
    res.end(data)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    server,
    origin: `http://127.0.0.1:${server.address().port}`,
    manifest,
    versions,
  }
}
