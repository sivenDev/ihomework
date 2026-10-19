import { describe, expect, it } from 'vitest'
import { FLASH_RUSH_MS, RUSH_MS, flashRushing, needsFocusBreak } from './focus'

const slow = RUSH_MS + 500
const fast = RUSH_MS - 300

describe('needsFocusBreak', () => {
  it('waits for at least three answers', () => {
    expect(needsFocusBreak([{ correct: false, ms: fast }, { correct: false, ms: fast }])).toBe(false)
  })

  it('reminds after three wrong answers in a row, even when slow', () => {
    expect(needsFocusBreak(Array.from({ length: 3 }, () => ({ correct: false, ms: slow })))).toBe(true)
  })

  it('reminds when two of the last three were rushed and wrong', () => {
    expect(
      needsFocusBreak([
        { correct: false, ms: fast },
        { correct: true, ms: slow },
        { correct: false, ms: fast },
      ]),
    ).toBe(true)
  })

  it('does not remind for quick correct answers or a single slip', () => {
    expect(needsFocusBreak(Array.from({ length: 3 }, () => ({ correct: true, ms: fast })))).toBe(false)
    expect(
      needsFocusBreak([
        { correct: true, ms: slow },
        { correct: false, ms: fast },
        { correct: true, ms: fast },
      ]),
    ).toBe(false)
  })

  it('only looks at the most recent three answers', () => {
    expect(
      needsFocusBreak([
        { correct: false, ms: fast },
        { correct: false, ms: fast },
        { correct: true, ms: slow },
        { correct: true, ms: slow },
        { correct: false, ms: slow },
      ]),
    ).toBe(false)
  })
})

describe('flashRushing', () => {
  it('reminds after four very quick taps in a row', () => {
    expect(flashRushing([1500, 600, 700, 800, 650])).toBe(true)
    expect(flashRushing([600, 700, FLASH_RUSH_MS, 650])).toBe(false)
    expect(flashRushing([600, 700, 800])).toBe(false)
  })
})
