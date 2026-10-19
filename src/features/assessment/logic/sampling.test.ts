import { describe, expect, it } from 'vitest'
import type { CharInfo, Dataset } from '../../../data/types'
import { fixtureDataset } from '../../../test/fixtures'
import {
  LAYER_SAMPLE,
  advanceExtension,
  extensionPool,
  sample,
  dictationPrompt,
  sampleDictation,
  sampleRecognition,
  sampleWords,
  startExtension,
} from './sampling'

/** 可复现的伪随机数 */
function seeded(seed = 1) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

describe('sample', () => {
  it('returns n distinct items from the list', () => {
    const picked = sample([1, 2, 3, 4, 5, 6], 4, seeded())
    expect(picked).toHaveLength(4)
    expect(new Set(picked).size).toBe(4)
    expect(picked.every((x) => x >= 1 && x <= 6)).toBe(true)
  })

  it('returns everything when n exceeds the list', () => {
    expect(sample([1, 2], 5, seeded()).sort()).toEqual([1, 2])
  })
})

describe('sampleRecognition', () => {
  const ds = fixtureDataset()

  it('samples only learned characters, at most perBook from each book, without repeats', () => {
    const items = sampleRecognition(ds, { lessonId: 'g1b-s1' }, 3, seeded())
    const g1a = items.filter((i) => i.book === 'g1a').map((i) => i.char)
    const g1b = items.filter((i) => i.book === 'g1b').map((i) => i.char)
    expect(g1a).toHaveLength(3)
    expect(g1a.every((c) => '天地人青山'.includes(c))).toBe(true)
    expect(g1b.sort()).toEqual(['晴', '请'])
    expect(new Set(items.map((i) => i.char)).size).toBe(items.length)
    expect(items.every((i) => !'情蜻'.includes(i.char))).toBe(true)
  })

  it('is empty before the parent sets progress', () => {
    expect(sampleRecognition(ds, null, 30)).toEqual([])
  })
})

function bigDataset(extensionCount: number): Dataset {
  const ds = fixtureDataset()
  const extra: Record<string, CharInfo> = {}
  const extension: string[] = []
  for (let i = 0; i < extensionCount; i++) {
    const ch = String.fromCodePoint(0x5000 + i)
    extra[ch] = { ...ds.chars['天'], rank: 100 + i }
    extension.push(ch)
  }
  return { ...ds, chars: { ...ds.chars, ...extra }, extension }
}

describe('extension layers', () => {
  it('pools unlearned textbook and extension characters by commonness in layers of 500', () => {
    const ds = bigDataset(1200)
    const pool = extensionPool(ds, { lessonId: 'g1a-k1' })
    expect(pool.map((l) => l.length)).toEqual([500, 500, 204])
    // 未学的课本字（情 rank 8 等）排在最前
    expect(pool[0].slice(0, 4)).toEqual(['晴', '请', '情', '蜻'])
    expect(pool.flat()).not.toContain('天')
  })

  const answerAll = (part: ReturnType<typeof startExtension>, correctCount: number) => {
    const last = part.layers.at(-1)!
    last.items.forEach((item, i) => (item.result = i < correctCount ? 'correct' : 'wrong'))
    return part
  }

  it('moves to the next layer while accuracy stays at or above 30%', () => {
    const ds = bigDataset(1200)
    const pool = extensionPool(ds, { lessonId: 'g1a-k1' })
    let part = startExtension(pool, seeded())
    expect(part.layers[0].items).toHaveLength(LAYER_SAMPLE)
    part = advanceExtension(answerAll(part, 3), pool, seeded())
    expect(part.layers).toHaveLength(2)
    expect(part.finished).toBe(false)
  })

  it('stops when a layer falls below 30%', () => {
    const ds = bigDataset(1200)
    const pool = extensionPool(ds, { lessonId: 'g1a-k1' })
    const part = advanceExtension(answerAll(startExtension(pool, seeded()), 2), pool, seeded())
    expect(part.layers).toHaveLength(1)
    expect(part.finished).toBe(true)
  })

  it('stops after the last layer and waits while a layer is unfinished', () => {
    const ds = bigDataset(100)
    const pool = extensionPool(ds, { lessonId: 'g1a-k1' })
    const started = startExtension(pool, seeded())
    expect(advanceExtension(started, pool, seeded())).toBe(started)
    expect(advanceExtension(answerAll(started, 10), pool, seeded()).finished).toBe(true)
  })
})

describe('sampleDictation and sampleWords', () => {
  const ds = fixtureDataset()
  ds.chars['人'] = { ...ds.chars['人'], words: ['大人', '人山', '天人'] }
  ds.chars['青'] = { ...ds.chars['青'], words: ['青山'] }

  it('dictates learned writing characters with a word made of learned characters', () => {
    const items = sampleDictation(ds, { lessonId: 'g1a-k1' }, 5, seeded())
    expect(items.map((i) => i.char).sort()).toEqual(['人', '山'])
    expect(items.find((i) => i.char === '人')!.word).toBe('人山')
    expect(items.find((i) => i.char === '山')!.word).toBe('山')
  })

  it('reads the character with its word', () => {
    expect(dictationPrompt('晴', '晴天')).toBe('晴，晴天的晴')
    expect(dictationPrompt('山', '山')).toBe('山')
  })

  it('picks words made only of learned characters', () => {
    const part = sampleWords(ds, { lessonId: 'g1a-k1' }, 3, 5, seeded())
    expect(part.chars).toHaveLength(3)
    expect(part.words.map((w) => w.word).sort()).toEqual(['人山', '天人', '青山'])
  })
})
