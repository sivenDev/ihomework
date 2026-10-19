// 使用时长计时：只累计页面可见时的时间；两次计时间隔过长（平板休眠、切到后台）不计入。

export const MAX_TICK_GAP_MS = 5_000

export interface TimerState {
  activeMs: number
  lastTick: number | null
}

export const initialTimerState: TimerState = { activeMs: 0, lastTick: null }

export function tick(state: TimerState, now: number, visible: boolean): TimerState {
  if (!visible) return { activeMs: state.activeMs, lastTick: null }
  if (state.lastTick === null) return { activeMs: state.activeMs, lastTick: now }
  const delta = Math.max(0, now - state.lastTick)
  return {
    activeMs: delta > MAX_TICK_GAP_MS ? state.activeMs : state.activeMs + delta,
    lastTick: now,
  }
}

export function needsRest(state: TimerState, limitMinutes: number): boolean {
  return state.activeMs >= limitMinutes * 60_000
}

export function activeMinutes(state: TimerState): number {
  return Math.floor(state.activeMs / 60_000)
}
