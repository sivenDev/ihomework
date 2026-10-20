import { describe, expect, it } from 'vitest'
import { levelConfig } from './levels'
import type { NewCharPick } from './newChars'
import { dayComplete, overload, planTasks, requiredSegments, segmentDone, type PlanInput } from './planner'

const picks = (chars: string): NewCharPick[] => [...chars].map((char) => ({ char, source: 'sync' }))

function input(level: '轻松' | '标准' | '加强', extra: Partial<PlanInput> = {}): PlanInput {
  const cfg = levelConfig(level)
  return {
    cfg,
    weekend: false,
    previewChars: [...'一二三四五六'],
    reviewChars: [...'天地人'],
    newPicks: picks('甲乙丙丁戊己庚辛'.slice(0, cfg.newChars)),
    bossToday: cfg.bossCap,
    ...extra,
  }
}

const required = (tasks: ReturnType<typeof planTasks>) => tasks.filter((t) => t.required)
const minutes = (tasks: ReturnType<typeof planTasks>, seg?: number) =>
  required(tasks)
    .filter((t) => seg === undefined || t.segment === seg)
    .reduce((n, t) => n + t.minutes, 0)

describe('overload', () => {
  it('keeps the quota when the Boss is within its cap', () => {
    expect(overload(levelConfig('标准'), 12)).toEqual({ newChars: 3, bossToday: 12 })
  })

  it('cuts new characters by the overflow and postpones extra Boss cards', () => {
    expect(overload(levelConfig('标准'), 17)).toEqual({ newChars: 1, bossToday: 15 })
  })

  it('cuts new characters down to 0 at most', () => {
    expect(overload(levelConfig('加强'), 60)).toEqual({ newChars: 0, bossToday: 25 })
  })
})

describe('planTasks', () => {
  it('标准: one segment in the order preview → review → new characters → Boss, within 20 minutes', () => {
    const tasks = planTasks(input('标准'))
    expect(required(tasks).map((t) => t.id)).toEqual(['preview', 'review', 'newChars', 'boss'])
    expect(tasks.every((t) => t.segment === 1)).toBe(true)
    expect(minutes(tasks)).toBeLessThanOrEqual(20)
  })

  it('轻松: no new characters, within 15 minutes', () => {
    const tasks = planTasks(input('轻松'))
    expect(required(tasks).map((t) => t.id)).toEqual(['preview', 'review', 'boss'])
    expect(minutes(tasks)).toBeLessThanOrEqual(15)
  })

  it('加强: learning in the first segment, recall in the second, each within 15 minutes', () => {
    const tasks = planTasks(input('加强'))
    expect(required(tasks).map((t) => [t.id, t.segment])).toEqual([
      ['preview', 1],
      ['newChars', 1],
      ['review', 2],
      ['boss', 2],
    ])
    expect(minutes(tasks, 1)).toBeLessThanOrEqual(15)
    expect(minutes(tasks, 2)).toBeLessThanOrEqual(15)
    expect(tasks.find((t) => t.id === 'newChars')?.picks).toHaveLength(8)
    expect(requiredSegments(tasks)).toEqual([1, 2])
  })

  it('加强 on weekends adds an optional 15-minute special challenge', () => {
    expect(planTasks(input('加强')).some((t) => t.id === 'bonus')).toBe(false)
    const bonus = planTasks(input('加强', { weekend: true })).find((t) => t.id === 'bonus')
    expect(bonus).toMatchObject({ minutes: 15, required: false })
    expect(planTasks(input('标准', { weekend: true })).some((t) => t.id === 'bonus')).toBe(false)
  })

  it('marks tasks as optional when over time, keeping Boss → review → new characters → preview', () => {
    const cfg = levelConfig('轻松', { segmentMinutes: 10 })
    const tasks = planTasks(input('轻松', { cfg }))
    expect(required(tasks).map((t) => t.id)).toEqual(['review', 'boss'])
    expect(tasks.find((t) => t.id === 'preview')).toMatchObject({ required: false })
    expect(minutes(tasks)).toBeLessThanOrEqual(10)
  })

  it('keeps the top task even when it alone is over time', () => {
    const cfg = levelConfig('标准', { segmentMinutes: 10, bossCap: 40 })
    const tasks = planTasks(input('标准', { cfg, bossToday: 40 }))
    expect(required(tasks).map((t) => t.id)).toEqual(['boss'])
  })

  it('leaves out tasks that have nothing to do', () => {
    const tasks = planTasks(input('标准', { previewChars: [], bossToday: 0 }))
    expect(required(tasks).map((t) => t.id)).toEqual(['review', 'newChars'])
  })

  it('加强 falls back to one segment when one of the segments would be empty', () => {
    const tasks = planTasks(input('加强', { previewChars: [], newPicks: [] }))
    expect(required(tasks).map((t) => [t.id, t.segment])).toEqual([
      ['review', 1],
      ['boss', 1],
    ])
    expect(requiredSegments(tasks)).toEqual([1])
  })

  it('shows reading check-in as a placeholder that does not count', () => {
    const reading = planTasks(input('标准')).find((t) => t.id === 'reading')
    expect(reading).toMatchObject({ required: false, placeholder: true })
  })
})

describe('completion', () => {
  const tasks = planTasks(input('加强', { weekend: true }))

  it('a segment is done when all its required tasks are done', () => {
    expect(segmentDone(tasks, { preview: true }, 1)).toBe(false)
    expect(segmentDone(tasks, { preview: true, newChars: true }, 1)).toBe(true)
  })

  it('the day is complete without optional tasks or placeholders', () => {
    expect(dayComplete(tasks, { preview: true, newChars: true, review: true })).toBe(false)
    expect(dayComplete(tasks, { preview: true, newChars: true, review: true, boss: true })).toBe(true)
  })

  it('a day without required tasks is not complete', () => {
    expect(dayComplete([], {})).toBe(false)
  })
})
