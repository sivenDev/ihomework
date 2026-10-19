import { describe, expect, it } from 'vitest'
import { fixtureDataset } from '../../../test/fixtures'
import { learnedShizi } from './scope'
import { applyEdits, emptyLessonEdit } from './merge'

describe('applyEdits', () => {
  it('adds and removes lesson characters without touching the built-in data', () => {
    const ds = fixtureDataset()
    const merged = applyEdits(
      ds,
      [{ ...emptyLessonEdit('g1a-s1'), addShizi: [{ char: '大', py: 'dà' }], removeShizi: ['地'], addXiezi: ['天'], removeXiezi: ['人'] }],
      [],
    )
    const lesson = merged.books[0].lessons[0]
    expect(lesson.shizi.map((r) => r.char)).toEqual(['天', '人', '大'])
    expect(lesson.xiezi).toEqual(['天'])
    expect(ds.books[0].lessons[0].shizi.map((r) => r.char)).toEqual(['天', '地', '人'])
    expect(learnedShizi(merged.books, { lessonId: 'g1a-s1' })).toEqual(['天', '人', '大'])
  })

  it('creates dictionary entries for characters the parent adds', () => {
    const merged = applyEdits(fixtureDataset(), [{ ...emptyLessonEdit('g1a-s1'), addShizi: [{ char: '鑫', py: 'xīn' }] }], [])
    expect(merged.chars['鑫'].py).toEqual(['xīn'])
  })

  it('fills in a default reading when the parent adds a character without pinyin', () => {
    const merged = applyEdits(fixtureDataset(), [{ ...emptyLessonEdit('g1a-s1'), addShizi: [{ char: '大', py: '' }] }], [])
    expect(merged.books[0].lessons[0].shizi.at(-1)).toEqual({ char: '大', py: 'dà' })
  })

  it('puts the parent reading first and replaces words', () => {
    const merged = applyEdits(fixtureDataset(), [], [{ char: '地', py: 'de', words: ['地上'] }])
    expect(merged.chars['地'].py[0]).toBe('de')
    expect(merged.chars['地'].words).toEqual(['地上'])
  })

  it('does not add a duplicate when the added character already exists', () => {
    const merged = applyEdits(fixtureDataset(), [{ ...emptyLessonEdit('g1a-s1'), addShizi: [{ char: '天', py: 'tiān' }] }], [])
    expect(merged.books[0].lessons[0].shizi.filter((r) => r.char === '天')).toHaveLength(1)
  })
})
