// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/schema'
import { updateSettings } from '../../db/settings'
import { fixtureDataset } from '../../test/fixtures'
import { answerCard } from '../boss/api'
import { addMistake } from '../boss/logic/scheduler'
import { loadXp } from '../rewards/store'
import { completeTask, ensureTodayPlan, enrollNewChars } from './store'

const ds = fixtureDataset()
const today = '2026-10-19'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  await updateSettings({ progressLessonId: 'g1a-k1' })
})

async function plan() {
  return (await db.dailyPlans.get(today))!
}

describe('daily plan', () => {
  it('builds a 标准 plan by default and regenerates when the parent changes the level', async () => {
    await ensureTodayPlan(ds, today)
    expect((await plan()).level).toBe('标准')
    expect((await plan()).tasks.find((t) => t.id === 'newChars')?.picks).toHaveLength(3)

    await updateSettings({ practiceLevel: '轻松' })
    await ensureTodayPlan(ds, today)
    expect((await plan()).level).toBe('轻松')
    expect((await plan()).tasks.some((t) => t.id === 'newChars')).toBe(false)
  })

  it('加强: finishing the first segment starts the rest, the whole day gives +20 once', async () => {
    await updateSettings({ practiceLevel: '加强' })
    await db.bossCards.put({ ...addMistake(undefined, '天', 'flash', '2026-10-18'), due: today })
    await ensureTodayPlan(ds, today)
    const segments = (await plan()).tasks.filter((t) => t.required).map((t) => [t.id, t.segment])
    expect(segments).toEqual([
      ['preview', 1],
      ['newChars', 1],
      ['review', 2],
      ['boss', 2],
    ])

    await completeTask('preview', today)
    expect((await plan()).restUntil).toBeUndefined()
    await completeTask('newChars', today)
    expect((await plan()).restUntil).toBeGreaterThan(Date.now())
    expect((await loadXp()).total).toBe(10)

    await completeTask('review', today)
    await completeTask('boss', today)
    await completeTask('boss', today)
    expect((await plan()).complete).toBe(true)
    // 同一天重新生成也不会重复发经验值
    await updateSettings({ allowAhead: true })
    await ensureTodayPlan(ds, today)
    expect((await plan()).complete).toBe(true)
    expect((await loadXp()).total).toBe(20)
  })

  it('keeps the new characters of a finished task when the plan is regenerated', async () => {
    await ensureTodayPlan(ds, today)
    const picks = (await plan()).tasks.find((t) => t.id === 'newChars')!.picks!
    await enrollNewChars(picks, today)
    await completeTask('newChars', today)
    await updateSettings({ allowAhead: true })
    await ensureTodayPlan(ds, today)
    expect((await plan()).tasks.find((t) => t.id === 'newChars')?.picks).toEqual(picks)
    expect((await plan()).done.newChars).toBe(true)
  })

  it('creates a unit challenge once when progress moves into a new unit', async () => {
    const books = structuredClone(ds.books)
    books[1].lessons.forEach((l) => (l.unit = 2))
    const twoUnits = { ...ds, books }
    await ensureTodayPlan(twoUnits, today)
    await updateSettings({ progressLessonId: 'g1b-s1' })
    await ensureTodayPlan(twoUnits, today)
    await ensureTodayPlan(twoUnits, today)
    const exams = await db.exams.toArray()
    expect(exams).toHaveLength(1)
    expect(exams[0]).toMatchObject({ kind: 'unit', key: 'g1a-1', status: 'pending' })
    expect(exams[0].chars.sort()).toEqual([...'天地人青山'].sort())
    expect(exams[0].write.sort()).toEqual(['人', '山'])
  })
})

describe('defeat xp', () => {
  it('gives +1 the first time a character is defeated', async () => {
    await db.bossCards.put({ ...addMistake(undefined, '天', 'flash', '2026-10-01'), streak: 2, stage: 2, due: today })
    await answerCard('天', true, today)
    expect((await loadXp()).total).toBe(1)
  })
})
