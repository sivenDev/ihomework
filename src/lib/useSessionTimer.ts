import { useCallback, useEffect, useState } from 'react'
import { activeMinutes, initialTimerState, needsRest, tick } from './sessionTimer'

const TICK_MS = 1_000

export function useSessionTimer(limitMinutes: number) {
  const [state, setState] = useState(initialTimerState)

  useEffect(() => {
    const update = () => setState((s) => tick(s, Date.now(), document.visibilityState === 'visible'))
    update()
    const id = window.setInterval(update, TICK_MS)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  const reset = useCallback(() => setState({ activeMs: 0, lastTick: Date.now() }), [])

  return { needsRest: needsRest(state, limitMinutes), minutes: activeMinutes(state), reset }
}
