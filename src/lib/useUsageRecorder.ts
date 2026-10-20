import { useEffect } from 'react'
import { db } from '../db/schema'
import { localDate } from './date'
import { tick, type TimerState } from './sessionTimer'

const TICK_MS = 1_000
/** 每隔多久写一次数据库 */
const FLUSH_MS = 15_000

/** 把一段使用时长加到当天的记录上。 */
export async function addUsage(date: string, seconds: number): Promise<void> {
  if (seconds <= 0) return
  await db.transaction('rw', db.usage, async () => {
    const row = await db.usage.get(date)
    await db.usage.put({ date, seconds: (row?.seconds ?? 0) + seconds })
  })
}

/** 记录孩子模式的使用时长（只算页面可见的时间，规则同休息提醒的计时），供家长看板显示每日用时。 */
export function useUsageRecorder() {
  useEffect(() => {
    let state: TimerState = { activeMs: 0, lastTick: null }
    let flushed = 0
    const flush = () => {
      const seconds = Math.floor((state.activeMs - flushed) / 1000)
      if (seconds <= 0) return
      flushed += seconds * 1000
      void addUsage(localDate(), seconds)
    }
    const update = () => {
      state = tick(state, Date.now(), document.visibilityState === 'visible')
      if (document.visibilityState !== 'visible') flush()
    }
    update()
    const ticker = window.setInterval(update, TICK_MS)
    const flusher = window.setInterval(flush, FLUSH_MS)
    document.addEventListener('visibilitychange', update)
    window.addEventListener('pagehide', flush)
    return () => {
      window.clearInterval(ticker)
      window.clearInterval(flusher)
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])
}
