import { describe, expect, it } from 'vitest'
import { fixtureDataset } from '../../../test/fixtures'
import { extensionCandidates } from './extension'

const ds = fixtureDataset()

describe('extensionCandidates', () => {
  it('offers ahead characters only when the parent allows it', () => {
    const progress = { lessonId: 'g1a-s1' }
    expect(extensionCandidates(ds, progress, { allowAhead: false, mastered: new Set() }).ahead).toEqual([])
    expect(extensionCandidates(ds, progress, { allowAhead: true, mastered: new Set() }).ahead).toEqual(['晴', '请', '情', '蜻'])
  })

  it('finds out-of-textbook characters in the families of learned characters, by commonness', () => {
    // 已学“晴”（声旁青），字族里课本外的字是“清”“睛”
    const result = extensionCandidates(ds, { lessonId: 'g1b-s1' }, { allowAhead: false, mastered: new Set() })
    expect(result.family).toEqual(['清', '睛'])
  })

  it('treats a learned character that is itself a phonetic as a family root', () => {
    const result = extensionCandidates(ds, { lessonId: 'g1a-k1' }, { allowAhead: false, mastered: new Set() })
    expect(result.family).toEqual(['清', '睛'])
  })

  it('excludes learned and mastered characters from every source', () => {
    // 已学到 g1a-k1：预习课是 g1b-s1，超前学习取其后的 g1b-k1
    const result = extensionCandidates(ds, { lessonId: 'g1a-k1' }, { allowAhead: true, mastered: new Set(['清', '大', '情']) })
    expect(result.family).toEqual(['睛'])
    expect(result.frequent).toEqual(['小', '睛'])
    expect(result.ahead).toEqual(['蜻'])
  })
})
