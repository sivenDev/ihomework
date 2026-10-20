import { describe, expect, it } from 'vitest'
import { fixtureDataset } from '../../../test/fixtures'
import { backlogProgress, extensionProgress, levelAdvice } from './advisor'
import { unitEnded, weeklyBossOpen, weeklyPool, weekStart } from './weekly'

describe('levelAdvice', () => {
  const today = '2026-10-22'
  const base = { level: '标准' as const, levelSince: '2026-10-01', today, days: [], weeklyAccuracies: [] }

  it('suggests one level down after 3 days in a row without finishing the required tasks', () => {
    const days = [
      { date: '2026-10-19', complete: false },
      { date: '2026-10-20', complete: false },
      // 10-21 没打开
    ]
    expect(levelAdvice({ ...base, days })).toEqual([{ kind: 'down', to: '轻松' }])
  })

  it('does not suggest going down when one of the last 3 days was completed', () => {
    const days = [{ date: '2026-10-20', complete: true }]
    expect(levelAdvice({ ...base, days })).toEqual([])
  })

  it('waits 3 days after the level was set, and never goes below 轻松', () => {
    expect(levelAdvice({ ...base, levelSince: '2026-10-20' })).toEqual([])
    expect(levelAdvice({ ...base, levelSince: '2026-10-19' })).toEqual([{ kind: 'down', to: '轻松' }])
    expect(levelAdvice({ ...base, level: '轻松' })).toEqual([])
  })

  it('suggests a level up or fewer new characters after 2 weeks of weekly Boss below 70%', () => {
    const days = [{ date: '2026-10-21', complete: true }]
    expect(levelAdvice({ ...base, days, weeklyAccuracies: [0.9, 0.65, 0.69] })).toEqual([{ kind: 'up-or-fewer', to: '加强' }])
    expect(levelAdvice({ ...base, days, weeklyAccuracies: [0.65, 0.7] })).toEqual([])
    expect(levelAdvice({ ...base, days, level: '加强', weeklyAccuracies: [0.5, 0.5] })).toEqual([{ kind: 'up-or-fewer' }])
  })
})

describe('backlogProgress', () => {
  const today = '2026-10-22'
  // 最近 2 周（10-08 ~ 10-21）完成了 6 天 → 平均每周 3 天
  const days = ['10-08', '10-10', '10-13', '10-15', '10-18', '10-21'].map((d) => ({ date: `2026-${d}`, complete: true }))

  it('estimates weeks to clear the backlog from the daily quota and recent practice days', () => {
    expect(backlogProgress({ conquered: 4, remaining: 20, dailyNew: 3, days, today })).toEqual({ conquered: 4, remaining: 20, weeks: 3 })
  })

  it('cannot estimate without practice or quota', () => {
    expect(backlogProgress({ conquered: 0, remaining: 5, dailyNew: 3, days: [], today }).weeks).toBeNull()
    expect(backlogProgress({ conquered: 0, remaining: 5, dailyNew: 0, days, today }).weeks).toBeNull()
    expect(backlogProgress({ conquered: 5, remaining: 0, dailyNew: 0, days, today }).weeks).toBe(0)
  })
})

describe('extensionProgress', () => {
  it('counts extension characters learned in total, this week and last week', () => {
    const learned = [
      { char: '甲', date: '2026-10-13' },
      { char: '乙', date: '2026-10-18' },
      { char: '丙', date: '2026-10-19' },
      { char: '丁', date: '2026-10-21' },
      { char: '戊', date: '2026-10-01' },
    ]
    expect(extensionProgress(learned, '2026-10-22')).toEqual({ total: 5, thisWeek: 2, lastWeek: 2 })
  })
})

describe('weekly Boss', () => {
  it('weeks start on Monday and the weekly Boss opens on Saturday', () => {
    expect(weekStart('2026-10-19')).toBe('2026-10-19')
    expect(weekStart('2026-10-25')).toBe('2026-10-19')
    expect(weeklyBossOpen('2026-10-23')).toBe(false)
    expect(weeklyBossOpen('2026-10-24')).toBe(true)
    expect(weeklyBossOpen('2026-10-25')).toBe(true)
  })

  it('draws only characters practiced this week, at most 20', () => {
    const pool = weeklyPool({
      today: '2026-10-24',
      learned: [
        { char: '天', date: '2026-10-18' }, // 上周日
        { char: '地', date: '2026-10-19' },
        { char: '人', date: '2026-10-24' },
      ],
      rng: () => 0,
    })
    expect(pool.sort()).toEqual(['人', '地'])

    const many = Array.from({ length: 30 }, (_, i) => ({ char: String.fromCharCode(0x4e00 + i), date: '2026-10-20' }))
    expect(weeklyPool({ today: '2026-10-24', learned: many })).toHaveLength(20)
  })
})

describe('unitEnded', () => {
  const ds = fixtureDataset()
  // 夹具里每课都是第 1 单元：改一下，让 g1a-k1 属于第 2 单元
  ds.books[0].lessons[2].unit = 2

  it('returns the finished unit when progress moves into a new unit', () => {
    expect(unitEnded(ds.books, 'g1a-s1', 'g1a-k1')?.map((l) => l.id)).toEqual(['g1a-s1', 'g1a-p1'])
    expect(unitEnded(ds.books, 'g1a-k1', 'g1b-s1')?.map((l) => l.id)).toEqual(['g1a-k1'])
  })

  it('does nothing within a unit, when going back, or on the first setting', () => {
    expect(unitEnded(ds.books, 'g1a-s1', 'g1a-p1')).toBeNull()
    expect(unitEnded(ds.books, 'g1a-k1', 'g1a-s1')).toBeNull()
    expect(unitEnded(ds.books, null, 'g1a-k1')).toBeNull()
  })
})
