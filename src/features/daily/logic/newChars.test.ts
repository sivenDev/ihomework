import { describe, expect, it } from 'vitest'
import { fixtureDataset } from '../../../test/fixtures'
import { addMistake, type BossCard } from '../../boss/logic/scheduler'
import { backlogList, pickNewChars, type CharHistory } from './newChars'

const ds = fixtureDataset()
const today = '2026-10-19'

function card(char: string, source: string, status: BossCard['status'] = 'active'): BossCard {
  return { ...addMistake(undefined, char, source, today), status }
}

const empty: CharHistory = { cards: [], attempts: [], reportBacklog: [] }

describe('backlogList', () => {
  // 学到 g1b-s1（晴请）：之前学过 天地人青山
  const progress = { lessonId: 'g1b-s1' }

  it('combines the assessment backlog and earlier characters never answered correctly, in textbook order', () => {
    const history: CharHistory = {
      ...empty,
      reportBacklog: ['请', '天'],
      attempts: [
        { char: '山', result: 'wrong', ts: 1 },
        { char: '人', result: 'wrong', ts: 2 },
        { char: '人', result: 'correct', ts: 3 },
      ],
    }
    expect(backlogList(ds, progress, history)).toEqual({ all: ['天', '山', '请'], conquered: [], remaining: ['天', '山', '请'] })
  })

  it('counts defeated characters as conquered', () => {
    const history: CharHistory = { ...empty, reportBacklog: ['天', '请'], cards: [card('天', 'assessment', 'defeated')] }
    expect(backlogList(ds, progress, history)).toMatchObject({ conquered: ['天'], remaining: ['请'] })
  })

  it('ignores characters of the current lesson that have not been answered correctly yet', () => {
    const history: CharHistory = { ...empty, attempts: [{ char: '晴', result: 'wrong', ts: 1 }] }
    expect(backlogList(ds, progress, history).all).toEqual([])
  })
})

describe('pickNewChars', () => {
  it('补漏: takes untaught backlog characters early to late, then fills with this lesson', () => {
    const history: CharHistory = {
      ...empty,
      reportBacklog: ['请', '天', '山'],
      // “天”已经通过新字任务学过了
      cards: [card('天', 'backlog')],
    }
    const progress = { lessonId: 'g1b-s1' }
    expect(pickNewChars(ds, progress, '补漏', 2, history, { allowAhead: false })).toEqual([
      { char: '山', source: 'backlog' },
      { char: '请', source: 'backlog' },
    ])
    expect(pickNewChars(ds, progress, '补漏', 3, history, { allowAhead: false })).toEqual([
      { char: '山', source: 'backlog' },
      { char: '请', source: 'backlog' },
      { char: '晴', source: 'sync' },
    ])
  })

  it('补漏: re-teaches a backlog character that is only in the Boss because of a mistake', () => {
    const history: CharHistory = { ...empty, reportBacklog: ['天'], cards: [card('天', 'assessment')] }
    expect(pickNewChars(ds, { lessonId: 'g1b-s1' }, '补漏', 1, history, { allowAhead: false })).toEqual([{ char: '天', source: 'backlog' }])
  })

  it('同步: takes this lesson and the next one, skipping characters already known or in the Boss', () => {
    const history: CharHistory = {
      ...empty,
      cards: [card('晴', 'flash')],
      attempts: [{ char: '山', result: 'correct', ts: 1 }],
    }
    expect(pickNewChars(ds, { lessonId: 'g1a-k1' }, '同步', 5, history, { allowAhead: false })).toEqual([
      { char: '青', source: 'sync' },
      { char: '请', source: 'sync' },
    ])
  })

  it('拓展: rotates family characters and frequent characters', () => {
    expect(pickNewChars(ds, { lessonId: 'g1a-k1' }, '拓展', 3, empty, { allowAhead: false })).toEqual([
      { char: '清', source: 'extension' },
      { char: '大', source: 'extension' },
      { char: '睛', source: 'extension' },
    ])
  })

  it('拓展: puts later lessons first in the rotation when the parent allows learning ahead', () => {
    expect(pickNewChars(ds, { lessonId: 'g1a-k1' }, '拓展', 6, empty, { allowAhead: true }).map((p) => p.char)).toEqual([
      '情',
      '清',
      '大',
      '蜻',
      '睛',
      '小',
    ])
  })

  it('拓展: skips characters already in the Boss', () => {
    const history: CharHistory = { ...empty, cards: [card('清', 'extension')] }
    expect(pickNewChars(ds, { lessonId: 'g1a-k1' }, '拓展', 2, history, { allowAhead: false }).map((p) => p.char)).toEqual(['睛', '大'])
  })

  it('returns nothing when the quota is 0', () => {
    expect(pickNewChars(ds, { lessonId: 'g1a-k1' }, '同步', 0, empty, { allowAhead: false })).toEqual([])
  })
})
