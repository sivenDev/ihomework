import { describe, expect, it } from 'vitest'
import { fixtureDataset } from '../../../test/fixtures'
import { aheadShizi, currentLesson, learnedShizi, learnedXiezi, nextLesson } from './scope'

const { books } = fixtureDataset()

describe('textbook scope', () => {
  it('has nothing learned before the parent sets progress', () => {
    expect(learnedShizi(books, null)).toEqual([])
    expect(currentLesson(books, null)).toBeUndefined()
    expect(nextLesson(books, null)?.id).toBe('g1a-s1')
  })

  it('includes every lesson up to and including the current one', () => {
    expect(learnedShizi(books, { lessonId: 'g1a-s1' })).toEqual(['天', '地', '人'])
    expect(learnedShizi(books, { lessonId: 'g1a-k1' })).toEqual(['天', '地', '人', '青', '山'])
    expect(learnedXiezi(books, { lessonId: 'g1a-k1' })).toEqual(['人', '山'])
  })

  it('crosses book boundaries in order', () => {
    expect(learnedShizi(books, { lessonId: 'g1b-s1' })).toEqual(['天', '地', '人', '青', '山', '晴', '请'])
    expect(nextLesson(books, { lessonId: 'g1a-k1' })?.id).toBe('g1b-s1')
  })

  it('skips lessons without characters when picking the preview lesson', () => {
    expect(nextLesson(books, { lessonId: 'g1a-s1' })?.id).toBe('g1a-k1')
  })

  it('returns no preview after the last lesson', () => {
    expect(nextLesson(books, { lessonId: 'g1b-k1' })).toBeUndefined()
    expect(aheadShizi(books, { lessonId: 'g1b-k1' })).toEqual([])
  })

  it('takes ahead characters from lessons after the preview lesson', () => {
    expect(aheadShizi(books, { lessonId: 'g1a-s1' })).toEqual(['晴', '请', '情', '蜻'])
  })

  it('treats an unknown lesson id like no progress', () => {
    expect(learnedShizi(books, { lessonId: 'missing' })).toEqual([])
  })
})
