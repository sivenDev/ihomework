import { useEffect, useState } from 'react'

/**
 * 题目（key）变化后，等 ms 毫秒才允许作答。返回是否可以作答，以及可以作答的时刻（用来测量作答用时）。
 * paused 时不计时（例如专注提醒弹出期间）。
 */
export function useThinkDelay(key: string, ms: number, paused = false): { ready: boolean; readyAt: number } {
  const [ready, setReady] = useState<{ key: string; at: number } | null>(null)
  useEffect(() => {
    if (paused) return
    const id = window.setTimeout(() => setReady({ key, at: Date.now() }), ms)
    return () => window.clearTimeout(id)
  }, [key, ms, paused])
  const isReady = ready?.key === key
  return { ready: isReady, readyAt: isReady ? ready.at : 0 }
}
