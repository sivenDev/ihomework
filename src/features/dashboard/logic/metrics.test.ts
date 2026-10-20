import { describe, expect, it } from 'vitest'
import { fixtureDataset } from '../../../test/fixtures'
import type { Report } from '../../assessment/logic/types'
import { addMistake } from '../../boss/logic/scheduler'
import { adviceSnoozed, bossStats, checkinStats, literacyCurve, nextAssessment, usageLastDays } from './metrics'

const { books } = fixtureDataset()

function report(date: string, patch: Partial<Report> = {}): Report {
  return {
    date,
    progressLessonId: 'g1a-k1',
    recognition: { tested: 5, correct: 4, accuracy: 0.8, estimate: 4, learned: 5, perBook: [] },
    backlog: [],
    focus: '并行',
    route: '同步',
    level: '标准',
    ...patch,
  }
}

describe('literacy curve', () => {
  it('uses assessment estimates, then weekly Boss accuracy, carrying values without new data', () => {
    const curve = literacyCurve({
      books,
      progress: { lessonId: 'g1b-s1' },
      reports: [
        report('2026-10-01', {
          dictation: { tested: 2, correct: 1, accuracy: 0.5 },
          extension: { estimate: 120, layersTested: 2 },
        }),
      ],
      weekly: [
        // g1b-s1 时已学生字 7 个（天地人青山晴请）、写字表 3 个（人山晴）
        { date: '2026-10-10', progressLessonId: 'g1b-s1', read: { 天: true, 地: true, 人: true, 青: false }, write: { 人: true, 山: true, 晴: false } },
        { date: '2026-10-17', read: { 天: true, 地: true }, write: {} },
      ],
      extensionLearned: [
        { char: '清', date: '2026-09-30' },
        { char: '大', date: '2026-10-05' },
        { char: '小', date: '2026-10-12' },
        { char: '大', date: '2026-10-13' },
      ],
    })
    expect(curve).toEqual([
      // 截至 g1a-k1 的写字表 2 个（人山）× 50%
      { date: '2026-10-01', source: 'assessment', recognition: 4, writing: 1, extension: 120 },
      { date: '2026-10-10', source: 'weekly', recognition: 5, writing: 2, extension: 121 },
      // 没有默写：会写沿用；没有记录进度时用当前进度
      { date: '2026-10-17', source: 'weekly', recognition: 7, writing: 2, extension: 122 },
    ])
  })

  it('writing stays empty until there is dictation data; a later assessment without extension keeps counting', () => {
    const curve = literacyCurve({
      books,
      progress: null,
      reports: [report('2026-10-01'), report('2026-10-20')],
      weekly: [],
      extensionLearned: [{ char: '大', date: '2026-10-05' }],
    })
    expect(curve.map((p) => [p.writing, p.extension])).toEqual([
      [null, 0],
      [null, 1],
    ])
  })
})

describe('dashboard stats', () => {
  it('lists undefeated characters by due date and the defeat rate', () => {
    const cards = [
      { ...addMistake(undefined, '山', 'flash', '2026-10-01'), due: '2026-10-05' },
      { ...addMistake(undefined, '天', 'flash', '2026-10-01'), due: '2026-10-03' },
      { ...addMistake(undefined, '人', 'flash', '2026-10-01'), status: 'defeated' as const },
    ]
    expect(bossStats(cards)).toEqual({ active: ['天', '山'], defeated: 1, total: 3, rate: 1 / 3 })
    expect(bossStats([]).rate).toBeNull()
  })

  it('shows the last 7 days of usage in minutes, including empty days', () => {
    const days = usageLastDays(
      [
        { date: '2026-10-20', seconds: 1250 },
        { date: '2026-10-15', seconds: 600 },
        { date: '2026-10-10', seconds: 999 },
      ],
      '2026-10-20',
    )
    expect(days).toHaveLength(7)
    expect(days[0]).toEqual({ date: '2026-10-14', minutes: 0 })
    expect(days[1]).toEqual({ date: '2026-10-15', minutes: 10 })
    expect(days[6]).toEqual({ date: '2026-10-20', minutes: 21 })
  })

  it('counts the streak and all completed days', () => {
    const days = [
      { date: '2026-10-10', complete: true },
      { date: '2026-10-18', complete: true },
      { date: '2026-10-19', complete: true },
      { date: '2026-10-20', complete: false },
    ]
    expect(checkinStats(days, '2026-10-20')).toEqual({ streak: 2, total: 3 })
  })

  it('reminds to reassess 4 weeks after the last assessment', () => {
    expect(nextAssessment(undefined, '2026-10-20')).toBeNull()
    expect(nextAssessment('2026-10-01', '2026-10-20')).toEqual({ due: '2026-10-29', daysLeft: 9 })
    expect(nextAssessment('2026-09-01', '2026-10-20')?.daysLeft).toBeLessThan(0)
  })

  it('hides ignored advice for 7 days', () => {
    expect(adviceSnoozed(undefined, '2026-10-20')).toBe(false)
    expect(adviceSnoozed('2026-10-15', '2026-10-20')).toBe(true)
    expect(adviceSnoozed('2026-10-13', '2026-10-20')).toBe(false)
  })
})
