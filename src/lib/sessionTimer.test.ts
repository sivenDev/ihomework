import { describe, expect, it } from 'vitest'
import { activeMinutes, initialTimerState, needsRest, tick, type TimerState } from './sessionTimer'

function run(state: TimerState, from: number, to: number, step: number, visible = true) {
  let s = state
  for (let t = from; t <= to; t += step) s = tick(s, t, visible)
  return s
}

describe('sessionTimer', () => {
  it('accumulates visible time', () => {
    const s = run(initialTimerState, 0, 60_000, 1_000)
    expect(s.activeMs).toBe(60_000)
    expect(activeMinutes(s)).toBe(1)
  })

  it('does not count hidden time', () => {
    let s = run(initialTimerState, 0, 10_000, 1_000)
    s = run(s, 11_000, 600_000, 1_000, false)
    s = run(s, 601_000, 605_000, 1_000)
    expect(s.activeMs).toBe(14_000)
  })

  it('ignores long gaps such as device sleep', () => {
    let s = tick(initialTimerState, 0, true)
    s = tick(s, 1_000, true)
    s = tick(s, 3_600_000, true)
    expect(s.activeMs).toBe(1_000)
  })

  it('needs rest once the limit is reached', () => {
    const s = run(initialTimerState, 0, 20 * 60_000, 1_000)
    expect(needsRest(s, 20)).toBe(true)
    expect(needsRest(s, 21)).toBe(false)
  })
})
