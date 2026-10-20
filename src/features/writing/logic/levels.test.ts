import { describe, expect, it } from 'vitest'
import { challengeGoal, currentWritingLevel, levelStatus, nextWritingLevel, type ScoredWriting } from './levels'

describe('writing level', () => {
  it('starts from the parent-confirmed level, then the assessment, then level 1', () => {
    expect(currentWritingLevel(3, 2)).toBe(3)
    expect(currentWritingLevel(null, 2)).toBe(2)
    expect(currentWritingLevel(null, undefined)).toBe(1)
  })

  it('suggests a level-up after reaching the current goal twice', () => {
    const one: ScoredWriting[] = [{ level: 1, result: 'level' }]
    expect(levelStatus(one, 1)).toEqual({ hits: 1, canLevelUp: false })
    expect(levelStatus([...one, { level: 1, result: 'none' }], 1).canLevelUp).toBe(false)
    expect(levelStatus([...one, { level: 1, result: 'challenge' }], 1)).toEqual({ hits: 2, canLevelUp: true })
  })

  it('only counts writings from the current level, so one level-up at a time', () => {
    const records: ScoredWriting[] = [
      { level: 1, result: 'challenge' },
      { level: 1, result: 'challenge' },
      { level: 1, result: 'level' },
    ]
    expect(nextWritingLevel(1)).toBe(2)
    expect(levelStatus(records, 2)).toEqual({ hits: 0, canLevelUp: false })
  })

  it('stops at level 5', () => {
    expect(levelStatus([{ level: 5, result: 'level' }, { level: 5, result: 'level' }], 5)).toEqual({ hits: 2, canLevelUp: false })
    expect(nextWritingLevel(5)).toBe(5)
  })
})

describe('challenge goal', () => {
  it('拓展 raises the goal by one level, other routes keep it', () => {
    expect(challengeGoal(2, '拓展')).toBe(3)
    expect(challengeGoal(5, '拓展')).toBe(5)
    expect(challengeGoal(2, '同步')).toBe(2)
    expect(challengeGoal(2, '补漏')).toBe(2)
  })

  it('reaching the challenge goal does not change the actual level', () => {
    // 2 级写、达到 3 级挑战目标两次：只是 2 级达标两次，升级后是 3 级而不是 4 级
    const records: ScoredWriting[] = [
      { level: 2, result: 'challenge' },
      { level: 2, result: 'challenge' },
    ]
    expect(levelStatus(records, 2).canLevelUp).toBe(true)
    expect(nextWritingLevel(2)).toBe(3)
    expect(levelStatus(records, 3).hits).toBe(0)
  })
})
