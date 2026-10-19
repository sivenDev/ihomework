import { describe, expect, it } from 'vitest'
import type { Dataset } from '../../../data/types'
import { fixtureDataset } from '../../../test/fixtures'
import { detectiveQuestion, detectiveRound, familyPuzzle, poolForLevel, toneVariants } from './generators'

function seeded(seed = 7) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

/** 给字族成员配上真实读音，方便检查干扰项 */
function dataset(): Dataset {
  const ds = fixtureDataset()
  const py: Record<string, string> = { 青: 'qīng', 晴: 'qíng', 请: 'qǐng', 情: 'qíng', 清: 'qīng', 睛: 'jīng', 蜻: 'qīng', 天: 'tiān', 大: 'dà' }
  for (const [c, p] of Object.entries(py)) ds.chars[c] = { ...ds.chars[c], py: [p] }
  return ds
}

describe('poolForLevel', () => {
  const ds = dataset()
  const progress = { lessonId: 'g1a-k1' }

  it('widens the pool level by level', () => {
    expect(poolForLevel(ds, progress, 1)).toEqual(['青', '山', '晴', '请'])
    expect(poolForLevel(ds, progress, 2)).toEqual(['天', '地', '人', '青', '山'])
    expect(poolForLevel(ds, { lessonId: 'g1b-s1' }, 2)).toEqual(['晴', '请'])
    expect(poolForLevel(ds, progress, 3)).toEqual(['天', '地', '人', '青', '山'])
    expect(poolForLevel(ds, progress, 4)).toEqual(['天', '地', '人', '青', '山', '情', '蜻'])
    expect(poolForLevel(ds, progress, 5)).toEqual(['天', '地', '人', '青', '山', '情', '蜻', '清', '大', '小', '睛'])
  })
})

describe('toneVariants', () => {
  it('lists the other three tones of the same syllable', () => {
    expect(toneVariants('qíng').sort()).toEqual(['qìng', 'qīng', 'qǐng'].sort())
    expect(toneVariants('lǜ')).toEqual(['lǖ', 'lǘ', 'lǚ'])
    expect(toneVariants('de')).toEqual([])
  })
})

describe('detectiveQuestion', () => {
  const ds = dataset()

  it('asks about a phono-semantic character with distinct options including the answer', () => {
    const q = detectiveQuestion(ds, '晴', seeded())!
    expect(q).toMatchObject({ char: '晴', reading: 'qíng', meaning: '和太阳、时间有关', semantic: '日', phonetic: '青', phoneticReading: 'qīng' })
    expect(q.readingOptions).toHaveLength(4)
    expect(new Set(q.readingOptions).size).toBe(4)
    expect(q.readingOptions).toContain('qíng')
    // 声旁本身的读音是最有迷惑性的干扰项
    expect(q.readingOptions).toContain('qīng')
    expect(q.meaningOptions).toHaveLength(3)
    expect(new Set(q.meaningOptions).size).toBe(3)
    expect(q.meaningOptions).toContain('和太阳、时间有关')
  })

  it('skips characters that are not phono-semantic or whose radical is unknown', () => {
    expect(detectiveQuestion(ds, '天')).toBeNull()
    const ds2 = dataset()
    ds2.chars['晴'] = { ...ds2.chars['晴'], semantic: '？' }
    expect(detectiveQuestion(ds2, '晴')).toBeNull()
  })

  it('builds a round from eligible characters only, without repeats', () => {
    const round = detectiveRound(ds, ['天', '晴', '请', '情', '地'], 5, seeded())
    expect(round.map((q) => q.char).sort()).toEqual(['情', '晴', '请'])
  })
})

describe('familyPuzzle', () => {
  const ds = dataset()

  it('picks a family with at least two members in scope and adds two distractor radicals', () => {
    const p = familyPuzzle(ds, ['晴', '请', '情', '天'], new Set(), seeded())!
    expect(p.phonetic).toBe('青')
    expect(p.targets).toEqual([
      { radical: '日', char: '晴' },
      { radical: '讠', char: '请' },
      { radical: '忄', char: '情' },
    ])
    expect(p.radicalOptions).toHaveLength(5)
    expect(p.radicalOptions).toEqual(expect.arrayContaining(['日', '讠', '忄']))
    expect(p.radicalOptions.filter((r) => !['日', '讠', '忄'].includes(r)).every((r) => ['虫', '氵', '目', '木'].includes(r))).toBe(true)
  })

  it('returns null when no family has two members in scope', () => {
    expect(familyPuzzle(ds, ['晴', '天'], new Set(), seeded())).toBeNull()
  })
})
