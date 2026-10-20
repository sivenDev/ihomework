import { describe, expect, it } from 'vitest'
import { effectiveLevel, isWeekend, levelConfig } from './levels'
import { decideRoute, qualifiesForExtension } from './routes'

describe('decideRoute', () => {
  const base = { lock: null, backlogRemaining: 0, weeklyAccuracies: [] }

  it('goes to 补漏 while backlog characters remain', () => {
    expect(decideRoute({ ...base, backlogRemaining: 3 })).toBe('补漏')
  })

  it('goes to 同步 when the backlog is clear but extension is not earned', () => {
    expect(decideRoute(base)).toBe('同步')
    expect(decideRoute({ ...base, weeklyAccuracies: [0.95, 0.85] })).toBe('同步')
  })

  it('goes to 拓展 after two weeks in a row at 90% or above', () => {
    expect(decideRoute({ ...base, weeklyAccuracies: [0.6, 0.9, 0.95] })).toBe('拓展')
  })

  it('goes straight to 拓展 when the first assessment is strong in both reading and writing', () => {
    expect(decideRoute({ ...base, firstAssessment: { recognition: 0.92, dictation: 0.85 } })).toBe('拓展')
    expect(decideRoute({ ...base, firstAssessment: { recognition: 0.92, dictation: 0.8 } })).toBe('同步')
    expect(decideRoute({ ...base, firstAssessment: { recognition: 0.95 } })).toBe('同步')
  })

  it('returns from 拓展 to 补漏 when new backlog characters appear', () => {
    const strong = { ...base, weeklyAccuracies: [0.95, 0.95] }
    expect(decideRoute(strong)).toBe('拓展')
    expect(decideRoute({ ...strong, backlogRemaining: 1 })).toBe('补漏')
  })

  it('follows the parent lock regardless of the rules', () => {
    expect(decideRoute({ ...base, lock: '拓展', backlogRemaining: 5 })).toBe('拓展')
    expect(decideRoute({ ...base, lock: '同步', weeklyAccuracies: [1, 1] })).toBe('同步')
  })

  it('needs both of the latest two weeks for the weekly rule', () => {
    expect(qualifiesForExtension({ weeklyAccuracies: [0.9] })).toBe(false)
    expect(qualifiesForExtension({ weeklyAccuracies: [0.9, 0.9] })).toBe(true)
  })
})

describe('levels', () => {
  it('uses the default amounts for each level', () => {
    expect(levelConfig('轻松')).toMatchObject({ segments: 1, segmentMinutes: 15, newChars: 0, bossCap: 10 })
    expect(levelConfig('标准')).toMatchObject({ segments: 1, segmentMinutes: 20, newChars: 3, bossCap: 15 })
    expect(levelConfig('加强')).toMatchObject({ segments: 2, segmentMinutes: 15, newChars: 8, bossCap: 25, weekendBonusMinutes: 15 })
  })

  it('applies parent tweaks within limits', () => {
    expect(levelConfig('标准', { newChars: 5, bossCap: 20, segmentMinutes: 25 })).toMatchObject({ newChars: 5, bossCap: 20, segmentMinutes: 25 })
    expect(levelConfig('标准', { newChars: 99, bossCap: 1 })).toMatchObject({ newChars: 15, bossCap: 5 })
  })

  it('switches to 轻松 only on the chosen day', () => {
    const opts = { chosen: '加强' as const, easyDay: '2026-10-19' }
    expect(effectiveLevel({ ...opts, today: '2026-10-19' })).toBe('轻松')
    expect(effectiveLevel({ ...opts, today: '2026-10-20' })).toBe('加强')
  })

  it('uses the assessment suggestion until the parent chooses, then 标准 by default', () => {
    expect(effectiveLevel({ chosen: null, suggested: '加强', easyDay: null, today: '2026-10-19' })).toBe('加强')
    expect(effectiveLevel({ chosen: '轻松', suggested: '加强', easyDay: null, today: '2026-10-19' })).toBe('轻松')
    expect(effectiveLevel({ chosen: null, easyDay: null, today: '2026-10-19' })).toBe('标准')
  })

  it('knows weekends', () => {
    expect(isWeekend('2026-10-24')).toBe(true) // 周六
    expect(isWeekend('2026-10-25')).toBe(true) // 周日
    expect(isWeekend('2026-10-26')).toBe(false)
  })
})
