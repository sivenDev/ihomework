import { describe, expect, it } from 'vitest'
import { MAX_READINGS, decide, scoreFlash } from './flashCheck'

describe('decide', () => {
  it('moves on when the first reading matches', () => {
    expect(decide(1, 'same')).toEqual({ next: 'advance', result: 'first-try' })
  })

  it('asks to read again after a mismatch', () => {
    expect(decide(1, 'different')).toEqual({ next: 'retry' })
  })

  it('counts a later match as corrected', () => {
    expect(decide(2, 'same')).toEqual({ next: 'advance', result: 'corrected' })
  })

  it('gives up kindly after the last allowed reading still differs', () => {
    expect(MAX_READINGS).toBe(2)
    expect(decide(MAX_READINGS, 'different')).toEqual({ next: 'advance', result: 'gave-up' })
  })
})

describe('scoreFlash', () => {
  it('scores first-try readings and lists everything else for practice', () => {
    const learned = new Set(['天', '地', '人'])
    const { score, needPractice, answers } = scoreFlash(
      [
        { char: '天', result: 'first-try' },
        { char: '地', result: 'corrected' },
        { char: '人', result: 'gave-up' },
        { char: '蜻', result: 'skipped' },
      ],
      learned,
    )
    expect(score).toBe(1)
    expect(needPractice).toEqual(['地', '人', '蜻'])
    expect(answers).toEqual([
      { char: '天', correct: true, learned: true },
      { char: '地', correct: false, learned: true },
      { char: '人', correct: false, learned: true },
      { char: '蜻', correct: false, learned: false },
    ])
  })
})
