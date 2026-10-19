// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/schema'
import { fixtureDataset } from '../../test/fixtures'
import { createRun, finishRun, updateRun } from './store'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('assessment store', () => {
  it('saves the report and sends mistakes to the error boss without duplicates', async () => {
    const ds = fixtureDataset()
    await db.bossCards.put({ char: '青', stage: 1, streak: 1, due: '2026-10-21', status: 'active', sources: ['flash'], updatedAt: 1 })

    const id = await createRun(ds, 'g1a-k1', 10)
    await updateRun(id, (d) => {
      d.parts.recognition!.items.forEach((item) => (item.result = item.char === '青' || item.char === '山' ? 'wrong' : 'correct'))
      d.parts.dictation = { items: [{ char: '人', word: '人', result: 'blank' }] }
      return d
    })
    await finishRun(ds, id)

    const run = await db.assessments.get(id)
    expect((run!.data as { report: { backlog: string[] } }).report.backlog.sort()).toEqual(['人', '山', '青'])
    const cards = await db.bossCards.toArray()
    expect(cards.map((c) => c.char).sort()).toEqual(['人', '山', '青'])
    expect(cards.find((c) => c.char === '青')).toMatchObject({ streak: 0, stage: 0, sources: ['flash', 'assessment'] })
  })
})
