// 注册 Service Worker（只在正式构建中），把离线数据下载进度和“有新版本”告诉页面。
import { useSyncExternalStore } from 'react'

export interface PwaState {
  /** 第一次安装时的下载进度 */
  progress: { done: number; total: number } | null
  /** 第一次安装完成，可以断网使用 */
  offlineReady: boolean
  /** 新版本已下载好，等家长或孩子点“更新” */
  updateReady: boolean
}

let state: PwaState = { progress: null, offlineReady: false, updateReady: false }
const listeners = new Set<() => void>()
let registration: ServiceWorkerRegistration | undefined
let reloadOnChange = false

function set(patch: Partial<PwaState>) {
  state = { ...state, ...patch }
  for (const l of listeners) l()
}

export function usePwaState(): PwaState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const sw = navigator.serviceWorker
  // 打开页面时还没有 Service Worker 控制：这是第一次安装
  const firstInstall = !sw.controller

  sw.addEventListener('message', (event: MessageEvent<{ type: string; done?: number; total?: number }>) => {
    const data = event.data
    if (data?.type === 'precache-progress' && firstInstall) set({ progress: { done: data.done!, total: data.total! } })
    if (data?.type === 'precache-done' && firstInstall) set({ progress: null, offlineReady: true })
  })
  sw.addEventListener('controllerchange', () => {
    if (reloadOnChange) window.location.reload()
  })

  void sw.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).then((reg) => {
    registration = reg
    if (reg.waiting && sw.controller) set({ updateReady: true })
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && sw.controller) set({ updateReady: true })
      })
    })
  })
}

/** 切换到新版本并刷新页面。 */
export function applyUpdate() {
  if (!registration?.waiting) return
  reloadOnChange = true
  registration.waiting.postMessage({ type: 'skip-waiting' })
}

export function dismissOfflineReady() {
  set({ offlineReady: false })
}
