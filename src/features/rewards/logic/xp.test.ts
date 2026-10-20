import { describe, expect, it } from 'vitest'
import { dailyXpEvents, defeatXpEvent, freshEvents, streakDays, xpSummary } from './xp'
import { rankOf, RANK_THRESHOLDS } from './ranks'

describe('xp events', () => {
  it('gives +10 for each finished segment, so a two-segment day gives +20', () => {
    expect(dailyXpEvents('2026-10-19', [1], 0).map((e) => e.amount)).toEqual([10])
    expect(dailyXpEvents('2026-10-19', [1, 2], 0).reduce((n, e) => n + e.amount, 0)).toBe(20)
  })

  it('never gives the same event twice', () => {
    const first = dailyXpEvents('2026-10-19', [1], 0)
    const again = [...dailyXpEvents('2026-10-19', [1, 2], 5), defeatXpEvent('天', 5), defeatXpEvent('天', 6)]
    expect(freshEvents(first.map((e) => e.id), again).map((e) => e.id)).toEqual(['daily:2026-10-19:2', 'defeat:天'])
  })

  it('+1 for each defeated character', () => {
    expect(defeatXpEvent('天', 0)).toMatchObject({ amount: 1, kind: 'defeat' })
  })
})

describe('xpSummary', () => {
  it('keeps the total for ranks and subtracts confirmed and pending exchanges from what can be spent', () => {
    const events = [{ amount: 100 }, { amount: 20 }]
    const redemptions = [
      { cost: 50, status: 'confirmed' as const },
      { cost: 30, status: 'pending' as const },
      { cost: 999, status: 'declined' as const },
    ]
    expect(xpSummary(events, redemptions)).toEqual({ total: 120, spent: 50, reserved: 30, available: 40 })
  })
})

describe('ranks', () => {
  it('goes 汉字学徒 → 部首侦探 → 字族猎人 → 文字大师, 3 steps each', () => {
    expect(RANK_THRESHOLDS).toHaveLength(12)
    expect(rankOf(0)).toMatchObject({ index: 0, title: '汉字学徒', step: 1, name: '汉字学徒 1 级', next: RANK_THRESHOLDS[1] })
    expect(rankOf(RANK_THRESHOLDS[3])).toMatchObject({ index: 3, title: '部首侦探', step: 1 })
    expect(rankOf(RANK_THRESHOLDS[8] - 1)).toMatchObject({ title: '字族猎人', step: 2 })
    expect(rankOf(99_999)).toMatchObject({ index: 11, title: '文字大师', step: 3, next: null })
  })

  it('does not go down after an exchange, because it uses the total', () => {
    const { total } = xpSummary([{ amount: 120 }], [{ cost: 100, status: 'confirmed' }])
    expect(rankOf(total).index).toBe(rankOf(120).index)
  })
})

describe('streakDays', () => {
  const days = (list: string[]) => list.map((d) => ({ date: `2026-10-${d}`, complete: true }))

  it('counts finished days in a row up to today', () => {
    expect(streakDays(days(['17', '18', '19']), '2026-10-19')).toBe(3)
  })

  it('keeps yesterday’s streak while today is not finished yet', () => {
    expect(streakDays(days(['17', '18']), '2026-10-19')).toBe(2)
  })

  it('breaks after a missed day', () => {
    expect(streakDays(days(['15', '16', '18']), '2026-10-19')).toBe(1)
    expect(streakDays(days(['15', '16']), '2026-10-19')).toBe(0)
    expect(streakDays([{ date: '2026-10-19', complete: false }], '2026-10-19')).toBe(0)
  })
})
