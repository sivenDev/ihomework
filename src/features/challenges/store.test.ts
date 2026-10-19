// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/schema'
import { recordRound, saveFamily } from './store'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('recordRound', () => {
  it('records attempts, keeps the best score, adjusts the level and sends learned mistakes to the boss', async () => {
    const first = await recordRound(
      {
        activity: 'flash',
        level: 1,
        score: 9,
        answers: [
          ...Array.from({ length: 9 }, () => ({ char: '天', correct: true, learned: true })),
          { char: '地', correct: false, learned: true },
          { char: '蜻', correct: false, learned: false },
        ],
      },
      '2026-10-19',
    )
    expect(first).toMatchObject({ newBest: true, previousBest: 0, level: 1, nextLevel: 1 })
    expect(first.accuracy).toBeCloseTo(9 / 11)
    expect(await db.attempts.count()).toBe(11)
    expect((await db.bossCards.toArray()).map((c) => c.char)).toEqual(['地'])

    const second = await recordRound(
      { activity: 'flash', level: 1, score: 5, answers: Array.from({ length: 5 }, () => ({ char: '人', correct: true, learned: true })) },
      '2026-10-19',
    )
    expect(second).toMatchObject({ newBest: false, previousBest: 9, nextLevel: 2 })
    expect(await db.challengeStats.get('flash')).toMatchObject({ level: 2, best: { 1: 9 }, plays: 2 })
  })

  it('merges characters into an existing family map', async () => {
    await saveFamily('青', ['晴', '请'], '2026-10-19')
    await saveFamily('青', ['请', '情'], '2026-10-20')
    expect(await db.familyCollection.get('青')).toEqual({ phonetic: '青', chars: ['晴', '请', '情'], date: '2026-10-20' })
  })
})
