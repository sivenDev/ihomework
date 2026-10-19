import { describe, expect, it } from 'vitest'
import { MAX_LEVEL, MIN_LEVEL, nextLevel } from './difficulty'

describe('nextLevel', () => {
  it('goes up at 85% and down below 60%, within 1 to 5', () => {
    expect(nextLevel(2, 0.85)).toBe(3)
    expect(nextLevel(2, 0.84)).toBe(2)
    expect(nextLevel(2, 0.6)).toBe(2)
    expect(nextLevel(2, 0.59)).toBe(1)
    expect(nextLevel(MAX_LEVEL, 1)).toBe(MAX_LEVEL)
    expect(nextLevel(MIN_LEVEL, 0)).toBe(MIN_LEVEL)
  })
})
