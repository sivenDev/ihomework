import { describe, expect, it } from 'vitest'
import { fixtureDataset } from '../../../test/fixtures'
import { THRESHOLDS, computeReport, suggestFocus, suggestLevel, suggestRoute } from './report'
import type { RunData } from './types'

describe('suggestion rules', () => {
  it('focus: weak recognition first, then weak writing, otherwise both', () => {
    expect(suggestFocus(0.74, 15)).toBe('识字')
    expect(suggestFocus(0.75, 5)).toBe('并行')
    expect(suggestFocus(0.89, 5)).toBe('并行')
    expect(suggestFocus(0.9, 9)).toBe('写作')
    expect(suggestFocus(0.9, 10)).toBe('并行')
    expect(suggestFocus(0.95, undefined)).toBe('并行')
  })

  it('route: strong recognition and dictation reach extension even with a few mistakes', () => {
    expect(suggestRoute(0.9, 0.85, ['天'])).toBe('拓展')
    expect(suggestRoute(0.9, 0.84, ['天'])).toBe('补漏')
    expect(suggestRoute(0.89, 1, ['天'])).toBe('补漏')
    expect(suggestRoute(0.95, undefined, [])).toBe('同步')
    expect(suggestRoute(0.8, 0.9, [])).toBe('同步')
  })

  it('level: below 75% recognition suggests 加强', () => {
    expect(suggestLevel(0.7499)).toBe('加强')
    expect(suggestLevel(THRESHOLDS.recognitionWeak)).toBe('标准')
  })
})

describe('computeReport', () => {
  const ds = fixtureDataset()
  const run: RunData = {
    sampleSize: 30,
    progressLessonId: 'g1b-s1',
    parts: {
      recognition: {
        items: [
          { char: '天', book: 'g1a', result: 'correct' },
          { char: '地', book: 'g1a', result: 'correct' },
          { char: '人', book: 'g1a', result: 'correct' },
          { char: '青', book: 'g1a', result: 'wrong' },
          { char: '晴', book: 'g1b', result: 'correct' },
          { char: '请', book: 'g1b', result: 'wrong' },
        ],
      },
      dictation: {
        items: [
          { char: '人', word: '人', result: 'correct' },
          { char: '山', word: '山', result: 'blank' },
          { char: '晴', word: '晴', result: 'wrong' },
        ],
      },
      extension: {
        finished: true,
        layers: [
          { size: 500, items: Array.from({ length: 10 }, (_, i) => ({ char: String(i), result: i < 6 ? 'correct' : 'wrong' })) },
          { size: 300, items: Array.from({ length: 10 }, (_, i) => ({ char: String(i), result: i < 2 ? 'correct' : 'wrong' })) },
        ],
      },
      words: { chars: [{ char: '天', result: 2 }, { char: '人', result: 1 }], words: [{ word: '大人', result: true }, { word: '天地', result: false }] },
      reading: { text: '天地人，你我他。', seconds: 30, stalls: 2, done: true },
      writing: { done: true, level: 2, scores: { elements: 3, order: 2, sentences: 2, details: 1, handwriting: 2 } },
    },
  }

  it('estimates in-textbook vocabulary per book from the hand-worked example', () => {
    const report = computeReport(ds, run, '2026-10-19')
    // 一上已学 5 字，抽 4 对 3 → 3.75；一下已学 2 字，抽 2 对 1 → 1；合计 4.75 ≈ 5
    expect(report.recognition).toMatchObject({ tested: 6, correct: 4, learned: 7, estimate: 5 })
    expect(report.recognition.accuracy).toBeCloseTo(4 / 6)
    expect(report.recognition.perBook).toEqual([
      { book: 'g1a', learned: 5, tested: 4, correct: 3 },
      { book: 'g1b', learned: 2, tested: 2, correct: 1 },
    ])
  })

  it('estimates out-of-textbook vocabulary by layer', () => {
    // 0.6 × 500 + 0.2 × 300 = 360
    expect(computeReport(ds, run, '2026-10-19').extension).toEqual({ estimate: 360, layersTested: 2 })
  })

  it('summarises dictation, words, reading and writing', () => {
    const report = computeReport(ds, run, '2026-10-19')
    expect(report.dictation).toEqual({ tested: 3, correct: 1, accuracy: 1 / 3 })
    expect(report.words).toEqual({ charScore: 3, charMax: 4, wordsKnown: 1, wordsTested: 2 })
    expect(report.reading).toEqual({ charsPerMinute: 12, stalls: 2, seconds: 30 })
    expect(report.writing).toMatchObject({ total: 10, level: 2 })
  })

  it('collects recognition and dictation mistakes into the backlog and suggests next steps', () => {
    const report = computeReport(ds, run, '2026-10-19')
    expect(report.backlog).toEqual(['青', '请', '山', '晴'])
    expect(report).toMatchObject({ focus: '识字', route: '补漏', level: '加强' })
  })

  it('omits parts that were not done', () => {
    const report = computeReport(ds, { ...run, parts: { recognition: run.parts.recognition } }, '2026-10-19')
    expect(report.dictation).toBeUndefined()
    expect(report.extension).toBeUndefined()
    expect(report.writing).toBeUndefined()
    expect(report.backlog).toEqual(['青', '请'])
  })
})
