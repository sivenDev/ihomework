// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/schema'
import { getSettings, updateSettings } from '../../db/settings'
import { fixtureDataset } from '../../test/fixtures'
import { ensureTodayPlan } from '../daily/store'
import { logReading } from '../reading/store'
import { loadXp } from '../rewards/store'
import { levelUpWriting, loadWritingStatus, scoreWriting, startWriting, submitWriting } from './store'

const ds = fixtureDataset()
const today = '2026-10-19'
const scores = { elements: 3, order: 2, sentences: 3, details: 2, handwriting: 3 } as const

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  await updateSettings({ progressLessonId: 'g1a-k1' })
})

async function writeOnce(result: 'none' | 'level' | 'challenge') {
  const id = await startWriting(ds, today)
  await submitWriting(id, today)
  await scoreWriting(id, scores, result, today)
  return id
}

describe('writing level', () => {
  it('levels up once after two hits and gives XP once', async () => {
    await writeOnce('level')
    expect(await levelUpWriting()).toBeNull()
    await writeOnce('none')
    await writeOnce('level')
    expect(await loadWritingStatus()).toMatchObject({ level: 1, hits: 2, canLevelUp: true })

    expect(await levelUpWriting()).toBe(2)
    expect(await levelUpWriting()).toBeNull()
    expect((await getSettings()).writingLevel).toBe(2)
    expect(await loadWritingStatus()).toMatchObject({ level: 2, hits: 0 })
    expect((await loadXp()).total).toBe(5)
  })

  it('拓展 sets a challenge goal one level above the actual level', async () => {
    await updateSettings({ routeLock: '拓展', writingLevel: 2 })
    const id = await startWriting(ds, today)
    expect((await db.writings.get(id))!.data).toMatchObject({ level: 2, goal: 3 })
  })

  it('keeps a single draft', async () => {
    expect(await startWriting(ds, today)).toBe(await startWriting(ds, today))
  })
})

describe('reading check-in', () => {
  it('completes the daily reading task; a finished book gives +20 once', async () => {
    await ensureTodayPlan(ds, today)
    expect(await logReading({ title: '父与子', minutes: 15, finished: false }, today)).toBe(0)
    expect((await db.dailyPlans.get(today))!.done.reading).toBe(true)

    expect(await logReading({ title: '《父与子》', minutes: 10, finished: true }, today)).toBe(20)
    expect(await logReading({ title: '父与子', minutes: 10, finished: true }, today)).toBe(0)
    expect((await loadXp()).total).toBe(20)
  })

  it('a check-in before the plan exists still counts', async () => {
    await logReading({ title: '神奇校车', minutes: 10, finished: false }, today)
    await ensureTodayPlan(ds, today)
    expect((await db.dailyPlans.get(today))!.done.reading).toBe(true)
  })
})
