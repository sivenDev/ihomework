/* 汉字闯关 Service Worker（由 scripts/pwa/build-sw.ts 在构建时生成 sw.js，不要直接修改 sw.js）。
 *
 * - 安装时预缓存全部文件：应用、课本字库、拓展字库、笔顺数据。只下载有变化的文件，并把下载进度发给页面。
 * - 之后所有同源请求都从缓存读取，断网也能用。
 * - 新版本装好后等待，页面上点“更新”才切换（不在使用中途强制刷新）。
 */
const VERSION = '__VERSION__'
/** [相对路径, 版本] */
const MANIFEST = __MANIFEST__
const CACHE = 'ihomework-precache'
const CONCURRENCY = 8

const scope = self.registration.scope
const entries = MANIFEST.map(([path, rev]) => {
  const url = new URL(path, scope).href
  return { url, key: `${url}?__rev=${rev}` }
})
const keyByUrl = new Map(entries.map((e) => [e.url, e.key]))
const indexKey = keyByUrl.get(new URL('index.html', scope).href)

async function broadcast(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
  for (const client of clients) client.postMessage({ ...message, version: VERSION })
}

async function precache() {
  const cache = await caches.open(CACHE)
  const cached = new Set((await cache.keys()).map((r) => r.url))
  const todo = entries.filter((e) => !cached.has(e.key))
  const total = entries.length
  let done = total - todo.length
  let next = 0
  let lastReport = 0
  await broadcast({ type: 'precache-progress', done, total })
  const worker = async () => {
    while (next < todo.length) {
      const entry = todo[next++]
      const response = await fetch(entry.url, { cache: 'no-cache' })
      if (!response.ok) throw new Error(`预缓存失败：${entry.url} ${response.status}`)
      await cache.put(entry.key, response)
      done++
      if (done - lastReport >= 100 || done === total) {
        lastReport = done
        await broadcast({ type: 'precache-progress', done, total })
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    precache().then(() => {
      // 第一次安装直接启用；更新时进入等待，页面上点“更新”才切换
      if (!self.registration.active) return self.skipWaiting()
    }),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set(entries.map((e) => e.key))
      const cache = await caches.open(CACHE)
      for (const request of await cache.keys()) if (!keep.has(request.url)) await cache.delete(request)
      for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name)
      await self.clients.claim()
      await broadcast({ type: 'precache-done' })
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'skip-waiting') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  url.search = ''
  url.hash = ''
  const key = keyByUrl.get(url.href) ?? (request.mode === 'navigate' ? indexKey : undefined)
  if (!key) return
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) => cache.match(key))
      .then((cached) => cached ?? fetch(request)),
  )
})
