import { useEffect, useState } from 'react'

/** 每隔 ms 毫秒刷新一次的当前时间；第一次刷新前为 null。 */
export function useNow(ms = 1_000): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const update = () => setNow(Date.now())
    const first = window.setTimeout(update, 0)
    const id = window.setInterval(update, ms)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [ms])
  return now
}
