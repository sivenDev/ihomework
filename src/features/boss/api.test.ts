// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/schema'
import { addMistakes, answerCard, importPendingMistakes } from './api'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('boss api', () => {
  it('adds each character once and resets on repeat mistakes', async () => {
    await addMistakes(['晴', '晴', '请'], 'assessment', '2026-10-19')
    await answerCard('晴', true, '2026-10-20')
    await addMistakes(['晴'], 'dictation', '2026-10-21')
    expect(await db.bossCards.count()).toBe(2)
    expect(await db.bossCards.get('晴')).toMatchObject({ streak: 0, due: '2026-10-22', sources: ['assessment', 'dictation'] })
  })

  it('imports pending mistakes left by earlier assessments and clears the queue', async () => {
    await db.pendingMistakes.bulkPut([
      { char: '天', sources: ['assessment'], addedAt: 1 },
      { char: '地', sources: ['assessment'], addedAt: 1 },
    ])
    expect(await importPendingMistakes('2026-10-19')).toBe(2)
    expect(await db.pendingMistakes.count()).toBe(0)
    expect((await db.bossCards.get('天'))?.due).toBe('2026-10-20')
  })

  it('ignores answers for unknown characters', async () => {
    expect(await answerCard('无', true, '2026-10-19')).toBeUndefined()
  })
})
