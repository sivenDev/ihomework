import { describe, expect, it } from 'vitest'
import { ALLOWED_MISTAKES, judgeWriting } from './judge'

describe('judgeWriting', () => {
  it('counts a clean or nearly clean write as correct', () => {
    expect(judgeWriting({ totalMistakes: 0, hinted: false, gaveUp: false })).toBe('correct')
    expect(judgeWriting({ totalMistakes: ALLOWED_MISTAKES, hinted: false, gaveUp: false })).toBe('correct')
  })

  it('needs more practice when a hint appeared or there were many wrong strokes', () => {
    expect(judgeWriting({ totalMistakes: 0, hinted: true, gaveUp: false })).toBe('hinted')
    expect(judgeWriting({ totalMistakes: ALLOWED_MISTAKES + 1, hinted: false, gaveUp: false })).toBe('hinted')
  })

  it('is wrong when the child gives up', () => {
    expect(judgeWriting({ totalMistakes: 0, hinted: false, gaveUp: true })).toBe('wrong')
  })
})
